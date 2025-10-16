# Changelog

## [1.3.3] - 2025-10-16

### 🐛 Critical Bug Fixes

#### Fixed Release Package Path Resolution
- **Fixed path resolution in pkg executable**: Changed from `process.cwd()` to `path.dirname(process.execPath)`
  - **Root cause**: `process.cwd()` returns the directory where the command was executed, not where the executable is located
  - **Solution**: Use `path.dirname(process.execPath)` to get the correct executable directory
  - Release package now correctly reads `request_resources/` from the executable's directory
  - Configuration files (`config/dbinfo.json`) now loaded from the correct location
  - Results and logs now saved to the correct directories relative to the executable

#### Impact
- Before: Running the executable from a different directory would fail to find resources
- After: Executable now works correctly regardless of where it's run from

#### Affected Files
- `app.js`: Changed `APP_ROOT = process.pkg ? process.cwd() : __dirname` → `APP_ROOT = process.pkg ? path.dirname(process.execPath) : __dirname`
- `ConfigManager.js`: Same APP_ROOT fix
- `DBExecutor.js`: Same APP_ROOT fix + simplified path logic
- `DBConnectionChecker.js`: Added APP_ROOT constant and removed fallback logic
- `TelnetChecker.js`: Added APP_ROOT constant and removed fallback logic

## [1.3.2] - 2025-10-14

### 🐛 Bug Fixes

#### Fixed Executable Path Issue
- **Use Current Working Directory**: Use `process.cwd()` instead of `process.execPath` in pkg executable
  - Executable now correctly recognizes `request_resources/` folder in current directory
  - Executable now correctly recognizes `config/` folder in current directory
  - Executable now saves results to `results/` folder in current directory
  - Executable now saves logs to `log/` folder in current directory

#### Affected Files
- `app.js`: Changed APP_ROOT to use process.cwd()
- `DBExecutor.js`: Changed APP_ROOT, logDir, resultsDir to be based on process.cwd()
- `ConfigManager.js`: Changed APP_ROOT to use process.cwd()
- `DBConnectionChecker.js`: Changed getResultsDir() to be based on process.cwd()
- `TelnetChecker.js`: Changed getResultsDir() to be based on process.cwd()

## [1.3.1] - 2025-10-14

### 🔧 Technical Improvements

#### Improved pkg Environment File Path Handling
- **Added APP_ROOT constant**: Use correct file paths in both pkg and development environments
  - `app.js`: Added APP_ROOT constant and changed __dirname → APP_ROOT
  - `DBExecutor.js`: Modified sqlFilesDir path to use APP_ROOT
  - `ConfigManager.js`: Modified dbConfigFile and resultsDir paths to use APP_ROOT

#### Improved dbinfo.json Structure
- **Removed dbs wrapper**: DB settings placed directly in root
  - Before: `{"dbs": {"sampleDB": {...}}}`
  - After: `{"sampleDB": {...}}`
  - More concise structure for better readability

#### Improved pkg Configuration
- **Extended assets**: Include all JSON files in config directory
- **Added documentation files**: Include USER_MANUAL, CHANGELOG, etc.
- **Added app.js script**: Include app.js in pkg build

### 🐛 Bug Fixes
- **Fixed request_resources access error in exe**: Resolved by using APP_ROOT instead of __dirname in pkg environment
- **Fixed config file access error in exe**: Use correct path in pkg environment

## [1.3.0] - 2025-10-08

### 🎯 Major Changes

#### Database SQL Executor Major Improvements
- **CSV Result File Generation**: Automatically save SQL execution results to structured CSV files
  - Location: `results/sql_files/`
  - Filename format: `{SQL_name}_{DB_name}_{timestamp}.csv`
  - Example: `SQL_001_sampleDB_20251008_143025.csv`

- **Result File Structure**:
  - **Database Info Header**: Display DB name, type, server, execution time and other metadata
  - **Condition-based Grouping**: Clearly separate results for each parameter set
  - **Parameter Information**: Show parameter values for each execution condition
  - **Result Count**: Display number of result rows for each condition

- **Preprocessor Directive Introduction**: Specify database connection in SQL files
  - Format: `#DATABASE dbname` or `#DB dbname`
  - Directive lines are automatically removed before execution (DB engine compatibility)
  - If not specified, can be selected from CLI

