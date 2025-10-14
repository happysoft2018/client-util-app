const fs = require('fs');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');

// pkg 실행 파일 경로 처리
const APP_ROOT = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '../..');

class ConfigManager {
  constructor() {
    this.dbConfigFile = path.join(APP_ROOT, 'config', 'dbinfo.json');
    
    this.loadDbConfig();
  }

  loadDbConfig() {
    try {
      if (fs.existsSync(this.dbConfigFile)) {
        const dbConfigData = fs.readFileSync(this.dbConfigFile, 'utf8');
        this.dbConfig = JSON.parse(dbConfigData);
      } else {
        throw new Error(`Database configuration file not found: ${this.dbConfigFile}`);
      }
    } catch (error) {
      console.warn('⚠️  Error loading DB config file:', error.message);
      this.dbConfig = {};
    }
  }

  getDbConfig(dbName) {
    return this.dbConfig[dbName];
  }

  getAvailableDbs() {
    return Object.keys(this.dbConfig || {});
  }

  getSupportedDbTypes() {
    const dbTypes = new Set();
    Object.values(this.dbConfig || {}).forEach(db => {
      dbTypes.add({ name: db.type.toUpperCase(), type: db.type });
    });
    return Array.from(dbTypes);
  }

  getDbType(dbName) {
    const db = this.dbConfig[dbName];
    return db ? db.type : null;
  }

  validateDbConfig(dbName) {
    const db = this.getDbConfig(dbName);
    if (!db) {
      return { success: false, message: `Database configuration not found: ${dbName}` };
    }

    try {
      DatabaseFactory.validateConfig(db.type, db);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async testDbConnection(dbName) {
    const db = this.getDbConfig(dbName);
    if (!db) {
      return { success: false, message: `Database configuration not found: ${dbName}` };
    }

    try {
      const connection = DatabaseFactory.createConnection(db.type, db);
      const result = await connection.testConnection();
      await connection.disconnect();
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  showEnvironmentVariables() {
    console.clear();
    console.log('🌍 System Information');
    console.log('='.repeat(40));
    
    console.log('\n💻 System Information:');
    console.log(`  Operating System: ${process.platform} ${process.arch}`);
    console.log(`  Node.js Version: ${process.version}`);
    console.log(`  Application Directory: ${process.cwd()}`);
    
    console.log('\n📁 Configuration Files:');
    console.log(`  DB Config: ${this.dbConfigFile}`);
    console.log(`  DB Config Status: ${fs.existsSync(this.dbConfigFile) ? '✅ Found' : '❌ Not found'}`);
    
    console.log('\n📁 Results Directory:');
    const resultsDir = path.join(APP_ROOT, 'results');
    console.log(`  Results Dir: ${resultsDir}`);
    console.log(`  Results Status: ${fs.existsSync(resultsDir) ? '✅ Found' : '❌ Not found'}`);
  }
}

module.exports = ConfigManager;