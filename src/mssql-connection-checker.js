const fs = require('fs');
const csv = require('csv-parser');
const mssql = require('mssql');
const axios = require('axios');
const os = require('os');
const path = require('path');
require('dotenv').config();

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
const DB_USER = args.u;
const DB_PASSWORD = args.p;
const TIMEOUT_SEC = parseInt(args.t) ? parseInt(args.t) * 1000 : 5000;
const API_URL = process.env.API_URL;
const CHECK_UNIT_ID = Date.now();
const LOCAL_PC_IP = getLocalIp();
const REGEX_IP_PATTERN = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
const REGEX_PORT_PATTERN = /^[0-9]{4}$/


if (!CSV_PATH || !DB_USER || !DB_PASSWORD) {

  console.error();
  console.error('==================================== 파라미터를 정상적으로 지정해 주세요! ========================================');
  console.error('파라미터: -f  [필수] csv파일경로');
  console.error('          -u  [필수] DB계정ID');
  console.error('          -p  [필수] 패스워드');
  console.error('          -t  [선택] 타임아웃(초) (기본값: 5) ');
  console.error();
  console.error('사용법: node src/mssql-connection-checker.js -f {csv파일경로} -u {DB계정ID} -p {패스워드} [ -t {타입아웃(초)}]');
  console.error()
  console.error('   ex)  node src/mssql-connection-checker.js -f c:\\temp\DB목록.csv -u guest -p 1111');
  console.error('        node src/mssql-connection-checker.js -f c:\\temp\DB목록.csv -u guest -p 1111 -t 7 ');
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
  console.error('   Windows: c:\\temp\\DB목록.csv');
  console.error('   Linux/Mac: /home/user/DB목록.csv');
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

async function checkMssqlConnection({ ip, port, db_name }) {

  const config = {
    user: DB_USER,
    password: DB_PASSWORD,
    server: ip,
    port: parseInt(port, 10),
    database: db_name,
    options: { encrypt: true, trustServerCertificate: true },
    connectionTimeout: TIMEOUT_SEC, // 타임아웃
    requestTimeout: TIMEOUT_SEC     // 타임아웃
  };
  
  const start = Date.now();

  try {

    const pool = await mssql.connect(config);
    await pool.close();
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    return { success: true, elapsed };

  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    return { success: false, error_code: err.code, error_msg: err.message, elapsed };
  }
}

async function unitWorkByServer(row, check_unit_id) {

  const db_name = row.db_name
  const server_ip = row.server_ip
  const port = row.port
  const title = row.corp +'_'+ row.proc

  const result = await checkMssqlConnection({ db_name: db_name, ip: server_ip, port: port});
  const err_message = result.success ? '' : `[${result.error_code}] ${result.error_msg}`
  console.log(`[${row.server_ip}:${row.port}][${row.env_type}DB][${title}][${row.db_name}] \t→ [${result.success ? '✅ 성공' : '❌ 실패'}] ${err_message}`);

  if(check_unit_id === 0) {
    return;
  } 

  const body = {
    check_unit_id, 
    server_ip,
    port,
    db_name,
    db_userid: DB_USER,
    result_code: result.success,
    error_code: result.success ? '' : result.error_code,
    error_msg: result.success ? '' : result.error_msg,
    collapsed_time: result.elapsed
  };

  try {
    await axios.post(API_URL+'/db', body, { timeout: 3000 }); // 3초 타임아웃
  } catch (err) {
    console.error(`체크결과 기록 API (${API_URL}/db) 전송 실패`);
  }

}


async function main() {

  const rows = [];

  try {
    // CSV 파싱
    fs.createReadStream(CSV_PATH)
      .pipe(csv(['db_name', 'server_ip', 'port', 'corp', 'proc', 'env_type']))
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
        const requiredColumns = ['db_name', 'server_ip', 'port'];
        const firstRow = rows[0];
        const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
        
        if (missingColumns.length > 0) {
          console.error();
          console.error('==================================== CSV 파일 형식이 올바르지 않습니다! ========================================');
          console.error(`파일 경로: ${CSV_PATH}`);
          console.error(`누락된 필수 컬럼: ${missingColumns.join(', ')}`);
          console.error();
          console.error('필수 컬럼: db_name, server_ip, port');
          console.error('선택 컬럼: corp, proc, env_type');
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
        console.log(`총 ${rows.length}개의 DB 정보를 읽었습니다.`);

        try {
          const result = await axios.post(API_URL+'/master', {check_method: 'DB_CONN', pc_ip: LOCAL_PC_IP}, { timeout: 3000 });
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
          console.log('모든 DB 체크 및 결과 전송 완료');
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