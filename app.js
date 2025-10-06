const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

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
      // Get default values from configuration
      const defaultConfig = this.configManager.getDefaultConfig();
      
      console.log('\n📁 CSV File Settings:');
      const csvPath = await this.askQuestion(
        `CSV file path (default: ${defaultConfig.mssql.csvPath || 'input required'}): `,
        defaultConfig.mssql.csvPath
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
        `DB Account ID (default: ${defaultConfig.mssql.dbUser || 'input required'}): `,
        defaultConfig.mssql.dbUser
      );
      
      const dbPassword = await this.askQuestion(
        `DB Password (default: ${defaultConfig.mssql.dbPassword ? '***' : 'input required'}): `,
        defaultConfig.mssql.dbPassword
      );
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        `Timeout (seconds) (default: ${defaultConfig.mssql.timeout || 5}): `,
        defaultConfig.mssql.timeout || 5
      );

      console.log('\n🚀 Starting database connection check...');
      console.log('-'.repeat(40));
      
      await this.dbConnectionChecker.run({
        csvPath: csvPath || defaultConfig.mssql.csvPath,
        dbUser: dbUser || defaultConfig.mssql.dbUser,
        dbPassword: dbPassword || defaultConfig.mssql.dbPassword,
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
      const defaultConfig = this.configManager.getDefaultConfig();
      
      console.log('\n📁 CSV File Settings:');
      const csvPath = await this.askQuestion(
        `CSV file path (default: ${defaultConfig.telnet.csvPath || 'input required'}): `,
        defaultConfig.telnet.csvPath
      );
      
      console.log('\n⏱️  Timeout Settings:');
      const timeout = await this.askQuestion(
        `Timeout (seconds) (default: ${defaultConfig.telnet.timeout || 3}): `,
        defaultConfig.telnet.timeout || 3
      );

      console.log('\n🚀 Starting Telnet connection check...');
      console.log('-'.repeat(40));
      
      await this.telnetChecker.run({
        csvPath: csvPath || defaultConfig.telnet.csvPath,
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
    console.log('1. View Current Configuration');
    console.log('2. Update Default Configuration');
    console.log('3. Reset Configuration');
    console.log('4. Check Environment Variables');
    console.log('5. Return to Main Menu');
    console.log();

    const choice = await this.askQuestion('Select (1-5): ');
    
    switch(choice.trim()) {
      case '1':
        this.configManager.showCurrentConfig();
        break;
      case '2':
        await this.configManager.updateDefaultConfig(this);
        break;
      case '3':
        this.configManager.resetConfig();
        console.log('✅ Configuration has been reset.');
        break;
      case '4':
        this.configManager.showEnvironmentVariables();
        break;
      case '5':
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
    
    const defaultConfig = this.configManager.getDefaultConfig();
    
    try {
      console.log('\n🚀 Running all checks sequentially...');
      console.log('='.repeat(40));
      
      // 1. Telnet check
      if (defaultConfig.telnet.csvPath && fs.existsSync(defaultConfig.telnet.csvPath)) {
        console.log('\n1️⃣ Starting Telnet connection check...');
        await this.telnetChecker.run({
          csvPath: defaultConfig.telnet.csvPath,
          timeout: defaultConfig.telnet.timeout || 3
        });
        console.log('✅ Telnet check completed');
      } else {
        console.log('⚠️  Telnet check: CSV file path not set or file does not exist.');
      }
      
      // 2. DB connection check
      if (defaultConfig.mssql.csvPath && fs.existsSync(defaultConfig.mssql.csvPath) && 
          defaultConfig.mssql.dbUser && defaultConfig.mssql.dbPassword) {
        console.log('\n2️⃣ Starting database connection check...');
        await this.dbConnectionChecker.run({
          csvPath: defaultConfig.mssql.csvPath,
          dbUser: defaultConfig.mssql.dbUser,
          dbPassword: defaultConfig.mssql.dbPassword,
          timeout: defaultConfig.mssql.timeout || 5,
          dbType: 'mssql' // default value
        });
        console.log('✅ Database check completed');
      } else {
        console.log('⚠️  Database check: Required configuration not completed.');
      }
      
      console.log('\n🎉 All checks completed successfully!');
      
    } catch (error) {
      console.error('❌ Error occurred during batch processing:', error.message);
    }
    
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
