# Node.js Integrated Utility Tool v1.3.7

A comprehensive utility tool for managing various local environment utilities in a unified application.

🌏 **Multi-language Support**: English / Korean (한국어)

## 📁 Project Structure

```
my-node-client-util-app/
├── app.js                          # 🚀 Main integrated application
├── src/
│   └── modules/                    # 📦 Modularized features
│       ├── ConfigManager.js        # Configuration management
│       ├── DBConnectionChecker.js  # Universal DB connection and permission checker
│       ├── DBExecutor.js           # Universal DB SQL executor
│       ├── CSVQueryExecutor.js     # CSV-based batch query executor
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
│   ├── SQL_sample.csv              # CSV-based batch query file (starts with SQL_) (v1.3.6+)
│   └── sql_files/                  # SQL files directory
│       ├── SQL_001.sql             # SQL query template
│       └── SQL_001.csv             # SQL parameter template
├── results/                        # Check results (auto-generated)
│   ├── db_connection_check_*.csv   # DB check results
│   ├── telnet_connection_check_*.csv # Telnet check results
│   ├── csv_queries/                # CSV-based query results (v1.3.6+)
│   └── README.md                   # Results format documentation
├── log/                            # Execution logs (auto-generated)
├── run.bat                         # 🎯 Launcher (English)
└── 실행하기.bat                     # 🎯 Launcher (Korean)
```

## 🆕 Latest Updates

### v1.3.7 - CSV Query Result Output Improvements (2025-10-24) 🐛

**Bug Fixes:**
- **Enhanced Newline Handling**: Procedure definitions and multi-line text now display cleanly in CSV format
  - Replaces all newlines with spaces for single-line storage
  - Quotes values only when they contain commas/quotes in CSV files
  - Easy to read in Excel or text editors

### v1.3.6 - CSV-based Batch Query Execution (2025-10-21) 📊

**New Module:**
- **CSVQueryExecutor**: Execute multiple SQL queries from a CSV file in batch
  - Define queries and output file paths in CSV format
  - Supports date/time variables in file paths: `${DATE:format}`
  - Automatic directory creation for output files
  - Results saved as CSV files with timestamp

**Security Features:**
- **Query Validation**: Only SELECT queries and safe system procedures allowed
  - Blocked: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE
  - Allowed: sp_helptext, sp_help, sp_who, sp_columns, sp_tables, etc.
- **Protection**: Prevents accidental data modification or deletion

**CSV Format:**
```csv
SQL,result_filepath
"select * from users;",results/csv_queries/users_${DATE:yyyyMMddHHmmss}.csv
"exec sp_helptext 'dbo.MyProc';",results/csv_queries/proc_definition.txt
```

### v1.3.5 - Extended Multi-language Support (2025-10-20) 🌏

**Additional Module Localization:**
- Added multi-language messages to DBConnectionChecker, DBExecutor, and TelnetChecker modules
- All user messages unified in English/Korean
- All error messages translated including database connection errors, SQL execution errors
- Improved translation quality of user input prompts

**Documentation Updates:**
- Updated request documentation
- Updated user manual
- Synchronized version information

### v1.3.4 - Multi-language & Encoding Support (2025-10-18) 🌏

**Multi-language Support (English/Korean):**
- Added `--lang` parameter to select UI language
  - English: Run with `run.bat` or `node app.js --lang=en`
  - Korean: Run with `실행하기.bat` or `node app.js --lang=kr`
- All UI messages (menus, prompts, errors) available in both languages
- Over 60 messages translated for seamless experience

**CSV Encoding:**
- **UTF-8 encoding required** for all CSV files
- Fixed Korean character corruption issues
- Applies to all CSV inputs: DB connection check, Telnet check, SQL parameters
- 📝 **Important**: Save your CSV files with UTF-8 encoding (see User Manual for details)

**Release Script Enhancement:**
- Version automatically read from `package.json`
- Dual launcher scripts (English/Korean) generated automatically
- ZIP archive creation for easy distribution

### v1.3.3 - Critical Bug Fix (2025-10-16) 🔧

**Fixed Release Package Path Resolution:**
- Fixed path resolution in pkg executable: Changed from `process.cwd()` to `path.dirname(process.execPath)`
- **Root cause**: `process.cwd()` returns the directory where the command was executed, not where the executable is located
- **Impact**: Release package now correctly reads resources from the executable's directory regardless of where it's run from
- Affected: `request_resources/`, `config/dbinfo.json`, `results/`, `log/` directories

