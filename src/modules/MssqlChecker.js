const fs = require('fs');
const csv = require('csv-parser');
const mssql = require('mssql');
const axios = require('axios');
const os = require('os');
require('dotenv').config();

class MssqlChecker {
  constructor(configManager) {
    this.configManager = configManager;
    this.apiUrl = process.env.API_URL;
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    this.regexPortPattern = /^[0-9]{4}$/;
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

  validateInput(options) {
    const { csvPath, dbUser, dbPassword } = options;
    
    if (!csvPath || !dbUser || !dbPassword) {
      throw new Error('CSV 파일 경로, DB 계정 ID, 패스워드는 필수입니다.');
    }

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    }

    if (!fs.statSync(csvPath).isFile()) {
      throw new Error('CSV 경로가 파일이 아닙니다.');
    }

    if (!csvPath.toLowerCase().endsWith('.csv')) {
      throw new Error('CSV 파일(.csv 확장자)만 지원됩니다.');
    }

    const stats = fs.statSync(csvPath);
    const fileSizeInKB = stats.size / 1024;
    const MAX_FILE_SIZE_KB = 200;
    
    if (fileSizeInKB > MAX_FILE_SIZE_KB) {
      throw new Error(`CSV 파일이 너무 큽니다. (${fileSizeInKB.toFixed(2)}KB > ${MAX_FILE_SIZE_KB}KB)`);
    }

    if (stats.size === 0) {
      throw new Error('CSV 파일이 비어있습니다.');
    }
  }

  async checkMssqlConnection({ ip, port, db_name, dbUser, dbPassword, timeout }) {
    const config = {
      user: dbUser,
      password: dbPassword,
      server: ip,
      port: parseInt(port, 10),
      database: db_name,
      options: { encrypt: true, trustServerCertificate: true },
      connectionTimeout: timeout * 1000,
      requestTimeout: timeout * 1000
    };
    
    const start = Date.now();

    try {
      const pool = await mssql.connect(config);
      
      const result = { 
        success: true, 
        elapsed: 0,
        permissions: {
          select: false,
          insert: false,
          update: false,
          delete: false
        }
      };

      const testTableName = `temp_permission_test_${Date.now()}`;
      
      try {
        // SELECT 권한 체크
        try {
          await pool.request().query('SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES');
          result.permissions.select = true;
        } catch (err) {
          console.log(`  └ SELECT 권한 없음: ${err.message.substring(0, 50)}...`);
        }

        // CREATE TABLE 및 INSERT 권한 체크
        try {
          await pool.request().query(`CREATE TABLE ${testTableName} (id INT, test_data NVARCHAR(50))`);
          
          try {
            // INSERT 권한 체크
            await pool.request().query(`INSERT INTO ${testTableName} (id, test_data) VALUES (1, 'test')`);
            result.permissions.insert = true;

            // UPDATE 권한 체크
            try {
              await pool.request().query(`UPDATE ${testTableName} SET test_data = 'updated' WHERE id = 1`);
              result.permissions.update = true;
            } catch (err) {
              console.log(`  └ UPDATE 권한 없음: ${err.message.substring(0, 50)}...`);
            }

            // DELETE 권한 체크
            try {
              await pool.request().query(`DELETE FROM ${testTableName} WHERE id = 1`);
              result.permissions.delete = true;
            } catch (err) {
              console.log(`  └ DELETE 권한 없음: ${err.message.substring(0, 50)}...`);
            }

          } catch (err) {
            console.log(`  └ INSERT 권한 없음: ${err.message.substring(0, 50)}...`);
          }

          // 테스트 테이블 삭제
          try {
            await pool.request().query(`DROP TABLE ${testTableName}`);
          } catch (err) {
            // 테이블 삭제 실패는 무시
          }

        } catch (err) {
          console.log(`  └ CREATE TABLE 권한 없음 (INSERT/UPDATE/DELETE 테스트 불가): ${err.message.substring(0, 50)}...`);
        }

      } catch (permErr) {
        console.log(`  └ 권한 체크 중 오류: ${permErr.message.substring(0, 50)}...`);
      }

      await pool.close();
      result.elapsed = ((Date.now() - start) / 1000).toFixed(2);
      return result;

    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      return { 
        success: false, 
        error_code: err.code, 
        error_msg: err.message, 
        elapsed,
        permissions: {
          select: false,
          insert: false,
          update: false,
          delete: false
        }
      };
    }
  }

