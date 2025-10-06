const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const net = require('net');
require('dotenv').config();

class TelnetChecker {
  constructor() {
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

  async checkPort(ip, port, timeout) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let error_code = '';
      let error_msg = '';
      const start = Date.now();

      socket.setTimeout(timeout * 1000);

      socket.on('connect', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        socket.destroy();
        resolve({
          isConnected: true,
          error_code: '',
          error_msg: '',
          collapsed_time: elapsed
        });
      });

      socket.on('timeout', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        error_code = 'ETIMEDOUT';
        error_msg = `Connection timed out in ${timeout * 1000}ms`;
        socket.destroy();
        resolve({
          isConnected: false,
          error_code,
          error_msg,
          collapsed_time: elapsed
        });
      });

      socket.on('error', (err) => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        error_code = err.code || 'ERROR';
        error_msg = err.message || 'Unknown error';
        resolve({
          isConnected: false,
          error_code,
          error_msg,
          collapsed_time: elapsed
        });
      });

      socket.connect(port, ip);
    });
  }
  
  async unitWorkByServer(row, checkUnitId, timeout) {
    const { server_ip, port, env_type, usage_type, corp, proc } = row;
    
    const result = await this.checkPort(server_ip, port, timeout);
    const errMessage = result.isConnected ? '' : `[${result.error_code}] ${result.error_msg}`;
    
    console.log(`[${server_ip}:${port}][${env_type}${usage_type}][${corp}_${proc}] \t→ [${result.isConnected ? '✅ Connected' : '❌ Failed'}] ${errMessage}`);

    if (checkUnitId === 0) {
      return;
    }

    // API transmission
    if (this.apiUrl) {
      const body = {
        check_unit_id: checkUnitId, 
        server_ip,
        port,
        result_code: result.isConnected,
        error_code: result.error_code,
        error_msg: result.error_msg,
        collapsed_time: result.collapsed_time
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        await fetch(this.apiUrl + '/telnet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (err) {
        console.error(`Failed to send check result to API (${this.apiUrl}/telnet)`);
      }
    }
  }

  async run(options) {
    const { csvPath, timeout = 3 } = options;
    
    this.validateInput({ csvPath });

    const rows = [];
    let checkUnitId = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv(['server_ip', 'port', 'hostname', 'usage_type', 'env_type', 'corp', 'proc', 'role_type']))
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
          const requiredColumns = ['server_ip', 'port'];
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

          console.log(`Read ${rows.length} server information entries.`);

          try {
            // API master registration
            if (this.apiUrl) {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const result = await fetch(this.apiUrl + '/master', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ check_method: 'TELNET', pc_ip: this.localPcIp }),
                  signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                const data = await result.json();
                checkUnitId = data.insertId ? data.insertId : 0;
              } catch (err) {
                console.warn('⚠️  API master registration failed:', err.message);
                checkUnitId = 0;
              }
            }

            // Execute check for each server
            for (const row of rows) {
              if (!this.regexIpPattern.test(row.server_ip)) {
                console.log(`[${row.server_ip}] is not valid ip format`);
              } else if (!this.regexPortPattern.test(row.port)) {
                console.log(`[${row.port}] is not valid port format`);
              } else {
                await this.unitWorkByServer(row, checkUnitId, timeout);
              }
            }
            
            console.log('All server Telnet checks and result transmission completed');
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
                  await this.unitWorkByServer(row, 0, timeout);
                }
              }
              resolve();
            }
          }
        });
    });
  }
}

module.exports = TelnetChecker;
