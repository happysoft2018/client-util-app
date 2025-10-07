const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');

class DBConnectionChecker {
  constructor(configManager) {
    this.configManager = configManager;
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$/i;
    this.regexPortPattern = /^[0-9]+$/; // Port range is 1-65535, so removed 4-digit limit
    this.resultsDir = this.getResultsDir();
  }

  getResultsDir() {
    // pkg 환경에서는 실행 파일과 같은 디렉토리에 results 폴더 생성
    if (process.pkg) {
      return path.join(path.dirname(process.execPath), 'results');
    } else {
      return path.join(__dirname, '../../results');
    }
  }

  ensureResultsDir() {
    try {
      if (!fs.existsSync(this.resultsDir)) {
        fs.mkdirSync(this.resultsDir, { recursive: true });
      }
    } catch (error) {
      console.warn('⚠️  Warning: Could not create results directory:', error.message);
      // 대체 경로로 현재 작업 디렉토리 사용
      this.resultsDir = path.join(process.cwd(), 'results');
      try {
        if (!fs.existsSync(this.resultsDir)) {
          fs.mkdirSync(this.resultsDir, { recursive: true });
        }
      } catch (fallbackError) {
        console.error('❌ Error: Could not create results directory even in fallback location');
      }
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
      console.warn(`⚠️  Column count (${columns.length}) doesn't match value count (${values.length})`);
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
          message: 'INSERT executed successfully',
          elapsed: ((Date.now() - start) / 1000).toFixed(3),
          query: crudSqls.insertSql
        };
        console.log(`  └ INSERT: ✅ Success (${results.insert.elapsed}s)`);
      } catch (error) {
        results.insert = {
          success: false,
          message: error.message.substring(0, 200),
          elapsed: 0,
          query: crudSqls.insertSql
        };
        console.log(`  └ INSERT: ❌ Failed (testCrudOperations) - ${error.message.substring(0, 200)}...`);
        return results;
      }
    } else {
      // INSERT SQL이 없으면 UPDATE, DELETE 테스트 중단
      console.log(`  └ DELETE Test: ❌ Skipped - No INSERT SQL`);
      return results;
    }

    // Test DELETE (UPDATE 성공 시에만 실행)
    if (crudSqls.deleteSql) {
      try {
        const start = Date.now();
        await connection.executeQuery(crudSqls.deleteSql);
        results.delete = {
          success: true,
          message: 'DELETE executed successfully',
          elapsed: ((Date.now() - start) / 1000).toFixed(3),
          query: crudSqls.deleteSql
        };
        console.log(`  └ DELETE: ✅ Success (${results.delete.elapsed}s)`);
      } catch (error) {
        results.delete = {
          success: false,
          message: error.message.substring(0, 200),
          elapsed: 0,
          query: crudSqls.deleteSql
        };
        console.log(`  └ DELETE: ❌ Failed - ${error.message.substring(0, 200)}...`);
      }
    } else {
      console.log(`  └ DELETE: ❌ Skipped - No DELETE SQL`);
    }

    return results;
  }

  validateInput(options) {
    const { csvPath } = options;
    
    if (!csvPath) {
      throw new Error('CSV file path is required.');
    }

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    if (!fs.statSync(csvPath).isFile()) {
      throw new Error('CSV path is not a file.');
    }

    if (!csvPath.toLowerCase().endsWith('.csv')) {
      throw new Error('Only CSV files (.csv extension) are supported.');
    }

    const stats = fs.statSync(csvPath);
    const fileSizeInKB = stats.size / 1024;
    const MAX_FILE_SIZE_KB = 200;
    
    if (fileSizeInKB > MAX_FILE_SIZE_KB) {
      throw new Error(`CSV file is too large. (${fileSizeInKB.toFixed(2)}KB > ${MAX_FILE_SIZE_KB}KB)`);
    }

    if (stats.size === 0) {
      throw new Error('CSV file is empty.');
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
    
    console.log(`[${server_ip}:${port}][${dbType.toUpperCase()}][${dbUser}][${title}][${db_name}] \t→ [${result.success ? '✅ Success' : '❌ Failed'}]${permissionStatus} ${errMessage}`);

    // CRUD 결과 처리
    const insertQuery = result.permissions.insertQuery || '';
    const deleteQuery = result.permissions.deleteQuery || '';
    
    let crudData = {
      insert_success: insertQuery ? (result.permissions.insert ? 'SUCCESS' : 'FAILED') : 'SKIPPED',
      delete_success: deleteQuery ? (result.permissions.delete ? 'SUCCESS' : 'FAILED') : 'SKIPPED',
      insert_query: insertQuery,
      delete_query: deleteQuery
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
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          Object.keys(row).forEach(k => row[k] = row[k].trim());
          rows.push(row);
        })
        .on('error', (error) => {
          reject(new Error(`CSV file read error: ${error.message}`));
        })
        .on('end', async () => {
          if (rows.length === 0) {
            reject(new Error('CSV file is empty.'));
            return;
          }

          // Required column check
          const requiredColumns = ['db_name', 'username', 'password', 'server_ip', 'port', 'db_type'];
          const firstRow = rows[0];
          const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
          
          if (missingColumns.length > 0) {
            reject(new Error(`Required columns are missing: ${missingColumns.join(', ')}`));
            return;
          }

          const MAX_ROW_COUNT = 500;
          if (rows.length > MAX_ROW_COUNT) {
            reject(new Error(`CSV file has too many data rows. (${rows.length} > ${MAX_ROW_COUNT})`));
            return;
          }

          console.log(`Read ${rows.length} DB information entries.`);

          // Execute check for each server and collect results
          const results = [];
          for (const row of rows) {
            if (!this.regexIpPattern.test(row.server_ip)) {
              console.log(`[${row.server_ip}] is not valid ip format`);
            } else if (!this.regexPortPattern.test(row.port)) {
              console.log(`[${row.port}] is not valid port format`);
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
            console.log(`\n✅ Results saved to CSV file: ${results.length} entries`);
          }
          
          console.log('All DB checks completed');
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
      'insert_success', 'delete_success', 'insert_query', 'delete_query'
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
      console.log(`📁 CSV file saved: ${csvPath}`);
    } catch (error) {
      console.error(`❌ Error saving CSV file: ${error.message}`);
      console.log(`📁 Attempted path: ${csvPath}`);
    }
  }
}

module.exports = DBConnectionChecker;
