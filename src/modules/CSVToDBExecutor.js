const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const DatabaseFactory = require('./database/DatabaseFactory');

// pkg 실행 파일 경로 처리
const APP_ROOT = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '../..');

// 언어 설정 (명령줄 인수에서 가져오기)
const args = process.argv.slice(2);
const langArg = args.find(arg => arg.startsWith('--lang='));
const LANGUAGE = langArg ? langArg.split('=')[1] : 'en';

// 다국어 메시지
const messages = {
  en: {
    readingMapCsv: 'Reading mapping CSV:',
    invalidMapCsv: 'Invalid CSV format. Required columns: DB_NAME, TABLE_NAME, CSV_FILEPATH',
    foundMappings: 'Found mappings:',
    notFound: 'CSV file not found:',
    emptyData: 'CSV file is empty:',
    selectedDb: 'Selected database:',
    dbType: 'DB type:',
    server: 'Server:',
    database: 'Database:',
    account: 'Account:',
    processing: 'Processing',
    rows: 'rows',
    table: 'Table:',
    file: 'File:',
    inserted: 'Inserted rows:',
    completedAll: 'All CSV-to-DB tasks completed.',
    totalMappings: 'Total mappings processed:',
    successCount: 'Successful:',
    errorCount: 'Failed:',
    insertingRow: 'Inserting row',
    error: 'Error:',
    noDatabasesConfigured: 'No databases configured. Please add database configurations to config/dbinfo.json'
  },
  kr: {
    readingMapCsv: '매핑 CSV 읽는 중:',
    invalidMapCsv: 'CSV 형식이 잘못되었습니다. 필수 컬럼: DB_NAME, TABLE_NAME, CSV_FILEPATH',
    foundMappings: '매핑 개수:',
    notFound: 'CSV 파일을 찾을 수 없습니다:',
    emptyData: 'CSV 파일이 비어있습니다:',
    selectedDb: '선택된 데이터베이스:',
    dbType: 'DB 유형:',
    server: '서버:',
    database: '데이터베이스:',
    account: '계정:',
    processing: '처리 중',
    rows: '행',
    table: '테이블:',
    file: '파일:',
    inserted: '삽입된 행 수:',
    completedAll: '모든 CSV-to-DB 작업이 완료되었습니다.',
    totalMappings: '처리된 총 매핑 수:',
    successCount: '성공:',
    errorCount: '실패:',
    insertingRow: '행 삽입 중',
    error: '오류:',
    noDatabasesConfigured: 'DB가 설정되지 않았습니다. config/dbinfo.json에 DB 설정을 추가하세요'
  }
};

const msg = messages[LANGUAGE] || messages.en;