### v1.3.0 - Database SQL Executor Major Improvements ⭐
- **CSV Result File Generation**: Automatically save SQL execution results to structured CSV
  - Location: `results/sql_files/`
  - Filename: `{SQL_name}_{DB_name}_{timestamp}.csv`
  - DB info header and condition-based grouping

- **Preprocessor Directive**: Specify database connection with `#DATABASE` or `#DB` in SQL files
  ```sql
  #DATABASE sampleDB
  
  SELECT * FROM users WHERE id = @user_id;
  ```

- **JSON Parameter Support**: Support JSON format parameter files alongside CSV
  ```json
  [
      { "user_id": 1 },
      { "user_id": 2 }
  ]
  ```

### MariaDB Support Added
- **MariaDB Database**: Support MariaDB with MySQL-compatible driver
- **Supported DBs**: MSSQL, MySQL, **MariaDB** ⭐, PostgreSQL, Oracle

### v1.2.0 Existing Features

#### Enhanced Log Output
- **Database-specific separators**: Clear visual separation between database checks
- **Improved readability**: Better formatting with line breaks and emojis
- **Real-time progress**: Enhanced console output during checks

#### Detailed Error Capture
- **Operation-specific errors**: SELECT/INSERT/DELETE error messages saved to CSV
- **Comprehensive logging**: Up to 500 characters of detailed error information
- **Better troubleshooting**: Specific error details for problem diagnosis

#### Streamlined File Management
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
4. CSV-based Batch Query Execution  ⭐ NEW
5. Configuration Management
0. Exit

Select function to execute:
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

### Build Script

**`build.bat`** - Build executable only

```batch
build.bat
```

**Actions:**
1. Check Node.js and npm environment
2. Install dependencies (npm install)
3. Build executable using pkg
4. Output: `dist\my-node-client-util-app.exe`

**When to use:** Quick build testing

### Release Script (All-in-One)

**`release.bat`** - Build + Deploy Package Automation ⭐

```batch
release.bat
```

**Actions:**
1. Clean previous releases
2. Build application (npm run build)
3. Create release/my-node-client-util-app-v1.3.0/ folder
4. Copy executable
5. Copy configuration files (config/)
6. Copy sample files (request_resources/)
7. Create output folders (results/, log/)
8. Copy documentation (README, manuals, changelog - 8 files)
9. Create launcher script (run.bat)
10. Generate version info file (VERSION_INFO.txt)
11. Generate release notes (RELEASE_NOTES.txt)

**Output:**
- `release/my-node-client-util-app-v1.3.0/` - Deployment package
- `release/my-node-client-util-app-v1.3.0.zip` - ZIP archive (optional)

**When to use:** Creating complete deployment package (recommended)

### Deployment Workflow

#### For Developers:
```batch
# 1. Modify code and test
node app.js

# 2. Quick build test
build.bat

# 3. Create official release package (recommended)
release.bat
```

#### For End Users:
```
1. Download release/my-node-client-util-app-v1.3.0.zip
2. Extract the archive
3. Edit config/dbinfo.json for your environment
4. Run run.bat
```

### Deployment Package Structure

```
my-node-client-util-app-v1.3.0/
├── my-node-client-util-app.exe    # Executable
├── run.bat                         # Launcher script
├── VERSION_INFO.txt                # Version information
├── RELEASE_NOTES.txt               # Release notes
├── config/
│   └── dbinfo.json                 # DB configuration (user customizable)
├── request_resources/
│   ├── DB_sample.csv               # DB check sample
│   ├── server_sample.csv           # Telnet check sample
│   └── sql_files/
│       ├── SQL_001.sql             # SQL sample (#DATABASE directive)
│       └── SQL_001.csv             # Parameter sample
├── results/
│   └── sql_files/                  # SQL execution results location
├── log/                            # Log files location
└── Documentation/
    ├── README.md
    ├── README_KR.md
    ├── USER_MANUAL.md
    ├── USER_MANUAL_KR.md
    ├── CHANGELOG.md
    ├── CHANGELOG_KR.md
    ├── MIGRATION_GUIDE.md
    └── MIGRATION_GUIDE_KR.md
```

### Creating Deployment Package
```bash
# Create complete deployment package
release.bat
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

