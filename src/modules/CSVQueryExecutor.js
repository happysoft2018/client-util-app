const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
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
    csvFileNotFound: 'CSV file not found:',
    csvFileEmpty: 'CSV file is empty:',
    readingCsv: 'Reading CSV file:',
    foundQueries: 'Found queries:',
    invalidCsvFormat: 'Invalid CSV format. Required columns: SQL, result_filepath',
    selectingDb: 'Selecting database...',
    availableDbs: 'Available Databases:',
    selectDb: 'Select database to use',
    invalidDbSelection: 'Invalid database selection',
    selectedDb: 'Selected database:',
    dbType: 'DB type:',
    server: 'Server:',
    database: 'Database:',
    account: 'Account:',
    executingQuery: 'Executing query',
    of: 'of',
    query: 'Query:',
    savingResults: 'Saving results to:',
    resultsSaved: 'Results saved:',
    rows: 'rows',
    error: 'Error:',
    noResults: 'No results returned',
    completedAll: 'All queries completed successfully!',
    totalProcessed: 'Total queries processed:',
    successCount: 'Successful:',
    errorCount: 'Failed:',
    noDatabasesConfigured: 'No databases configured. Please add database configurations to config/dbinfo.json',
    creatingDirectory: 'Creating directory:',
    dateVariableSubstituted: 'Date variable substituted',
    original: 'Original',
    processed: 'Processed'
  },
  kr: {
    csvFileNotFound: 'CSV 파일을 찾을 수 없습니다:',
    csvFileEmpty: 'CSV 파일이 비어있습니다:',
    readingCsv: 'CSV 파일 읽는 중:',
    foundQueries: '쿼리 개수:',
    invalidCsvFormat: 'CSV 형식이 잘못되었습니다. 필수 컬럼: SQL, result_filepath',
    selectingDb: '데이터베이스 선택 중...',
    availableDbs: '사용 가능한 데이터베이스:',
    selectDb: '사용할 데이터베이스 선택',
    invalidDbSelection: '잘못된 데이터베이스 선택',
    selectedDb: '선택된 데이터베이스:',
    dbType: 'DB 유형:',
    server: '서버:',
    database: '데이터베이스:',
    account: '계정:',
    executingQuery: '쿼리 실행 중',
    of: '/',
    query: '쿼리:',
    savingResults: '결과 저장 중:',
    resultsSaved: '결과 저장 완료:',
    rows: '행',
    error: '오류:',
    noResults: '결과 없음',
    completedAll: '모든 쿼리가 성공적으로 완료되었습니다!',
    totalProcessed: '처리된 총 쿼리 수:',
    successCount: '성공:',
    errorCount: '실패:',
    noDatabasesConfigured: 'DB가 설정되지 않았습니다. config/dbinfo.json에 DB 설정을 추가하세요',
    creatingDirectory: '디렉토리 생성:',
    dateVariableSubstituted: '날짜 변수 치환됨',
    original: '원본',
    processed: '처리됨'
  }
};

const msg = messages[LANGUAGE] || messages.en;

class CSVQueryExecutor {
  constructor(configManager, readlineInterface = null) {
    this.configManager = configManager;
    this.msg = msg;
    
    this.rl = readlineInterface || require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Format date with custom format string (using local time)
   * @param {Date} date - Date object to format
   * @param {string} format - Format string (e.g., 'YYYY-MM-DD HH:mm:ss' or 'yyyy-MM-dd HH:mm:ss')
   * @returns {string} Formatted date string
   */
  formatDate(date, format) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    let result = format;
    
    // Year (both uppercase and lowercase)
    result = result.replace(/yyyy/g, year.toString());
    result = result.replace(/YYYY/g, year.toString());
    result = result.replace(/yy/g, year.toString().slice(-2));
    result = result.replace(/YY/g, year.toString().slice(-2));
    
    // Month (must be replaced before minutes 'mm')
    result = result.replace(/MM/g, month.toString().padStart(2, '0'));
    result = result.replace(/M/g, month.toString());
    
    // Day (both uppercase and lowercase)
    result = result.replace(/dd/g, day.toString().padStart(2, '0'));
    result = result.replace(/DD/g, day.toString().padStart(2, '0'));
    result = result.replace(/d/g, day.toString());
    result = result.replace(/D/g, day.toString());
    
    // Hours
    result = result.replace(/HH/g, hours.toString().padStart(2, '0'));
    result = result.replace(/H/g, hours.toString());
    
    // Minutes
    result = result.replace(/mm/g, minutes.toString().padStart(2, '0'));
    result = result.replace(/m/g, minutes.toString());
    
    // Seconds
    result = result.replace(/ss/g, seconds.toString().padStart(2, '0'));
    result = result.replace(/s/g, seconds.toString());
    
    // Milliseconds
    result = result.replace(/SSS/g, milliseconds.toString().padStart(3, '0'));
    
    return result;
  }

