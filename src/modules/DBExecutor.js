const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
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
        default: 'default:',
        dbConfigRequired: 'DB configuration is required. Please select a DB in settings management.',
        dbConfigNotFound: 'Selected DB configuration not found:',
        executingSql: '📊 Executing SQL with',
        parameters: 'parameters...',
        completed: '✅ Completed:',
        result: 'Result:',
        rows: 'rows',
        error: '❌ Error:',
        csvFileSaved: '\n📄 CSV file saved:',
        totalParameterSets: 'Total parameter sets:',
        totalResultRows: 'Total result rows:',
        csvSaveFailed: '⚠️  Warning: Failed to save CSV file:',
        executionResultSummary: '\n📈 Execution Result Summary:',
        totalProcessedParams: 'Total processed parameters:',
        executionResult: 'Execution result:',
        elapsedTime: 'Elapsed time:',
        seconds: 'seconds',
        sqlFileRequired: 'SQL file name is required.',
        sqlFileNotExist: 'SQL file does not exist:',
        paramFileNotExist: 'Parameter file does not exist. Need either',
        or: 'or',
        sqlFile: '📄 SQL file:',
        paramFile: '📄 Parameter file',
        specifiedDb: '\n📌 Specified DB in SQL file:',
        sqlQueryContent: '\n🔍 SQL Query Content:',
        noDatabasesConfigured: 'No databases configured. Please add database configurations to config/dbinfo.json',
        usingSpecifiedDb: '✅ Using specified database:',
        warningDbNotFound: '⚠️  Warning: Specified database',
        dbNotFoundInConfig: 'not found in config.',
        availableDbs: 'Available databases:',
        dbNotFoundError: 'Database',
        dbNotFoundErrorEnd: 'not found in config/dbinfo.json',
        availableDbsPrompt: '\n🗄️  Available Databases:',
        selectDbPrompt: 'Select database to use',
        invalidDbSelection: 'Invalid database selection',
        dbInUse: '\n🗄️  Database in use:',
        dbType: 'DB type:',
        server: 'Server:',
        database: 'Database:',
        account: 'Account:',
        jsonMustBeObject: 'JSON file must contain an object or an array of objects.',
        paramFileEmpty: 'Parameter file is empty:',
        paramData: '\n📋 Parameter Data',
        entries: 'entries',
        allTasksComplete: '\n🎉 All tasks completed successfully!',
        dbInfo: 'Database Information',
        dbName: 'DB Name',
        executionTime: 'Execution Time',
        parametersSet: 'Parameters - Set',
        errorLabel: 'Error',
        resultCount: 'Result Count',
        noResults: 'No results returned'
    },
    kr: {
        default: '기본값:',
        dbConfigRequired: 'DB 설정이 필요합니다. 설정 관리에서 DB를 선택하세요.',
        dbConfigNotFound: '선택한 DB 설정을 찾을 수 없습니다:',
        executingSql: '📊 SQL 실행 중, 파라미터 수:',
        parameters: '개...',
        completed: '✅ 완료:',
        result: '결과:',
        rows: '행',
        error: '❌ 오류:',
        csvFileSaved: '\n📄 CSV 파일 저장됨:',
        totalParameterSets: '총 파라미터 세트 수:',
        totalResultRows: '총 결과 행 수:',
        csvSaveFailed: '⚠️  경고: CSV 파일 저장 실패:',
        executionResultSummary: '\n📈 실행 결과 요약:',
        totalProcessedParams: '처리된 총 파라미터 수:',
        executionResult: '실행 결과:',
        elapsedTime: '소요 시간:',
        seconds: '초',
        sqlFileRequired: 'SQL 파일명이 필요합니다.',
        sqlFileNotExist: 'SQL 파일이 존재하지 않습니다:',
        paramFileNotExist: '파라미터 파일이 존재하지 않습니다.',
        or: '또는',
        sqlFile: '📄 SQL 파일:',
        paramFile: '📄 파라미터 파일',
        specifiedDb: '\n📌 SQL 파일에 지정된 DB:',
        sqlQueryContent: '\n🔍 SQL 쿼리 내용:',
        noDatabasesConfigured: 'DB가 설정되지 않았습니다. config/dbinfo.json에 DB 설정을 추가하세요',
        usingSpecifiedDb: '✅ 지정된 데이터베이스 사용:',
        warningDbNotFound: '⚠️  경고: 지정된 데이터베이스',
        dbNotFoundInConfig: '를 config에서 찾을 수 없습니다.',
        availableDbs: '사용 가능한 데이터베이스:',
        dbNotFoundError: '데이터베이스',
        dbNotFoundErrorEnd: '를 config/dbinfo.json에서 찾을 수 없습니다',
        availableDbsPrompt: '\n🗄️  사용 가능한 데이터베이스:',
        selectDbPrompt: '사용할 데이터베이스 선택',
        invalidDbSelection: '잘못된 데이터베이스 선택',
        dbInUse: '\n🗄️  사용 중인 데이터베이스:',
        dbType: 'DB 유형:',
        server: '서버:',
        database: '데이터베이스:',
        account: '계정:',
        jsonMustBeObject: 'JSON 파일은 객체 또는 객체 배열을 포함해야 합니다.',
        paramFileEmpty: '파라미터 파일이 비어있습니다:',
        paramData: '\n📋 파라미터 데이터',
        entries: '개',
        allTasksComplete: '\n🎉 모든 작업이 성공적으로 완료되었습니다!',
        dbInfo: '데이터베이스 정보',
        dbName: 'DB 이름',
        executionTime: '실행 시각',
        parametersSet: '파라미터 - 세트',
        errorLabel: '오류',
        resultCount: '결과 수',
        noResults: '결과 없음'
    }
};

