const fs = require('fs');
const csv = require('csv-parser');
const mssql = require('mssql');
const mysql = require('mysql2/promise');
const os = require('os');
const path = require('path');
require('dotenv').config();

class SqlExecutor {
  constructor(configManager) {
    this.templateDir = path.join(__dirname, '../../templet');
    this.configManager = configManager;
  }

  getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'unknown';
  }

  async validateEnvironment() {
    // 로컬 DB 환경변수 체크 (MySQL - 로깅용)
    const requiredLocalEnvVars = [
      'LOCALDB_HOST',
      'LOCALDB_USER',
      'LOCALDB_PASSWORD',
      'LOCALDB_DATABASE',
      'LOCALDB_PORT'
    ];

    const missingLocalVars = requiredLocalEnvVars.filter(varName => !process.env[varName]);
    
    if (missingLocalVars.length > 0) {
      console.warn(`⚠️  로컬 DB 환경변수가 설정되지 않았습니다: ${missingLocalVars.join(', ')}`);
      console.warn('   로그 기능이 비활성화됩니다.');
    }
  }

  async createConnections(selectedDbName = null) {
    await this.validateEnvironment();

    let localDBPool = null;
    let remoteDBPool = null;

    // 로컬 DB 연결 (MySQL - 로깅용, 선택사항)
    if (process.env.LOCALDB_HOST) {
      try {
        localDBPool = await mysql.createConnection({
          host: process.env.LOCALDB_HOST,
          user: process.env.LOCALDB_USER,
          password: process.env.LOCALDB_PASSWORD,
          database: process.env.LOCALDB_DATABASE,
          port: parseInt(process.env.LOCALDB_PORT, 10)
        });
      } catch (error) {
        console.warn('⚠️  로컬 DB 연결 실패, 로그 기능이 비활성화됩니다:', error.message);
      }
    }

    // 원격 DB 연결 (MSSQL)
    let dbConfig;
    if (selectedDbName) {
      dbConfig = this.configManager.getDbConfig(selectedDbName);
      if (!dbConfig) {
        throw new Error(`선택된 DB 설정을 찾을 수 없습니다: ${selectedDbName}`);
      }
    } else {
      // 환경변수에서 가져오기 (레거시)
      if (!process.env.REMOTEDB_HOST) {
        throw new Error('DB 설정이 필요합니다. 설정 관리에서 DB를 선택하거나 환경변수를 설정해주세요.');
      }
      dbConfig = {
        server: process.env.REMOTEDB_HOST,
        user: process.env.REMOTEDB_USER,
        password: process.env.REMOTEDB_PASSWORD,
        database: process.env.REMOTEDB_DATABASE,
        port: parseInt(process.env.REMOTEDB_PORT, 10),
        options: { 
          encrypt: false, 
          trustServerCertificate: true,
          requestTimeout: 300000,
          connectionTimeout: 30000
        }
      };
    }

    remoteDBPool = await mssql.connect({
      user: dbConfig.user,
      password: dbConfig.password,
      server: dbConfig.server,
      port: parseInt(dbConfig.port, 10),
      database: dbConfig.database,
      options: dbConfig.options || { 
        encrypt: false, 
        trustServerCertificate: true,
        requestTimeout: 300000,
        connectionTimeout: 30000
      }
    });

    return { localDBPool, remoteDBPool };
  }

  async executeSql(localDBPool, remoteDBPool, sqlName, query, rows) {
    const pcIp = this.getLocalIp();
    const startTime = Date.now();
    let totalCount = 0;
    let errorMsg = '';
    let resultCode = '성공';
    let sqlId = null;

    // 로그 테이블에 실행 정보 저장 (로컬 DB가 있는 경우에만)
    if (localDBPool) {
      try {
        const [insertResult] = await localDBPool.execute(
          'INSERT INTO sql_exec_log (sql_name, sql_content, pc_ip) VALUES (?, ?, ?)',
          [sqlName, query, pcIp]
        );
        sqlId = insertResult.insertId;
      } catch (error) {
        console.warn('⚠️  로그 테이블 저장 실패:', error.message);
      }
    }

    // 로그 디렉토리 생성
    const now = new Date();
    const yyyymmdd = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0');
    const logDir = path.join(__dirname, '../../log', yyyymmdd);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    console.log(`\n📊 ${rows.length}개의 파라미터로 SQL을 실행합니다...`);
    console.log('-'.repeat(50));

    // 각 행에 대해 SQL 실행
    for (const row of rows) {
      try {
        const request = remoteDBPool.request();
        Object.entries(row).forEach(([key, value]) => {
          request.input(key, value);
        });
        
        const result = await request.query(query);
        totalCount += result.recordset.length;

        // 결과를 로그파일에 저장
        const timestampNow = new Date();
        const timestamp = timestampNow.getFullYear() + 
                         String(timestampNow.getMonth() + 1).padStart(2, '0') + 
                         String(timestampNow.getDate()).padStart(2, '0') + 
                         String(timestampNow.getHours()).padStart(2, '0') + 
                         String(timestampNow.getMinutes()).padStart(2, '0') + 
                         String(timestampNow.getSeconds()).padStart(2, '0');
        const logFile = path.join(logDir, `${sqlName}_${timestamp}.log`);
        fs.appendFileSync(logFile, JSON.stringify({ row, result: result.recordset }, null, 2) + '\n');
        
        console.log(`✅ 완료: ${JSON.stringify(row)} (결과: ${result.recordset.length}행)`);

      } catch (err) {
        errorMsg += err.message + '\n';
        resultCode = '실패';
        console.error(`❌ 에러: ${JSON.stringify(row)} - ${err.message}`);
      }
    }

    // 실행 종료 시간 및 처리 소요시간
    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // 결과 요약 업데이트 (로컬 DB가 있는 경우에만)
    if (localDBPool && sqlId) {
      try {
        await localDBPool.execute(
          'UPDATE sql_exec_log SET result_count = ?, result_code = ?, result_msg = ?, collapsed_time = ? WHERE sql_id = ?',
          [totalCount, resultCode, errorMsg, elapsed, sqlId]
        );
      } catch (error) {
        console.warn('⚠️  로그 업데이트 실패:', error.message);
      }
    }

    console.log('\n📈 실행 결과 요약:');
    console.log(`  총 처리된 파라미터: ${rows.length}개`);
    console.log(`  총 결과 행 수: ${totalCount}행`);
    console.log(`  실행 결과: ${resultCode}`);
    console.log(`  소요 시간: ${elapsed}초`);

    return { totalCount, resultCode, elapsed };
  }

  async run(sqlName) {
    if (!sqlName) {
      throw new Error('SQL 파일명이 필요합니다.');
    }

    const sqlFilePath = path.join(this.templateDir, `${sqlName}.sql`);
    const csvFilePath = path.join(this.templateDir, `${sqlName}.csv`);

    // 파일 존재 여부 체크
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL 파일이 존재하지 않습니다: ${sqlFilePath}`);
    }
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`파라미터 CSV 파일이 존재하지 않습니다: ${csvFilePath}`);
    }

    console.log(`\n📄 SQL 파일: ${sqlFilePath}`);
    console.log(`📄 파라미터 파일: ${csvFilePath}`);

    // SQL 파일 읽기
    const query = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log(`\n🔍 SQL 쿼리 내용:`);
    console.log('-'.repeat(30));
    console.log(query);
    console.log('-'.repeat(30));

    // DB 연결 생성
    const selectedDbName = this.configManager.getDefaultConfig().sql.selectedDb;
    const { localDBPool, remoteDBPool } = await this.createConnections(selectedDbName);
    
    if (selectedDbName) {
      const dbConfig = this.configManager.getDbConfig(selectedDbName);
      console.log(`\n🗄️  사용 중인 데이터베이스: ${selectedDbName}`);
      console.log(`   서버: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`   데이터베이스: ${dbConfig.database}`);
      console.log(`   계정: ${dbConfig.user}`);
    }

    try {
      // CSV 파일 파싱
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on('data', (row) => {
            rows.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (rows.length === 0) {
        throw new Error('CSV 파일이 비어있습니다.');
      }

      console.log(`\n📋 파라미터 데이터 (${rows.length}개):`);
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row)}`);
      });

      // SQL 실행
      const result = await this.executeSql(localDBPool, remoteDBPool, sqlName, query, rows);
      
      console.log('\n🎉 모든 작업이 완료되었습니다!');
      
    } finally {
      // 연결 종료
      if (localDBPool) {
        await localDBPool.end();
      }
      await remoteDBPool.close();
    }
  }
}

module.exports = SqlExecutor;
