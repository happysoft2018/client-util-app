const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');

// pkg 실행 파일 경로 처리
const APP_ROOT = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '../..');

// 언어 설정 (명령줄 인수에서 가져오기)
const args = process.argv.slice(2);
const langArg = args.find(arg => arg.startsWith('--lang='));
const LANGUAGE = langArg ? langArg.split('=')[1] : 'en';

// 다국어 메시지
const messages = {
    en: {
        errorCreateDir: '❌ Error: Could not create results directory:',
        columnCountMismatch: '⚠️  Column count',
        doesntMatchValue: "doesn't match value count",
        insertSuccess: '✅ Success',
        insertFailed: '❌ Failed',
        deleteSkipped: '❌ Skipped - No INSERT SQL',
        deleteSuccess: '✅ Success',
        deleteFailed: '❌ Failed',
        insertExecuted: 'INSERT executed successfully',
        deleteExecuted: 'DELETE executed successfully',
        csvFileRequired: 'CSV file path is required.',
        csvNotFound: 'CSV file not found:',
        csvNotFile: 'CSV path is not a file.',
        onlyCsvSupported: 'Only CSV files (.csv extension) are supported.',
        csvTooLarge: 'CSV file is too large.',
        csvEmpty: 'CSV file is empty.',
        readEntries: 'Read',
        dbInfoEntries: 'DB information entries.',
        csvReadError: 'CSV file read error:',
        requiredColumnsMissing: 'Required columns are missing:',
        csvTooManyRows: 'CSV file has too many data rows.',
        invalidIp: 'is not valid IP format',
        invalidPort: 'is not valid port format',
        invalidDbName: 'is not valid DB name format',
        connecting: 'Connecting...',
        connectionSuccess: '✅ Connection Success',
        connectionFailed: '❌ Connection Failed',
        permissionCheck: 'Permission Check...',
        selectSuccess: 'SELECT: ✅ Success',
        selectFailed: 'SELECT: ❌ Failed',
        crudTest: 'CRUD Test...',
        allChecksComplete: 'All DB connection checks completed',
        resultsSaved: '\n✅ Results saved to CSV file:',
        entries: 'entries',
        csvFileSaved: '📁 CSV file saved:',
        errorSavingCsv: '❌ Error saving CSV file:',
        attemptedPath: '📁 Attempted path:'
    },
    kr: {
        errorCreateDir: '❌ 오류: results 디렉토리 생성 실패:',
        columnCountMismatch: '⚠️  컬럼 수',
        doesntMatchValue: '가 값의 수와 일치하지 않습니다',
        insertSuccess: '✅ 성공',
        insertFailed: '❌ 실패',
        deleteSkipped: '❌ 건너뜀 - INSERT SQL 없음',
        deleteSuccess: '✅ 성공',
        deleteFailed: '❌ 실패',
        insertExecuted: 'INSERT 실행 성공',
        deleteExecuted: 'DELETE 실행 성공',
        csvFileRequired: 'CSV 파일 경로가 필요합니다.',
        csvNotFound: 'CSV 파일을 찾을 수 없습니다:',
        csvNotFile: 'CSV 경로가 파일이 아닙니다.',
        onlyCsvSupported: 'CSV 파일만 지원됩니다 (.csv 확장자).',
        csvTooLarge: 'CSV 파일이 너무 큽니다.',
        csvEmpty: 'CSV 파일이 비어있습니다.',
        readEntries: 'DB 정보',
        dbInfoEntries: '개를 읽었습니다.',
        csvReadError: 'CSV 파일 읽기 오류:',
        requiredColumnsMissing: '필수 컬럼이 누락되었습니다:',
        csvTooManyRows: 'CSV 파일의 데이터 행이 너무 많습니다.',
        invalidIp: '는 유효한 IP 형식이 아닙니다',
        invalidPort: '는 유효한 포트 형식이 아닙니다',
        invalidDbName: '는 유효한 DB 이름 형식이 아닙니다',
        connecting: '연결 중...',
        connectionSuccess: '✅ 연결 성공',
        connectionFailed: '❌ 연결 실패',
        permissionCheck: '권한 확인 중...',
        selectSuccess: 'SELECT: ✅ 성공',
        selectFailed: 'SELECT: ❌ 실패',
        crudTest: 'CRUD 테스트 중...',
        allChecksComplete: '모든 DB 연결 점검 완료',
        resultsSaved: '\n✅ 결과가 CSV 파일로 저장되었습니다:',
        entries: '개',
        csvFileSaved: '📁 CSV 파일 저장됨:',
        errorSavingCsv: '❌ CSV 파일 저장 오류:',
        attemptedPath: '📁 시도한 경로:'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class DBConnectionChecker {
  constructor(configManager) {
    this.configManager = configManager;
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$/i;
    this.regexPortPattern = /^[0-9]+$/; // Port range is 1-65535, so removed 4-digit limit
    this.resultsDir = path.join(APP_ROOT, 'results');
    this.msg = msg;
  }

  ensureResultsDir() {
    try {
      if (!fs.existsSync(this.resultsDir)) {
        fs.mkdirSync(this.resultsDir, { recursive: true });
      }
    } catch (error) {
      console.error(this.msg.errorCreateDir, error.message);
    }
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

  generateCrudSqls(row, dbType) {
    const { crud_test_table, crud_test_columns, crud_test_values } = row;
    
    if (!crud_test_table || !crud_test_columns || !crud_test_values) {
      return {
        insertSql: null,
        deleteSql: null
      };
    }

    // Parse columns and values
    const columns = crud_test_columns.split(',').map(col => col.trim());
    const values = crud_test_values.split(',').map(val => val.trim());
    
    if (columns.length !== values.length) {
      console.warn(`${this.msg.columnCountMismatch} (${columns.length}) ${this.msg.doesntMatchValue} (${values.length})`);
      return {
        insertSql: null,
        deleteSql: null
      };
    }

    // Generate INSERT SQL
    let insertSql;
    if (dbType.toLowerCase() === 'mssql') {
      insertSql = `INSERT INTO ${crud_test_table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
    } else if (dbType.toLowerCase() === 'mysql') {
      insertSql = `INSERT INTO ${crud_test_table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
    } else if (dbType.toLowerCase() === 'postgresql') {
      insertSql = `INSERT INTO ${crud_test_table} (${columns.join(', ')}) VALUES (${values.map((val, idx) => `$${idx + 1}`).join(', ')})`;
    } else if (dbType.toLowerCase() === 'oracle') {
      insertSql = `INSERT INTO ${crud_test_table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
    }

    // Generate DELETE SQL (using first column as WHERE condition)
    let deleteSql;
    if (columns.length > 0) {
      deleteSql = `DELETE FROM ${crud_test_table} WHERE ${columns[0]} = '${values[0]}'`;
    }

    return {
      insertSql,
      deleteSql
    };
  }

  async testCrudOperations(connection, crudSqls, dbType) {
    const results = {
      insert: { success: false, message: '', elapsed: 0, query: '' },
      delete: { success: false, message: '', elapsed: 0, query: '' }
    };

    // SELECT test is already done in checkPermissions and checkDbConnection
    // Skip SELECT test in CRUD operations to avoid duplication

    // Test INSERT (SELECT 성공 시에만 실행)
    if (crudSqls.insertSql) {
      try {
        const start = Date.now();
        await connection.executeQuery(crudSqls.insertSql);
        results.insert = {
          success: true,
          message: this.msg.insertExecuted,
          elapsed: ((Date.now() - start) / 1000).toFixed(3),
          query: crudSqls.insertSql
        };
        console.log(`  └ INSERT: ${this.msg.insertSuccess} (${results.insert.elapsed}s)`);
      } catch (error) {
        results.insert = {
          success: false,
          message: error.message.substring(0, 200),
          elapsed: 0,
          query: crudSqls.insertSql
        };
        console.log(`  └ INSERT: ${this.msg.insertFailed} (testCrudOperations) - ${error.message.substring(0, 200)}...`);
        return results;
      }
    } else {
      // INSERT SQL이 없으면 UPDATE, DELETE 테스트 중단
      console.log(`  └ DELETE Test: ${this.msg.deleteSkipped}`);
      return results;
    }

    // Test DELETE (UPDATE 성공 시에만 실행)
    if (crudSqls.deleteSql) {
      try {
        const start = Date.now();
        await connection.executeQuery(crudSqls.deleteSql);
        results.delete = {
          success: true,
          message: this.msg.deleteExecuted,
          elapsed: ((Date.now() - start) / 1000).toFixed(3),
          query: crudSqls.deleteSql
        };
        console.log(`  └ DELETE: ${this.msg.deleteSuccess} (${results.delete.elapsed}s)`);
      } catch (error) {
        results.delete = {
          success: false,
          message: error.message.substring(0, 200),
          elapsed: 0,
          query: crudSqls.deleteSql
        };
        console.log(`  └ DELETE: ${this.msg.deleteFailed} - ${error.message.substring(0, 200)}...`);
      }
    } else {
      console.log(`  └ DELETE: ${this.msg.deleteSkipped}`);
    }

    return results;
  }

  validateInput(options) {
    const { csvPath } = options;
    
    if (!csvPath) {
      throw new Error(this.msg.csvFileRequired);
    }

    if (!fs.existsSync(csvPath)) {
      throw new Error(`${this.msg.csvNotFound} ${csvPath}`);
    }

    if (!fs.statSync(csvPath).isFile()) {
      throw new Error(this.msg.csvNotFile);
    }

    if (!csvPath.toLowerCase().endsWith('.csv')) {
      throw new Error(this.msg.onlyCsvSupported);
    }

    const stats = fs.statSync(csvPath);
    const fileSizeInKB = stats.size / 1024;
    const MAX_FILE_SIZE_KB = 200;
    
    if (fileSizeInKB > MAX_FILE_SIZE_KB) {
      throw new Error(`${this.msg.csvTooLarge} (${fileSizeInKB.toFixed(2)}KB > ${MAX_FILE_SIZE_KB}KB)`);
    }

    if (stats.size === 0) {
      throw new Error(this.msg.csvEmpty);
    }
  }

  async checkDbConnection({ ip, port, db_name, dbUser, dbPassword, timeout, dbType, row = null }) {
    const config = {
      user: dbUser,
      password: dbPassword,
      server: ip,
      port: parseInt(port, 10),
      database: db_name,
      options: {
        connectionTimeout: timeout * 1000, // Convert seconds to milliseconds
        requestTimeout: timeout * 1000
      }
    };
    
    const start = Date.now();

    try {
      const connection = DatabaseFactory.createConnection(dbType, config);
      await connection.connect();
      
      const result = { 
        success: true, 
        elapsed: 0,
        dbType: dbType,
        permissions: {
          select: false,
          insert: false,
          delete: false
        }
      };

      // Permission check (includes SELECT test using select_sql from CSV)
      try {
        // Prepare test table info from CSV if available
        let testTableInfo = null;
        if (row) {
          // Remove semicolon from select_sql if present
          let cleanSelectSql = row.select_sql || null;
          if (cleanSelectSql) {
            cleanSelectSql = cleanSelectSql.trim().replace(/;+\s*$/, '');
          }
          
          testTableInfo = {
            selectSql: cleanSelectSql
          };
          
          if (row.crud_test_table && row.crud_test_columns && row.crud_test_values) {
            // Safely parse columns and values
            const columnsStr = (row.crud_test_columns || '').trim();
            const valuesStr = (row.crud_test_values || '').trim();
            
            if (columnsStr && valuesStr) {
              const columns = columnsStr.split(',').map(col => col.trim()).filter(col => col);
              const values = valuesStr.split(',').map(val => val.trim()).filter(val => val);
              
              if (columns.length > 0 && values.length > 0 && columns.length === values.length) {
                testTableInfo.table = row.crud_test_table.trim();
                testTableInfo.columns = columns;
                testTableInfo.values = values;
              } else {
                console.log(`  └ Warning: Column/value count mismatch or empty (${columns.length} columns, ${values.length} values)`);
              }
            }
          }
        }
        
        const permissions = await connection.checkPermissions(testTableInfo);
        result.permissions = permissions;
      } catch (permErr) {
        console.log(`  └ Error during permission check: ${permErr.message.substring(0, 200)}...`);
      }

      // CRUD test is now integrated into checkPermissions()
      // No need for separate testCrudOperations() call to avoid duplicate INSERT/DELETE

      await connection.disconnect();
      result.elapsed = ((Date.now() - start) / 1000).toFixed(2);
      return result;

    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      return { 
        success: false, 
        error_code: err.code, 
        error_msg: err.message, 
        elapsed,
        dbType: dbType,
        permissions: {
          select: false,
          insert: false,
          delete: false
        }
      };
    }
  }

  async unitWorkByServer(row, checkUnitId, options) {
    const { dbUser, dbPassword, timeout, dbType = 'mssql' } = options;
    const { db_name, server_ip, port, db_title } = row;
    const title = db_title || db_name;

    console.log('\n' + '='.repeat(80));
    console.log(`🔍 Checking: [${server_ip}:${port}] ${dbType.toUpperCase()} - ${title}`);
    console.log('='.repeat(80));

    const result = await this.checkDbConnection({ 
      db_name, 
      ip: server_ip, 
      port, 
      dbUser, 
      dbPassword, 
      timeout,
      dbType,
      row
    });
    
    const errMessage = result.success ? '' : `[${result.error_code}] ${result.error_msg}`;
    
    // Permission information display
    let permissionStatus = '';
    if (result.success) {
      const perms = result.permissions;
      const permArray = [];
      if (perms.select) permArray.push('SELECT');
      if (perms.insert) permArray.push('INSERT');
      if (perms.delete) permArray.push('DELETE');
      
      if (permArray.length > 0) {
        permissionStatus = ` [Permissions: ${permArray.join(', ')}]`;
      } else {
        permissionStatus = ` [Permissions: None]`;
      }
    }
    
    console.log(`\n📊 Result: [${result.success ? '✅ Success' : '❌ Failed'}]${permissionStatus} ${errMessage}`);

    // CRUD 결과 처리
    const insertQuery = result.permissions.insertQuery || '';
    const deleteQuery = result.permissions.deleteQuery || '';
    
    // 에러 메시지들을 하나의 컬럼으로 합치기
    const operationErrors = [];
    if (result.permissions.selectError) {
      operationErrors.push(`SELECT: ${result.permissions.selectError}`);
    }
    if (result.permissions.insertError) {
      operationErrors.push(`INSERT: ${result.permissions.insertError}`);
    }
    if (result.permissions.deleteError) {
      operationErrors.push(`DELETE: ${result.permissions.deleteError}`);
    }

    let crudData = {
      insert_success: insertQuery ? (result.permissions.insert ? 'SUCCESS' : 'FAILED') : 'SKIPPED',
      delete_success: deleteQuery ? (result.permissions.delete ? 'SUCCESS' : 'FAILED') : 'SKIPPED',
      insert_query: insertQuery,
      delete_query: deleteQuery,
      operation_errors: operationErrors.join(' | ')
    };

    // Return result for CSV saving
    return {
      timestamp: new Date().toISOString(),
      pc_ip: this.localPcIp,
      server_ip,
      port,
      db_name,
      db_type: dbType,
      db_userid: dbUser,
      result_code: result.success ? '✅ SUCCESS' : '❌ FAILED',
      error_code: result.success ? '' : result.error_code,
      error_msg: result.success ? '' : result.error_msg,
      collapsed_time: result.elapsed,
      perm_select: result.permissions.select ? 'Y' : 'N',
      perm_insert: result.permissions.insert ? 'Y' : 'N',
      perm_delete: result.permissions.delete ? 'Y' : 'N',
      ...crudData
    };
  }

  async run(options) {
    const { csvPath, timeout = 5, dbType = 'mssql' } = options;
    
    this.validateInput({ csvPath });

    const rows = [];
    let checkUnitId = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => {
          Object.keys(row).forEach(k => row[k] = row[k].trim());
          rows.push(row);
        })
        .on('error', (error) => {
          reject(new Error(`${this.msg.csvReadError} ${error.message}`));
        })
        .on('end', async () => {
          if (rows.length === 0) {
            reject(new Error(this.msg.csvEmpty));
            return;
          }

          // Required column check
          const requiredColumns = ['db_name', 'username', 'password', 'server_ip', 'port', 'db_type'];
          const firstRow = rows[0];
          const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
          
          if (missingColumns.length > 0) {
            reject(new Error(`${this.msg.requiredColumnsMissing} ${missingColumns.join(', ')}`));
            return;
          }

          const MAX_ROW_COUNT = 500;
          if (rows.length > MAX_ROW_COUNT) {
            reject(new Error(`${this.msg.csvTooManyRows} (${rows.length} > ${MAX_ROW_COUNT})`));
            return;
          }

          console.log(`${this.msg.readEntries} ${rows.length}${LANGUAGE === 'kr' ? this.msg.dbInfoEntries : ' ' + this.msg.dbInfoEntries}`);

          // Execute check for each server and collect results
          const results = [];
          for (const row of rows) {
            if (!this.regexIpPattern.test(row.server_ip)) {
              console.log(`[${row.server_ip}] ${this.msg.invalidIp}`);
            } else if (!this.regexPortPattern.test(row.port)) {
              console.log(`[${row.port}] ${this.msg.invalidPort}`);
            } else {
              // Use db_type from CSV if specified, otherwise use default
              const rowDbType = (dbType === 'auto') ? (row.db_type || 'mssql') : (row.db_type || dbType);
              const result = await this.unitWorkByServer(row, 0, { 
                dbUser: row.username, 
                dbPassword: row.password, 
                timeout, 
                dbType: rowDbType 
              });
              if (result) {
                results.push(result);
              }
            }
          }
          
          // Save results to CSV
          if (results.length > 0) {
            const sourceCsvName = path.basename(csvPath);
            await this.saveResultsToCSV(results, '', sourceCsvName);
            console.log(`${this.msg.resultsSaved} ${results.length} ${this.msg.entries}`);
          }
          
          console.log(this.msg.allChecksComplete);
          resolve();
        });
    });
  }

  async saveResultsToCSV(results, filename, sourceCsvName = '') {
    // 디렉토리 생성 보장
    this.ensureResultsDir();
    
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') +
                     now.getDate().toString().padStart(2, '0') +
                     now.getHours().toString().padStart(2, '0') +
                     now.getMinutes().toString().padStart(2, '0') +
                     now.getSeconds().toString().padStart(2, '0');
    
    // 소스 CSV 파일명에서 확장자 제거
    const sourceName = sourceCsvName ? sourceCsvName.replace(/\.csv$/i, '') : 'unknown';
    const csvFilename = `${sourceName}_${filename}_${timestamp}.csv`;
    const csvPath = path.join(this.resultsDir, csvFilename);

    // CSV 헤더
    const headers = [
      'timestamp', 'pc_ip', 'server_ip', 'port', 'db_name', 'db_type', 'db_userid',
      'result_code', 'error_code', 'error_msg', 'collapsed_time',
      'perm_select', 'perm_insert', 'perm_delete',
      'insert_success', 'delete_success', 'insert_query', 'delete_query',
      'operation_errors'
    ];

    // CSV 내용 생성
    const csvContent = [
      headers.join(','),
      ...results.map(result => 
        headers.map(header => `"${result[header] || ''}"`).join(',')
      )
    ].join('\n');

    try {
      // 파일 저장
      fs.writeFileSync(csvPath, csvContent, 'utf8');
      console.log(`${this.msg.csvFileSaved} ${csvPath}`);
    } catch (error) {
      console.error(`${this.msg.errorSavingCsv} ${error.message}`);
      console.log(`${this.msg.attemptedPath} ${csvPath}`);
    }
  }
}

module.exports = DBConnectionChecker;
