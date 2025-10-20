const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const net = require('net');
const path = require('path');

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
        csvPathRequired: 'CSV file path is required.',
        csvNotFound: 'CSV file not found:',
        csvNotFile: 'CSV path is not a file.',
        onlyCsvSupported: 'Only CSV files (.csv extension) are supported.',
        csvTooLarge: 'CSV file is too large.',
        csvEmpty: 'CSV file is empty.',
        connectionTimedOut: 'Connection timed out in',
        unknownError: 'Unknown error',
        unknownServer: 'Unknown',
        connected: '✅ Connected',
        failed: '❌ Failed',
        csvReadError: 'CSV file read error:',
        requiredColumnsMissing: 'Required columns are missing:',
        csvTooManyRows: 'CSV file has too many data rows.',
        readServerInfo: 'Read',
        serverInfoEntries: 'server information entries.',
        invalidIp: 'is not valid ip format',
        invalidPort: 'is not valid port format',
        resultsSaved: '\n✅ Results saved to CSV file:',
        entries: 'entries',
        allChecksComplete: 'All server Telnet checks completed',
        csvFileSaved: '📁 CSV file saved:',
        errorSavingCsv: '❌ Error saving CSV file:',
        attemptedPath: '📁 Attempted path:'
    },
    kr: {
        errorCreateDir: '❌ 오류: results 디렉토리 생성 실패:',
        csvPathRequired: 'CSV 파일 경로가 필요합니다.',
        csvNotFound: 'CSV 파일을 찾을 수 없습니다:',
        csvNotFile: 'CSV 경로가 파일이 아닙니다.',
        onlyCsvSupported: 'CSV 파일만 지원됩니다 (.csv 확장자).',
        csvTooLarge: 'CSV 파일이 너무 큽니다.',
        csvEmpty: 'CSV 파일이 비어있습니다.',
        connectionTimedOut: '연결 시간 초과:',
        unknownError: '알 수 없는 오류',
        unknownServer: '알 수 없음',
        connected: '✅ 연결 성공',
        failed: '❌ 실패',
        csvReadError: 'CSV 파일 읽기 오류:',
        requiredColumnsMissing: '필수 컬럼이 누락되었습니다:',
        csvTooManyRows: 'CSV 파일의 데이터 행이 너무 많습니다.',
        readServerInfo: '서버 정보',
        serverInfoEntries: '개를 읽었습니다.',
        invalidIp: '는 유효한 IP 형식이 아닙니다',
        invalidPort: '는 유효한 포트 형식이 아닙니다',
        resultsSaved: '\n✅ 결과가 CSV 파일로 저장되었습니다:',
        entries: '개',
        allChecksComplete: '모든 서버 Telnet 점검 완료',
        csvFileSaved: '📁 CSV 파일 저장됨:',
        errorSavingCsv: '❌ CSV 파일 저장 오류:',
        attemptedPath: '📁 시도한 경로:'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class TelnetChecker {
  constructor() {
    this.localPcIp = this.getLocalIp();
    this.regexIpPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
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

  validateInput(options) {
    const { csvPath } = options;
    
    if (!csvPath) {
      throw new Error(this.msg.csvPathRequired);
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
        error_msg = `${this.msg.connectionTimedOut} ${timeout * 1000}ms`;
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
        error_msg = err.message || this.msg.unknownError;
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
    
    const serverDesc = server_name || this.msg.unknownServer;
    console.log(`[${server_ip}:${port}][${serverDesc}] \t→ [${result.isConnected ? this.msg.connected : this.msg.failed}] ${errMessage}`);

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
          const requiredColumns = ['server_ip', 'port'];
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

          console.log(`${this.msg.readServerInfo} ${rows.length}${LANGUAGE === 'kr' ? this.msg.serverInfoEntries : ' ' + this.msg.serverInfoEntries}`);

          // Execute check for each server and collect results
          const results = [];
          for (const row of rows) {
            if (!this.regexIpPattern.test(row.server_ip)) {
              console.log(`[${row.server_ip}] ${this.msg.invalidIp}`);
            } else if (!this.regexPortPattern.test(row.port)) {
              console.log(`[${row.port}] ${this.msg.invalidPort}`);
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
      console.log(`${this.msg.csvFileSaved} ${csvPath}`);
    } catch (error) {
      console.error(`${this.msg.errorSavingCsv} ${error.message}`);
      console.log(`${this.msg.attemptedPath} ${csvPath}`);
    }
  }
}

module.exports = TelnetChecker;