class CSVToDBExecutor {
  constructor(configManager, readlineInterface = null) {
    this.configManager = configManager;
    this.msg = msg;
    this.rl = readlineInterface || require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // Quote SQL identifiers for MSSQL, handling schema-qualified names and escaping closing brackets
  quoteIdentifier(name) {
    if (!name) return '';
    return name
      .split('.')
      .map(part => `[${String(part).replace(/]/g, ']]')}]`)
      .join('.');
  }

  // Create valid column list, quoted identifiers, safe parameter keys, and preserve original header keys
  sanitizeColumns(columns) {
    const valid = [];
    const quoted = [];
    const paramKeys = [];
    const rawOriginals = [];

    let idx = 0;
    for (const raw of columns) {
      const col = (raw || '').trim();
      if (!col) continue; // skip empty header

      // param key: start with letter, only [A-Za-z0-9_]
      let key = col.replace(/[^A-Za-z0-9_]/g, '_');
      if (!/^[A-Za-z_]/.test(key)) key = `p_${key}`;
      // ensure uniqueness
      let uniqueKey = key;
      while (paramKeys.includes(uniqueKey)) {
        uniqueKey = `${key}_${idx++}`;
      }

      valid.push(col);
      quoted.push(this.quoteIdentifier(col));
      paramKeys.push(uniqueKey);
      rawOriginals.push(raw);
    }

    return { valid, quoted, paramKeys, rawOriginals };
  }

  // Coerce CSV string values to appropriate JS types for DB binding
  coerceValue(val, columnName = '') {
    if (val === undefined || val === null) return null;
    if (typeof val !== 'string') return val;
    const s = val.trim();
    if (s === '' || s.toUpperCase() === 'NULL') return null;
    // boolean
    if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
    // integer
    if (/^[+-]?\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isSafeInteger(n)) return n;
    }
    // float
    if (/^[+-]?\d*\.\d+$/.test(s)) {
      const f = Number(s);
      if (!Number.isNaN(f)) return f;
    }
    // date: try parse common formats
    const dateLike = /^(\d{4}-\d{2}-\d{2})([ T]\d{2}:\d{2}(:\d{2})?)?/.test(s)
      || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /i.test(s)
      || /GMT[+-]\d{4}/i.test(s)
      || /^\d{13}$/.test(s)
      || /^(\d{4}[\/-]\d{2}[\/-]\d{2})([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(s);
    const nameSuggestsDate = /(^|_)(date|time|datetime|timestamp|createdat|updatedat|created_at|updated_at)$/i.test(String(columnName || ''));
    if (dateLike || nameSuggestsDate) {
      // epoch millis
      if (/^\d{13}$/.test(s)) {
        const d = new Date(Number(s));
        if (!isNaN(d.getTime())) return d;
      }
      // strip trailing parenthetical timezone names e.g. (대한민국 표준시)
      let normalized = s.replace(/\s*\([^)]*\)\s*$/, '');
      // trim
      normalized = normalized.trim();
      // Replace space 'T' variants consistently
      // Attempt parse
      let d = new Date(normalized);
      if (!isNaN(d.getTime())) return d;
      // Fallback: replace '-' with '/' for Safari-like parsing edge cases
      d = new Date(normalized.replace(/-/g, '/'));
      if (!isNaN(d.getTime())) return d;
    }
    return val;
  }

  formatDate(date, format) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    let result = format;
    result = result.replace(/yyyy/g, year.toString());
    result = result.replace(/YYYY/g, year.toString());
    result = result.replace(/yy/g, year.toString().slice(-2));
    result = result.replace(/YY/g, year.toString().slice(-2));
    result = result.replace(/MM/g, month.toString().padStart(2, '0')); 
    result = result.replace(/M/g, month.toString());
    result = result.replace(/dd/g, day.toString().padStart(2, '0'));
    result = result.replace(/DD/g, day.toString().padStart(2, '0'));
    result = result.replace(/d/g, day.toString());
    result = result.replace(/D/g, day.toString());
    result = result.replace(/HH/g, hours.toString().padStart(2, '0'));
    result = result.replace(/H/g, hours.toString());
    result = result.replace(/mm/g, minutes.toString().padStart(2, '0'));
    result = result.replace(/m/g, minutes.toString());
    result = result.replace(/ss/g, seconds.toString().padStart(2, '0'));
    result = result.replace(/s/g, seconds.toString());
    result = result.replace(/SSS/g, milliseconds.toString().padStart(3, '0'));
    return result;
  }

