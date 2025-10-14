const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

// pkg 실행 파일에서는 현재 작업 디렉토리 사용
const APP_ROOT = process.pkg ? process.cwd() : __dirname;

// Module imports
const DBConnectionChecker = require('./src/modules/DBConnectionChecker');
const TelnetChecker = require('./src/modules/TelnetChecker');
const DBExecutor = require('./src/modules/DBExecutor');
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
  }

  ensureResultsDirectory() {
    try {
      const resultsDir = path.join(APP_ROOT, 'results');
      
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
        console.log(`📁 Created results directory: ${resultsDir}`);
      }
    } catch (error) {
      console.warn('⚠️  Warning: Could not create results directory:', error.message);
      // 대체 경로로 현재 작업 디렉토리 사용
      try {
        const fallbackDir = path.join(process.cwd(), 'results');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
          console.log(`📁 Created fallback results directory: ${fallbackDir}`);
        }
      } catch (fallbackError) {
        console.error('❌ Error: Could not create results directory even in fallback location');
      }
    }
  }

  async start() {
    console.clear();
    console.log('='.repeat(50));
        console.log('    Node.js Integrated Utility Tool');
    console.log('='.repeat(50));
    console.log();
    
    await this.showMainMenu();
  }

  async showMainMenu() {
    console.log('📋 Main Menu');
    console.log('------------------------------------------------');
    console.log('1. Database Connection and Permission Check');
    console.log('2. Server Telnet Connection Check');
    console.log('3. Database SQL Execution');
    console.log('4. Configuration Management');
    console.log('5. Run All Checks (Batch Processing)');
    console.log('6. Exit');
    console.log('------------------------------------------------');
    console.log();

    const choice = await this.askQuestion('Select function to execute (1-6): ');
    
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
        await this.showConfigMenu();
        break;
      case '5':
        await this.runAllChecks();
        break;
      case '6':
        await this.exitApp();
        break;
      default:
        console.log('❌ Invalid selection. Please select again.');
        await this.waitAndContinue();
        await this.showMainMenu();
    }
  }

  async runDbConnectionCheck() {
    console.clear();
        console.log('🔍 Database Connection and Permission Check');
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request_resources folder
      const dbCheckDir = path.join(APP_ROOT, 'request_resources');
      
      if (!fs.existsSync(dbCheckDir)) {
        console.log('❌ DB check CSV directory not found: request_resources/');
        console.log('Please create the directory and add CSV files.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const csvFiles = fs.readdirSync(dbCheckDir)
        .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('db'));

      if (csvFiles.length === 0) {
        console.log('❌ No DB CSV files found in request_resources/ directory.');
        console.log('Please add .csv files starting with "DB" to the request_resources/ directory.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log('\n📄 Available DB Check CSV Files:');
      csvFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `Select CSV file number to use (1-${csvFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
        console.log('❌ Invalid file selection.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = csvFiles[selectedFileIndex];
      const csvPath = path.join(dbCheckDir, selectedFile);
      console.log(`✅ Selected CSV file: ${selectedFile}`);
      console.log('ℹ️  Note: Authentication information will be read from CSV file (username, password columns)');
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        'Timeout (seconds)',
        5
      );

      console.log('\n🚀 Starting database connection check...');
      console.log('-'.repeat(40));
      console.log('ℹ️  Note: Each server in CSV can have different database types (mssql, mysql, postgresql, oracle)');
      console.log('ℹ️  Note: Authentication credentials will be read from CSV file');
      
      await this.dbConnectionChecker.run({
        csvPath: csvPath,
        timeout: parseInt(timeout) || 5,
        dbType: 'auto' // CSV에서 각 행의 db_type을 사용
      });
      
      console.log('\n✅ Database connection check completed.');
      
    } catch (error) {
      console.error('❌ Error occurred during database connection check:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runTelnetCheck() {
    console.clear();
        console.log('🌐 Server Telnet Connection Check');
    console.log('='.repeat(40));
    
    try {
      // Get CSV file list from request_resources folder
      const telnetCheckDir = path.join(APP_ROOT, 'request_resources');
      
      if (!fs.existsSync(telnetCheckDir)) {
        console.log('❌ Telnet check CSV directory not found: request_resources/');
        console.log('Please create the directory and add CSV files.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const csvFiles = fs.readdirSync(telnetCheckDir)
        .filter(file => file.endsWith('.csv') && file.toLowerCase().startsWith('server'));

      if (csvFiles.length === 0) {
        console.log('❌ No Server CSV files found in request_resources/ directory.');
        console.log('Please add .csv files starting with "server" to the request_resources/ directory.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log('\n📄 Available Telnet Check CSV Files:');
      csvFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `Select CSV file number to use (1-${csvFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= csvFiles.length) {
        console.log('❌ Invalid file selection.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = csvFiles[selectedFileIndex];
      const csvPath = path.join(telnetCheckDir, selectedFile);
      console.log(`✅ Selected CSV file: ${selectedFile}`);
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        'Timeout (seconds)',
        3
      );

      console.log('\n🚀 Starting Telnet connection check...');
      console.log('-'.repeat(40));
      
      await this.telnetChecker.run({
        csvPath: csvPath,
        timeout: parseInt(timeout) || 3
      });
      
      console.log('\n✅ Telnet connection check completed.');
      
    } catch (error) {
      console.error('❌ Error occurred during Telnet connection check:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runSqlExecution() {
    console.clear();
        console.log('⚙️  Database SQL Execution');
    console.log('='.repeat(40));
    
    try {
      // Get SQL file list from request_resources/sql_files folder
      const sqlFilesDir = path.join(APP_ROOT, 'request_resources', 'sql_files');
      
      if (!fs.existsSync(sqlFilesDir)) {
        console.log('❌ SQL files directory not found: request_resources/sql_files/');
        console.log('Please create the directory and add SQL files.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const sqlFiles = fs.readdirSync(sqlFilesDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));

      if (sqlFiles.length === 0) {
        console.log('❌ No SQL files found in request_resources/sql_files/ directory.');
        console.log('Please add .sql files to the request_resources/sql_files/ directory.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log('\n📄 Available SQL Files:');
      sqlFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}.sql`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `Select SQL file number to execute (1-${sqlFiles.length}): `
      );
      
      const selectedFileIndex = parseInt(fileChoice) - 1;
      if (selectedFileIndex < 0 || selectedFileIndex >= sqlFiles.length) {
        console.log('❌ Invalid file selection.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      const selectedFile = sqlFiles[selectedFileIndex];
      console.log(`✅ Selected SQL file: ${selectedFile}.sql`);
      console.log(`\n🚀 Starting SQL execution...`);
      console.log('-'.repeat(40));
      
      await this.dbExecutor.run(selectedFile);
      
      console.log('\n✅ SQL execution completed.');
      
    } catch (error) {
      console.error('❌ Error occurred during SQL execution:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async showConfigMenu() {
    console.clear();
        console.log('⚙️  Configuration Management');
    console.log('='.repeat(40));
    console.log('1. Check System Information');
    console.log('2. View Available Databases');
    console.log('3. Return to Main Menu');
    console.log();

    const choice = await this.askQuestion('Select (1-3): ');
    
    switch(choice.trim()) {
      case '1':
        this.configManager.showEnvironmentVariables();
        break;
      case '2':
        const availableDbs = this.configManager.getAvailableDbs();
        console.log('\n🗄️  Available Databases:');
        if (availableDbs.length > 0) {
          availableDbs.forEach((dbName, index) => {
            const dbInfo = this.configManager.getDbConfig(dbName);
            const dbType = this.configManager.getDbType(dbName);
            console.log(`  ${index + 1}. ${dbName} (${dbType}) - ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}`);
          });
        } else {
          console.log('  No databases configured in config/dbinfo.json');
        }
        break;
      case '3':
        await this.showMainMenu();
        return;
      default:
        console.log('❌ Invalid selection.');
    }
    
    await this.waitAndContinue();
    await this.showConfigMenu();
  }

  async runAllChecks() {
    console.clear();
    console.log('🔄 Run All Checks (Batch Processing)');
    console.log('='.repeat(40));
    
    console.log('\n⚠️  Batch processing requires manual configuration.');
    console.log('Please use individual check functions to configure each check separately.');
    console.log('\nAvailable checks:');
    console.log('1. Database Connection and Permission Check');
    console.log('2. Server Telnet Connection Check');
    console.log('3. Database SQL Execution');
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async exitApp() {
    console.log('\n👋 Exiting program.');
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
    console.log('\n⏳ Press Enter to continue...');
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
