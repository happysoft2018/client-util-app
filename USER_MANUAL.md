# User Manual v1.2.0

## 📖 Table of Contents

1. [Introduction](#introduction)
2. [Major Changes](#major-changes)
3. [CSV File Writing Guide](#csv-file-writing-guide)
4. [Database Permission Check](#database-permission-check)
5. [Execution Method](#execution-method)
6. [Checking Results](#checking-results)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Introduction

This manual guides you through using the database connection and permission check features of the Node.js Integrated Utility Tool v1.2.0.

### Key Features of v1.2.0

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
- Unified CSV file location under `request_resources/` directly
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

**Starting from v1.2.0, all CSV files are located directly under `request_resources/`:**

```
request_resources/
├── DB_sample.csv          ← For DB check (starts with DB_)
├── DB_production.csv      ← For DB check (starts with DB_)
├── server_sample.csv      ← For Telnet check (starts with server_)
└── server_production.csv  ← For Telnet check (starts with server_)
```

**File naming rules:**
- **For DB check**: Files starting with `DB_`
- **For Telnet check**: Files starting with `server_`
- **Extension**: Must be `.csv`

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
| `db_type` | DB type | `mssql`, `mysql`, `postgresql`, `oracle` |
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

```batch
# Windows
run.bat
```

Select `1. Database Connection and Permission Check` from menu

### Method 2: Direct Execution

```bash
# Run Node.js directly
node app.js

# Or use npm
npm start
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
✅ Correct path: request_resources/db_check/DB_sample.csv
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
DevelopDB,dev_admin,DevPass123,dev.db.com,3306,mysql,Development DB,"SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 100",test_users,"user_id, username, email, created_at","DEV_TEST_001, Test Account, devtest@test.com, NOW()"
```

**Features:**
- ✅ Use admin account
- ✅ Similar to actual production queries
- ✅ Check all permissions
- ✅ Dedicated test table

---

## Additional Resources

- **Changelog**: See `CHANGELOG.md` or `CHANGELOG_EN.md`
- **Migration**: See `MIGRATION_GUIDE.md` or `MIGRATION_GUIDE_EN.md`
- **Full Documentation**: See `README.md`, `README_KR.md`

---
