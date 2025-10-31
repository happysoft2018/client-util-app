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

// 간단한 CLI 인수 파서
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq === -1) {
      out[a.slice(2)] = true;
    } else {
      const k = a.slice(2, eq);
      const v = a.slice(eq + 1);
      out[k] = v;
    }
  }
  return out;
}
const ARGS = parseArgs(args);

// 다국어 메시지 (중복 제거 빌더)
function section(prefix, entries) {
  const obj = {};
  for (const [k, v] of Object.entries(entries)) {
    obj[`${prefix}${k}`] = v;
  }
  return obj;
}

// Apply ${var} replacements within string values of a flat entries object
function applyTemplate(entries, params) {
  const out = {};
  const re = /\$\{(\w+)\}/g;
  for (const [k, v] of Object.entries(entries)) {
    if (typeof v === 'string') {
      out[k] = v.replace(re, (_, p1) => (p1 in params ? String(params[p1]) : ''));
    } else {
      out[k] = v;
    }
  }
  return out;
}

function buildEnMessages() {
  const base = {
    title: 'Node.js Integrated Utility Tool',
    mainMenuTitle: 'Main Menu',
    menu1: '1. Database Connection and Permission Check (request/DB*.csv)',
    menu2: '2. Server Telnet Connection Check (request/SERVER*.csv)',
    menu3: '3. Single SQL Execution with parameters (request/sql_files/SQL*.sql)',
    menu4: '4. Multiple SQL Execution based on CSV (request/SQL2CSV*.csv)',
    menu5: '5. CSV to DB Import (request/CSV2DB*.csv)',
    menu6: '6. Configuration Management',
    menu0: '0. Exit',
    selectPrompt: 'Select function to execute (0-6): ',
    invalidSelection: 'Invalid selection. Please select again.',
    configTitle: 'Configuration Management',
    configMenu1: '1. Check System Information',
    configMenu2: '2. View Available Databases',
    configMenu3: '3. View Supported DB Types',
    configMenu4: '0. Return to Main Menu',
    configSelect: 'Select (0-3): ',
    configAvailableDbs: 'Available Databases:',
    configNoDbs: 'No databases configured in config/dbinfo.json',
    configSupportedDbTypes: 'Supported DB Types:',
    configNoSupportedTypes: 'No DB types detected from config/dbinfo.json',
    exit: 'Exiting program.',
    pressEnter: 'Press Enter to continue...',
    createdResultsDir: 'Created results directory:'
  };

  // Common template for connection-check style sections (DB, Telnet)
  const connectCheck = {
    Title: '${title}',
    DirNotFound: '${label} check CSV directory not found: request/',
    CreateDir: 'Please create the directory and add CSV files. (ex request/${prefix}_sample.csv)',
    NoFiles: 'No ${prefix} CSV files found in request/ directory.',
    AddFiles: 'Please add ${label} CSV files starting with "${prefix}" to the request/ directory. (ex ${prefix}_sample.csv)',
    AvailableFiles: 'Available ${label} Check CSV Files:',
    SelectFile: 'Select CSV file number to use',
    InvalidFile: 'Invalid file selection.',
    SelectedFile: 'Selected CSV file:',
    TimeoutSettings: 'Timeout Settings:',
    Timeout: 'Timeout (seconds)',
    Starting: 'Starting ${lowerLabel} connection check...',
    Completed: '${label} connection check completed.',
    Error: 'Error occurred during ${label} connection check:'
  };

    const sqlExec = {
    Title: '${title}',
    DirNotFound: '${label} files directory not found: ${fileDir}',
    CreateDir: 'Please create the directory and add SQL files. (ex ${fileDir}${prefix}_sample.csv)',
    NoFiles: 'No ${label} files found in ${fileDir} directory.',
    AddFiles: 'Please add ${label} files starting with "${prefix}" to the ${fileDir} directory. (ex ${prefix}_sample.csv)',
    AvailableFiles: 'Available ${label} Files:',
    SelectFile: 'Select ${label} file number to execute',
    InvalidFile: 'Invalid file selection.',
    SelectedFile: 'Selected ${label} file:',
    Starting: 'Starting ${label} query execution...',
    Completed: '${label} query execution completed.',
    Error: 'Error occurred during ${label} query execution:'
  };

  const db = {
    ...section('dbCheck', applyTemplate(connectCheck, { title: 'Database Connection and Permission Check', label: 'DB', lowerLabel: 'database', prefix: 'DB' })),
    ...section('dbCheck', {
      AuthNote: 'Note: Authentication information will be read from CSV file (username, password columns)',
      TypeNote: 'Note: Each server in CSV can have different database types (mssql, mysql, postgresql, oracle)',
      AuthNote2: 'Note: Authentication credentials will be read from CSV file'
    })
  };

  const telnet = section('telnet', applyTemplate(connectCheck, { title: 'Server Telnet Connection Check', label: 'Telnet', lowerLabel: 'telnet', prefix: 'server' }));

  const sql = {
    ...section('sql', applyTemplate(sqlExec, { title: 'Database SQL Execution', label: 'SQL', fileDir: 'request/sql_files/', prefix: 'SQL' })),
    ...section('sql', {
    CreateDir: 'Please create the directory and add SQL files. (ex request/sql_files/sample.sql)',
    AddFiles: 'Please add .sql files to the request/sql_files/ directory. (ex sample.sql)',
    })
  };

  const sql2csv = section('csvQuery', applyTemplate(sqlExec, { title: 'CSV based batch query execution', label: 'CSV', prefix: 'SQL2CSV', fileDir: 'request/' }));

  // CSV to DB import messages
  const csv2db = section('csv2db', applyTemplate(sqlExec, { title: 'CSV to DB Import', label: 'CSV2DB', prefix: 'CSV2DB', fileDir: 'request/' }));

  return { ...base, ...db, ...telnet, ...sql, ...sql2csv, ...csv2db };
}

