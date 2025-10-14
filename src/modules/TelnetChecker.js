const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const net = require('net');
const path = require('path');

class TelnetChecker {
  constructor() {
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    this.regexPortPattern = /^[0-9]+$/; // Port range is 1-65535, so removed 4-digit limit
    this.resultsDir = this.getResultsDir();
  }

  getResultsDir() {
    // pkg 환경에서는 현재 작업 디렉토리에 results 폴더 생성
    if (process.pkg) {
      return path.join(process.cwd(), 'results');
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
  
  async unitWorkByServer(row, timeout) {
    const { server_ip, port, server_name } = row;
    
    const result = await this.checkPort(server_ip, port, timeout);
    const errMessage = result.isConnected ? '' : `[${result.error_code}] ${result.error_msg}`;
    
    const serverDesc = server_name || 'Unknown';
    console.log(`[${server_ip}:${port}][${serverDesc}] \t→ [${result.isConnected ? '✅ Connected' : '❌ Failed'}] ${errMessage}`);

    // Return result for CSV saving
    return {
      timestamp: new Date().toISOString(),
      pc_ip: this.localPcIp,
      server_ip,
      port,
      server_name: server_name || '',
      result_code: result.isConnected ? 'SUCCESS' : 'FAILED',
      error_code: result.error_code || '',
      error_msg: result.error_msg || '',
      collapsed_time: result.collapsed_time
    };
  }

  async run(options) {
    const { csvPath, timeout = 3 } = options;
    
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

          // Execute check for each server and collect results
          const results = [];
          for (const row of rows) {
            if (!this.regexIpPattern.test(row.server_ip)) {
              console.log(`[${row.server_ip}] is not valid ip format`);
            } else if (!this.regexPortPattern.test(row.port)) {
              console.log(`[${row.port}] is not valid port format`);
            } else {
              const result = await this.unitWorkByServer(row, timeout);
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
          
          console.log('All server Telnet checks completed');
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
      'timestamp', 'pc_ip', 'server_ip', 'port', 'server_name',
      'result_code', 'error_code', 'error_msg', 'collapsed_time'
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

module.exports = TelnetChecker;
