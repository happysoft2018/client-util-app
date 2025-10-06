const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');
require('dotenv').config();

class DBExecutor {
  constructor(configManager) {
    this.configManager = configManager;
    this.templateDir = path.join(__dirname, '../../templet');
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
      throw new Error('DB configuration is required. Please select a DB in settings management.');
    }

    const dbConfig = this.configManager.getDbConfig(selectedDbName);
    if (!dbConfig) {
      throw new Error(`Selected DB configuration not found: ${selectedDbName}`);
    }
    
    const dbType = this.configManager.getDbType(selectedDbName);
    const remoteConnection = DatabaseFactory.createConnection(dbType, dbConfig);
    await remoteConnection.connect();

    return { remoteConnection };
  }

  async executeSql(remoteConnection, sqlName, query, rows) {
    const pcIp = this.getLocalIp();
    const startTime = Date.now();
    let totalCount = 0;
    let errorMsg = '';
    let resultCode = 'Success';
    let sqlId = null;

    // Logging functionality removed - all DB operations now use config/dbinfo.json

    // Create log directory
    const now = new Date();
    const yyyymmdd = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0');
    const logDir = path.join(__dirname, '../../log', yyyymmdd);

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    console.log(`\n📊 Executing SQL with ${rows.length} parameters...`);
    console.log('-'.repeat(50));

    // Execute SQL for each row
    for (const row of rows) {
      try {
        const result = await remoteConnection.executeQuery(query, row);
        totalCount += result.rowCount;

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
        
        console.log(`✅ Completed: ${JSON.stringify(row)} (Result: ${result.rowCount} rows)`);

      } catch (err) {
        errorMsg += err.message + '\n';
        resultCode = 'Failed';
        console.error(`❌ Error: ${JSON.stringify(row)} - ${err.message}`);
      }
    }

    // Execution end time and processing duration
    const endTime = Date.now();
    const elapsed = ((endTime - startTime) / 1000).toFixed(2);

    // Logging functionality removed - results are shown in console and log files

    console.log('\n📈 Execution Result Summary:');
    console.log(`  Total processed parameters: ${rows.length}`);
    console.log(`  Total result rows: ${totalCount}`);
    console.log(`  Execution result: ${resultCode}`);
    console.log(`  Elapsed time: ${elapsed} seconds`);

    return { totalCount, resultCode, elapsed };
  }

  async run(sqlName) {
    if (!sqlName) {
      throw new Error('SQL file name is required.');
    }

    const sqlFilePath = path.join(this.templateDir, `${sqlName}.sql`);
    const csvFilePath = path.join(this.templateDir, `${sqlName}.csv`);

    // Check file existence
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file does not exist: ${sqlFilePath}`);
    }
    
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Parameter CSV file does not exist: ${csvFilePath}`);
    }

    console.log(`\n📄 SQL file: ${sqlFilePath}`);
    console.log(`📄 Parameter file: ${csvFilePath}`);

    // Read SQL file
    const query = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log(`\n🔍 SQL Query Content:`);
    console.log('-'.repeat(30));
    console.log(query);
    console.log('-'.repeat(30));

    // Create DB connection
    const selectedDbName = this.configManager.getDefaultConfig().sql.selectedDb;
    const { remoteConnection } = await this.createConnections(selectedDbName);
    
    if (selectedDbName) {
      const dbConfig = this.configManager.getDbConfig(selectedDbName);
      const dbType = this.configManager.getDbType(selectedDbName);
      console.log(`\n🗄️  Database in use: ${selectedDbName}`);
      console.log(`   DB type: ${dbType || 'MSSQL'}`);
      console.log(`   Server: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`   Database: ${dbConfig.database}`);
      console.log(`   Account: ${dbConfig.user}`);
    }

    try {
      // Parse CSV file
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on('data', (row) => {
            rows.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (rows.length === 0) {
        throw new Error('CSV file is empty.');
      }

      console.log(`\n📋 Parameter Data (${rows.length} entries):`);
      rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row)}`);
      });

      // Execute SQL
      const result = await this.executeSql(remoteConnection, sqlName, query, rows);
      
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