const msg = messages[LANGUAGE] || messages.en;

class DBExecutor {
  constructor(configManager, readlineInterface = null) {
    this.configManager = configManager;
    this.msg = msg;
    
    // Set sqlFilesDir based on environment (pkg or development)
    this.sqlFilesDir = path.join(APP_ROOT, 'request_resources', 'sql_files');
    
    this.rl = readlineInterface || require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (${this.msg.default} ${defaultValue}): ` : `${question} `;
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
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

  async validateEnvironment() {
    // Local logging functionality is now optional and uses config/dbinfo.json
    // No environment variable validation needed
  }

  async createConnections(selectedDbName = null) {
    await this.validateEnvironment();

    // All DB connections now use config/dbinfo.json
    if (!selectedDbName) {
      throw new Error(this.msg.dbConfigRequired);
    }

    const dbConfig = this.configManager.getDbConfig(selectedDbName);
    if (!dbConfig) {
      throw new Error(`${this.msg.dbConfigNotFound} ${selectedDbName}`);
    }
    
    const dbType = this.configManager.getDbType(selectedDbName);
    const remoteConnection = DatabaseFactory.createConnection(dbType, dbConfig);
    await remoteConnection.connect();

    return { remoteConnection };
  }

  async executeSql(remoteConnection, sqlName, query, rows, selectedDbName, dbConfig, dbType) {
    const pcIp = this.getLocalIp();
    const startTime = Date.now();
    let totalCount = 0;
    let errorMsg = '';
    let resultCode = 'Success';
    let sqlId = null;
    let groupedResults = []; // Array to store results grouped by parameters

    // Logging functionality removed - all DB operations now use config/dbinfo.json

    // Create log directory (pkg compatible)
    const now = new Date();
    const yyyymmdd = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0');
    
    const logDir = path.join(APP_ROOT, 'log', yyyymmdd);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create results directory (pkg compatible)
    const resultsDir = path.join(APP_ROOT, 'results', 'sql_files');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    console.log(`\n${this.msg.executingSql} ${rows.length} ${this.msg.parameters}`);
    console.log('-'.repeat(50));

    // Execute SQL for each row
    for (const row of rows) {
      try {
        const result = await remoteConnection.executeQuery(query, row);
        totalCount += result.rowCount;

        // Store results grouped by parameters
        groupedResults.push({
          parameters: row,
          results: result.rows || [],
          rowCount: result.rowCount
        });

        // Save result to log file
        const timestampNow = new Date();
        const timestamp = timestampNow.getFullYear() + 
                         String(timestampNow.getMonth() + 1).padStart(2, '0') + 
                         String(timestampNow.getDate()).padStart(2, '0') + 
                         String(timestampNow.getHours()).padStart(2, '0') + 
                         String(timestampNow.getMinutes()).padStart(2, '0') + 
                         String(timestampNow.getSeconds()).padStart(2, '0');
        const logFile = path.join(logDir, `${sqlName}_${timestamp}.log`);
        fs.appendFileSync(logFile, JSON.stringify({ row, result: result.rows }, null, 2) + '\n');
        
        console.log(`${this.msg.completed} ${JSON.stringify(row)} (${this.msg.result} ${result.rowCount} ${this.msg.rows})`);

      } catch (err) {
        errorMsg += err.message + '\n';
        resultCode = 'Failed';
        console.error(`${this.msg.error} ${JSON.stringify(row)} - ${err.message}`);
        
        // Store error result
        groupedResults.push({
          parameters: row,
          results: [],
          rowCount: 0,
          error: err.message
        });
      }
    }

    // Execution end time and processing duration
    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // Save results to CSV file
    if (groupedResults.length > 0) {
      try {
        const timestampNow = new Date();
        const timestamp = timestampNow.getFullYear() + 
                         String(timestampNow.getMonth() + 1).padStart(2, '0') + 
                         String(timestampNow.getDate()).padStart(2, '0') + '_' +
                         String(timestampNow.getHours()).padStart(2, '0') + 
                         String(timestampNow.getMinutes()).padStart(2, '0') + 
                         String(timestampNow.getSeconds()).padStart(2, '0');
        const csvFile = path.join(resultsDir, `${sqlName}_${selectedDbName}_${timestamp}.csv`);
        
        let csvContent = '';
        
        // Add database information header
        csvContent += `Database Information\n`;
        csvContent += `DB Name,${selectedDbName}\n`;
        csvContent += `DB Type,${dbType}\n`;
        csvContent += `Server,${dbConfig.server}:${dbConfig.port}\n`;
        csvContent += `Database,${dbConfig.database}\n`;
        csvContent += `Execution Time,${new Date().toISOString()}\n`;
        csvContent += `\n`;
        
        // Process each parameter group
        groupedResults.forEach((group, groupIndex) => {
          // Add parameter section header
          csvContent += `Parameters - Set ${groupIndex + 1}\n`;
          
          // Add parameter details
          const paramKeys = Object.keys(group.parameters);
          paramKeys.forEach(key => {
            csvContent += `${key},${group.parameters[key]}\n`;
          });
          
          // Check if there's an error
          if (group.error) {
            csvContent += `Error,${group.error}\n`;
            csvContent += `\n`;
            return;
          }
          
          // Add result count
          csvContent += `Result Count,${group.rowCount}\n`;
          csvContent += `\n`;
          
          // Add results if any
          if (group.results.length > 0) {
            // Get all column names from results
            const resultColumns = [...new Set(group.results.flatMap(obj => Object.keys(obj)))];
            
            // Create CSV header for results
            csvContent += resultColumns.join(',') + '\n';
            
            // Create CSV rows for results
            group.results.forEach(resultRow => {
              const rowData = resultColumns.map(col => {
                const value = resultRow[col];
                // Handle null/undefined
                if (value === null || value === undefined) return '';
                // Escape commas and quotes in values
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                  return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
              }).join(',');
              csvContent += rowData + '\n';
            });
          } else {
            csvContent += `No results returned\n`;
          }
          
          // Add separator between groups
          csvContent += `\n`;
          csvContent += `${'='.repeat(50)}\n`;
          csvContent += `\n`;
        });
        
        // Write CSV file
        fs.writeFileSync(csvFile, csvContent, 'utf-8');
        console.log(`${this.msg.csvFileSaved} ${csvFile}`);
        console.log(`   ${this.msg.totalParameterSets} ${groupedResults.length}`);
        console.log(`   ${this.msg.totalResultRows} ${totalCount}`);
      } catch (csvError) {
        console.error(`${this.msg.csvSaveFailed} ${csvError.message}`);
      }
    }

    // Logging functionality removed - results are shown in console and log files

    console.log(this.msg.executionResultSummary);
    console.log(`  ${this.msg.totalProcessedParams} ${rows.length}`);
    console.log(`  ${this.msg.totalResultRows} ${totalCount}`);
    console.log(`  ${this.msg.executionResult} ${resultCode}`);
    console.log(`  ${this.msg.elapsedTime} ${elapsed} ${this.msg.seconds}`);

    return { totalCount, resultCode, elapsed };
  }

  async run(sqlName) {
    if (!sqlName) {
      throw new Error(this.msg.sqlFileRequired);
    }

    const sqlFilePath = path.join(this.sqlFilesDir, `${sqlName}.sql`);
    const csvFilePath = path.join(this.sqlFilesDir, `${sqlName}.csv`);
    const jsonFilePath = path.join(this.sqlFilesDir, `${sqlName}.json`);

    // Check file existence
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`${this.msg.sqlFileNotExist} ${sqlFilePath}`);
    }
    
    // Check if either CSV or JSON file exists
    const hasCsv = fs.existsSync(csvFilePath);
    const hasJson = fs.existsSync(jsonFilePath);
    
    if (!hasCsv && !hasJson) {
      throw new Error(`${this.msg.paramFileNotExist} ${csvFilePath} ${this.msg.or} ${jsonFilePath}`);
    }
    
    // Determine which parameter file to use (prefer JSON if both exist)
    const paramFilePath = hasJson ? jsonFilePath : csvFilePath;
    const paramFileType = hasJson ? 'JSON' : 'CSV';

    console.log(`\n${this.msg.sqlFile} ${sqlFilePath}`);
    console.log(`${this.msg.paramFile} (${paramFileType}): ${paramFilePath}`);

    // Read SQL file
    const rawQuery = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // Extract DB name from SQL file directive and remove directive lines
    let specifiedDbName = null;
    const lines = rawQuery.split('\n');
    const cleanedLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Check for #DB dbname or #DATABASE dbname format (preprocessor directive style)
      const dbMatch = trimmedLine.match(/^#(?:DB|DATABASE)\s+(\w+)/i);
      if (dbMatch) {
        specifiedDbName = dbMatch[1];
        console.log(`\n📌 Specified DB in SQL file: ${specifiedDbName}`);
        // Skip this line (don't add to cleanedLines)
      } else {
        cleanedLines.push(line);
      }
    }
    
    // Cleaned query without directive lines
    const query = cleanedLines.join('\n');
    
    console.log(`\n🔍 SQL Query Content:`);
    console.log('-'.repeat(30));
    console.log(query);
    console.log('-'.repeat(30));

    // Get available databases
    const availableDbs = this.configManager.getAvailableDbs();
    if (availableDbs.length === 0) {
      throw new Error('No databases configured. Please add database configurations to config/dbinfo.json');
    }

    let selectedDbName;

    // Check if specified DB exists in config
    if (specifiedDbName) {
      if (availableDbs.includes(specifiedDbName)) {
        selectedDbName = specifiedDbName;
        console.log(`✅ Using specified database: ${selectedDbName}`);
      } else {
        console.log(`⚠️  Warning: Specified database '${specifiedDbName}' not found in config.`);
        console.log('Available databases:');
        availableDbs.forEach((dbName) => {
          console.log(`  - ${dbName}`);
        });
        throw new Error(`Database '${specifiedDbName}' not found in config/dbinfo.json`);
      }
    } else {
      // No DB specified in SQL file, prompt user to select
      console.log('\n🗄️  Available Databases:');
      availableDbs.forEach((dbName, index) => {
        const dbInfo = this.configManager.getDbConfig(dbName);
        const dbType = this.configManager.getDbType(dbName);
        console.log(`  ${index + 1}. ${dbName} (${dbType}) - ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}`);
      });

      const dbChoice = await this.askQuestion(
        `Select database to use (1-${availableDbs.length}): `
      );
      
      const selectedDbIndex = parseInt(dbChoice) - 1;
      if (selectedDbIndex < 0 || selectedDbIndex >= availableDbs.length) {
        throw new Error('Invalid database selection');
      }
      
      selectedDbName = availableDbs[selectedDbIndex];
    }
    const { remoteConnection } = await this.createConnections(selectedDbName);
    
    const dbConfig = this.configManager.getDbConfig(selectedDbName);
    const dbType = this.configManager.getDbType(selectedDbName);
    console.log(`\n🗄️  Database in use: ${selectedDbName}`);
    console.log(`   DB type: ${dbType || 'MSSQL'}`);
    console.log(`   Server: ${dbConfig.server}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   Account: ${dbConfig.user}`);

    try {
      // Parse parameter file (CSV or JSON)
      let rows = [];
      
      if (paramFileType === 'JSON') {
        // Parse JSON file
        const jsonContent = fs.readFileSync(paramFilePath, 'utf-8');
        const jsonData = JSON.parse(jsonContent);
        
        // Support both single object and array of objects
        if (Array.isArray(jsonData)) {
          rows = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
          rows = [jsonData];
        } else {
          throw new Error('JSON file must contain an object or an array of objects.');
        }
      } else {
        // Parse CSV file (UTF-8 only)
        await new Promise((resolve, reject) => {
          fs.createReadStream(paramFilePath, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (row) => {
              rows.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
        });
      }

      if (rows.length === 0) {
        throw new Error(`Parameter file is empty: ${paramFilePath}`);
      }

      console.log(`\n📋 Parameter Data (${rows.length} entries):`);
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row)}`);
      });

      // Execute SQL
      const result = await this.executeSql(remoteConnection, sqlName, query, rows, selectedDbName, dbConfig, dbType);
      
      console.log('\n🎉 All tasks completed successfully!');
      
    } finally {
      // Close connections
      if (remoteConnection) {
        await remoteConnection.disconnect();
      }
    }
  }
}

module.exports = DBExecutor;
