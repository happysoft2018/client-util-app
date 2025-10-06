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

  async checkDbConnection({ ip, port, db_name, dbUser, dbPassword, timeout, dbType = 'mssql' }) {
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
          update: false,
          delete: false,
          create: false,
          drop: false
        }
      };

      // Permission check
      try {
        const permissions = await connection.checkPermissions();
        result.permissions = permissions;
      } catch (permErr) {
        console.log(`  └ Error during permission check: ${permErr.message.substring(0, 50)}...`);
      }

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
          update: false,
          delete: false,
          create: false,
          drop: false
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
      dbType
    });
    
    const errMessage = result.success ? '' : `[${result.error_code}] ${result.error_msg}`;
    
    // Permission information display
    let permissionStatus = '';
    if (result.success) {
      const perms = result.permissions;
      const permArray = [];
      if (perms.select) permArray.push('SELECT');
      if (perms.insert) permArray.push('INSERT');
      if (perms.update) permArray.push('UPDATE');
      if (perms.delete) permArray.push('DELETE');
      if (perms.create) permArray.push('CREATE');
      if (perms.drop) permArray.push('DROP');
      
      if (permArray.length > 0) {
        permissionStatus = ` [Permissions: ${permArray.join(', ')}]`;
      } else {
        permissionStatus = ` [Permissions: None]`;
      }
    }
    
    console.log(`[${server_ip}:${port}][${dbType.toUpperCase()}][${dbUser}][${title}][${db_name}] \t→ [${result.success ? '✅ Success' : '❌ Failed'}]${permissionStatus} ${errMessage}`);

    // Return result for CSV saving
    return {
      timestamp: new Date().toISOString(),
      pc_ip: this.localPcIp,
      server_ip,
      port,
      db_name,
      db_type: dbType,
      db_userid: dbUser,
      result_code: result.success ? 'SUCCESS' : 'FAILED',
      error_code: result.success ? '' : result.error_code,
      error_msg: result.success ? '' : result.error_msg,
      collapsed_time: result.elapsed,
      perm_select: result.permissions.select ? 'Y' : 'N',
      perm_insert: result.permissions.insert ? 'Y' : 'N',
      perm_update: result.permissions.update ? 'Y' : 'N',
      perm_delete: result.permissions.delete ? 'Y' : 'N',
      perm_create: result.permissions.create ? 'Y' : 'N',
      perm_drop: result.permissions.drop ? 'Y' : 'N'
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
            await this.saveResultsToCSV(results, 'db_connection_check');
            console.log(`\n✅ Results saved to CSV file: ${results.length} entries`);
          }
          
          console.log('All DB checks completed');
          resolve();
        });
    });
  }

  async saveResultsToCSV(results, filename) {
    // 디렉토리 생성 보장
    this.ensureResultsDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const csvFilename = `${filename}_${timestamp}.csv`;
    const csvPath = path.join(this.resultsDir, csvFilename);

    // CSV 헤더
    const headers = [
      'timestamp', 'pc_ip', 'server_ip', 'port', 'db_name', 'db_type', 'db_userid',
      'result_code', 'error_code', 'error_msg', 'collapsed_time',
      'perm_select', 'perm_insert', 'perm_update', 'perm_delete', 'perm_create', 'perm_drop'
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
