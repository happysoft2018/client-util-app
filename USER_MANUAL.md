# User Manual v1.3.6

## 📖 Table of Contents

1. [Introduction](#introduction)
2. [Major Changes](#major-changes)
3. [CSV File Writing Guide](#csv-file-writing-guide)
4. [Database Permission Check](#database-permission-check)
5. [Execution Method](#execution-method)
6. [Checking Results](#checking-results)
7. [Database SQL Execution Feature](#database-sql-execution-feature)
8. [CSV-based Batch Query Execution](#csv-based-batch-query-execution) ⭐ NEW
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Introduction

This manual guides you through using the database connection, permission check, and SQL execution features of the Node.js Integrated Utility Tool v1.3.6.

### Key Features of v1.3.6

#### CSV-based Batch Query Execution 📊
- ✅ **Batch SQL Execution**: Execute multiple SQL queries from a single CSV file
- ✅ **Date/Time Variables**: Support dynamic file paths with `${DATE:format}`
- ✅ **Security Features**: Only SELECT queries and safe system procedures allowed
- ✅ **Auto Directory Creation**: Automatically creates output directories if they don't exist
- ✅ **Flexible Output Paths**: Support both absolute and relative file paths

### Key Features of v1.3.4

#### Multi-language Support 🌏
- ✅ **Language Selection**: Choose UI language with `--lang` parameter
  - English: Run `run.bat` or `node app.js --lang=en`
  - Korean: Run `실행하기.bat` or `node app.js --lang=kr`
- ✅ **Internationalized UI**: All menus, prompts, and messages available in both languages
- ✅ **Seamless Experience**: Over 60 messages translated

#### CSV Encoding Support 📝
- ✅ **UTF-8 Encoding**: All CSV files must be saved in UTF-8 encoding
- ✅ **Korean Character Support**: Proper display of Korean, Chinese, Japanese characters
- ✅ **Universal Compatibility**: Works across all platforms and tools
- ✅ **Reliable Processing**: Consistent behavior in both development and production environments

### Key Features of v1.3.3

#### Critical Bug Fix
- ✅ **Fixed Path Resolution**: Release package now correctly reads resources from executable's directory
- ✅ **Improved Portability**: Executable works correctly regardless of where it's run from
- ✅ **Root Cause Fixed**: Changed from `process.cwd()` to `path.dirname(process.execPath)`

### Key Features of v1.3.0

#### Database SQL Executor Improvements
- ✅ **CSV Result File Generation**: Automatically save SQL execution results to structured CSV files
- ✅ **Preprocessor Directive**: Specify database connection with `#DATABASE` or `#DB` in SQL files
- ✅ **JSON Parameter Support**: Support JSON format parameter files alongside CSV
- ✅ **Condition-based Result Grouping**: Clearly separate results for each parameter set

#### Database Support Expansion
- ✅ **MariaDB Support**: Added MariaDB database support with MySQL-compatible driver

#### Existing Features (v1.2.0)
- ✅ **Safe Permission Checking**: Uses actual tables instead of creating temporary tables
- ✅ **Actual Query Testing**: Executes actual queries specified in CSV
- ✅ **Enhanced Stability**: Fixed Oracle connection errors
- ✅ **Simplified Results**: Checks only necessary permissions (SELECT, INSERT, DELETE)
- ✅ **Enhanced Log Output**: Improved readability with database-specific separators and line breaks
- ✅ **Error Message Capture**: Detailed error information for SELECT/INSERT/DELETE operations saved to CSV
- ✅ **Improved File Structure**: Unified CSV file location and automatic filtering

---

## Major Changes

### Permission Check Items

| Permission | v1.0.0 | v1.1.0 | v1.2.0 | Description |
|------------|:------:|:------:|:------:|-------------|
| SELECT | ✅ | ✅ | ✅ | Executes actual query from CSV |
| INSERT | ✅ | ✅ | ✅ | Inserts data into actual table |
| DELETE | ✅ | ✅ | ✅ | Deletes inserted data |
| UPDATE | ✅ | ❌ | ❌ | Removed (safety) |
| CREATE | ✅ | ❌ | ❌ | Removed (safety) |
| DROP | ✅ | ❌ | ❌ | Removed (safety) |

### v1.2.0 New Features

**Enhanced Log Output:**
- Improved readability with database-specific separators and line breaks
- Clear separation of each check result

**Detailed Error Messages:**
- Specific error messages for SELECT/INSERT/DELETE operations saved to CSV
- Provides detailed information for problem diagnosis and resolution

**Improved File Structure:**
- Unified CSV file location under `request/` directly
- Automatic filtering based on filename (DB check: starts with `DB_`, Telnet check: starts with `server_`)

### Why Changed?

**Enhanced Safety:**
- CREATE/DROP tests are risky in production environments
- Prevents unnecessary resource usage from temporary table creation

**Enhanced Practicality:**
- Test with actual queries and tables in use
- Can verify conditions identical to production environment

**Enhanced Usability:**
- Cleaner and more readable log output
- Simplified file management
- More accurate error analysis

---

## CSV File Writing Guide

### File Location and Naming Rules

**Starting from v1.2.0, all CSV files are located directly under `request/`:**

```
request/
├── DB_sample.csv          ← For DB check (starts with DB_)
├── DB_production.csv      ← For DB check (starts with DB_)
├── server_sample.csv      ← For Telnet check (starts with server_)
└── server_production.csv  ← For Telnet check (starts with server_)
```

**File naming rules:**
- **For DB check**: Files starting with `DB_`
- **For Telnet check**: Files starting with `server_`
- **Extension**: Must be `.csv`

### CSV File Encoding 📝

**⚠️ IMPORTANT: UTF-8 Encoding Required**

All CSV files **must** be saved with UTF-8 encoding. Other encodings (like EUC-KR, ANSI) are **not supported** and will cause Korean characters to display incorrectly.

**Why UTF-8:**
- 🌍 Universal compatibility across all platforms
- 📊 Better support in modern tools (Excel, VS Code, etc.)
- 🔄 Easier to share and collaborate internationally
- 🚀 More reliable in package builds and CI/CD environments
- ✅ No character corruption for Korean, Chinese, Japanese, and other languages

**How to Save as UTF-8:**

1. **Excel (Recommended Method)**:
   - File → Save As → File type: "CSV UTF-8 (Comma delimited) (*.csv)"
   - ⚠️ Do NOT use regular "CSV (Comma delimited)" - it uses ANSI encoding

2. **Notepad / Notepad++**:
   - File → Save As → Encoding: "UTF-8"

3. **VS Code**:
   - Click encoding indicator in status bar (bottom right)
   - Select "Save with Encoding"
   - Choose "UTF-8"

4. **LibreOffice Calc**:
   - File → Save As → Character set: "Unicode (UTF-8)"

**Verification:**
- Open the CSV file in Notepad or VS Code
- Check the encoding in the status bar or file properties
- If Korean characters look correct, the encoding is likely correct

### Required Columns

All CSV files **must** have the following columns:

```csv
db_name,username,password,server_ip,port,db_type,db_title
```

| Column | Description | Example |
|--------|-------------|---------|
| `db_name` | Database name | `SampleDB` |
| `username` | Username | `sa`, `root`, `postgres` |
| `password` | Password | `password123` |
| `server_ip` | Server IP or hostname | `localhost`, `192.168.1.100` |
| `port` | Port number | `1433`, `3306`, `5432`, `1521` |
| `db_type` | DB type | `mssql`, `mysql`, `mariadb`, `postgresql`, `oracle` |
| `db_title` | Description (optional) | `Production Database` |

### Permission Check Columns (Optional)

Add the following columns to perform permission checks:

```csv
select_sql,crud_test_table,crud_test_columns,crud_test_values
```

| Column | Description | Example |
|--------|-------------|---------|
| `select_sql` | SELECT query to execute | `SELECT TOP 3 name FROM users` |
| `crud_test_table` | Table name to test | `users` |
| `crud_test_columns` | Column names (comma-separated) | `id, name, email` |
| `crud_test_values` | Values (comma-separated) | `test001, Test User, test@test.com` |

### CSV File Examples

#### Example 1: Basic Connection Check Only

```csv
db_name,username,password,server_ip,port,db_type,db_title
ProductionDB,readonly,ReadPass123,prod.company.com,1433,mssql,Production Database
DevelopDB,devuser,DevPass123,dev.company.com,3306,mysql,Development Database
MariaTestDB,devuser,DevPass123,dev.company.com,3306,mariadb,MariaDB Test Database
TestDB,testuser,TestPass123,test.company.com,5432,postgresql,Test Database
```

**Result:**
- Verify database connection success/failure
- Check only basic SELECT permission

#### Example 2: With Full Permission Check

**MSSQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,Pass123,localhost,1433,mssql,Sample DB,"SELECT TOP 5 CustomerName FROM Customers WHERE Active = 1",Customers,"CustomerID, CustomerName, Email","TEST001, Test Customer, test@test.com"
```

**MySQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
TestDB,root,Pass123,localhost,3306,mysql,Test DB,"SELECT * FROM users WHERE status = 'active' LIMIT 10",users,"user_id, username, email, status","test001, testuser, test@test.com, active"
```

**MariaDB:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
MariaTestDB,root,Pass123,localhost,3306,mariadb,MariaDB Test,"SELECT * FROM products WHERE price > 1000 LIMIT 10",products,"product_id, product_name, price","test001, Test Product, 5000"
```

**PostgreSQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
UserDB,postgres,Pass123,localhost,5432,postgresql,User DB,"SELECT name, email FROM accounts WHERE active = true LIMIT 5",accounts,"account_id, name, email, active","test001, Test Account, test@test.com, true"
```

**Oracle:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
OracleDB,system,Pass123,localhost,1521,oracle,Oracle DB,"SELECT employee_name FROM employees WHERE rownum <= 5",employees,"employee_id, employee_name, department","E001, John Doe, IT"
```

### Telnet Check CSV Format

#### Basic Format:
```csv
server_ip,port,server_name
192.168.1.100,8080,HQ ERP Web Server
192.168.1.101,3306,HQ WMS DB Server
192.168.1.102,22,Branch CRM SSH Server
10.0.0.50,443,Production API Server
```

**Column Descriptions:**
- `server_ip` (Required): Server IP address or hostname to check
- `port` (Required): Port number to check
- `server_name` (Optional): Server description for identification

**Result CSV Columns:**
```csv
timestamp,pc_ip,server_ip,port,server_name,result_code,error_code,error_msg,collapsed_time
```

---

## Database Permission Check

### Check Process

```
1. Connection Test
   ↓
2. SELECT Permission Check (Execute select_sql from CSV)
   ↓
3. INSERT Permission Check (Insert data into crud_test_table)
   ↓
4. DELETE Permission Check (Delete inserted data)
   ↓
5. Save Results
```

### Step-by-Step Description

#### Step 1: Connection Test
```
Purpose: Verify database server accessibility
On Failure: Skip all subsequent steps
On Success: Proceed to next step
```

#### Step 2: SELECT Permission Check
```sql
-- Execute query specified in CSV (MSSQL example)
SELECT TOP 5 CustomerName FROM Customers WHERE Active = 1
```

**Result:**
- ✅ Success: `perm_select = Y`
- ❌ Failure: `perm_select = N`

#### Step 3: INSERT Permission Check
```sql
-- Generate INSERT query from CSV info (MSSQL example)
INSERT INTO Customers (CustomerID, CustomerName, Email) 
VALUES ('TEST001', 'Test Customer', 'test@test.com')
```

**Result:**
- ✅ Success: `perm_insert = Y`, `insert_success = SUCCESS`
- ❌ Failure: `perm_insert = N`, `insert_success = FAILED`
- ⏭️ Skip: `insert_success = SKIPPED` (no table info)

#### Step 4: DELETE Permission Check
```sql
-- DELETE based on first column (MSSQL example)
DELETE FROM Customers WHERE CustomerID = 'TEST001'
```

**Result:**
- ✅ Success: `perm_delete = Y`, `delete_success = SUCCESS`
- ❌ Failure: `perm_delete = N`, `delete_success = FAILED`
- ⏭️ Skip: `delete_success = SKIPPED` (INSERT failed)

### Precautions

#### ⚠️ Data Cleanup

Test data may remain if DELETE fails.

**Recommended Methods:**
1. Use unique IDs (e.g., `TEST_PERM_001`)
2. Periodically clean up test data
3. Use dedicated test tables

**Cleanup Script:**
```sql
-- MSSQL
DELETE FROM test_table WHERE id LIKE 'TEST_%';

-- MySQL/PostgreSQL
DELETE FROM test_table WHERE id LIKE 'TEST_%';

-- Oracle
DELETE FROM test_table WHERE id LIKE 'TEST_%';
COMMIT;
```

#### 🔒 Security

Passwords are stored in plain text in CSV files.

**Security Measures:**
1. Restrict CSV file access
2. Add to .gitignore
3. Recommend using read-only accounts
4. Manage sensitive DBs separately

---

## Execution Method

### Method 1: Using Batch File (Recommended)

**English UI:**
```batch
# Windows
run.bat
```

**Korean UI (한국어):**
```batch
# Windows
실행하기.bat
```

Select `1. Database Connection and Permission Check` from menu

### Method 2: Direct Execution

**English:**
```bash
# Run Node.js directly with English UI
node app.js --lang=en

# Or use npm
npm start
```

**Korean:**
```bash
# Run Node.js directly with Korean UI
node app.js --lang=kr
```

**Default (without language parameter):**
```bash
# Defaults to English
node app.js
```

### Execution Screen

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

Select function to execute (1-6): 1

📁 Available CSV files:
  1. DB_sample.csv

Select CSV file to use (1): 1

⏱️  Connection timeout (default: 5 seconds): 

🔍 Starting database connection check...
Read 4 DB information entries.
```

### Messages During Execution

```
[localhost:1433][MSSQL][sa][SampleDB][Customers]
  → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
  └ SELECT: ✅ Success (0.005s) - RowCount: 3
  └ INSERT: ✅ Success (0.002s)
  └ DELETE: ✅ Success (0.001s)

[localhost:3306][MYSQL][root][TestDB][users]
  → [❌ Failed] [ER_ACCESS_DENIED_ERROR] Access denied
```

---

## Checking Results

### Result File Location

```
results/
  └── DB_sample__20251007143022.csv
```

File name format: `[OriginalCSVFileName]__[Timestamp].csv`

### Result CSV Format

```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_delete,insert_success,delete_success,insert_query,delete_query,operation_errors
```

### Column Descriptions

| Column | Description | Values |
|--------|-------------|--------|
| `timestamp` | Check time | ISO 8601 format |
| `pc_ip` | PC IP performing check | Auto-detected |
| `server_ip` | DB server IP | CSV input value |
| `port` | DB port | CSV input value |
| `db_name` | Database name | CSV input value |
| `db_type` | DB type | mssql/mysql/postgresql/oracle |
| `db_userid` | User ID | CSV input value |
| `result_code` | Connection result | SUCCESS / FAILED |
| `error_code` | Error code | Error code if failed |
| `error_msg` | Error message | Error message if failed |
| `collapsed_time` | Elapsed time | In seconds |
| `perm_select` | SELECT permission | Y / N |
| `perm_insert` | INSERT permission | Y / N |
| `perm_delete` | DELETE permission | Y / N |
| `insert_success` | INSERT execution result | SUCCESS / FAILED / SKIPPED |
| `delete_success` | DELETE execution result | SUCCESS / FAILED / SKIPPED |
| `insert_query` | Executed INSERT query | Actual executed query statement |
| `delete_query` | Executed DELETE query | Actual executed query statement |
| `operation_errors` | Operation-specific error messages | Detailed error information for SELECT/INSERT/DELETE |

### Result Example

```csv
2025-10-07T14:30:22.123Z,192.168.1.50,localhost,1433,SampleDB,mssql,sa,SUCCESS,,,0.15,Y,Y,Y,SUCCESS,SUCCESS,"INSERT INTO users (id, name, email) VALUES ('TEST_001', 'Test User', 'test@example.com')","DELETE FROM users WHERE id = 'TEST_001' AND name = 'Test User' AND email = 'test@example.com'",
2025-10-07T14:30:23.456Z,192.168.1.50,localhost,3306,TestDB,mysql,root,FAILED,ER_ACCESS_DENIED_ERROR,Access denied for user 'root'@'localhost',0.05,N,N,N,SKIPPED,SKIPPED,,"","SELECT: Access denied for user 'root'@'localhost'"
```

---

## Troubleshooting

### Common Issues

#### 1. "CSV file not found" Error

**Cause:** Incorrect CSV file path

**Solution:**
```
✅ Correct path: request/db_check/DB_sample.csv
❌ Wrong path: DB_sample.csv
```

#### 2. "Column not found" Error

**Cause:** Required columns missing in CSV file

**Solution:**
```csv
# These columns are required at minimum
db_name,username,password,server_ip,port,db_type
```

#### 3. INSERT Failure

**Cause:**
- Table does not exist
- Mismatch between column count and value count
- Data type mismatch
- Primary Key duplicate

**Solution:**
1. Verify table exists
2. Check column and value counts match
   ```csv
   # Wrong - 3 columns, 2 values
   crud_test_columns,"id, name, email"
   crud_test_values,"test001, Test"
   
   # Correct - 3 columns, 3 values
   crud_test_columns,"id, name, email"
   crud_test_values,"test001, Test, test@test.com"
   ```
3. Use unique IDs

#### 4. DELETE Failure

**Cause:**
- No DELETE permission
- WHERE condition doesn't match

**Solution:**
1. Verify DELETE permission
2. Ensure first column is Primary Key
3. Manually clean up data

```sql
-- Manual cleanup
DELETE FROM test_table WHERE id = 'TEST001';
```

---

## Best Practices

### Production Environment

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProductionDB,readonly_monitor,SecurePass123,prod.db.com,1433,mssql,Production DB,"SELECT TOP 1 status FROM health_check",health_check,"check_id, check_name, check_time","HC001, DB Monitor, GETDATE()"
```

**Features:**
- ✅ Use read-only account
- ✅ Dedicated health check table
- ✅ Check only minimum permissions
- ✅ Simple query

### Development Environment

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
DevelopDB,dev_admin,DevPass123,dev.db.com,3306,mariadb,Development DB,"SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 100",test_users,"user_id, username, email, created_at","DEV_TEST_001, Test Account, devtest@test.com, NOW()"
```

**Features:**
- ✅ Use admin account
- ✅ Similar to actual production queries
- ✅ Check all permissions
- ✅ Dedicated test table

---

## Database SQL Execution Feature

### Overview

The Database SQL Execution feature allows you to repeatedly execute parameterized SQL queries with multiple conditions and save results to CSV files.

### Supported Databases

- **Microsoft SQL Server** (mssql)
- **MySQL** (mysql)
- **MariaDB** (mariadb) ⭐ v1.2.0+
- **PostgreSQL** (postgresql)
- **Oracle** (oracle)

### File Structure

```
request/
└── sql_files/
    ├── SQL_001.sql      ← SQL query file
    ├── SQL_001.csv      ← Parameter file (CSV)
    ├── SQL_001.json     ← Parameter file (JSON)
    ├── SQL_002.sql
    └── SQL_002.json

results/
└── sql_files/
    ├── SQL_001_sampleDB_20251008_143025.csv   ← Execution results
    └── SQL_002_mysqlDB_20251008_150130.csv
```

**Note:** Only one of CSV or JSON is required. If both exist, JSON takes priority.

### Writing SQL Files (.sql)

#### Basic Format

Write parameters in `@variable_name` format:

```sql
-- SQL_001.sql example
SELECT p.*
FROM product p
WHERE price >= @min_price
  AND price <= @max_price;
```

#### Specifying Database Connection (Optional)

You can specify the database to connect to using preprocessor directive at the top of the SQL file:

```sql
#DATABASE sampleDB

SELECT p.*
FROM product p
WHERE price >= @min_price
  AND price <= @max_price;
```

Or

```sql
#DB mysqlDB

SELECT * FROM users;
```

**Rules:**
- Write `#DATABASE dbname` or `#DB dbname` at the beginning of the SQL file
- Starts with `#` symbol (C/C++ style preprocessor directive)
- Case insensitive (#DB, #db, #Database, #database all work)
- Database name must match the name defined in `config/dbinfo.json`
- If no database is specified, you can select it from CLI during execution

**Benefits:**
- ✅ `#` symbol clearly indicates command/directive (not a comment)
- ✅ No need to select frequently used databases every time
- ✅ Clearly distinguish queries for specific databases
- ✅ Prevent mistakes of running on wrong database
- ✅ Immediately recognizable as special feature

### Writing Parameter Files (.csv or .json)

Write parameter values in a CSV or JSON file with the same name as the SQL file.

#### CSV Format:

```csv
min_price,max_price
1000000,2000000
1000,100000
5000,50000
```

**Rules:**
- First line is the header (parameter names)
- Each row is one execution unit
- CSV header names must match `@variable_name` in SQL

#### JSON Format:

**Array Format (multiple conditions):**
```json
[
    {
        "min_price": 1000000,
        "max_price": 2000000
    },
    {
        "min_price": 1000,
        "max_price": 100000
    },
    {
        "min_price": 5000,
        "max_price": 50000
    }
]
```

**Single Object Format (one condition):**
```json
{
    "min_price": 1000000,
    "max_price": 2000000
}
```

**Rules:**
- Supports both array format and single object format
- JSON keys must match `@variable_name` in SQL
- If both JSON and CSV exist, JSON takes priority

### Execution Method

1. Select `3. Database SQL Execution` from the main menu
2. Select the SQL file to execute
3. Select the database to connect to (automatically selected if specified in SQL file)
4. Automatic execution

**Execution Scenarios:**

**Scenario 1: Database specified in SQL file**
```
📄 SQL file: SQL_001.sql
📄 Parameter file (CSV): SQL_001.csv

📌 Specified DB in SQL file: sampleDB
✅ Using specified database: sampleDB

🗄️ Database in use: sampleDB
   DB type: mssql
   ...
```

**Scenario 2: Database not specified**
```
📄 SQL file: SQL_002.sql
📄 Parameter file (JSON): SQL_002.json

🗄️ Available Databases:
  1. sampleDB (mssql) - localhost:1433/SampleDB
  2. mysqlDB (mysql) - localhost:3306/mydb
  3. mariaDB (mariadb) - localhost:3306/mariadb_testdb

Select database to use (1-3): _
```

### Result CSV File Format

Result files are created in the `results/sql_files/` folder and include the following information:

#### 1. Database Information (Top)
```csv
Database Information
DB Name,sampleDB
DB Type,mssql
Server,localhost:1433
Database,SampleDB
Execution Time,2025-10-08T14:30:25.123Z
```

#### 2. Results by Condition (Separated)
```csv
Parameters - Set 1
min_price,1000000
max_price,2000000
Result Count,5

product_id,product_name,price,category
101,Product A,1500000,Electronics
102,Product B,1800000,Electronics
...

==================================================

Parameters - Set 2
min_price,1000
max_price,100000
Result Count,3

product_id,product_name,price,category
201,Product X,50000,Books
...
```

### File Naming Format

Result filename: `{SQL_filename}_{DB_name}_{execution_time}.csv`

Examples:
- `SQL_001_sampleDB_20251008_143025.csv`
- `product_search_mysqlDB_20251008_150130.csv`
- `inventory_status_mariaDB_20251008_153045.csv`

### Usage Examples

#### Example 1: Product Search by Price Range

**SQL_product_search.sql:**
```sql
#DB mysqlDB

SELECT 
    product_id,
    product_name,
    price,
    category
FROM products
WHERE price BETWEEN @min_price AND @max_price
ORDER BY price DESC;
```

**SQL_product_search.csv:**
```csv
min_price,max_price
0,10000
10000,50000
50000,100000
100000,1000000
```

**Or SQL_product_search.json:**
```json
[
    { "min_price": 0, "max_price": 10000 },
    { "min_price": 10000, "max_price": 50000 },
    { "min_price": 50000, "max_price": 100000 },
    { "min_price": 100000, "max_price": 1000000 }
]
```

#### Example 2: Order Search by Period

**SQL_order_search.sql:**
```sql
#DATABASE sampleDB

SELECT 
    order_id,
    customer_name,
    order_date,
    total_amount
FROM orders
WHERE order_date >= @start_date
  AND order_date < @end_date
ORDER BY order_date;
```

**SQL_order_search.csv:**
```csv
start_date,end_date
2025-01-01,2025-02-01
2025-02-01,2025-03-01
2025-03-01,2025-04-01
```

**Or SQL_order_search.json:**
```json
[
    { "start_date": "2025-01-01", "end_date": "2025-02-01" },
    { "start_date": "2025-02-01", "end_date": "2025-03-01" },
    { "start_date": "2025-03-01", "end_date": "2025-04-01" }
]
```

#### Example 3: Complex Query with Multiple Parameters

**SQL_complex_search.sql:**
```sql
SELECT 
    c.customer_name,
    o.order_id,
    o.order_date,
    o.total_amount
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE c.region = @region
  AND o.order_date >= @start_date
  AND o.total_amount >= @min_amount
ORDER BY o.order_date DESC;
```

**SQL_complex_search.csv:**
```csv
region,start_date,min_amount
Seoul,2025-01-01,100000
Busan,2025-01-01,100000
Daegu,2025-01-01,100000
```

**Or SQL_complex_search.json:**
```json
[
    { "region": "Seoul", "start_date": "2025-01-01", "min_amount": 100000 },
    { "region": "Busan", "start_date": "2025-01-01", "min_amount": 100000 },
    { "region": "Daegu", "start_date": "2025-01-01", "min_amount": 100000 }
]
```

### config/dbinfo.json Configuration

SQL Executor uses databases defined in `config/dbinfo.json`:

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
    "database": "mydb",
    "port": 3306,
    "options": {
      "ssl": false,
      "connectionTimeout": 30000
    }
  },
  "mariaDB": {
    "type": "mariadb",
    "user": "root",
    "password": "password",
    "server": "localhost",
    "database": "mariadb_testdb",
    "port": 3306,
    "options": {
      "ssl": false,
      "connectionTimeout": 30000
    }
  }
}
```

### Precautions

⚠️ **Large Result Processing**
- CSV files can become very large if there are too many results
- Recommend using LIMIT clause to restrict result count

⚠️ **Parameter Name Matching**
- SQL `@variable_name` must exactly match CSV header names
- Case sensitive

⚠️ **SQL Injection Prevention**
- Parameters are automatically bound for safety
- Be careful with CSV file management

⚠️ **Korean Filenames**
- Korean characters can be used in SQL filenames
- Example: `상품조회.sql`, `상품조회.csv`

### Log Files

JSON logs are also generated during SQL execution:

```
log/
└── 20251008/
    ├── SQL_001_143025.log
    └── SQL_001_143026.log
```

---

## CSV-based Batch Query Execution

The CSV-based Batch Query Execution feature allows you to execute multiple SQL queries from a single CSV file, making it ideal for batch data extraction and reporting tasks.

### Overview

**Key Benefits:**
- Execute multiple queries at once without manual intervention
- Dynamic file paths with date/time variables
- Automatic directory creation for organized output
- Built-in security to prevent data modification

**Typical Use Cases:**
- Daily/weekly data extraction for reporting
- Batch export of multiple tables
- Regular database object definition extraction (sp_helptext, etc.)
- Scheduled data backups to CSV files

### CSV File Format

Create a CSV file in `request/` directory with filename starting with `SQL_` prefix.

**Required Columns:**
- `SQL`: SQL query to execute
- `result_filepath`: Output file path (supports date variables)

**Example CSV (SQL_daily_export.csv):**
```csv
SQL,result_filepath
"select * from users;","c:\Temp\csv_result\users_${DATE:yyyyMMddHHmmss}.csv"
"select * from products;","c:\Temp\csv_result\products_${DATE:yyyyMMdd}.csv"
"select * from orders where order_date >= dateadd(day, -7, getdate());","c:\Temp\csv_result\orders_last7days_${DATE:yyyyMMdd}.txt"
"exec sp_helptext 'dbo.GetCustomerOrders';","c:\Temp\csv_result\proc_definition.txt"
```

### Date/Time Variables

You can use date/time variables in `result_filepath` to create timestamped output files.

**Syntax:**
- `${DATE:format}`
- Both uppercase and lowercase tokens are supported

**Supported Tokens:**

| Token | Description | Example |
|-------|-------------|---------|
| `yyyy` or `YYYY` | 4-digit year | 2025 |
| `yy` or `YY` | 2-digit year | 25 |
| `MM` | 2-digit month | 01, 12 |
| `M` | Month (1-2 digits) | 1, 12 |
| `dd` or `DD` | 2-digit day | 01, 31 |
| `d` or `D` | Day (1-2 digits) | 1, 31 |
| `HH` | 2-digit hour (24h) | 00, 23 |
| `H` | Hour (1-2 digits) | 0, 23 |
| `mm` | 2-digit minute | 00, 59 |
| `m` | Minute (1-2 digits) | 0, 59 |
| `ss` | 2-digit second | 00, 59 |
| `s` | Second (1-2 digits) | 0, 59 |
| `SSS` | Milliseconds | 000, 999 |

**Examples:**
```csv
result_filepath
"results/export_${DATE:yyyyMMdd}.csv"
"c:\Temp\backup_${DATE:yyyy-MM-dd_HHmmss}.txt"
"reports/monthly_${DATE:yyyyMM}.csv"
```

**Output Examples:**
- `export_20251021.csv`
- `backup_2025-10-21_143052.txt`
- `monthly_202510.csv`

### Security Features

The feature includes built-in security validation to prevent accidental data modification.

#### Allowed Operations

✅ **SELECT Queries:**
```sql
select * from users;
select id, name from products where price > 10000;
```

✅ **Safe System Procedures:**
- Information retrieval: `sp_help`, `sp_helptext`, `sp_helpdb`, `sp_helpindex`
- Column/table info: `sp_columns`, `sp_tables`, `sp_stored_procedures`
- Database info: `sp_databases`, `sp_helpfile`, `sp_helpfilegroup`
- Session info: `sp_who`, `sp_who2`, `sp_spaceused`, `sp_depends`

```sql
exec sp_helptext 'dbo.MyStoredProcedure';
exec sp_help 'dbo.MyTable';
exec sp_who2;
```

#### Blocked Operations

❌ **Data Modification (DML):**
- `INSERT`, `UPDATE`, `DELETE`, `MERGE`

❌ **Schema Changes (DDL):**
- `DROP`, `TRUNCATE`, `ALTER`, `CREATE`

❌ **Dangerous Procedures:**
- `xp_cmdshell`, `xp_regread`, `xp_regwrite`
- `OPENROWSET`, `OPENQUERY`

❌ **Data Persistence:**
- `SELECT INTO` (except temp tables with `#` prefix)

**Error Example:**
```
❌ Query validation failed: Dangerous keyword detected: DELETE
```

### Usage Steps

**1. Create CSV File**

Create a file like `request/SQL_daily_export.csv`:
```csv
SQL,result_filepath
"select * from customers;","c:\Temp\csv_result\customers_${DATE:yyyyMMddHHmmss}.csv"
"select * from orders;","c:\Temp\csv_result\orders_${DATE:yyyyMMddHHmmss}.csv"
```

**2. Run Application**

```bash
# Launch application
node app.js

# Or use batch file
run.bat
```

**3. Select Menu Option**

```
📋 Main Menu
1. Database Connection and Permission Check
2. Server Telnet Connection Check  
3. Database SQL Execution
4. CSV-based Batch Query Execution  ⭐
5. Configuration Management
0. Exit

Select function to execute: 4
```

**4. Select CSV File**

The application will automatically list all CSV files starting with `SQL_`:
```
📊 CSV-based Batch Query Execution
========================================

Available CSV files:
1. SQL_daily_export.csv
2. SQL_table_definitions.csv

Select CSV file (1-2): 1
```

**5. Select Database**

Choose the target database from configured databases:
```
Available databases:
1. sampleDB (mssql)
2. mysqlDB (mysql)
3. postgresDB (postgresql)

Select database (1-3): 1
```

**6. Execution and Results**

The application will:
- Validate each query for security
- Execute queries sequentially
- Substitute date/time variables in file paths
- Create directories automatically if needed
- Save results to specified locations

**Example Output:**
```
📄 CSV file: SQL_daily_export.csv
✅ Found 2 queries

Connected to: sampleDB (mssql)

Query 1/2
  Query: select * from customers;
  📄 File: c:\Temp\csv_result\customers_20251021143052.csv
  📁 Creating directory: c:\Temp\csv_result
  💾 Saving results: customers_20251021143052.csv
  ✅ Results saved: customers_20251021143052.csv (150 rows)

Query 2/2
  Query: select * from orders;
  📄 File: c:\Temp\csv_result\orders_20251021143052.csv
  💾 Saving results: orders_20251021143052.csv
  ✅ Results saved: orders_20251021143052.csv (523 rows)

✅ CSV query execution completed successfully!
```

### Use Case Examples

#### Example 1: Daily Data Export

**Purpose:** Export multiple tables daily for backup or reporting

**SQL_daily_backup.csv:**
```csv
SQL,result_filepath
"select * from users;","c:\Backups\daily\users_${DATE:yyyyMMdd}.csv"
"select * from products;","c:\Backups\daily\products_${DATE:yyyyMMdd}.csv"
"select * from orders;","c:\Backups\daily\orders_${DATE:yyyyMMdd}.csv"
"select * from customers;","c:\Backups\daily\customers_${DATE:yyyyMMdd}.csv"
```

**Scheduled Execution:**
- Set up Windows Task Scheduler to run daily at 2 AM
- Automatic timestamped backups
- Organized in `c:\Backups\daily\` directory

#### Example 2: Database Object Definitions

**Purpose:** Extract stored procedure and table definitions

**SQL_object_definitions.csv:**
```csv
SQL,result_filepath
"exec sp_helptext 'dbo.GetCustomerOrders';","c:\Definitions\GetCustomerOrders_${DATE:yyyyMMdd}.sql"
"exec sp_helptext 'dbo.UpdateInventory';","c:\Definitions\UpdateInventory_${DATE:yyyyMMdd}.sql"
"exec sp_help 'dbo.Orders';","c:\Definitions\Orders_table_${DATE:yyyyMMdd}.txt"
"exec sp_help 'dbo.Customers';","c:\Definitions\Customers_table_${DATE:yyyyMMdd}.txt"
```

#### Example 3: Weekly Reports

**Purpose:** Generate weekly summary reports

**SQL_weekly_reports.csv:**
```csv
SQL,result_filepath
"select datepart(week, order_date) as week_num, count(*) as total_orders, sum(total_amount) as total_sales from orders where order_date >= dateadd(week, -4, getdate()) group by datepart(week, order_date) order by week_num;","c:\Reports\weekly_sales_${DATE:yyyyMMdd}.csv"
"select top 10 product_name, sum(quantity) as total_sold from order_items oi join products p on oi.product_id = p.product_id where order_date >= dateadd(week, -1, getdate()) group by product_name order by total_sold desc;","c:\Reports\top_products_${DATE:yyyyMMdd}.csv"
```

### File Path Options

**Absolute Path:**
```csv
result_filepath
"c:\Temp\export.csv"
"d:\Backups\data_${DATE:yyyyMMdd}.txt"
```

**Relative Path (from application directory):**
```csv
result_filepath
"results/csv_queries/users.csv"
"results/export_${DATE:yyyyMMdd}.csv"
```

### Troubleshooting

**Problem: "CSV file is empty"**
- **Cause:** CSV file format is incorrect or columns are missing
- **Solution:** Ensure CSV has headers `SQL` and `result_filepath`

**Problem: "Query validation failed: Only SELECT queries are allowed"**
- **Cause:** Query contains blocked keywords (INSERT, UPDATE, DELETE, etc.)
- **Solution:** Use only SELECT queries or safe system procedures

**Problem: "Failed to create directory"**
- **Cause:** Insufficient permissions or invalid path
- **Solution:** Check directory permissions or use a different path

**Problem: Date variable not substituted**
- **Cause:** Incorrect variable format or unsupported token
- **Solution:** Use correct format: `${DATE:yyyyMMddHHmmss}`

### Best Practices

1. **Filename Convention:**
   - Start CSV files with `SQL_` prefix for easy identification
   - Use descriptive names: `SQL_daily_export.csv`, `SQL_table_definitions.csv`

2. **Output Organization:**
   - Group related outputs in same directory
   - Use date variables for automatic timestamping
   - Include descriptive filenames

3. **Query Optimization:**
   - Use WHERE clauses to limit result size
   - Add TOP/LIMIT for large tables
   - Consider query performance impact

4. **Security:**
   - Only store CSV files with safe queries
   - Regularly review and audit query definitions
   - Use read-only database accounts when possible

5. **Automation:**
   - Set up scheduled tasks for regular execution
   - Monitor output directories for successful completion
   - Implement error notification if needed

---

## Additional Resources

- **Changelog**: See `CHANGELOG.md` or `CHANGELOG_EN.md`
- **Migration**: See `MIGRATION_GUIDE.md` or `MIGRATION_GUIDE_EN.md`
- **Full Documentation**: See `README.md`, `README_KR.md`

---
