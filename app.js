const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set console encoding to UTF-8 for proper Korean character display
if (process.platform === 'win32') {
  try {
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  } catch (e) {
    // Ignore if not supported
  }
}

// pkg 실행 파일 경로 처리
const APP_ROOT = process.pkg ? path.dirname(process.execPath) : __dirname;

// 언어 설정 (명령줄 인수에서 가져오기)
const args = process.argv.slice(2);
const langArg = args.find(arg => arg.startsWith('--lang='));
const LANGUAGE = langArg ? langArg.split('=')[1] : 'en';

// 다국어 메시지
const messages = {
  en: {
    title: 'Node.js Integrated Utility Tool',
    mainMenuTitle: 'Main Menu',
    menu1: '1. Database Connection and Permission Check',
    menu2: '2. Server Telnet Connection Check',
    menu3: '3. Database SQL Execution',
    menu4: '4. CSV-based Batch Query Execution',
    menu5: '5. Configuration Management',
    menu0: '0. Exit',
    selectPrompt: 'Select function to execute (0-5): ',
    invalidSelection: 'Invalid selection. Please select again.',
    
    // Database Connection Check
    dbCheckTitle: 'Database Connection and Permission Check',
    dbCheckDirNotFound: 'DB check CSV directory not found: request_resources/',
    dbCheckCreateDir: 'Please create the directory and add CSV files.',
    dbCheckNoFiles: 'No DB CSV files found in request_resources/ directory.',
    dbCheckAddFiles: 'Please add .csv files starting with "DB" to the request_resources/ directory.',
    dbCheckAvailableFiles: 'Available DB Check CSV Files:',
    dbCheckSelectFile: 'Select CSV file number to use',
    dbCheckInvalidFile: 'Invalid file selection.',
    dbCheckSelectedFile: 'Selected CSV file:',
    dbCheckAuthNote: 'Note: Authentication information will be read from CSV file (username, password columns)',
    dbCheckTimeoutSettings: 'Timeout Settings:',
    dbCheckTimeout: 'Timeout (seconds)',
    dbCheckStarting: 'Starting database connection check...',
    dbCheckTypeNote: 'Note: Each server in CSV can have different database types (mssql, mysql, postgresql, oracle)',
    dbCheckAuthNote2: 'Note: Authentication credentials will be read from CSV file',
    dbCheckCompleted: 'Database connection check completed.',
    dbCheckError: 'Error occurred during database connection check:',
    
    // Telnet Check
    telnetTitle: 'Server Telnet Connection Check',
    telnetDirNotFound: 'Telnet check CSV directory not found: request_resources/',
    telnetCreateDir: 'Please create the directory and add CSV files.',
    telnetNoFiles: 'No Server CSV files found in request_resources/ directory.',
    telnetAddFiles: 'Please add .csv files starting with "server" to the request_resources/ directory.',
    telnetAvailableFiles: 'Available Telnet Check CSV Files:',
    telnetSelectFile: 'Select CSV file number to use',
    telnetInvalidFile: 'Invalid file selection.',
    telnetSelectedFile: 'Selected CSV file:',
    telnetTimeoutSettings: 'Timeout Settings:',
    telnetTimeout: 'Timeout (seconds)',
    telnetStarting: 'Starting Telnet connection check...',
    telnetCompleted: 'Telnet connection check completed.',
    telnetError: 'Error occurred during Telnet connection check:',
    
    // SQL Execution
    sqlTitle: 'Database SQL Execution',
    sqlDirNotFound: 'SQL files directory not found: request_resources/sql_files/',
    sqlCreateDir: 'Please create the directory and add SQL files.',
    sqlNoFiles: 'No SQL files found in request_resources/sql_files/ directory.',
    sqlAddFiles: 'Please add .sql files to the request_resources/sql_files/ directory.',
    sqlAvailableFiles: 'Available SQL Files:',
    sqlSelectFile: 'Select SQL file number to execute',
    sqlInvalidFile: 'Invalid file selection.',
    sqlSelectedFile: 'Selected SQL file:',
    sqlStarting: 'Starting SQL execution...',
    sqlCompleted: 'SQL execution completed.',
    sqlError: 'Error occurred during SQL execution:',
    
    // CSV Query Execution
    csvQueryTitle: 'CSV-based Batch Query Execution',
    csvQueryDirNotFound: 'CSV query directory not found: request_resources/',
    csvQueryCreateDir: 'Please create the directory and add CSV files.',
    csvQueryNoFiles: 'No CSV query files found in request_resources/ directory.',
    csvQueryAddFiles: 'Please add .csv files starting with "SQL" to the request_resources/ directory.',
    csvQueryAvailableFiles: 'Available CSV Query Files:',
    csvQuerySelectFile: 'Select CSV file number to execute',
    csvQueryInvalidFile: 'Invalid file selection.',
    csvQuerySelectedFile: 'Selected CSV file:',
    csvQueryStarting: 'Starting CSV query execution...',
    csvQueryCompleted: 'CSV query execution completed.',
    csvQueryError: 'Error occurred during CSV query execution:',
    
    // Configuration
    configTitle: 'Configuration Management',
    configMenu1: '1. Check System Information',
    configMenu2: '2. View Available Databases',
    configMenu3: '3. Return to Main Menu',
    configSelect: 'Select (1-3): ',
    configAvailableDbs: 'Available Databases:',
    configNoDbs: 'No databases configured in config/dbinfo.json',
    
    // Common
    exit: 'Exiting program.',
    pressEnter: 'Press Enter to continue...',
    createdResultsDir: 'Created results directory:'
  },
  kr: {
    title: 'Node.js 통합 유틸리티 도구',
    mainMenuTitle: '메인 메뉴',
    menu1: '1. 데이터베이스 접속 및 권한 확인',
    menu2: '2. 서버 텔넷 접속 확인',
    menu3: '3. 데이터베이스 SQL 실행',
    menu4: '4. CSV 기반 일괄 쿼리 실행',
    menu5: '5. 설정 관리',
    menu0: '0. 종료',
    selectPrompt: '실행할 기능을 선택하세요 (0-5): ',
    invalidSelection: '잘못된 선택입니다. 다시 선택해주세요.',
    
    // Database Connection Check
    dbCheckTitle: '데이터베이스 접속 및 권한 확인',
    dbCheckDirNotFound: 'DB 확인용 CSV 디렉토리를 찾을 수 없습니다: request_resources/',
    dbCheckCreateDir: '디렉토리를 생성하고 CSV 파일을 추가해주세요.',
    dbCheckNoFiles: 'request_resources/ 디렉토리에 DB CSV 파일이 없습니다.',
    dbCheckAddFiles: 'request_resources/ 디렉토리에 "DB"로 시작하는 .csv 파일을 추가해주세요.',
    dbCheckAvailableFiles: '사용 가능한 DB 확인 CSV 파일:',
    dbCheckSelectFile: '사용할 CSV 파일 번호를 선택하세요',
    dbCheckInvalidFile: '잘못된 파일 선택입니다.',
    dbCheckSelectedFile: '선택된 CSV 파일:',
    dbCheckAuthNote: '참고: 인증 정보는 CSV 파일에서 읽어옵니다 (username, password 컬럼)',
    dbCheckTimeoutSettings: '타임아웃 설정:',
    dbCheckTimeout: '타임아웃 (초)',
    dbCheckStarting: '데이터베이스 접속 확인을 시작합니다...',
    dbCheckTypeNote: '참고: CSV의 각 서버는 서로 다른 데이터베이스 타입을 가질 수 있습니다 (mssql, mysql, postgresql, oracle)',
    dbCheckAuthNote2: '참고: 인증 정보는 CSV 파일에서 읽어옵니다',
    dbCheckCompleted: '데이터베이스 접속 확인이 완료되었습니다.',
    dbCheckError: '데이터베이스 접속 확인 중 오류가 발생했습니다:',
    
    // Telnet Check
    telnetTitle: '서버 텔넷 접속 확인',
    telnetDirNotFound: '텔넷 확인용 CSV 디렉토리를 찾을 수 없습니다: request_resources/',
    telnetCreateDir: '디렉토리를 생성하고 CSV 파일을 추가해주세요.',
    telnetNoFiles: 'request_resources/ 디렉토리에 Server CSV 파일이 없습니다.',
    telnetAddFiles: 'request_resources/ 디렉토리에 "server"로 시작하는 .csv 파일을 추가해주세요.',
    telnetAvailableFiles: '사용 가능한 텔넷 확인 CSV 파일:',
    telnetSelectFile: '사용할 CSV 파일 번호를 선택하세요',
    telnetInvalidFile: '잘못된 파일 선택입니다.',
    telnetSelectedFile: '선택된 CSV 파일:',
    telnetTimeoutSettings: '타임아웃 설정:',
    telnetTimeout: '타임아웃 (초)',
    telnetStarting: '텔넷 접속 확인을 시작합니다...',
    telnetCompleted: '텔넷 접속 확인이 완료되었습니다.',
    telnetError: '텔넷 접속 확인 중 오류가 발생했습니다:',
    
    // SQL Execution
    sqlTitle: '데이터베이스 SQL 실행',
    sqlDirNotFound: 'SQL 파일 디렉토리를 찾을 수 없습니다: request_resources/sql_files/',
    sqlCreateDir: '디렉토리를 생성하고 SQL 파일을 추가해주세요.',
    sqlNoFiles: 'request_resources/sql_files/ 디렉토리에 SQL 파일이 없습니다.',
    sqlAddFiles: 'request_resources/sql_files/ 디렉토리에 .sql 파일을 추가해주세요.',
    sqlAvailableFiles: '사용 가능한 SQL 파일:',
    sqlSelectFile: '실행할 SQL 파일 번호를 선택하세요',
    sqlInvalidFile: '잘못된 파일 선택입니다.',
    sqlSelectedFile: '선택된 SQL 파일:',
    sqlStarting: 'SQL 실행을 시작합니다...',
    sqlCompleted: 'SQL 실행이 완료되었습니다.',
    sqlError: 'SQL 실행 중 오류가 발생했습니다:',
    
    // CSV Query Execution
    csvQueryTitle: 'CSV 기반 일괄 쿼리 실행',
    csvQueryDirNotFound: 'CSV 쿼리 디렉토리를 찾을 수 없습니다: request_resources/',
    csvQueryCreateDir: '디렉토리를 생성하고 CSV 파일을 추가해주세요.',
    csvQueryNoFiles: 'request_resources/ 디렉토리에 CSV 쿼리 파일이 없습니다.',
    csvQueryAddFiles: 'request_resources/ 디렉토리에 "SQL"로 시작하는 .csv 파일을 추가해주세요.',
    csvQueryAvailableFiles: '사용 가능한 CSV 쿼리 파일:',
    csvQuerySelectFile: '실행할 CSV 파일 번호를 선택하세요',
    csvQueryInvalidFile: '잘못된 파일 선택입니다.',
    csvQuerySelectedFile: '선택된 CSV 파일:',
    csvQueryStarting: 'CSV 쿼리 실행을 시작합니다...',
    csvQueryCompleted: 'CSV 쿼리 실행이 완료되었습니다.',
    csvQueryError: 'CSV 쿼리 실행 중 오류가 발생했습니다:',
    
    // Configuration
    configTitle: '설정 관리',
    configMenu1: '1. 시스템 정보 확인',
    configMenu2: '2. 사용 가능한 데이터베이스 보기',
    configMenu3: '3. 메인 메뉴로 돌아가기',
    configSelect: '선택 (1-3): ',
    configAvailableDbs: '사용 가능한 데이터베이스:',
    configNoDbs: 'config/dbinfo.json에 설정된 데이터베이스가 없습니다',
    
    // Common
    exit: '프로그램을 종료합니다.',
    pressEnter: 'Enter를 눌러 계속...',
    createdResultsDir: 'results 디렉토리를 생성했습니다:'
  }
};

