const fs = require('fs');
const path = require('path');
const os = require('os');
const DatabaseFactory = require('./database/DatabaseFactory');

class ConfigManager {
  constructor() {
    this.configFile = path.join(__dirname, '../../config/user-config.json');
    this.dbConfigFile = path.join(__dirname, '../../config/dbinfo.json');
    this.defaultConfig = {
      mssql: {
        csvPath: '',
        dbUser: '',
        dbPassword: '',
        timeout: 5,
        selectedDb: ''
      },
      telnet: {
        csvPath: '',
        timeout: 3
      },
      sql: {
        templatePath: path.join(__dirname, '../../templet'),
        selectedDb: ''
      }
    };
    
    this.loadConfig();
    this.loadDbConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        this.config = { ...this.defaultConfig, ...JSON.parse(configData) };
      } else {
        this.config = { ...this.defaultConfig };
        this.saveConfig();
      }
    } catch (error) {
      console.warn('⚠️  Error loading config file:', error.message);
      this.config = { ...this.defaultConfig };
    }
  }

  loadDbConfig() {
    try {
      if (fs.existsSync(this.dbConfigFile)) {
        const dbConfigData = fs.readFileSync(this.dbConfigFile, 'utf8');
        this.dbConfig = JSON.parse(dbConfigData);
      } else {
        this.dbConfig = { dbs: {} };
        console.warn('⚠️  DB config file not found:', this.dbConfigFile);
      }
    } catch (error) {
      console.warn('⚠️  Error loading DB config file:', error.message);
      this.dbConfig = { dbs: {} };
    }
  }

  getDbConfig(dbName) {
    return this.dbConfig.dbs[dbName] || null;
  }

  getAvailableDbs() {
    return Object.keys(this.dbConfig.dbs || {});
  }

  getSupportedDbTypes() {
    return DatabaseFactory.getSupportedTypes();
  }

  getDbType(dbName) {
    const dbConfig = this.getDbConfig(dbName);
    return dbConfig ? dbConfig.type || 'mssql' : null;
  }

  validateDbConfig(dbName) {
    const dbConfig = this.getDbConfig(dbName);
    if (!dbConfig) {
      return { valid: false, error: `DB configuration not found: ${dbName}` };
    }

    try {
      DatabaseFactory.validateConfig(dbConfig.type || 'mssql', dbConfig);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  async testDbConnection(dbName) {
    const dbConfig = this.getDbConfig(dbName);
    if (!dbConfig) {
      return { success: false, message: `DB configuration not found: ${dbName}` };
    }

    try {
      const connection = DatabaseFactory.createConnection(dbConfig.type || 'mssql', dbConfig);
      const result = await connection.testConnection();
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  saveConfig() {
    try {
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn('⚠️  Error saving config file:', error.message);
    }
  }

  getDefaultConfig() {
    return this.config;
  }

  updateConfig(section, key, value) {
    if (!this.config[section]) {
      this.config[section] = {};
    }
    this.config[section][key] = value;
    this.saveConfig();
  }

  async updateDefaultConfig(app) {
    console.clear();
    console.log('⚙️  Update Default Configuration');
    console.log('='.repeat(40));

    // Display available DB list
    const availableDbs = this.getAvailableDbs();
    if (availableDbs.length > 0) {
      console.log('\n🗄️  Available Databases:');
      availableDbs.forEach((dbName, index) => {
        const dbInfo = this.getDbConfig(dbName);
        console.log(`  ${index + 1}. ${dbName} (${dbInfo.server}:${dbInfo.port}/${dbInfo.database})`);
      });
      console.log();
    }

    console.log('\n🔍 Database Settings:');
    const mssqlCsvPath = await app.askQuestion(
      `CSV file path (current: ${this.config.mssql.csvPath || 'not set'}): `,
      this.config.mssql.csvPath
    );
    
    // DB selection
    if (availableDbs.length > 0) {
      const dbChoice = await app.askQuestion(
        `Select DB to use (1-${availableDbs.length}) (current: ${this.config.mssql.selectedDb || 'not set'}): `,
        availableDbs.indexOf(this.config.mssql.selectedDb) + 1
      );
      
      const selectedDbIndex = parseInt(dbChoice) - 1;
      if (selectedDbIndex >= 0 && selectedDbIndex < availableDbs.length) {
        const selectedDb = availableDbs[selectedDbIndex];
        this.config.mssql.selectedDb = selectedDb;
        const dbConfig = this.getDbConfig(selectedDb);
        this.config.mssql.dbUser = dbConfig.user;
        this.config.mssql.dbPassword = dbConfig.password;
        console.log(`✅ DB configuration applied: ${selectedDb}`);
      }
    } else {
      // Manual input (legacy)
      const mssqlDbUser = await app.askQuestion(
        `DB Account ID (current: ${this.config.mssql.dbUser || 'not set'}): `,
        this.config.mssql.dbUser
      );
      
      const mssqlDbPassword = await app.askQuestion(
        `DB Password (current: ${this.config.mssql.dbPassword ? '***' : 'not set'}): `,
        this.config.mssql.dbPassword
      );
      
      if (mssqlDbUser) this.config.mssql.dbUser = mssqlDbUser;
      if (mssqlDbPassword) this.config.mssql.dbPassword = mssqlDbPassword;
    }
    
    const mssqlTimeout = await app.askQuestion(
      `Timeout (seconds) (current: ${this.config.mssql.timeout}): `,
      this.config.mssql.timeout.toString()
    );

    console.log('\n🌐 Telnet Settings:');
    const telnetCsvPath = await app.askQuestion(
      `CSV file path (current: ${this.config.telnet.csvPath || 'not set'}): `,
      this.config.telnet.csvPath
    );
    
    const telnetTimeout = await app.askQuestion(
      `Timeout (seconds) (current: ${this.config.telnet.timeout}): `,
      this.config.telnet.timeout.toString()
    );

    // SQL execution DB selection
    if (availableDbs.length > 0) {
      console.log('\n⚙️  SQL Execution Settings:');
      const sqlDbChoice = await app.askQuestion(
        `Select DB for SQL execution (1-${availableDbs.length}) (current: ${this.config.sql.selectedDb || 'not set'}): `,
        availableDbs.indexOf(this.config.sql.selectedDb) + 1
      );
      
      const selectedSqlDbIndex = parseInt(sqlDbChoice) - 1;
      if (selectedSqlDbIndex >= 0 && selectedSqlDbIndex < availableDbs.length) {
        this.config.sql.selectedDb = availableDbs[selectedSqlDbIndex];
        console.log(`✅ SQL execution DB configured: ${this.config.sql.selectedDb}`);
      }
    }

    // Update settings
    if (mssqlCsvPath) this.config.mssql.csvPath = mssqlCsvPath;
    if (mssqlTimeout) this.config.mssql.timeout = parseInt(mssqlTimeout) || 5;
    
    if (telnetCsvPath) this.config.telnet.csvPath = telnetCsvPath;
    if (telnetTimeout) this.config.telnet.timeout = parseInt(telnetTimeout) || 3;

    this.saveConfig();
    console.log('\n✅ Configuration saved successfully.');
  }

  resetConfig() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
  }

  showCurrentConfig() {
    console.clear();
    console.log('📋 Current Configuration');
    console.log('='.repeat(40));
    
    console.log('\n🔍 Database Settings:');
    console.log(`  CSV file path: ${this.config.mssql.csvPath || 'not set'}`);
    if (this.config.mssql.selectedDb) {
      const dbConfig = this.getDbConfig(this.config.mssql.selectedDb);
      const dbType = this.getDbType(this.config.mssql.selectedDb);
      console.log(`  Selected DB: ${this.config.mssql.selectedDb}`);
      console.log(`  DB type: ${dbType || 'MSSQL'}`);
      console.log(`  Server: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`  Database: ${dbConfig.database}`);
      console.log(`  Account: ${dbConfig.user}`);
    } else {
      console.log(`  DB Account ID: ${this.config.mssql.dbUser || 'not set'}`);
      console.log(`  DB Password: ${this.config.mssql.dbPassword ? '***' : 'not set'}`);
    }
    console.log(`  Timeout: ${this.config.mssql.timeout} seconds`);
    
    console.log('\n🌐 Telnet Settings:');
    console.log(`  CSV file path: ${this.config.telnet.csvPath || 'not set'}`);
    console.log(`  Timeout: ${this.config.telnet.timeout} seconds`);
    
    console.log('\n⚙️  SQL Settings:');
    console.log(`  Template path: ${this.config.sql.templatePath}`);
    if (this.config.sql.selectedDb) {
      const dbConfig = this.getDbConfig(this.config.sql.selectedDb);
      const dbType = this.getDbType(this.config.sql.selectedDb);
      console.log(`  Selected DB: ${this.config.sql.selectedDb}`);
      console.log(`  DB type: ${dbType || 'MSSQL'}`);
      console.log(`  Server: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`  Database: ${dbConfig.database}`);
    }
    
    // Available databases list
    const availableDbs = this.getAvailableDbs();
    if (availableDbs.length > 0) {
      console.log('\n🗄️  Available Databases:');
      availableDbs.forEach(dbName => {
        const dbInfo = this.getDbConfig(dbName);
        const dbType = this.getDbType(dbName);
        const isSelected = dbName === this.config.mssql.selectedDb || dbName === this.config.sql.selectedDb;
        const status = isSelected ? ' (selected)' : '';
        console.log(`  - ${dbName}: [${dbType || 'MSSQL'}] ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}${status}`);
      });
    }
  }

  showEnvironmentVariables() {
    console.clear();
    console.log('🌍 Environment Variables');
    console.log('='.repeat(40));
    
    const envVars = [
      'API_URL',
      'LOCALDB_HOST',
      'LOCALDB_USER', 
      'LOCALDB_PASSWORD',
      'LOCALDB_DATABASE',
      'LOCALDB_PORT'
    ];
    
    console.log('\n📋 Main Environment Variables:');
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        const displayValue = varName.includes('PASSWORD') ? '***' : value;
        console.log(`  ${varName}: ${displayValue}`);
      } else {
        console.log(`  ${varName}: not set`);
      }
    });
    
    console.log('\n💻 System Information:');
    console.log(`  Operating System: ${os.platform()} ${os.arch()}`);
    console.log(`  Node.js Version: ${process.version}`);
    console.log(`  Current Directory: ${process.cwd()}`);
  }
}

module.exports = ConfigManager;