function buildKrMessages() {
  const base = {
    title: 'Node.js 통합 유틸리티 도구',
    mainMenuTitle: '메인 메뉴',
    menu1: '1. 데이터베이스 접속 및 권한 확인 (request/DB*.csv)',
    menu2: '2. 서버 텔넷 접속 확인 (request/SERVER*.csv)',
    menu3: '3. 단일 SQL 실행 (파라미터 적용) (request/sql_files/SQL*.sql)',
    menu4: '4. 복수 SQL 실행 (CSV 기반) (request/SQL2CSV*.csv)',
    menu5: '5. CSV를 DB에 입력 (request/CSV2DB*.csv)',
    menu6: '6. 설정 관리',
    menu0: '0. 종료',
    selectPrompt: '실행할 기능을 선택하세요 (0-6): ',
    invalidSelection: '잘못된 선택입니다. 다시 선택해주세요.',
    configTitle: '설정 관리',
    configMenu1: '1. 시스템 정보 확인',
    configMenu2: '2. 사용 가능한 데이터베이스 보기',
    configMenu3: '3. 지원 DB 타입 보기',
    configMenu4: '0. 메인 메뉴로 돌아가기',
    configSelect: '선택 (0-3): ',
    configAvailableDbs: '사용 가능한 데이터베이스:',
    configNoDbs: 'config/dbinfo.json에 설정된 데이터베이스가 없습니다',
    configSupportedDbTypes: '지원 DB 타입:',
    configNoSupportedTypes: 'config/dbinfo.json에서 감지된 DB 타입이 없습니다',
    exit: '프로그램을 종료합니다.',
    pressEnter: 'Enter를 눌러 계속...',
    createdResultsDir: 'results 디렉토리를 생성했습니다:'
  };

  // 공통 템플릿 (연결 확인형 섹션: DB, Telnet)
  const connectCheck = {
    Title: '${title}',
    DirNotFound: '${label} 확인용 CSV 디렉토리를 찾을 수 없습니다: request/',
    CreateDir: '디렉토리를 생성하고 CSV 파일을 추가해주세요. (ex request/${prefix}_sample.csv)',
    NoFiles: 'request/ 디렉토리에 ${prefix} CSV 파일이 없습니다.',
    AddFiles: 'request/ 디렉토리에 "${prefix}"로 시작하는 .csv 파일을 추가해주세요. (ex ${prefix}_sample.csv)',
    AvailableFiles: '사용 가능한 ${label} 확인 CSV 파일:',
    SelectFile: '사용할 CSV 파일 번호를 선택하세요',
    InvalidFile: '잘못된 파일 선택입니다.',
    SelectedFile: '선택된 CSV 파일:',
    TimeoutSettings: '타임아웃 설정:',
    Timeout: '타임아웃 (초)',
    Starting: '${label} 접속 확인을 시작합니다...',
    Completed: '${label} 접속 확인이 완료되었습니다.',
    Error: '${label} 접속 확인 중 오류가 발생했습니다:'
  };

  const sqlexec = {
    Title: '${title}',
    DirNotFound: '${label} 파일 디렉토리를 찾을 수 없습니다: ${fileDir}',
    CreateDir: '디렉토리를 생성하고 ${label} 파일을 추가해주세요. (ex request/${prefix}_sample.sql)',
    NoFiles: '${fileDir} 디렉토리에 ${label} 파일이 없습니다.',
    AddFiles: 'request/ 디렉토리에 "${prefix}"로 시작하는 ${label} 파일을 추가해주세요. (ex ${prefix}_sample.csv)',
    AvailableFiles: '사용 가능한 ${label} 파일:',
    SelectFile: '실행할 ${label} 파일 번호를 선택하세요',
    InvalidFile: '잘못된 파일 선택입니다.',
    SelectedFile: '선택된 ${label} 파일:',
    Starting: '${label} 쿼리 실행을 시작합니다...',
    Completed: '${label} 쿼리 실행이 완료되었습니다.',
    Error: '${label} 쿼리 실행 중 오류가 발생했습니다:'
  };


  const db = {
    ...section('dbCheck', applyTemplate(connectCheck, { title: '데이터베이스 접속 및 권한 확인', label: '데이터베이스', prefix: 'DB' })),
    ...section('dbCheck', {
      AuthNote: '참고: 인증 정보는 CSV 파일에서 읽어옵니다 (username, password 컬럼)',
      TypeNote: '참고: CSV의 각 서버는 서로 다른 데이터베이스 타입을 가질 수 있습니다 (mssql, mysql, postgresql, oracle)',
      AuthNote2: '참고: 인증 정보는 CSV 파일에서 읽어옵니다'
    })
  };

  const telnet = section('telnet', applyTemplate(connectCheck, { title: '서버 텔넷 접속 확인', label: '텔넷', prefix: 'SERVER' }));

  const sql = {
    ...section('sql', applyTemplate(sqlexec, { title: '데이터베이스 SQL 실행', label: 'SQL', fileDir: 'request/sql_files/' })),
    ...section('sql', {
    CreateDir: '디렉토리를 생성하고 SQL 파일을 추가해주세요. (ex request/sql_files/sample.sql)',
      AddFiles: 'request/sql_files/ 디렉토리에 SQL 파일을 추가해주세요. (ex sample.sql)'
    })
  };

  const sql2csv = section('csvQuery', applyTemplate(sqlexec, { title: 'CSV 기반 일괄 쿼리 실행', label: 'CSV', prefix: 'SQL2CSV', fileDir: 'request/' }));

  // CSV to DB import messages
  const csv2db = section('csv2db', applyTemplate(sqlexec, { title: 'CSV 데이터 DB 입력', label: 'CSV2DB', prefix: 'CSV2DB', fileDir: 'request/' }));

  return { ...base, ...db, ...telnet, ...sql, ...sql2csv, ...csv2db };
}

