const fs = require('fs');
const csv = require('csv-parser');
const net = require('net');
const mysql = require('mysql2/promise');

// --- DB 설정 ---
const DB_CONFIG = {
  host: 'localhost',
  port: '3306',
  user: 'guest',
  password: '1111',
  database: 'etcdb',
};

// --- 인자에서 CSV 파일명 받기 ---
const csvFile = process.argv[2];
if (!csvFile) {
  console.error('❌ CSV 파일명을 인자로 입력해주세요. 예: node telnet_checker.js servers.csv');
  process.exit(1);
}

// --- DB에 결과 저장 ---
async function insertResult(db, ip, port, isConnected) {
  const query = `
    INSERT INTO telnet_results (server_ip, port, is_connected)
    VALUES (?, ?, ?)
  `;
  await db.execute(query, [ip, port, isConnected]);
}

// --- Telnet (TCP 연결 시도) ---
async function checkPort(ip, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.connect(port, ip);
  });
}

// --- 실행 메인 ---
async function run() {
  const db = await mysql.createConnection(DB_CONFIG);
  const results = [];

  fs.createReadStream(csvFile)
    .pipe(csv())
    .on('data', (row) => {
      results.push(row);
    })
    .on('end', async () => {
      for (const row of results) {
        const ip = row.server_ip;
        const port = parseInt(row.port, 10);

        if (!ip || isNaN(port)) {
          console.warn(`⚠️ 잘못된 데이터: ${JSON.stringify(row)}`);
          continue;
        }

        const isConnected = await checkPort(ip, port);
        console.log(`🔎 ${ip}:${port} → ${isConnected ? '✅ 연결됨' : '❌ 실패'}`);

        await insertResult(db, ip, port, isConnected);
      }

      await db.end();
      console.log('✅ 모든 검사 완료 및 DB 저장됨.');
    });
}

run().catch(console.error);

