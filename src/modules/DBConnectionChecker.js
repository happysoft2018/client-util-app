const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const os = require('os');
const DatabaseFactory = require('./database/DatabaseFactory');
require('dotenv').config();

class DBConnectionChecker {
  constructor(configManager) {
    this.configManager = configManager;
    this.apiUrl = process.env.API_URL;
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    this.regexPortPattern = /^[0-9]+$/; // 포트는 1-65535 범위이므로 4자리 제한 제거
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
      throw new Error('CSV file path, DB account ID, and password are required.');
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
      database: db_name
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
    const { db_name, server_ip, port, corp, proc } = row;
    const title = corp + '_' + proc;

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
    
    console.log(`[${server_ip}:${port}][${dbType.toUpperCase()}][${row.env_type}DB][${title}][${db_name}] \t→ [${result.success ? '✅ Success' : '❌ Failed'}]${permissionStatus} ${errMessage}`);

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
        db_type: dbType,
        db_userid: dbUser,
        result_code: result.success,
        error_code: result.success ? '' : result.error_code,
        error_msg: result.success ? '' : result.error_msg,
        collapsed_time: result.elapsed,
        perm_select: result.permissions.select,
        perm_insert: result.permissions.insert,
        perm_update: result.permissions.update,
        perm_delete: result.permissions.delete,
        perm_create: result.permissions.create,
        perm_drop: result.permissions.drop
      };

      try {
        await axios.post(this.apiUrl + '/db', body, { timeout: 3000 });
      } catch (err) {
        console.error(`Failed to send check result to API (${this.apiUrl}/db)`);
      }
    }
  }

  async run(options) {
    const { csvPath, dbUser, dbPassword, timeout = 5, dbType = 'mssql' } = options;
    
    this.validateInput({ csvPath, dbUser, dbPassword });

    const rows = [];
    let checkUnitId = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv(['db_name', 'server_ip', 'port', 'corp', 'proc', 'env_type', 'db_type']))
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
          const requiredColumns = ['db_name', 'server_ip', 'port'];
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

          try {
            // API master registration
            if (this.apiUrl) {
              const result = await axios.post(
                this.apiUrl + '/master', 
                { check_method: 'DB_CONN', pc_ip: this.localPcIp }, 
                { timeout: 3000 }
              );
              checkUnitId = result.data.insertId ? result.data.insertId : 0;
            }

            // Execute check for each server
            for (const row of rows) {
              if (!this.regexIpPattern.test(row.server_ip)) {
                console.log(`[${row.server_ip}] is not valid ip format`);
              } else if (!this.regexPortPattern.test(row.port)) {
                console.log(`[${row.port}] is not valid port format`);
              } else {
                // Use db_type from CSV if specified, otherwise use default
                const rowDbType = row.db_type || dbType;
                await this.unitWorkByServer(row, checkUnitId, { 
                  dbUser, 
                  dbPassword, 
                  timeout, 
                  dbType: rowDbType 
                });
              }
            }
            
            console.log('All DB checks and result transmission completed');
            resolve();
          } catch (apiError) {
            if (this.apiUrl) {
              reject(new Error(`API server connection error: ${apiError.message}`));
            } else {
              // Proceed with local check even if API URL is not set
              console.log('⚠️  API URL not set, proceeding with local check only.');
              for (const row of rows) {
                if (!this.regexIpPattern.test(row.server_ip)) {
                  console.log(`[${row.server_ip}] is not valid ip format`);
                } else if (!this.regexPortPattern.test(row.port)) {
                  console.log(`[${row.port}] is not valid port format`);
                } else {
                  const rowDbType = row.db_type || dbType;
                  await this.unitWorkByServer(row, 0, { 
                    dbUser, 
                    dbPassword, 
                    timeout, 
                    dbType: rowDbType 
                  });
                }
              }
              resolve();
            }
          }
        });
    });
  }
}

module.exports = DBConnectionChecker;
