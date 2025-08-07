const fs = require('fs');
const csv = require('csv-parser');
const mssql = require('mssql');
const mysql = require('mysql2/promise');
const os = require('os');
const path = require('path');
require('dotenv').config();

async function main() {

  // 1. SQL문파일명을 인자로 전달 받음
  const argFileName = process.argv[2];
  if (!argFileName) {
    console.error('에러: SQL 파일명을 인자로 입력하세요. 예) node execute-mssql-sql-query.js SQL_001');
    process.exit(1);
  }

  const sqlFilePath = `templet/${argFileName}.sql`;
  const csvFilePath = `templet/${argFileName}.csv`;

  // 2. 파일 존재 여부 체크
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`에러: SQL 파일이 존재하지 않습니다: ${sqlFilePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(csvFilePath)) {
    console.error(`에러: 파라미터 CSV 파일이 존재하지 않습니다: ${csvFilePath}`);
    process.exit(1);
  }

  // DB 연결
  const localDBPool = await mysql.createConnection({
    host: process.env.LOCALDB_HOST,
    user: process.env.LOCALDB_USER,
    password: process.env.LOCALDB_PASSWORD,
    database: process.env.LOCALDB_DATABASE,
    port: process.env.LOCALDB_PORT
  });

  const remoteDBPool = await mssql.connect({
    user: process.env.REMOTEDB_USER,
    password: process.env.REMOTEDB_PASSWORD,
    server: process.env.REMOTEDB_HOST,
    port: parseInt(process.env.REMOTEDB_PORT, 10),
    database: process.env.REMOTEDB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
  });

  // 3. 파일 읽기 및 처리
  const query = fs.readFileSync(sqlFilePath, 'utf-8');

  // 실행 PC의 IP 주소 추출
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
  const pcIp = getLocalIp();

  // 실행 시작 시간
  const startTime = Date.now();
  let totalCount = 0;
  let errorMsg = '';
  let resultCode = '성공';

  // 로그 테이블에 실행 정보 저장
  const [insertResult] = await localDBPool.execute(
    'INSERT INTO sql_exec_log (sql_name, sql_content, pc_ip) VALUES (?, ?, ?)',
    [argFileName, query, pcIp]
  );
  const sql_id = insertResult.insertId;

  const rows = [];
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      rows.push(row);
    })
    .on('end', async () => {
      
      // 현지 시각으로 로그 디렉토리 생성
      const now = new Date();
      const yyyymmdd = now.getFullYear() + 
                      String(now.getMonth() + 1).padStart(2, '0') + 
                      String(now.getDate()).padStart(2, '0');
      const logDir = path.join('log', yyyymmdd);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      for (const row of rows) {

        try {

          const request = remoteDBPool.request();
          Object.entries(row).forEach(([key, value]) => {
            request.input(key, value);
          });
          
          const result = await request.query(query);
          totalCount += result.recordset.length;

          // 결과를 로그파일에 저장 (현지 시각 사용)
          const timestampNow = new Date();
          const timestamp = timestampNow.getFullYear() + 
                           String(timestampNow.getMonth() + 1).padStart(2, '0') + 
                           String(timestampNow.getDate()).padStart(2, '0') + 
                           String(timestampNow.getHours()).padStart(2, '0') + 
                           String(timestampNow.getMinutes()).padStart(2, '0') + 
                           String(timestampNow.getSeconds()).padStart(2, '0');
          const logFile = path.join(logDir, `${argFileName}_${timestamp}.log`);
          fs.appendFileSync(logFile, JSON.stringify({ row, result: result.recordset }, null, 2) + '\n');
          console.log(`완료: ${JSON.stringify(row)}`);

        } catch (err) {

          errorMsg += err.message + '\n';
          resultCode = '실패';
          console.error('에러:', err);
        }
      }

      // 실행 종료 시간 및 처리 소요시간
      const endTime = Date.now();
      const elapsed = ((endTime - startTime) / 1000).toFixed(2); // 초 단위

      // 결과 요약 업데이트
      await localDBPool.execute(
        'update sql_exec_log set result_count = ?, result_code = ?, result_msg = ?, collapsed_time = ? where sql_id = ?',
        [totalCount, resultCode, errorMsg, elapsed, sql_id]
      );
      console.log('모든 작업 완료');
      await localDBPool.end();
      await remoteDBPool.close();
    });
}

main(); 