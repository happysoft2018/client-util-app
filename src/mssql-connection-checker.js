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

async function checkMssqlConnection({ ip, port, dbname }) {

  const config = {
    user: DB_USER,
    password: DB_PASSWORD,
    server: ip,
    port: parseInt(port, 10),
    database: dbname,
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

  const dbname = row.dbname
  const server_ip = row.server_ip
  const port = row.port
  const title = row.corp +'_'+ row.proc

  const result = await checkMssqlConnection({ dbname: dbname, ip: server_ip, port: port});
  const err_message = result.success ? '' : `[${result.error_code}] ${result.error_msg}`
  console.log(`[${row.server_ip}:${row.port}][${row.env_type}DB][${title}][${row.dbname}] \t→ [${result.success ? '✅ 성공' : '❌ 실패'}] ${err_message}`);

  if(check_unit_id === 0) {
    return;
  } 

  const body = {
    check_unit_id, 
    server_ip,
    port,
    dbname,
    result_code: result.success,
    error_code: result.success ? '' : result.error_code,
    error_msg: result.success ? '' : result.error_msg,
    collapsed_time: result.elapsed
  };

  try {
    await axios.post(API_URL+'/db-dtl', body, { timeout: 3000 }); // 3초 타임아웃
  } catch (err) {
    console.error(`체크결과 기록 API (${API_URL}) 전송 실패`);
  }

}


async function main() {

  const rows = [];

  // CSV 파싱
  fs.createReadStream(CSV_PATH)
    .pipe(csv(['dbname', 'server_ip', 'port', 'corp', 'proc', 'env_type']))
    .on('data', (row) => {
      // 공백 제거
      Object.keys(row).forEach(k => row[k] = row[k].trim());
      rows.push(row);
    })
    .on('end', async () => {

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
    });
}

main(); 