  /**
   * Substitute date/time variables in filepath
   * @param {string} filepath - Filepath with date variables
   * @returns {string} Filepath with substituted date values
   */
  substituteDateVariables(filepath) {
    const now = new Date();
    
    // Pattern: ${DATA:format} or ${DATE:format}
    const datePattern = /\$\{(?:DATA|DATE):([^}]+)\}/g;
    
    let result = filepath;
    let match;
    
    while ((match = datePattern.exec(filepath)) !== null) {
      const fullMatch = match[0];
      const format = match[1];
      
      try {
        const formattedDate = this.formatDate(now, format);
        result = result.replace(fullMatch, formattedDate);
      } catch (error) {
        console.warn(`⚠️  Warning: Failed to format date with format '${format}': ${error.message}`);
        // Keep original variable if formatting fails
      }
    }
    
    return result;
  }

  async askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question} `;
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async readCsvFile(csvPath) {
    return new Promise((resolve, reject) => {
      const queries = [];
      let rowCount = 0;
      
      fs.createReadStream(csvPath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Try to find SQL and result_filepath columns (case-insensitive and trim whitespace)
          const keys = Object.keys(row);
          const sqlKey = keys.find(k => k.trim().toLowerCase() === 'sql');
          const filepathKey = keys.find(k => k.trim().toLowerCase() === 'result_filepath');
          
          if (sqlKey && filepathKey && row[sqlKey] && row[filepathKey]) {
            const sqlValue = row[sqlKey].trim();
            const filepathValue = row[filepathKey].trim();
            
            if (sqlValue && filepathValue) {
              // Substitute date variables in filepath
              const processedFilepath = this.substituteDateVariables(filepathValue);
              
              queries.push({
                sql: sqlValue,
                resultFilepath: processedFilepath,
                originalFilepath: filepathValue
              });
            }
          }
        })
        .on('end', () => {
          console.log(`✅ ${this.msg.foundQueries} ${queries.length}`);
          resolve(queries);
        })
        .on('error', (err) => {
          console.error(`\n❌ CSV parsing error:`, err);
          reject(err);
        });
    });
  }

  async selectDatabase() {
    const availableDbs = this.configManager.getAvailableDbs();
    if (availableDbs.length === 0) {
      throw new Error(this.msg.noDatabasesConfigured);
    }

    console.log(`\n🗄️  ${this.msg.availableDbs}`);
    availableDbs.forEach((dbName, index) => {
      const dbInfo = this.configManager.getDbConfig(dbName);
      const dbType = this.configManager.getDbType(dbName);
      console.log(`  ${index + 1}. ${dbName} (${dbType}) - ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}`);
    });

    const dbChoice = await this.askQuestion(
      `${this.msg.selectDb} (1-${availableDbs.length}): `
    );
    
    const selectedDbIndex = parseInt(dbChoice) - 1;
    if (selectedDbIndex < 0 || selectedDbIndex >= availableDbs.length) {
      throw new Error(this.msg.invalidDbSelection);
    }
    
    return availableDbs[selectedDbIndex];
  }

  async executeQuery(connection, query, resultFilepath, resultsDir) {
    try {
      // Execute query
      const result = await connection.executeQuery(query, {});
      
      // Prepare result file path (absolute or relative to resultsDir)
      let fullResultPath;
      if (path.isAbsolute(resultFilepath)) {
        fullResultPath = resultFilepath;
      } else {
        fullResultPath = path.join(resultsDir, resultFilepath);
      }
      
      // Create directory if it doesn't exist
      const resultDir = path.dirname(fullResultPath);
      if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir, { recursive: true });
        console.log(`  📁 ${this.msg.creatingDirectory} ${resultDir}`);
      }
      
      console.log(`  💾 ${this.msg.savingResults} ${resultFilepath}`);
      
      // Save results to text file
      let content = '';
      
      if (result.rows && result.rows.length > 0) {
        // Get column names
        const columns = Object.keys(result.rows[0]);
        
        // Create CSV-like format
        content += columns.join(',') + '\n';
        
        result.rows.forEach(row => {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          content += values.join(',') + '\n';
        });
        
        fs.writeFileSync(fullResultPath, content, 'utf-8');
        console.log(`  ✅ ${this.msg.resultsSaved} ${resultFilepath} (${result.rowCount} ${this.msg.rows})`);
        
        return { success: true, rowCount: result.rowCount };
      } else {
        content = this.msg.noResults;
        fs.writeFileSync(fullResultPath, content, 'utf-8');
        console.log(`  ⚠️  ${this.msg.noResults}`);
        
        return { success: true, rowCount: 0 };
      }
      
    } catch (error) {
      console.error(`  ❌ ${this.msg.error} ${error.message}`);
      
      // Save error to file
      let fullResultPath;
      if (path.isAbsolute(resultFilepath)) {
        fullResultPath = resultFilepath;
      } else {
        fullResultPath = path.join(resultsDir, resultFilepath);
      }
      
      // Create directory if it doesn't exist (for error files too)
      const resultDir = path.dirname(fullResultPath);
      if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir, { recursive: true });
      }
      
      const errorContent = `${this.msg.error} ${error.message}\n`;
      fs.writeFileSync(fullResultPath, errorContent, 'utf-8');
      
      return { success: false, error: error.message };
    }
  }

  async run(csvPath) {
    console.log(`\n📄 ${this.msg.readingCsv} ${csvPath}`);
    
    // Check if file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`${this.msg.csvFileNotFound} ${csvPath}`);
    }
    
    // Read CSV file
    const queries = await this.readCsvFile(csvPath);
    
    if (queries.length === 0) {
      throw new Error(`${this.msg.csvFileEmpty} ${csvPath}`);
    }
    
    console.log(`✅ ${this.msg.foundQueries} ${queries.length}`);
    
    // Validate CSV format
    if (!queries[0].sql || !queries[0].resultFilepath) {
      throw new Error(this.msg.invalidCsvFormat);
    }
    
    // Select database
    const selectedDbName = await this.selectDatabase();
    
    const dbConfig = this.configManager.getDbConfig(selectedDbName);
    const dbType = this.configManager.getDbType(selectedDbName);
    
    console.log(`\n🗄️  ${this.msg.selectedDb} ${selectedDbName}`);
    console.log(`   ${this.msg.dbType} ${dbType}`);
    console.log(`   ${this.msg.server} ${dbConfig.server}:${dbConfig.port}`);
    console.log(`   ${this.msg.database} ${dbConfig.database}`);
    console.log(`   ${this.msg.account} ${dbConfig.user}`);
    
    // Create database connection
    const connection = DatabaseFactory.createConnection(dbType, dbConfig);
    await connection.connect();
    
    try {
      // Create results directory
      const resultsDir = path.join(APP_ROOT, 'results', 'csv_queries');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      console.log(`\n🚀 Starting query execution...`);
      console.log('='.repeat(50));
      
      let successCount = 0;
      let errorCount = 0;
      
      // Execute each query
      for (let i = 0; i < queries.length; i++) {
        const { sql, resultFilepath, originalFilepath } = queries[i];
        
        console.log(`\n[${i + 1}${this.msg.of}${queries.length}] ${this.msg.executingQuery}`);
        console.log(`  📝 ${this.msg.query} ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
        
        // Show date variable substitution if applicable
        if (originalFilepath && originalFilepath !== resultFilepath) {
          console.log(`  🕐 Original: ${originalFilepath}`);
          console.log(`  📄 Result: ${resultFilepath}`);
        } else {
          console.log(`  📄 File: ${resultFilepath}`);
        }
        
        const result = await this.executeQuery(connection, sql, resultFilepath, resultsDir);
        
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      // Summary
      console.log('\n' + '='.repeat(50));
      console.log(`\n✅ ${this.msg.completedAll}`);
      console.log(`   ${this.msg.totalProcessed} ${queries.length}`);
      console.log(`   ${this.msg.successCount} ${successCount}`);
      console.log(`   ${this.msg.errorCount} ${errorCount}`);
      
    } finally {
      await connection.disconnect();
    }
  }
}

module.exports = CSVQueryExecutor;

