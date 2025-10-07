# Node.js Integrated Utility Tool v1.2.0

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
├── request_resources/              # Resource files directory (v1.2.0+)
│   ├── DB_sample.csv               # DB check CSV files (starts with DB_)
│   ├── server_sample.csv           # Telnet check CSV files (starts with server_)
│   └── sql_files/                  # SQL files directory
│       ├── SQL_001.sql             # SQL query template
│       └── SQL_001.csv             # SQL parameter template
├── results/                        # Check results (auto-generated)
│   ├── db_connection_check_*.csv   # DB check results
│   ├── telnet_connection_check_*.csv # Telnet check results
│   └── README.md                   # Results format documentation
├── log/                            # Execution logs (auto-generated)
└── run.bat                         # 🎯 Integrated execution tool
```

## 🆕 v1.2.0 New Features

### Enhanced Log Output
- **Database-specific separators**: Clear visual separation between database checks
- **Improved readability**: Better formatting with line breaks and emojis
- **Real-time progress**: Enhanced console output during checks

### Detailed Error Capture
- **Operation-specific errors**: SELECT/INSERT/DELETE error messages saved to CSV
- **Comprehensive logging**: Up to 500 characters of detailed error information
- **Better troubleshooting**: Specific error details for problem diagnosis

### Streamlined File Management
- **Unified CSV location**: All CSV files now in `request_resources/` directly
- **Smart filtering**: Automatic file filtering based on naming convention
  - DB checks: Files starting with `DB_`
  - Telnet checks: Files starting with `server_`
- **Simplified structure**: No more subdirectories for CSV files

### Enhanced DELETE Operations
- **Multi-column conditions**: DELETE queries now use all specified columns
- **Safer testing**: More precise data deletion for accurate permission checks
- **Better query logging**: Actual executed queries saved to results

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

2. **Database Permission Check** (v1.1.0 Updated)
   - **SELECT Permission**: Executes actual query specified in CSV
   - **INSERT Permission**: Inserts test data into actual table specified in CSV
   - **DELETE Permission**: Deletes inserted test data
   
   > ⚠️ **Note**: CREATE, DROP, and UPDATE permission checks have been removed for safety.

3. **Actual Query Testing**
   - Executes SELECT query specified in CSV file
   - Verifies query execution success and results
   - Tests under the same conditions as production environment

4. **Result Display**
   ```
   [192.168.1.100:1433][MSSQL][sa][SampleDB][customers] → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
   [192.168.1.101:3306][MYSQL][root][TestDB][users]    → [❌ Failed] [LOGIN_FAILED] Login failed
   ```

5. **CSV Result Export**
   - All check results are automatically saved to CSV files with timestamp
   - Files are saved in `results/` directory
   - Records success/failure status for each permission
   - Includes detailed information for analysis and reporting

### 📋 **CSV File Format** (v1.1.0 Updated)

#### DB Check CSV (Basic Connection Check Only):
```csv
db_name,username,password,server_ip,port,db_type,db_title
SampleDB,sa,1111,localhost,1433,mssql,Sample MSSQL DB
TestDB,root,1111,localhost,3306,mysql,Test MySQL DB
UserDB,postgres,1111,localhost,5432,postgresql,User PostgreSQL DB
```

**Required Columns**: `db_name`, `username`, `password`, `server_ip`, `port`, `db_type`
**Optional Columns**: `db_title`

#### DB Check CSV (With Full Permission Check):
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,1111,localhost,1433,mssql,Sample DB,"SELECT top 3 customername from customers",customers,"customercode, customername","test001, Test Customer"
TestDB,root,1111,localhost,3306,mysql,Test DB,"SELECT title from boards",boards,"title, content, userid","test, test content, admin"
UserDB,postgres,1111,localhost,5432,postgresql,User DB,"SELECT name from servers",users,"id, email, name","test001, test@example.com, Test User"
```

**Additional Columns (For Permission Check)**:
- `select_sql`: SELECT query to execute
- `crud_test_table`: Table name for INSERT/DELETE testing
- `crud_test_columns`: Column names for testing (comma-separated)
- `crud_test_values`: Test values (comma-separated)

**Database Types**:
- `db_type`: mssql, mysql, postgresql, oracle

#### Telnet Check CSV:
```csv
server_ip,port,server_name
192.168.1.100,8080,HQ ERP Web Server
192.168.1.101,3306,HQ WMS DB Server
192.168.1.102,22,Branch CRM SSH Server
```

**Required Columns**: `server_ip`, `port`
**Optional Columns**: `server_name` (Server description for identification)

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
