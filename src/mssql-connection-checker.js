const fs = require('fs');
const csv = require('csv-parser');
const mssql = require('mssql');
const axios = require('axios');
const os = require('os');
const path = require('path');

// 인자 파싱 (간단 버전)
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1];
      result[key] = value;
      i++;
    }
  }
  return result;
}

const args = parseArgs();
const CSV_PATH = args.csv || path.join(__dirname, '../sample/DB목록샘플.csv');
const DB_USER = args.user;
const DB_PASSWORD = args.password;
const API_URL = args['api-url'] || process.env.API_URL || 'http://localhost:4000/api/check-server-log';

if (!CSV_PATH || !DB_USER || !DB_PASSWORD) {
  console.error('사용법: node src/mssql-connection-checker.js --csv <csv경로> --user <db계정> --password <db패스워드> [--api-url <API주소>]');
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
    options: { encrypt: true, trustServerCertificate: true }
  };
  const start = Date.now();
  try {
    const pool = await mssql.connect(config);
    await pool.close();
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    return { success: true, elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    return { success: false, error: err.message, elapsed };
  }
}

async function main() {

  const pcIp = getLocalIp();
  const rows = [];

  // CSV 파싱
  fs.createReadStream(CSV_PATH)
    .pipe(csv(['server_ip', 'port', 'dbname']))
    .on('data', (row) => {
      // 공백 제거
      Object.keys(row).forEach(k => row[k] = row[k].trim());
      rows.push(row);
    })
    .on('end', async () => {
      for (const row of rows) {
        console.log(row);
        const server_ip = row.server_ip
        const port = row.port
        const dbname = row.dbname
        const result = await checkMssqlConnection({ ip: server_ip, port: port, dbname: dbname });
        const body = {
          server_ip,
          port,
          dbname,
          pc_ip: pcIp,
          result_count: result.success ? 1 : 0,
          result_code: result.success ? '성공' : '실패',
          result_msg: result.success ? '' : result.error,
          collapsed_time: result.elapsed
        };
        try {
          const res = await axios.post(API_URL, body);
          console.log(`[${row.server_ip},${row.port}][${row.dbname}] 전송 성공:`, res.data);
        } catch (err) {
          console.error(`[${row.server_ip},${row.port}][${row.dbname}] API 전송 실패:`, err.response?.data || err.message);
        }
      }
      console.log('모든 DB 체크 및 결과 전송 완료');
    });
}

main(); 