  substituteDateVariables(filepath) {
    const now = new Date();
    const datePattern = /\$\{DATE:([^}]+)\}/g;
    let result = filepath;
    let match;
    while ((match = datePattern.exec(filepath)) !== null) {
      const fullMatch = match[0];
      const format = match[1];
      try {
        const formattedDate = this.formatDate(now, format);
        result = result.replace(fullMatch, formattedDate);
      } catch (error) {
        // ignore
      }
    }
    return result;
  }

  async readMappings(csvPath) {
    return new Promise((resolve, reject) => {
      const mappings = [];
      fs.createReadStream(csvPath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => {
          const keys = Object.keys(row);
          const dbKey = keys.find(k => k.trim().toUpperCase() === 'DB_NAME');
          const tableKey = keys.find(k => k.trim().toUpperCase() === 'TABLE_NAME');
          const fileKey = keys.find(k => k.trim().toUpperCase() === 'CSV_FILEPATH');
          if (dbKey && tableKey && fileKey) {
            const dbName = (row[dbKey] || '').trim();
            const tableName = (row[tableKey] || '').trim();
            const filePathRaw = (row[fileKey] || '').trim();
            if (dbName && tableName && filePathRaw) {
              const processedPath = this.substituteDateVariables(filePathRaw);
              mappings.push({ dbName, tableName, csvPath: processedPath, originalPath: filePathRaw });
            }
          }
        })
        .on('end', () => resolve(mappings))
        .on('error', reject);
    });
  }

  async readDataCsv(dataCsvPath) {
    return new Promise((resolve, reject) => {
      const rows = [];
      fs.createReadStream(dataCsvPath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  buildInsertQuery(tableName, quotedColumns, paramKeys) {
    const target = this.quoteIdentifier(tableName);
    const colList = quotedColumns.join(', ');
    const placeholders = paramKeys.map(k => `@${k}`).join(', ');
    return `INSERT INTO ${target} (${colList}) VALUES (${placeholders})`;
  }

  buildParams(columns, row, paramKeys = null, rawOriginals = null) {
    const params = {};
    // Maintain insertion order same as columns, map to safe param keys if provided
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const key = Array.isArray(paramKeys) && paramKeys[i] ? paramKeys[i] : col;
      // Use original header key to access row value if provided, fallback to sanitized name
      const rawKey = Array.isArray(rawOriginals) && rawOriginals[i] ? rawOriginals[i] : col;
      params[key] = this.coerceValue(row[rawKey], col);
    }
    return params;
  }

  async run(mappingCsvPath) {
    console.log(`\n📄 ${this.msg.readingMapCsv} ${mappingCsvPath}`);

    if (!fs.existsSync(mappingCsvPath)) {
      throw new Error(`${this.msg.notFound} ${mappingCsvPath}`);
    }

    const mappings = await this.readMappings(mappingCsvPath);
    if (mappings.length === 0) {
      throw new Error(this.msg.invalidMapCsv);
    }

    console.log(`✅ ${this.msg.foundMappings} ${mappings.length}`);

    const availableDbs = this.configManager.getAvailableDbs();
    if (availableDbs.length === 0) {
      throw new Error(this.msg.noDatabasesConfigured);
    }

    // Group mappings by DB to reuse connections
    const byDb = new Map();
    for (const m of mappings) {
      if (!byDb.has(m.dbName)) byDb.set(m.dbName, []);
      byDb.get(m.dbName).push(m);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [dbName, items] of byDb.entries()) {
      const dbConfig = this.configManager.getDbConfig(dbName);
      if (!dbConfig) {
        console.error(`❌ ${this.msg.error} Unknown DB: ${dbName}`);
        errorCount += items.length;
        continue;
      }
      const dbType = this.configManager.getDbType(dbName);
      console.log(`\n🗄️  ${this.msg.selectedDb} ${dbName}`);
      console.log(`   ${this.msg.dbType} ${dbType}`);
      console.log(`   ${this.msg.server} ${dbConfig.server}:${dbConfig.port}`);
      console.log(`   ${this.msg.database} ${dbConfig.database}`);
      console.log(`   ${this.msg.account} ${dbConfig.user}`);

      const connection = DatabaseFactory.createConnection(dbType, dbConfig);
      await connection.connect();
      try {
        for (const item of items) {
          const dataCsv = item.csvPath;
          const displayFile = item.originalPath !== item.csvPath ? `${item.originalPath} -> ${item.csvPath}` : item.csvPath;
          console.log(`\n📦 ${this.msg.processing} (${this.msg.table} ${item.tableName})`);
          console.log(`   ${this.msg.file} ${displayFile}`);

          if (!fs.existsSync(dataCsv)) {
            console.error(`  ❌ ${this.msg.notFound} ${dataCsv}`);
            errorCount++;
            continue;
          }

          const rows = await this.readDataCsv(dataCsv);
          if (rows.length === 0) {
            console.warn(`  ⚠️  ${this.msg.emptyData} ${dataCsv}`);
            continue;
          }

          const columnsRaw = Object.keys(rows[0]);
          let { valid: columns, quoted, paramKeys, rawOriginals } = this.sanitizeColumns(columnsRaw);
          if (columns.length === 0) {
            console.error(`  ❌ ${this.msg.error} No valid columns found in CSV header.`);
            errorCount++;
            continue;
          }

          // MSSQL: exclude identity and computed columns to avoid explicit insert into restricted columns
          try {
            if (dbType && dbType.toLowerCase() === 'mssql') {
              // Identity columns
              const hasIdentityFn = typeof connection.getIdentityColumns === 'function';
              const hasComputedFn = typeof connection.getComputedColumns === 'function';
              let identityCols = [];
              let computedCols = [];
              if (hasIdentityFn) {
                identityCols = await connection.getIdentityColumns(item.tableName);
                if (!identityCols || identityCols.length === 0) {
                  console.log(`  (identity) detected: none`);
                } else {
                  console.log(`  (identity) detected: ${identityCols.join(', ')}`);
                }
              }
              if (Array.isArray(identityCols) && identityCols.length > 0) {
                const identitySet = new Set(identityCols.map(c => c.toLowerCase()));
                const keptIndexes = [];
                for (let i = 0; i < columns.length; i++) {
                  if (!identitySet.has(String(columns[i]).toLowerCase())) keptIndexes.push(i);
                }
                if (keptIndexes.length !== columns.length) {
                  columns = keptIndexes.map(i => columns[i]);
                  quoted = keptIndexes.map(i => quoted[i]);
                  paramKeys = keptIndexes.map(i => paramKeys[i]);
                  rawOriginals = keptIndexes.map(i => rawOriginals[i]);
                }
                if (columns.length === 0) {
                  console.error(`  ❌ ${this.msg.error} All columns are identity; nothing to insert.`);
                  errorCount++;
                  continue;
                }
              }
              // Computed columns
              if (hasComputedFn) {
                computedCols = await connection.getComputedColumns(item.tableName);
                if (!computedCols || computedCols.length === 0) {
                  console.log(`  (computed) detected: none`);
                } else {
                  console.log(`  (computed) detected: ${computedCols.join(', ')}`);
                }
                if (Array.isArray(computedCols) && computedCols.length > 0) {
                  const computedSet = new Set(computedCols.map(c => c.toLowerCase()));
                  const keptIndexes2 = [];
                  for (let i = 0; i < columns.length; i++) {
                    if (!computedSet.has(String(columns[i]).toLowerCase())) keptIndexes2.push(i);
                  }
                  if (keptIndexes2.length !== columns.length) {
                    columns = keptIndexes2.map(i => columns[i]);
                    quoted = keptIndexes2.map(i => quoted[i]);
                    paramKeys = keptIndexes2.map(i => paramKeys[i]);
                    rawOriginals = keptIndexes2.map(i => rawOriginals[i]);
                  }
                  if (columns.length === 0) {
                    console.error(`  ❌ ${this.msg.error} All columns are computed; nothing to insert.`);
                    errorCount++;
                    continue;
                  }
                }
              }
            }
          } catch (e) {
            console.warn(`  ⚠️  Identity check failed: ${e.message}`);
          }
          const insertSql = this.buildInsertQuery(item.tableName, quoted, paramKeys);
          console.log(`  SQL: ${insertSql}`);

          let inserted = 0;
          let mappingHadError = false;
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const params = this.buildParams(columns, row, paramKeys, rawOriginals);
            if (i === 0) {
              try { console.log(`  Params(sample): ${JSON.stringify(params).slice(0, 500)}`); } catch {}
            }
            try {
              await connection.executeQuery(insertSql, params);
              inserted++;
            } catch (err) {
              mappingHadError = true;
              console.error(`  ❌ ${this.msg.error} ${err.message}`);
            }
          }

          console.log(`  ✅ ${this.msg.inserted} ${inserted}/${rows.length}`);
          if (rows.length > 0 && inserted === rows.length && !mappingHadError) {
            successCount++;
          } else {
            errorCount++;
          }
        }
      } finally {
        await connection.disconnect();
      }
    }

    console.log(`\n🎉 ${this.msg.completedAll}`);
    console.log(`   ${this.msg.totalMappings} ${mappings.length}`);
    console.log(`   ${this.msg.successCount} ${successCount}`);
    console.log(`   ${this.msg.errorCount} ${errorCount}`);
  }
}

module.exports = CSVToDBExecutor;
