# Node.js Integrated Utility Tool

A comprehensive utility tool for managing various local environment utilities in a unified application.

## 📁 Project Structure

```
my-node-client-util-app/
├── app.js                          # 🚀 Main integrated application
├── src/
│   └── modules/                    # 📦 Modularized features
│       ├── ConfigManager.js        # Configuration management
│       ├── DBConnectionChecker.js  # Universal DB connection and permission checker
│       ├── DBExecutor.js           # Universal DB SQL executor
│       ├── TelnetChecker.js        # Server Telnet connection checker
│       └── database/               # DB type-specific connection classes
│           ├── DatabaseFactory.js  # DB connection factory
│           ├── MSSQLConnection.js  # MSSQL connection class
│           ├── MySQLConnection.js  # MySQL connection class
│           ├── PostgreSQLConnection.js # PostgreSQL connection class
│           └── OracleConnection.js # Oracle connection class
├── config/
│   └── dbinfo.json                 # DB connection information settings
├── templet/                        # Template files
│   ├── DB_sample.csv               # CSV sample for DB checking
│   ├── SQL_001.sql                 # SQL query template
│   └── SQL_001.csv                 # SQL parameter template
├── results/                        # Check results (auto-generated)
│   ├── db_connection_check_*.csv   # DB check results
│   ├── telnet_connection_check_*.csv # Telnet check results
│   └── README.md                   # Results format documentation
├── log/                            # Execution logs (auto-generated)
└── run.bat                         # 🎯 Integrated execution tool
```

## 🚀 Usage

### 🎯 **Integrated Execution (Recommended)**
Double-click **`run.bat`** to launch the integrated menu:

```
========================================
    Node.js Integrated Utility Tool
========================================

📋 Main Menu
1. Database Connection and Permission Check
2. Server Telnet Connection Check  
3. Database SQL Execution
4. Configuration Management
5. Run All Checks (Batch Processing)
6. Exit

Select function to execute (1-6):
```

### 🔧 **Node.js Command Execution**
```bash
# Run integrated application
npm start
# or
node app.js
```

### 📦 **Key Improvements**
- **Multi-DB Support**: MSSQL, MySQL, PostgreSQL, Oracle support
- **Unified Management**: Manage all features in a single application
- **CSV Result Export**: All check results are automatically saved to CSV files
- **Batch Processing**: Execute all checks at once
- **Modularization**: Improved code structure for better maintainability
- **User-Friendly**: Intuitive menu system

## 🔍 Key Features

### 🗄️ **Multi-Database Support**
The following databases are supported:
- **Microsoft SQL Server** (MSSQL)
- **MySQL** 
- **PostgreSQL**
- **Oracle Database**

### 📊 **Database Connection and Permission Check**
`DBConnectionChecker.js` performs comprehensive checks including:

1. **Basic Connection Test**
   - Attempts database connection to specified server:port
   - Measures connection success/failure and elapsed time

2. **Database Permission Check**
   - **SELECT Permission**: System table query test
   - **INSERT Permission**: Temporary table data insertion test
   - **UPDATE Permission**: Temporary table data modification test  
   - **DELETE Permission**: Temporary table data deletion test
   - **CREATE Permission**: Table creation test
   - **DROP Permission**: Table deletion test

3. **Result Display**
   ```
   [192.168.1.100:1433][MSSQL][PRDDB][본사_ERP][SampleDB] → [✅ Success] [Permissions: SELECT, INSERT, UPDATE, DELETE]
   [192.168.1.101:3306][MYSQL][DEVDB][본사_WMS][TestDB]   → [❌ Failed] [LOGIN_FAILED] Login failed
   ```

4. **CSV Result Export**
   - All check results are automatically saved to CSV files
   - Files are saved in `results/` directory with timestamp
   - Includes detailed information for analysis and reporting

### 📋 **CSV File Format**

#### DB Check CSV:
```csv
db_name,server_ip,port,corp,proc,env_type,db_type
SampleDB,192.168.1.100,1433,본사,ERP,PRD,mssql
TestDB,192.168.1.101,3306,본사,WMS,DEV,mysql
UserDB,192.168.1.102,5432,지사,CRM,STG,postgresql
```

**Required Columns**: `db_name`, `server_ip`, `port`
**Optional Columns**: `corp`, `proc`, `env_type`, `db_type`
- `db_type`: mssql, mysql, postgresql, oracle (default: mssql)

## ⚙️ Prerequisites

1. **Node.js Installation**
   - Node.js 14.0.0 or higher required
   - Download from https://nodejs.org/

2. **Dependency Packages**
   - Automatically runs `npm install` when batch file is executed
   - Required packages: csv-parser, mssql, mysql2, pg, oracledb, telnet-client

## 🔧 Configuration

### Database Configuration

#### 🗄️ **DB Connection Information Settings (`config/dbinfo.json`)**
Database connection information is managed in the `config/dbinfo.json` file:

```json
{
  "dbs": {
    "sampleDB": {
      "type": "mssql",
      "user": "sample",
      "password": "sample1234!",
      "server": "localhost",
      "database": "SampleDB",
      "port": 1433,
      "options": { "encrypt": true, "trustServerCertificate": true }
    },
    "mysqlDB": {
      "type": "mysql",
      "user": "root",
      "password": "password",
      "server": "localhost",
      "database": "testdb",
      "port": 3306,
      "options": { "ssl": false }
    },
    "postgresDB": {
      "type": "postgresql",
      "user": "postgres",
      "password": "password",
      "server": "localhost",
      "database": "testdb",
      "port": 5432,
      "options": { "ssl": false }
    },
    "oracleDB": {
      "type": "oracle",
      "user": "hr",
      "password": "password",
      "server": "localhost",
      "database": "xe",
      "port": 1521
    }
  }
}
```

### Configuration Management
The application provides a **Configuration Management** menu for system information:
- **System Information**: Check system details and configuration file status
- **Available Databases**: View all configured databases from `config/dbinfo.json`

**Note**: All database connections use `config/dbinfo.json`. No additional environment variables are required.

## 🏗️ Build and Deployment

### Building Executable
```bash
# Build standalone executable
npm run build
# or use batch file
build.bat
```

### Creating Deployment Package
```bash
# Create complete deployment package
deploy.bat
```

The deployment package includes:
- `my-node-client-util-app.exe` - Standalone executable
- `config/` - Configuration files
- `templet/` - Template files
- `run.bat` - Launcher script
- Documentation files

## 📝 Important Notes

- Batch files only run on Windows environment.
- Uses UTF-8 encoding for proper character output.
- Ensure Node.js is installed before execution.
- For distribution, copy the entire deployment folder to target machines.

## 🌐 Internationalization

This application supports internationalization with both Korean and English interfaces:
- **English**: This file (`README.md`) - English documentation (main)
- **한국어 (Korean)**: `README_KR.md` - Korean documentation

All user interface messages and logs are displayed in English when running the application.

## 🔄 Migration from Legacy Scripts

If you're migrating from the previous separate utility scripts:
1. The old individual scripts (`mssql-check`, `telnet-check`, `sql-exec`) have been integrated into this unified application
2. All functionality is now available through the main menu system
3. Configuration management has been centralized for better user experience
4. Multi-database support has been added beyond just MSSQL

## 📞 Support

For issues or questions:
1. Check the configuration files (`config/dbinfo.json`, `.env`)
2. Verify Node.js and dependency package installation
3. Ensure database servers are accessible from your network
4. Check CSV file formats and required columns

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Compatibility**: Node.js 14.0.0+
