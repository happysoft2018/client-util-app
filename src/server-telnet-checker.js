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
const CSV_PATH = args.f;
const TIMEOUT_SEC = parseInt(args.t) ? parseInt(args.t) * 1000 : 3000;
const API_URL = process.env.API_URL;
const LOCAL_PC_IP = getLocalIp();
const REGEX_IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const REGEX_PORT_PATTERN = /^[0-9]{4}$/


if (!CSV_PATH ) {

  console.error();
  console.error('==================================== 파라미터를 정상적으로 지정해 주세요! ========================================');
  console.error('파라미터: -f  [필수] csv파일경로');
  console.error('          -t  [선택] 타임아웃(초) (기본값: 3) ');
  console.error();
  console.error('사용법: node src/server-telnet-checker.js -f {csv파일경로} [ -t {타임아웃(초)}]');
  console.error()
  console.error('   ex)  node src/server-telnet-checker.js -f c:\\temp\서버목록.csv');
  console.error('        node src/server-telnet-checker.js -f c:\\temp\서버목록.csv -t 5 ');
  console.error('==================================================================================================================');
  process.exit(1);
}

// CSV 파일 존재 여부 체크
if (!fs.existsSync(CSV_PATH)) {
  console.error();
  console.error('==================================== CSV 파일을 찾을 수 없습니다! ========================================');
  console.error(`지정된 파일 경로: ${CSV_PATH}`);
  console.error();
  console.error('다음을 확인해 주세요:');
  console.error('1. 파일 경로가 정확한지 확인');
  console.error('2. 파일이 실제로 존재하는지 확인');
  console.error('3. 파일 권한이 읽기 가능한지 확인');
  console.error();
  console.error('절대 경로 예시:');
  console.error('   Windows: c:\\temp\\서버목록.csv');
  console.error('   Linux/Mac: /home/user/서버목록.csv');
  console.error('==================================================================================================================');
  process.exit(1);
}

// CSV 경로가 파일이 아닐 때(디렉토리 등)
if (!fs.statSync(CSV_PATH).isFile()) {
  console.error();
  console.error('==================================== CSV 경로가 파일이 아닙니다! ========================================' );
  console.error(`지정된 경로: ${CSV_PATH}`);
  console.error();
  console.error('파일 경로가 맞는지, 디렉토리를 지정하지 않았는지 확인해 주세요.');
  console.error('==================================================================================================================');
  process.exit(1);
}

// CSV 파일 확장자 체크
if (!CSV_PATH.toLowerCase().endsWith('.csv')) {
  console.error();
  console.error('==================================== 파일 확장자가 올바르지 않습니다! ========================================');
  console.error(`지정된 파일: ${CSV_PATH}`);
  console.error();
  console.error('CSV 파일(.csv 확장자)만 지원됩니다.');
  console.error('==================================================================================================================');
  process.exit(1);
}

// CSV 파일 크기 체크 (최대 200KB)
const stats = fs.statSync(CSV_PATH);
const fileSizeInKB = stats.size / 1024;
const MAX_FILE_SIZE_KB = 200; // 200KB
if (fileSizeInKB > MAX_FILE_SIZE_KB) {
  console.error();
  console.error('==================================== CSV 파일이 너무 큽니다! ========================================');
  console.error(`파일 크기: ${fileSizeInKB.toFixed(2)} KB`);
  console.error(`최대 허용 크기: ${MAX_FILE_SIZE_KB} KB`);
  console.error();
  console.error('파일 데이터가 정상적인지 확인해 주세요.');
  console.error('==================================================================================================================');
  process.exit(1);
}

