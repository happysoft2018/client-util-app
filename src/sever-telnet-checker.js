const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const os = require('os');
require('dotenv').config();
const net = require('net');

// 인자 파싱 (간단 버전)
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('-')) {
      const key = args[i].replace(/^-/, '');
      const value = args[i + 1];
      result[key] = value;
      i++;
    }
  }
  return result;
}

const args = parseArgs();
const CSV_PATH = args.csv;
const TIMEOUT_SEC = parseInt(args.t) ? parseInt(args.t) * 1000 : 3000;
const API_URL = process.env.API_URL;
const CHECK_UNIT_ID = Date.now();
const LOCAL_PC_IP = getLocalIp();
const REGEX_IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const REGEX_PORT_PATTERN = /^[0-9]{4}$/


if (!CSV_PATH ) {

  console.error();
  console.error('==================================== 파라미터를 정상적으로 지정해 주세요! ========================================');
  console.error('파라미터: -csv  [필수] csv파일경로');
  console.error('          -t  [선택] 타임아웃(초) (기본값: 3) ');
  console.error();
  console.error('사용법: node src/server-telnet-checker.js -csv {csv파일경로} [ -t {타입아웃(초)}]');
  console.error()
  console.error('   ex)  node src/server-telnet-checker.js -csv c:\\temp\서버목록.csv');
  console.error('        node src/server-telnet-checker.js -csv c:\\temp\서버목록.csv -t 5 ');
  console.error('==================================================================================================================');
  process.exit(1);
}

function getLocalIp() {
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

async function checkPort(ip, port) {

  return new Promise((resolve) => {

    const socket = new net.Socket();
    let error_code = '';
    let error_msg = '';
    const start = Date.now();

    socket.setTimeout(TIMEOUT_SEC);

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
      error_msg = 'Connection timed out';
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
  
async function unitWorkByServer(row) {

  const server_ip = row.server_ip
  const port = row.port
  const title = row.corp +'_'+ row.proc
  
  const result = await checkPort(server_ip, port);
  console.log(`🔎 ${server_ip}:${port} ${title} → ${result.isConnected ? '✅ 연결됨' : '❌ 실패'}`);

  const body = {
    check_unit_id: CHECK_UNIT_ID, 
    server_ip,
    port,
    pc_ip: LOCAL_PC_IP,
    result_code: result.isConnected,
    error_code: result.error_code,
    error_msg: result.error_msg,
    collapsed_time: result.collapsed_time
  };

  try {
    const res = await axios.post(API_URL+'/telnet', body, { timeout: 3000 }); // 3초 타임아웃
  } catch (err) {
    console.error(`체크결과 기록 API (${API_URL}) 전송 실패`);
  }

}


async function main() {

  const rows = [];

  // CSV 파싱
  fs.createReadStream(CSV_PATH)
    .pipe(csv(['server_ip', 'port', 'corp', 'proc']))
    .on('data', (row) => {
      // 공백 제거
      Object.keys(row).forEach(k => row[k] = row[k].trim());
      rows.push(row);
    })
    .on('end', async () => {

      for (const row of rows) {

        if(!REGEX_IP_PATTERN.test(row.server_ip)) {
          console.log(`[${row.server_ip}] is not valid ip format`);
        }
        else if(!REGEX_PORT_PATTERN.test(row.port)) {
          console.log(`[${row.port}] is not valid port format`);
        }
        else {
          await unitWorkByServer(row);
        }
        
      }
      console.log('모든 서버 Telnet 체크 및 결과 전송 완료');
    });
}

main(); 