const fs = require('fs');
const csv = require('csv-parser');
const os = require('os');
const path = require('path');
const DatabaseFactory = require('./database/DatabaseFactory');

class DBExecutor {
  constructor(configManager, readlineInterface = null) {
    this.configManager = configManager;
    this.sqlFilesDir = path.join(__dirname, '../../request_resources/sql_files');
    this.rl = readlineInterface || require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} (default: ${defaultValue}): ` : `${question} `;
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

  async executeSql(remoteConnection, sqlName, query, rows, selectedDbName, dbConfig, dbType) {
    const pcIp = this.getLocalIp();
    const startTime = Date.now();
    let totalCount = 0;
    let errorMsg = '';
    let resultCode = 'Success';
    let sqlId = null;
    let groupedResults = []; // Array to store results grouped by parameters

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

    // Create results directory
    const resultsDir = path.join(__dirname, '../../results/sql_files');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    console.log(`\n📊 Executing SQL with ${rows.length} parameters...`);
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
        
        console.log(`✅ Completed: ${JSON.stringify(row)} (Result: ${result.rowCount} rows)`);

      } catch (err) {
        errorMsg += err.message + '\n';
        resultCode = 'Failed';
        console.error(`❌ Error: ${JSON.stringify(row)} - ${err.message}`);
        
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
        console.log(`\n📄 CSV file saved: ${csvFile}`);
        console.log(`   Total parameter sets: ${groupedResults.length}`);
        console.log(`   Total result rows: ${totalCount}`);
      } catch (csvError) {
        console.error(`⚠️  Warning: Failed to save CSV file: ${csvError.message}`);
      }
    }

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

    const sqlFilePath = path.join(this.sqlFilesDir, `${sqlName}.sql`);
    const csvFilePath = path.join(this.sqlFilesDir, `${sqlName}.csv`);
    const jsonFilePath = path.join(this.sqlFilesDir, `${sqlName}.json`);

    // Check file existence
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file does not exist: ${sqlFilePath}`);
    }
    
    // Check if either CSV or JSON file exists
    const hasCsv = fs.existsSync(csvFilePath);
    const hasJson = fs.existsSync(jsonFilePath);
    
    if (!hasCsv && !hasJson) {
      throw new Error(`Parameter file does not exist. Need either ${csvFilePath} or ${jsonFilePath}`);
    }
    
    // Determine which parameter file to use (prefer JSON if both exist)
    const paramFilePath = hasJson ? jsonFilePath : csvFilePath;
    const paramFileType = hasJson ? 'JSON' : 'CSV';

    console.log(`\n📄 SQL file: ${sqlFilePath}`);
    console.log(`📄 Parameter file (${paramFileType}): ${paramFilePath}`);

    // Read SQL file
    const query = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log(`\n🔍 SQL Query Content:`);
    console.log('-'.repeat(30));
    console.log(query);
    console.log('-'.repeat(30));

    // Select database from available databases
    const availableDbs = this.configManager.getAvailableDbs();
    if (availableDbs.length === 0) {
      throw new Error('No databases configured. Please add database configurations to config/dbinfo.json');
    }

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
    
    const selectedDbName = availableDbs[selectedDbIndex];
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
        // Parse CSV file
        await new Promise((resolve, reject) => {
          fs.createReadStream(paramFilePath)
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