#### Parameter File Extension
- **JSON File Support**: Support JSON format parameter files alongside CSV
  - Array format: `[{...}, {...}]` (multiple conditions)
  - Single object: `{...}` (one condition)
  - JSON takes priority if both JSON and CSV exist

#### Database Support Expansion
- **MariaDB Added**: Support MariaDB using MySQL-compatible driver
  - Added mariadb type to DatabaseFactory
  - Added example to config/dbinfo.json
  - Updated user manuals

### 🔧 Technical Improvements

#### DBExecutor Enhancements
- **Unified Parameter Parsing**: Can process both CSV and JSON files
- **DB Info Propagation**: Include DB metadata in execution results
- **Preprocessor Parsing**: Logic for extracting and removing SQL directives

#### User Experience Improvements
- **Automatic DB Selection**: Auto-select when DB is specified in SQL file
- **Structured Output**: CSV with clearly separated parameters and results
- **Error Handling**: Display available DB list when invalid DB name is specified

### 🐛 Bug Fixes
- **CSV Parameter Format**: Fixed JSON array format to standard CSV format
  - Before: `[{min_price:1000000, max_price:2000000}]`
  - After: `min_price,max_price\n1000000,2000000`

### 📚 Documentation Updates
- **USER_MANUAL_KR.md / USER_MANUAL.md**:
  - Greatly expanded Database SQL Execution section
  - Added JSON parameter file writing guide
  - Added #DATABASE directive usage
  - Added 3 usage examples (product search by price range, order search by period, complex query)
  - Added MariaDB-related content

---

## [1.2.0] - 2025-01-07

### 🎯 Major Changes

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

#### Enhanced DELETE Operations
- **Multi-column conditions**: DELETE queries now use all specified columns
- **Safer testing**: More precise data deletion for accurate permission checks
- **Better query logging**: Actual executed queries saved to results

### 🔧 Technical Improvements

#### CSV Result Format Extension
- **New columns added**:
  - `insert_query`: Executed INSERT query statement
  - `delete_query`: Executed DELETE query statement
  - `operation_errors`: Operation-specific error messages (SELECT/INSERT/DELETE)

#### Code Improvements
- **Enhanced error handling**: Error message capture in all database connection classes
- **Log formatting**: Consistent log output format applied
- **File filtering**: Efficient CSV file selection logic

### 🐛 Bug Fixes
- **PostgreSQL parameter binding**: Fixed to save actual values in CSV for INSERT/DELETE queries
- **Oracle connection reuse**: Improved connection reuse logic to prevent NJS-003 errors
- **MSSQL DML queries**: Fixed recordset undefined error for INSERT/DELETE operations

---

## [1.1.0] - 2025-10-05

### 🎯 Major Changes

#### Database Permission Check Logic Improvements

**Modified Permission Check Items:**
- ✅ **Retained**: SELECT, INSERT, DELETE permission checks
- ❌ **Removed**: CREATE TABLE, DROP TABLE, UPDATE permission checks

**Reasons for Changes:**
- Testing CREATE/DROP permissions in production environments poses high risks
- Prevents unnecessary resource usage from temporary table creation
- UPDATE permission can be sufficiently verified through INSERT/DELETE

### 🔧 Feature Improvements

#### 1. CSV File Format Extension
**New Columns Added:**
- `select_sql`: Specifies SELECT query to execute
- `crud_test_table`: Table name to use for permission testing
- `crud_test_columns`: Column names for testing (comma-separated)
- `crud_test_values`: Values for testing (comma-separated)