const messages = { en: buildEnMessages(), kr: buildKrMessages() };

// 현재 언어의 메시지 가져오기
const msg = messages[LANGUAGE] || messages.en;

// Module imports
const DBConnectionChecker = require('./src/modules/DBConnectionChecker');
const TelnetChecker = require('./src/modules/TelnetChecker');
const DBExecutor = require('./src/modules/DBExecutor');
const CSVQueryExecutor = require('./src/modules/CSVQueryExecutor');
const CSVToDBExecutor = require('./src/modules/CSVToDBExecutor');
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
    this.csvToDbExecutor = new CSVToDBExecutor(this.configManager, this.rl);
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
    // 비대화형 실행 경로 우선 처리
    const handled = await this.maybeRunFromCliArgs();
    if (handled) return;
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
    console.log(msg.menu6);
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
        await this.runCsvToDbExecution();
        break;
      case '6':
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

  async runDbConnectionCheck(options = undefined) {
    console.clear();
    console.log(`🔍 ${msg.dbCheckTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request folder
      const dbCheckDir = path.join(APP_ROOT, 'request');
      
      if (!fs.existsSync(dbCheckDir) && !(options && options.csvPath)) {
        console.log(`❌ ${msg.dbCheckDirNotFound}`);
        console.log(msg.dbCheckCreateDir);
        if (!(options && options.nonInteractive)) {
          await this.waitAndContinue();
          await this.showMainMenu();
        }
        return;
      }

      let csvPath;
      let timeout;
      if (options && options.csvPath) {
        csvPath = path.isAbsolute(options.csvPath) ? options.csvPath : path.join(APP_ROOT, options.csvPath);
        timeout = options.timeout ?? 5;
      } else {
        const csvFiles = fs.readdirSync(dbCheckDir)
          .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('db'));

        if (csvFiles.length === 0) {
          console.log(`❌ ${msg.dbCheckNoFiles}`);
          console.log(msg.dbCheckAddFiles);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
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
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        const selectedFile = csvFiles[selectedFileIndex];
        csvPath = path.join(dbCheckDir, selectedFile);
        console.log(`✅ ${msg.dbCheckSelectedFile} ${selectedFile}`);
        console.log(`ℹ️  ${msg.dbCheckAuthNote}`);
        
        console.log(`\n⏱️  ${msg.dbCheckTimeoutSettings}`);
        timeout = await this.askQuestion(
          msg.dbCheckTimeout,
          5
        );
      }

      console.log(`\n🚀 ${msg.dbCheckStarting}`);
      console.log('-'.repeat(40));
      console.log(`ℹ️  ${msg.dbCheckTypeNote}`);
      console.log(`ℹ️  ${msg.dbCheckAuthNote2}`);
      
      await this.dbConnectionChecker.run({
        csvPath: csvPath,
        timeout: parseInt(timeout) || 5,
        dbType: (options && options.dbType) ? options.dbType : 'auto' // CSV에서 각 행의 db_type을 사용
      });
      
      console.log(`\n✅ ${msg.dbCheckCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.dbCheckError}`, error.message);
    }
    if (!(options && options.nonInteractive)) {
      await this.waitAndContinue();
      await this.showMainMenu();
    }
  }

  async runTelnetCheck(options = undefined) {
    console.clear();
    console.log(`🌐 ${msg.telnetTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request folder
      const telnetCheckDir = path.join(APP_ROOT, 'request');
      
      if (!fs.existsSync(telnetCheckDir) && !(options && options.csvPath)) {
        console.log(`❌ ${msg.telnetDirNotFound}`);
        console.log(msg.telnetCreateDir);
        if (!(options && options.nonInteractive)) {
          await this.waitAndContinue();
          await this.showMainMenu();
        }
        return;
      }

      let csvPath;
      let timeout;
      if (options && options.csvPath) {
        csvPath = path.isAbsolute(options.csvPath) ? options.csvPath : path.join(APP_ROOT, options.csvPath);
        timeout = options.timeout ?? 3;
      } else {
        const csvFiles = fs.readdirSync(telnetCheckDir)
          .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('server'));

        if (csvFiles.length === 0) {
          console.log(`❌ ${msg.telnetNoFiles}`);
          console.log(msg.telnetAddFiles);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
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
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        const selectedFile = csvFiles[selectedFileIndex];
        csvPath = path.join(telnetCheckDir, selectedFile);
        console.log(`✅ ${msg.telnetSelectedFile} ${selectedFile}`);
        
        console.log(`\n⏱️  ${msg.telnetTimeoutSettings}`);
        timeout = await this.askQuestion(
          msg.telnetTimeout,
          3
        );
      }

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
    if (!(options && options.nonInteractive)) {
      await this.waitAndContinue();
      await this.showMainMenu();
    }
  }

  async runSqlExecution(options = undefined) {
    console.clear();
    console.log(`⚙️  ${msg.sqlTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get SQL file list from request/sql_files folder
      const sqlFilesDir = path.join(APP_ROOT, 'request', 'sql_files');
      
      if (!fs.existsSync(sqlFilesDir) && !(options && (options.sql || options.sqlPath))) {
        console.log(`❌ ${msg.sqlDirNotFound}`);
        console.log(msg.sqlCreateDir);
        if (!(options && options.nonInteractive)) {
          await this.waitAndContinue();
          await this.showMainMenu();
        }
        return;
      }

      let selectedFileBase;
      if (options && (options.sql || options.sqlPath)) {
        const provided = options.sqlPath || options.sql; // could be base name or path to .sql
        const isPath = /[\\/]/.test(provided) || provided.endsWith('.sql');
        if (isPath) {
          const base = path.basename(provided).replace(/\.sql$/i, '');
          selectedFileBase = base;
        } else {
          selectedFileBase = provided.replace(/\.sql$/i, '');
        }
      } else {
        const sqlFiles = fs.readdirSync(sqlFilesDir)
          .filter(file => file.endsWith('.sql'))
          .map(file => file.replace('.sql', ''));

        if (sqlFiles.length === 0) {
          console.log(`❌ ${msg.sqlNoFiles}`);
          console.log(msg.sqlAddFiles);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
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
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        selectedFileBase = sqlFiles[selectedFileIndex];
      }

      console.log(`✅ ${msg.sqlSelectedFile} ${selectedFileBase}.sql`);
      console.log(`\n🚀 ${msg.sqlStarting}`);
      console.log('-'.repeat(40));
      
      await this.dbExecutor.run(selectedFileBase);
      
      console.log(`\n✅ ${msg.sqlCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.sqlError}`, error.message);
    }
    if (!(options && options.nonInteractive)) {
      await this.waitAndContinue();
      await this.showMainMenu();
    }
  }

  async runCsvQueryExecution(options = undefined) {
    console.clear();
    console.log(`📊 ${msg.csvQueryTitle}`);
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request folder
      const csvQueryDir = path.join(APP_ROOT, 'request');
      
      if (!fs.existsSync(csvQueryDir) && !(options && options.csvPath)) {
        console.log(`❌ ${msg.csvQueryDirNotFound}`);
        console.log(msg.csvQueryCreateDir);
        if (!(options && options.nonInteractive)) {
          await this.waitAndContinue();
          await this.showMainMenu();
        }
        return;
      }

      let csvPath;
      if (options && options.csvPath) {
        csvPath = path.isAbsolute(options.csvPath) ? options.csvPath : path.join(APP_ROOT, options.csvPath);
      } else {
        const csvFiles = fs.readdirSync(csvQueryDir)
          .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('sql2csv'));

        if (csvFiles.length === 0) {
          console.log(`❌ ${msg.csvQueryNoFiles}`);
          console.log(msg.csvQueryAddFiles);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
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
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        const selectedFile = csvFiles[selectedFileIndex];
        csvPath = path.join(csvQueryDir, selectedFile);
        console.log(`✅ ${msg.csvQuerySelectedFile} ${selectedFile}`);
      }
      console.log(`\n🚀 ${msg.csvQueryStarting}`);
      console.log('-'.repeat(40));
      
      await this.csvQueryExecutor.run(csvPath);
      
      console.log(`\n✅ ${msg.csvQueryCompleted}`);
      
    } catch (error) {
      console.error(`❌ ${msg.csvQueryError}`, error.message);
    }
    if (!(options && options.nonInteractive)) {
      await this.waitAndContinue();
      await this.showMainMenu();
    }
  }

  async runCsvToDbExecution(options = undefined) {
    console.clear();
    console.log(`📥 ${msg.csv2dbTitle}`);
    console.log('='.repeat(40));
    
    try {
      const csvDir = path.join(APP_ROOT, 'request');
      if (!fs.existsSync(csvDir) && !(options && options.csvPath)) {
        console.log(`❌ ${msg.csv2dbDirNotFound}`);
        console.log(msg.csv2dbCreateDir);
        if (!(options && options.nonInteractive)) {
          await this.waitAndContinue();
          await this.showMainMenu();
        }
        return;
      }

      let csvPath;
      if (options && options.csvPath) {
        csvPath = path.isAbsolute(options.csvPath) ? options.csvPath : path.join(APP_ROOT, options.csvPath);
      } else {
        const csvFiles = fs.readdirSync(csvDir)
          .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('csv2db'));

        if (csvFiles.length === 0) {
          console.log(`❌ ${msg.csv2dbNoFiles}`);
          console.log(msg.csv2dbAddFiles);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        console.log(`\n📄 ${msg.csv2dbAvailableFiles}`);
        csvFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file}`);
        });
        console.log();

        const fileChoice = await this.askQuestion(
          `${msg.csv2dbSelectFile} (1-${csvFiles.length}): `
        );
        const selectedFileIndex = parseInt(fileChoice) - 1;
        if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
          console.log(`❌ ${msg.csv2dbInvalidFile}`);
          if (!(options && options.nonInteractive)) {
            await this.waitAndContinue();
            await this.showMainMenu();
          }
          return;
        }

        const selectedFile = csvFiles[selectedFileIndex];
        csvPath = path.join(csvDir, selectedFile);
        console.log(`✅ ${msg.csv2dbSelectedFile} ${selectedFile}`);
      }

      console.log(`\n🚀 ${msg.csv2dbStarting}`);
      console.log('-'.repeat(40));

      await this.csvToDbExecutor.run(csvPath);

      console.log(`\n✅ ${msg.csv2dbCompleted}`);
    } catch (error) {
      console.error(`❌ ${msg.csv2dbError}`, error.message);
    }
    if (!(options && options.nonInteractive)) {
      await this.waitAndContinue();
      await this.showMainMenu();
    }
  }

  async showConfigMenu() {
    console.clear();
    console.log(`⚙️  ${msg.configTitle}`);
    console.log('='.repeat(40));
    console.log(msg.configMenu1);
    console.log(msg.configMenu2);
    console.log(msg.configMenu3);
    console.log(msg.configMenu4);
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
        const supportedTypes = this.configManager.getSupportedDbTypes();
        console.log(`\n🧩 ${msg.configSupportedDbTypes}`);
        if (supportedTypes.length > 0) {
          supportedTypes.forEach((t, idx) => {
            console.log(`  ${idx + 1}. ${t.name} (${t.type})`);
          });
        } else {
          console.log(`  ${msg.configNoSupportedTypes}`);
        }
        break;
      case '0':
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

  // 비대화형 CLI 실행기
  async maybeRunFromCliArgs() {
    // --help 처리
    if (ARGS.help) {
      this.printUsage();
      await this.exitApp();
      return true;
    }
    const mode = ARGS.mode; // db | telnet | sql | csv | config
    if (!mode) return false;
    switch (mode) {
      case 'db':
        await this.runDbConnectionCheck({
          nonInteractive: true,
          csvPath: ARGS.csv,
          timeout: ARGS.timeout ? parseInt(ARGS.timeout) : undefined,
          dbType: ARGS.dbType || 'auto'
        });
        await this.exitApp();
        return true;
      case 'telnet':
        await this.runTelnetCheck({
          nonInteractive: true,
          csvPath: ARGS.csv,
          timeout: ARGS.timeout ? parseInt(ARGS.timeout) : undefined
        });
        await this.exitApp();
        return true;
      case 'sql':
        await this.runSqlExecution({
          nonInteractive: true,
          sql: ARGS.sql || ARGS.file || ARGS.name,
        });
        await this.exitApp();
        return true;
      case 'csv':
      case 'sql2csv':
        await this.runCsvQueryExecution({
          nonInteractive: true,
          csvPath: ARGS.csv
        });
        await this.exitApp();
        return true;
      case 'csv2db':
        await this.runCsvToDbExecution({
          nonInteractive: true,
          csvPath: ARGS.csv
        });
        await this.exitApp();
        return true;
      case 'config':
        // 간단한 정보 출력 후 종료
        this.configManager.showEnvironmentVariables();
        console.log();
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
        await this.exitApp();
        return true;
      default:
        console.error(`❌ Unknown mode: ${mode}`);
        this.printUsage();
        await this.exitApp();
        return true;
    }
  }

  printUsage() {
    console.log('\nUsage:');
    console.log('  node app.js --lang=kr --mode=db --csv=request/DB_sample.csv --timeout=5 --dbType=auto');
    console.log('  node app.js --lang=kr --mode=telnet --csv=request/server_sample.csv --timeout=3');
    console.log('  node app.js --lang=kr --mode=sql --sql=SQL_file_name');
    console.log('  node app.js --lang=kr --mode=csv --csv=request/SQL2CSV_sample.csv');
    console.log('  node app.js --lang=kr --mode=csv2db --csv=request/CSV2DB_sample.csv');
    console.log('  node app.js --help');
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
