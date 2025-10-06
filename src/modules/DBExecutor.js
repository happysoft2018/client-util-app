const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const os = require('os');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');
require('dotenv').config();

class DBExecutor {
  constructor(configManager) {
    this.configManager = configManager;
    this.templateDir = path.join(__dirname, '../../templet');
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
      console.warn(`⚠️  Local DB environment variables not set: ${missingLocalVars.join(', ')}`);
      console.warn('   Logging functionality will be disabled.');
    }
  }

  async createConnections(selectedDbName = null) {
    await this.validateEnvironment();

    let localDBPool = null;
    let remoteConnection = null;

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
            console.warn('⚠️  Local DB connection failed, logging functionality will be disabled:', error.message);
      }
    }

    // 원격 DB 연결
    let dbConfig;
    if (selectedDbName) {
      dbConfig = this.configManager.getDbConfig(selectedDbName);
      if (!dbConfig) {
        throw new Error(`Selected DB configuration not found: ${selectedDbName}`);
      }
      
      const dbType = this.configManager.getDbType(selectedDbName);
      remoteConnection = DatabaseFactory.createConnection(dbType, dbConfig);
      await remoteConnection.connect();
      
    } else {
      // Get from environment variables (legacy)
      if (!process.env.REMOTEDB_HOST) {
        throw new Error('DB configuration is required. Please select a DB in settings management or set environment variables.');
      }
      
      // Legacy assumes MSSQL
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
      
      remoteConnection = DatabaseFactory.createConnection('mssql', dbConfig);
      await remoteConnection.connect();
    }

    return { localDBPool, remoteConnection };
  }

  async executeSql(localDBPool, remoteConnection, sqlName, query, rows) {
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
        console.warn('⚠️  Failed to save log table:', error.message);
      }
    }

    // Create log directory
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
        const result = await remoteConnection.executeQuery(query, row);
        totalCount += result.rowCount;

        // 결과를 로그파일에 저장
        const timestampNow = new Date();
        const timestamp = timestampNow.getFullYear() + 
                         String(timestampNow.getMonth() + 1).padStart(2, '0') + 
                         String(timestampNow.getDate()).padStart(2, '0') + 
                         String(timestampNow.getHours()).padStart(2, '0') + 
                         String(timestampNow.getMinutes()).padStart(2, '0') + 
                         String(timestampNow.getSeconds()).padStart(2, '0');
        const logFile = path.join(logDir, `${sqlName}_${timestamp}.log`);
        fs.appendFileSync(logFile, JSON.stringify({ row, result: result.rows }, null, 2) + '\n');
        
        console.log(`✅ Completed: ${JSON.stringify(row)} (Result: ${result.rowCount} rows)`);

      } catch (err) {
        errorMsg += err.message + '\n';
        resultCode = 'Failed';
        console.error(`❌ Error: ${JSON.stringify(row)} - ${err.message}`);
      }
    }

    // Execution end time and processing duration
    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // Update result summary (only if local DB is available)
    if (localDBPool && sqlId) {
      try {
        await localDBPool.execute(
          'UPDATE sql_exec_log SET result_count = ?, result_code = ?, result_msg = ?, collapsed_time = ? WHERE sql_id = ?',
          [totalCount, resultCode, errorMsg, elapsed, sqlId]
        );
      } catch (error) {
        console.warn('⚠️  Log update failed:', error.message);
      }
    }

    console.log('\n📈 Execution Result Summary:');
    console.log(`  Total processed parameters: ${rows.length}`);
    console.log(`  Total result rows: ${totalCount}`);
    console.log(`  Execution result: ${resultCode}`);
    console.log(`  Elapsed time: ${elapsed} seconds`);

    return { totalCount, resultCode, elapsed };
  }

  async run(sqlName) {
    if (!sqlName) {
      throw new Error('SQL 파일명이 필요합니다.');
    }

    const sqlFilePath = path.join(this.templateDir, `${sqlName}.sql`);
    const csvFilePath = path.join(this.templateDir, `${sqlName}.csv`);

    // Check file existence
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file does not exist: ${sqlFilePath}`);
    }
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Parameter CSV file does not exist: ${csvFilePath}`);
    }

    console.log(`\n📄 SQL file: ${sqlFilePath}`);
    console.log(`📄 Parameter file: ${csvFilePath}`);

    // Read SQL file
    const query = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log(`\n🔍 SQL Query Content:`);
    console.log('-'.repeat(30));
    console.log(query);
    console.log('-'.repeat(30));

    // Create DB connection
    const selectedDbName = this.configManager.getDefaultConfig().sql.selectedDb;
    const { localDBPool, remoteConnection } = await this.createConnections(selectedDbName);
    
    if (selectedDbName) {
      const dbConfig = this.configManager.getDbConfig(selectedDbName);
      const dbType = this.configManager.getDbType(selectedDbName);
      console.log(`\n🗄️  Database in use: ${selectedDbName}`);
      console.log(`   DB type: ${dbType || 'MSSQL'}`);
      console.log(`   Server: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`   Database: ${dbConfig.database}`);
      console.log(`   Account: ${dbConfig.user}`);
    }

    try {
      // Parse CSV file
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
      const result = await this.executeSql(localDBPool, remoteConnection, sqlName, query, rows);
      
      console.log('\n🎉 All tasks completed successfully!');
      
    } finally {
      // Close connections
      if (localDBPool) {
        await localDBPool.end();
      }
      if (remoteConnection) {
        await remoteConnection.disconnect();
      }
    }
  }
}

module.exports = DBExecutor;