**CSV Format Example:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,user,pass,localhost,1433,mssql,Sample DB,"SELECT top 3 name from customers",customers,"customercode, customername","test001, Test Customer"
```

#### 2. Permission Check Method Changes
**Previous Method:**
- Created temporary table (`temp_permission_test_[timestamp]`)
- Tested INSERT/UPDATE/DELETE on temporary table
- Cleaned up with table DROP

**Current Method:**
- Uses actual tables specified in CSV
- SELECT: Executes `select_sql` query from CSV
- INSERT: Inserts data using table/columns/values from CSV
- DELETE: Deletes inserted data based on first column

**Advantages:**
- Can verify permissions on actual production tables
- No need for temporary table creation/deletion
- Can measure actual query performance

### 🐛 Bug Fixes

#### 1. Oracle Database Connection Error Fix
**Issue:** `NJS-003: invalid or closed connection` error occurred

**Cause:**
- `checkPermissions()` method attempted reconnection while already connected
- Connection closed at method end, causing subsequent operations to fail

**Solution:**
- Added connection status check logic
- Reuses existing connection if already connected
- Only disconnects if connection was made within the method

**Applied to:**
- `MSSQLConnection.js`
- `MySQLConnection.js`
- `OracleConnection.js`
- `PostgreSQLConnection.js`

#### 2. SELECT Query Duplicate Execution Fix
**Issue:** SELECT query executed multiple times with duplicate success/failure messages

**Cause:**
- Executed once in `checkPermissions()`
- Executed once in `checkDbConnection()`
- Executed once in `testCrudOperations()`

**Solution:**
- SELECT query now only executes in `checkPermissions()`
- Removed duplicate execution code
- `testCrudOperations()` now only handles INSERT/DELETE

### 📊 Result CSV Format Changes

**Previous Header:**
```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_update,perm_delete,perm_create,perm_drop,select_result_data,select_elapsed,insert_success,insert_elapsed,update_success,update_elapsed,delete_success,delete_elapsed
```

**Current Header:**
```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_delete,insert_success,delete_success
```

**Removed Columns:**
- `perm_update`, `perm_create`, `perm_drop`: Permission checks removed
- `select_result_data`, `select_elapsed`: Duplicate as included in permission check
- `insert_elapsed`, `update_success`, `update_elapsed`, `delete_elapsed`: Only showing success/failure

### 🔄 Migration Guide

#### CSV File Update
Existing CSV files need new columns added:

**Minimum Configuration (Permission check only):**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
```

**Connection Check Only (No permission check):**
```csv
db_name,username,password,server_ip,port,db_type,db_title
TestDB,user,pass,localhost,1433,mssql,Test DB
```
- Performs basic permission check only if `select_sql`, `crud_test_table`, etc. are absent

**Full Permission Check:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
TestDB,user,pass,localhost,1433,mssql,Test DB,"SELECT TOP 3 * FROM users",users,"id, name, email","test001, Test User, test@example.com"
```

#### Result CSV Interpretation Changes
- `perm_select`, `perm_insert`, `perm_delete`: Y/N indicates permission availability
- `insert_success`, `delete_success`: SUCCESS/FAILED/SKIPPED indicates execution result

### 📝 Known Limitations

1. **INSERT/DELETE Testing**
   - Permission check skipped if no table information in CSV
   - Table must actually exist
   - Number of columns and values must match

2. **Data Cleanup**
   - Data cleaned up with DELETE after INSERT
   - Data may remain if DELETE fails
   - Recommend using unique test IDs

3. **Permission Check Accuracy**
   - SELECT: Determined by success of CSV query execution
   - INSERT/DELETE: Determined by success of execution on actual table
   - UPDATE permission not directly verified

### 🔜 Future Plans

- [ ] Transaction support for automatic test data rollback
- [ ] Include detailed error messages in result CSV
- [ ] Retry logic for permission check failures
- [ ] Result visualization through web dashboard

---

## [1.0.0] - 2025-08-27 (Initial Release)

### ✨ Initial Release

#### Key Features
- Multi-database support (MSSQL, MySQL, PostgreSQL, Oracle)
- Database connection and permission checking
- Server Telnet connection checking
- SQL execution and result storage
- Integrated menu system
- Automatic CSV result saving

#### Supported Databases
- Microsoft SQL Server (MSSQL)
- MySQL
- PostgreSQL
- Oracle Database

#### Core Modules
- `ConfigManager.js`: Configuration management
- `DBConnectionChecker.js`: DB connection and permission checking
- `DBExecutor.js`: SQL execution
- `TelnetChecker.js`: Telnet connection checking
- `DatabaseFactory.js`: DB connection factory pattern

---

## Legend

- ✨ **Added**: New features
- 🔧 **Changed**: Changes to existing features
- 🐛 **Fixed**: Bug fixes
- ❌ **Removed**: Removed features
- 📝 **Deprecated**: To be removed in future
- 🔒 **Security**: Security-related fixes