// CSV 파일이 비어있는지 체크
if (stats.size === 0) {
  console.error();
  console.error('==================================== CSV 파일이 비어있습니다! ========================================');
  console.error(`파일 경로: ${CSV_PATH}`);
  console.error();
  console.error('CSV 파일에 데이터가 있는지 확인해 주세요.');
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
      error_msg = `Connection timed out in ${TIMEOUT_SEC}ms`;
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
  
async function unitWorkByServer(row, check_unit_id) {

  const server_ip = row.server_ip
  const port = row.port
  
  const result = await checkPort(server_ip, port);
  const err_message = result.isConnected ? '' : `[${result.error_code}] ${result.error_msg}`
  console.log(`[${server_ip}:${port}][${row.env_type}${row.usage_type}][${row.corp}_${row.proc}] \t→ [${result.isConnected ? '✅ 연결됨' : '❌ 실패'}] ${err_message}`);

  if(check_unit_id === 0) {
    return;
  } 

  const body = {
    check_unit_id, 
    server_ip,
    port,
    result_code: result.isConnected,
    error_code: result.error_code,
    error_msg: result.error_msg,
    collapsed_time: result.collapsed_time
  };

  try {
    await axios.post(API_URL+'/telnet', body, { timeout: 3000 }); // 3초 타임아웃
  } catch (err) {
    console.error(`체크결과 기록 API (${API_URL}/telnet) 전송 실패`);
  }

}


async function main() {

  const rows = [];

  try {
    // CSV 파싱
    fs.createReadStream(CSV_PATH)
      .pipe(csv(['server_ip', 'port', 'hostname', 'usage_type', 'env_type', 'corp', 'proc', 'role_type']))
      .on('data', (row) => {
        // 공백 제거
        Object.keys(row).forEach(k => row[k] = row[k].trim());
        rows.push(row);
      })
      .on('error', (error) => {
        console.error();
        console.error('==================================== CSV 파일 읽기 오류! ========================================');
        console.error(`오류 내용: ${error.message}`);
        console.error(`파일 경로: ${CSV_PATH}`);
        console.error();
        console.error('다음을 확인해 주세요:');
        console.error('1. 파일이 손상되지 않았는지 확인');
        console.error('2. 파일이 다른 프로그램에서 사용 중인지 확인');
        console.error('3. 파일 인코딩이 UTF-8인지 확인');
        console.error('==================================================================================================================');
        process.exit(1);
      })
      .on('end', async () => {
        
        if (rows.length === 0) {
          console.error();
          console.error('==================================== CSV 파일이 비어있습니다! ========================================');
          console.error(`파일 경로: ${CSV_PATH}`);
          console.error();
          console.error('CSV 파일에 데이터가 있는지 확인해 주세요.');
          console.error('==================================================================================================================');
          process.exit(1);
        }

        // 필수 컬럼 체크
        const requiredColumns = ['server_ip', 'port'];
        const firstRow = rows[0];
        const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
        
        if (missingColumns.length > 0) {
          console.error();
          console.error('==================================== CSV 파일 형식이 올바르지 않습니다! ========================================');
          console.error(`파일 경로: ${CSV_PATH}`);
          console.error(`누락된 필수 컬럼: ${missingColumns.join(', ')}`);
          console.error();
          console.error('필수 컬럼: server_ip, port');
          console.error('선택 컬럼: hostname, usage_type, env_type, corp, proc, role_type');
          console.error();
          console.error('CSV 파일의 헤더를 확인해 주세요.');
          console.error('==================================================================================================================');
          process.exit(1);
        }

        const MAX_ROW_COUNT = 500;
        if (rows.length > MAX_ROW_COUNT) {
          console.error();
          console.error(`===================== CSV 파일의 데이터 row수가 비정상적으로 많습니다.(${MAX_ROW_COUNT}개 이상) =========================`);
          console.error('CSV 파일의 데이터를 확인해 주세요.');
          console.error('=============================================================================================================');
          process.exit(1);
        }

        console.log(`총 ${rows.length}개의 서버 정보를 읽었습니다.`);

        try {
          const result = await axios.post(API_URL+'/master', {check_method: 'TELNET', pc_ip: LOCAL_PC_IP}, { timeout: 3000 });
          const check_unit_id = result.data.insertId ? result.data.insertId : 0;

          for (const row of rows) {

            if(!REGEX_IP_PATTERN.test(row.server_ip)) {
              console.log(`[${row.server_ip}] is not valid ip format`);
            }
            else if(!REGEX_PORT_PATTERN.test(row.port)) {
              console.log(`[${row.port}] is not valid port format`);
            }
            else {
              await unitWorkByServer(row, check_unit_id);
            }
            
          }
          console.log('모든 서버 Telnet 체크 및 결과 전송 완료');
        } catch (apiError) {
          console.error();
          console.error('==================================== API 서버 연결 오류! ========================================');
          console.error(`API URL: ${API_URL}`);
          console.error(`오류 내용: ${apiError.message}`);
          console.error();
          console.error('다음을 확인해 주세요:');
          console.error('1. API 서버가 실행 중인지 확인');
          console.error('2. .env 파일의 API_URL 설정이 올바른지 확인');
          console.error('3. 네트워크 연결 상태 확인');
          console.error('==================================================================================================================');
          process.exit(1);
        }
      });
  } catch (error) {
    console.error();
    console.error('==================================== 예상치 못한 오류가 발생했습니다! ========================================');
    console.error(`오류 내용: ${error.message}`);
    console.error('==================================================================================================================');
    process.exit(1);
  }
}

main(); 