  async unitWorkByServer(row, checkUnitId, options) {
    const { dbUser, dbPassword, timeout } = options;
    const { db_name, server_ip, port, corp, proc } = row;
    const title = corp + '_' + proc;

    const result = await this.checkMssqlConnection({ 
      db_name, 
      ip: server_ip, 
      port, 
      dbUser, 
      dbPassword, 
      timeout 
    });
    
    const errMessage = result.success ? '' : `[${result.error_code}] ${result.error_msg}`;
    
    // 권한 정보 표시
    let permissionStatus = '';
    if (result.success) {
      const perms = result.permissions;
      const permArray = [];
      if (perms.select) permArray.push('SELECT');
      if (perms.insert) permArray.push('INSERT');
      if (perms.update) permArray.push('UPDATE');
      if (perms.delete) permArray.push('DELETE');
      
      if (permArray.length > 0) {
        permissionStatus = ` [권한: ${permArray.join(', ')}]`;
      } else {
        permissionStatus = ` [권한: 없음]`;
      }
    }
    
    console.log(`[${server_ip}:${port}][${row.env_type}DB][${title}][${db_name}] \t→ [${result.success ? '✅ 성공' : '❌ 실패'}]${permissionStatus} ${errMessage}`);

    if (checkUnitId === 0) {
      return;
    }

    // API 전송
    if (this.apiUrl) {
      const body = {
        check_unit_id: checkUnitId, 
        server_ip,
        port,
        db_name,
        db_userid: dbUser,
        result_code: result.success,
        error_code: result.success ? '' : result.error_code,
        error_msg: result.success ? '' : result.error_msg,
        collapsed_time: result.elapsed,
        perm_select: result.permissions.select,
        perm_insert: result.permissions.insert,
        perm_update: result.permissions.update,
        perm_delete: result.permissions.delete
      };

      try {
        await axios.post(this.apiUrl + '/db', body, { timeout: 3000 });
      } catch (err) {
        console.error(`체크결과 기록 API (${this.apiUrl}/db) 전송 실패`);
      }
    }
  }

  async run(options) {
    const { csvPath, dbUser, dbPassword, timeout = 5 } = options;
    
    // 설정에서 DB 정보 가져오기
    const config = this.configManager.getDefaultConfig();
    const selectedDbName = config.mssql.selectedDb;
    
    let finalDbUser = dbUser;
    let finalDbPassword = dbPassword;
    
    // 설정된 DB가 있으면 해당 DB 정보 사용
    if (selectedDbName && !dbUser && !dbPassword) {
      const dbConfig = this.configManager.getDbConfig(selectedDbName);
      if (dbConfig) {
        finalDbUser = dbConfig.user;
        finalDbPassword = dbConfig.password;
        console.log(`\n🗄️  설정된 DB 사용: ${selectedDbName} (${dbConfig.server}:${dbConfig.port})`);
      }
    }
    
    this.validateInput({ csvPath, dbUser: finalDbUser, dbPassword: finalDbPassword });

    const rows = [];
    let checkUnitId = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv(['db_name', 'server_ip', 'port', 'corp', 'proc', 'env_type']))
        .on('data', (row) => {
          Object.keys(row).forEach(k => row[k] = row[k].trim());
          rows.push(row);
        })
        .on('error', (error) => {
          reject(new Error(`CSV 파일 읽기 오류: ${error.message}`));
        })
        .on('end', async () => {
          if (rows.length === 0) {
            reject(new Error('CSV 파일이 비어있습니다.'));
            return;
          }

          // 필수 컬럼 체크
          const requiredColumns = ['db_name', 'server_ip', 'port'];
          const firstRow = rows[0];
          const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
          
          if (missingColumns.length > 0) {
            reject(new Error(`필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`));
            return;
          }

          const MAX_ROW_COUNT = 500;
          if (rows.length > MAX_ROW_COUNT) {
            reject(new Error(`CSV 파일의 데이터 row수가 너무 많습니다. (${rows.length} > ${MAX_ROW_COUNT})`));
            return;
          }

          console.log(`총 ${rows.length}개의 DB 정보를 읽었습니다.`);

          try {
            // API 마스터 등록
            if (this.apiUrl) {
              const result = await axios.post(
                this.apiUrl + '/master', 
                { check_method: 'DB_CONN', pc_ip: this.localPcIp }, 
                { timeout: 3000 }
              );
              checkUnitId = result.data.insertId ? result.data.insertId : 0;
            }

            // 각 서버별 체크 실행
            for (const row of rows) {
              if (!this.regexIpPattern.test(row.server_ip)) {
                console.log(`[${row.server_ip}] is not valid ip format`);
              } else if (!this.regexPortPattern.test(row.port)) {
                console.log(`[${row.port}] is not valid port format`);
              } else {
                await this.unitWorkByServer(row, checkUnitId, { dbUser: finalDbUser, dbPassword: finalDbPassword, timeout });
              }
            }
            
            console.log('모든 DB 체크 및 결과 전송 완료');
            resolve();
          } catch (apiError) {
            if (this.apiUrl) {
              reject(new Error(`API 서버 연결 오류: ${apiError.message}`));
            } else {
              // API URL이 없어도 로컬 체크는 진행
              console.log('⚠️  API URL이 설정되지 않아 로컬 체크만 진행합니다.');
              for (const row of rows) {
                if (!this.regexIpPattern.test(row.server_ip)) {
                  console.log(`[${row.server_ip}] is not valid ip format`);
                } else if (!this.regexPortPattern.test(row.port)) {
                  console.log(`[${row.port}] is not valid port format`);
                } else {
                  await this.unitWorkByServer(row, 0, { dbUser: finalDbUser, dbPassword: finalDbPassword, timeout });
                }
              }
              resolve();
            }
          }
        });
    });
  }
}

module.exports = MssqlChecker;
