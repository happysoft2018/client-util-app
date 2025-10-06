const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
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
      throw new Error('CSV 파일 경로는 필수입니다.');
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
    
    console.log(`[${server_ip}:${port}][${env_type}${usage_type}][${corp}_${proc}] \t→ [${result.isConnected ? '✅ 연결됨' : '❌ 실패'}] ${errMessage}`);

    if (checkUnitId === 0) {
      return;
    }

    // API 전송
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
        await axios.post(this.apiUrl + '/telnet', body, { timeout: 3000 });
      } catch (err) {
        console.error(`체크결과 기록 API (${this.apiUrl}/telnet) 전송 실패`);
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
          reject(new Error(`CSV 파일 읽기 오류: ${error.message}`));
        })
        .on('end', async () => {
          if (rows.length === 0) {
            reject(new Error('CSV 파일이 비어있습니다.'));
            return;
          }

          // 필수 컬럼 체크
          const requiredColumns = ['server_ip', 'port'];
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

          console.log(`총 ${rows.length}개의 서버 정보를 읽었습니다.`);

          try {
            // API 마스터 등록
            if (this.apiUrl) {
              const result = await axios.post(
                this.apiUrl + '/master', 
                { check_method: 'TELNET', pc_ip: this.localPcIp }, 
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
                await this.unitWorkByServer(row, checkUnitId, timeout);
              }
            }
            
            console.log('모든 서버 Telnet 체크 및 결과 전송 완료');
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
