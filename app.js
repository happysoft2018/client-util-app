const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
    
    this.configManager = new ConfigManager();
    this.dbConnectionChecker = new DBConnectionChecker(this.configManager);
    this.telnetChecker = new TelnetChecker();
    this.dbExecutor = new DBExecutor(this.configManager);
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
    console.log('1. Database Connection and Permission Check');
    console.log('2. Server Telnet Connection Check');
    console.log('3. Database SQL Execution');
    console.log('4. Configuration Management');
    console.log('5. Run All Checks (Batch Processing)');
    console.log('6. Exit');
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
      console.log('\n📁 CSV File Settings:');
      const csvPath = await this.askQuestion(
        'CSV file path: '
      );
      
      // DB type selection
      const supportedTypes = this.configManager.getSupportedDbTypes();
      console.log('\n🗄️  Supported Database Types:');
      supportedTypes.forEach((type, index) => {
        console.log(`  ${index + 1}. ${type.name} (${type.type})`);
      });
      
      const dbTypeChoice = await this.askQuestion(
        `Select DB type (1-${supportedTypes.length}, default: MSSQL): `,
        '1'
      );
      
      const selectedDbType = supportedTypes[parseInt(dbTypeChoice) - 1] || supportedTypes[0];
      console.log(`✅ Selected DB type: ${selectedDbType.name}`);

      console.log('\n🔐 Database Authentication Information:');
      const dbUser = await this.askQuestion(
        'DB Account ID: '
      );
      
      const dbPassword = await this.askQuestion(
        'DB Password: '
      );
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        'Timeout (seconds) (default: 5): ',
        5
      );

      console.log('\n🚀 Starting database connection check...');
      console.log('-'.repeat(40));
      
      await this.dbConnectionChecker.run({
        csvPath: csvPath,
        dbUser: dbUser,
        dbPassword: dbPassword,
        timeout: parseInt(timeout) || 5,
        dbType: selectedDbType.type
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
      console.log('\n📁 CSV File Settings:');
      const csvPath = await this.askQuestion(
        'CSV file path: '
      );
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        'Timeout (seconds) (default: 3): ',
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
      // Get SQL file list from templet folder
      const templateDir = path.join(__dirname, 'templet');
      const sqlFiles = fs.readdirSync(templateDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));

      if (sqlFiles.length === 0) {
        console.log('❌ No SQL files found in templet folder.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log('\n📄 Available SQL Files:');
      sqlFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `Select SQL file number to execute (1-${sqlFiles.length}): `
      );
      
      const selectedFile = sqlFiles[parseInt(fileChoice) - 1];
      if (!selectedFile) {
        console.log('❌ Invalid file number.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n🚀 Starting SQL execution: ${selectedFile}`);
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
      const prompt = defaultValue ? `${question}` : question;
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