// 현재 언어의 메시지 가져오기
const msg = messages[LANGUAGE] || messages.en;

// Module imports
const DBConnectionChecker = require('./src/modules/DBConnectionChecker');
const TelnetChecker = require('./src/modules/TelnetChecker');
const DBExecutor = require('./src/modules/DBExecutor');
const CSVQueryExecutor = require('./src/modules/CSVQueryExecutor');
const ConfigManager = require('./src/modules/ConfigManager');

class NodeUtilApp {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // results 디렉토리 미리 생성
    this.ensureResultsDirectory();
    
    this.configManager = new ConfigManager();
    this.dbConnectionChecker = new DBConnectionChecker(this.configManager);
    this.telnetChecker = new TelnetChecker();
    this.dbExecutor = new DBExecutor(this.configManager, this.rl);
    this.csvQueryExecutor = new CSVQueryExecutor(this.configManager, this.rl);
  }

  ensureResultsDirectory() {
    try {
      const resultsDir = path.join(APP_ROOT, 'results');
      
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
        console.log(`📁 ${msg.createdResultsDir} ${resultsDir}`);
      }
    } catch (error) {
      console.error('❌ Error: Could not create results directory:', error.message);
    }
  }

  async start() {
    console.clear();
    console.log('='.repeat(50));
    console.log(`    ${msg.title}`);
    console.log('='.repeat(50));
    console.log();
    
    await this.showMainMenu();
  }

  async showMainMenu() {
    console.log(`📋 ${msg.mainMenuTitle}`);
    console.log('------------------------------------------------');
    console.log(msg.menu1);
    console.log(msg.menu2);
    console.log(msg.menu3);
    console.log(msg.menu4);
    console.log(msg.menu5);
    console.log(msg.menu0);
    console.log('------------------------------------------------');
    console.log();

    const choice = await this.askQuestion(msg.selectPrompt);
    
    switch(choice.trim()) {
      case '1':
        await this.runDbConnectionCheck();
        break;
      case '2':
        await this.runTelnetCheck();
        break;
      case '3':
        await this.runSqlExecution();
        break;
      case '4':
        await this.runCsvQueryExecution();
        break;
      case '5':
        await this.showConfigMenu();
        break;
      case '0':
        await this.exitApp();
        break;
      default:
        console.log(`❌ ${msg.invalidSelection}`);
        await this.waitAndContinue();
        await this.showMainMenu();
    }
  }

  async runDbConnectionCheck() {
    console.clear();
    console.log(`🔍 ${msg.dbCheckTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request_resources folder
      const dbCheckDir = path.join(APP_ROOT, 'request_resources');
      
      if (!fs.existsSync(dbCheckDir)) {
        console.log(`❌ ${msg.dbCheckDirNotFound}`);
        console.log(msg.dbCheckCreateDir);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const csvFiles = fs.readdirSync(dbCheckDir)
        .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('db'));

      if (csvFiles.length === 0) {
        console.log(`❌ ${msg.dbCheckNoFiles}`);
        console.log(msg.dbCheckAddFiles);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n📄 ${msg.dbCheckAvailableFiles}`);
      csvFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `${msg.dbCheckSelectFile} (1-${csvFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
        console.log(`❌ ${msg.dbCheckInvalidFile}`);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = csvFiles[selectedFileIndex];
      const csvPath = path.join(dbCheckDir, selectedFile);
      console.log(`✅ ${msg.dbCheckSelectedFile} ${selectedFile}`);
      console.log(`ℹ️  ${msg.dbCheckAuthNote}`);
      
      console.log(`\n⏱️  ${msg.dbCheckTimeoutSettings}`);
      const timeout = await this.askQuestion(
        msg.dbCheckTimeout,
        5
      );

      console.log(`\n🚀 ${msg.dbCheckStarting}`);
      console.log('-'.repeat(40));
      console.log(`ℹ️  ${msg.dbCheckTypeNote}`);
      console.log(`ℹ️  ${msg.dbCheckAuthNote2}`);
      
      await this.dbConnectionChecker.run({
        csvPath: csvPath,
        timeout: parseInt(timeout) || 5,
        dbType: 'auto' // CSV에서 각 행의 db_type을 사용
      });
      
      console.log(`\n✅ ${msg.dbCheckCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.dbCheckError}`, error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runTelnetCheck() {
    console.clear();
    console.log(`🌐 ${msg.telnetTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request_resources folder
      const telnetCheckDir = path.join(APP_ROOT, 'request_resources');
      
      if (!fs.existsSync(telnetCheckDir)) {
        console.log(`❌ ${msg.telnetDirNotFound}`);
        console.log(msg.telnetCreateDir);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const csvFiles = fs.readdirSync(telnetCheckDir)
        .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('server'));

      if (csvFiles.length === 0) {
        console.log(`❌ ${msg.telnetNoFiles}`);
        console.log(msg.telnetAddFiles);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n📄 ${msg.telnetAvailableFiles}`);
      csvFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `${msg.telnetSelectFile} (1-${csvFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
        console.log(`❌ ${msg.telnetInvalidFile}`);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = csvFiles[selectedFileIndex];
      const csvPath = path.join(telnetCheckDir, selectedFile);
      console.log(`✅ ${msg.telnetSelectedFile} ${selectedFile}`);
      
      console.log(`\n⏱️  ${msg.telnetTimeoutSettings}`);
      const timeout = await this.askQuestion(
        msg.telnetTimeout,
        3
      );

      console.log(`\n🚀 ${msg.telnetStarting}`);
      console.log('-'.repeat(40));
      
      await this.telnetChecker.run({
        csvPath: csvPath,
        timeout: parseInt(timeout) || 3
      });
      
      console.log(`\n✅ ${msg.telnetCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.telnetError}`, error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runSqlExecution() {
    console.clear();
    console.log(`⚙️  ${msg.sqlTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get SQL file list from request_resources/sql_files folder
      const sqlFilesDir = path.join(APP_ROOT, 'request_resources', 'sql_files');
      
      if (!fs.existsSync(sqlFilesDir)) {
        console.log(`❌ ${msg.sqlDirNotFound}`);
        console.log(msg.sqlCreateDir);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const sqlFiles = fs.readdirSync(sqlFilesDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));

      if (sqlFiles.length === 0) {
        console.log(`❌ ${msg.sqlNoFiles}`);
        console.log(msg.sqlAddFiles);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n📄 ${msg.sqlAvailableFiles}`);
      sqlFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}.sql`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `${msg.sqlSelectFile} (1-${sqlFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= sqlFiles.length) {
        console.log(`❌ ${msg.sqlInvalidFile}`);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = sqlFiles[selectedFileIndex];
      console.log(`✅ ${msg.sqlSelectedFile} ${selectedFile}.sql`);
      console.log(`\n🚀 ${msg.sqlStarting}`);
      console.log('-'.repeat(40));
      
      await this.dbExecutor.run(selectedFile);
      
      console.log(`\n✅ ${msg.sqlCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.sqlError}`, error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runCsvQueryExecution() {
    console.clear();
    console.log(`📊 ${msg.csvQueryTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request_resources folder
      const csvQueryDir = path.join(APP_ROOT, 'request_resources');
      
      if (!fs.existsSync(csvQueryDir)) {
        console.log(`❌ ${msg.csvQueryDirNotFound}`);
        console.log(msg.csvQueryCreateDir);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const csvFiles = fs.readdirSync(csvQueryDir)
        .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('sql'));

      if (csvFiles.length === 0) {
        console.log(`❌ ${msg.csvQueryNoFiles}`);
        console.log(msg.csvQueryAddFiles);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n📄 ${msg.csvQueryAvailableFiles}`);
      csvFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `${msg.csvQuerySelectFile} (1-${csvFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
        console.log(`❌ ${msg.csvQueryInvalidFile}`);
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = csvFiles[selectedFileIndex];
      const csvPath = path.join(csvQueryDir, selectedFile);
      console.log(`✅ ${msg.csvQuerySelectedFile} ${selectedFile}`);
      console.log(`\n🚀 ${msg.csvQueryStarting}`);
      console.log('-'.repeat(40));
      
      await this.csvQueryExecutor.run(csvPath);
      
      console.log(`\n✅ ${msg.csvQueryCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.csvQueryError}`, error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async showConfigMenu() {
    console.clear();
    console.log(`⚙️  ${msg.configTitle}`);
    console.log('='.repeat(40));
    console.log(msg.configMenu1);
    console.log(msg.configMenu2);
    console.log(msg.configMenu3);
    console.log();

    const choice = await this.askQuestion(msg.configSelect);
    
    switch(choice.trim()) {
      case '1':
        this.configManager.showEnvironmentVariables();
        break;
      case '2':
        const availableDbs = this.configManager.getAvailableDbs();
        console.log(`\n🗄️  ${msg.configAvailableDbs}`);
        if (availableDbs.length > 0) {
          availableDbs.forEach((dbName, index) => {
            const dbInfo = this.configManager.getDbConfig(dbName);
            const dbType = this.configManager.getDbType(dbName);
            console.log(`  ${index + 1}. ${dbName} (${dbType}) - ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}`);
          });
        } else {
          console.log(`  ${msg.configNoDbs}`);
        }
        break;
      case '3':
        await this.showMainMenu();
        return;
      default:
        console.log(`❌ ${msg.invalidSelection}`);
    }
    
    await this.waitAndContinue();
    await this.showConfigMenu();
  }

  async exitApp() {
    console.log(`\n👋 ${msg.exit}`);
    this.rl.close();
    process.exit(0);
  }

  askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question} `;
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async waitAndContinue() {
    console.log(`\n⏳ ${msg.pressEnter}`);
    return new Promise((resolve) => {
      this.rl.once('line', () => resolve());
    });
  }
}

// Application startup
if (require.main === module) {
  const app = new NodeUtilApp();
  app.start().catch(error => {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  });
}

module.exports = NodeUtilApp;
