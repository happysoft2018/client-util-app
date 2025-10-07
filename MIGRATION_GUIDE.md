# Migration Guide

## v1.0.0 → v1.1.0 Upgrade Guide

### 📋 Overview

Version 1.1.0 features significant improvements to the database permission checking methodology. This guide provides instructions for existing v1.0.0 users upgrading to v1.1.0.

### 🔄 Major Changes

#### 1. CSV File Format Changes

**v1.0.0 Format:**
```csv
db_name,server_ip,port,corp,proc,env_type,db_type
SampleDB,192.168.1.100,1433,HQ,ERP,PRD,mssql
```

**v1.1.0 Format (Minimum):**
```csv
db_name,username,password,server_ip,port,db_type,db_title
SampleDB,sa,password123,192.168.1.100,1433,mssql,Sample Database
```

**v1.1.0 Format (Full Permission Check):**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,pass123,localhost,1433,mssql,Sample DB,"SELECT top 3 name from customers",customers,"id, name, email","test001, Test User, test@test.com"
```

#### 2. Permission Check Item Changes

| Permission | v1.0.0 | v1.1.0 | Notes |
|------------|--------|--------|-------|
| SELECT | ✅ | ✅ | Changed to actual query execution |
| INSERT | ✅ | ✅ | Changed to use actual table |
| UPDATE | ✅ | ❌ Removed | Safety consideration |
| DELETE | ✅ | ✅ | Changed to use actual table |
| CREATE | ✅ | ❌ Removed | Safety consideration |
| DROP | ✅ | ❌ Removed | Safety consideration |

#### 3. Result CSV Format Changes

**v1.0.0 Result Columns:**
```
...,perm_select,perm_insert,perm_update,perm_delete,perm_create,perm_drop,...
```

**v1.1.0 Result Columns:**
```
...,perm_select,perm_insert,perm_delete,insert_success,delete_success
```

### 📝 Migration Steps

#### Step 1: Backup Existing CSV Files

```bash
# Windows
copy request_resources\db_check\*.csv request_resources\db_check\backup\

# Linux/Mac
cp request_resources/db_check/*.csv request_resources/db_check/backup/
```

#### Step 2: Modify CSV File Format

You need to add new columns to existing CSV files.

**Using Excel/LibreOffice:**
1. Open CSV file in Excel
2. Add the following columns:
   - `username`: Database username
   - `password`: Database password
   - `db_title`: (Optional) Database description
   - `select_sql`: (Optional) SELECT query to execute
   - `crud_test_table`: (Optional) Table name to test
   - `crud_test_columns`: (Optional) Columns to test
   - `crud_test_values`: (Optional) Values to test
3. Save as UTF-8 encoding

**Using Python Script:**
```python
import pandas as pd

# Read existing CSV
df = pd.read_csv('DB_sample_old.csv')

# Add new columns (set default values)
df['username'] = 'sa'  # Change to actual value
df['password'] = ''    # Change to actual value
df['db_title'] = df['db_name']
df['select_sql'] = ''
df['crud_test_table'] = ''
df['crud_test_columns'] = ''
df['crud_test_values'] = ''

# Save to new CSV
df.to_csv('DB_sample.csv', index=False, encoding='utf-8')
```

#### Step 3: Prepare Test Tables for Permission Checking

Prepare permission test tables in each database.

**MSSQL Example:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name NVARCHAR(100),
    test_email VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE()
);
```

**MySQL Example:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**PostgreSQL Example:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Oracle Example:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR2(50) PRIMARY KEY,
    test_name VARCHAR2(100),
    test_email VARCHAR2(100),
    created_at TIMESTAMP DEFAULT SYSDATE
);
```

#### Step 4: Create CSV File Examples

**Minimum Configuration (Connection check only):**
```csv
db_name,username,password,server_ip,port,db_type,db_title
ProductionDB,produser,Prod@2024,192.168.1.100,1433,mssql,Production Database
DevelopDB,devuser,Dev@2024,192.168.1.101,3306,mysql,Development Database
```

**With Permission Check:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProductionDB,produser,Prod@2024,192.168.1.100,1433,mssql,Production DB,"SELECT TOP 5 * FROM users",permission_test,"test_id, test_name, test_email","perm001, Permission Test, test@example.com"
DevelopDB,devuser,Dev@2024,192.168.1.101,3306,mysql,Development DB,"SELECT * FROM users LIMIT 5",permission_test,"test_id, test_name, test_email","perm001, Permission Test, test@example.com"
```

#### Step 5: Run Tests

1. Test with a small number of databases first
2. Verify result CSV files
3. Apply to all databases if no issues

```bash
# Run integrated execution tool
run.bat

# Or run directly
node app.js
```

### ⚠️ Precautions

#### 1. Password Security

Passwords are stored in plain text in CSV files. The following measures are recommended:

- Restrict access to CSV files
- Use read-only accounts
- Manage sensitive databases separately
- Add CSV files to .gitignore

#### 2. Test Data Cleanup

Data may remain if DELETE fails after INSERT:

**Recommendations:**
- Use unique test_ids (e.g., `perm_test_001`, `perm_test_002`)
- Periodically clean up test data
- Consider transaction support (future version)

**Cleanup Query Examples:**
```sql
-- MSSQL/MySQL/PostgreSQL
DELETE FROM permission_test WHERE test_id LIKE 'perm_%';

-- Oracle
DELETE FROM permission_test WHERE test_id LIKE 'perm_%';
COMMIT;
```

#### 3. Permission Check Limitations

v1.1.0 does not directly verify the following permissions:

- **CREATE TABLE**: Removed
- **DROP TABLE**: Removed
- **UPDATE**: Removed (inferred from INSERT/DELETE)

If these permissions are required, they must be verified separately.

### 🔍 Troubleshooting

#### Issue 1: "Column not found" Error

**Cause:** Required columns missing in CSV file

**Solution:**
```csv
# Check required columns
db_name,username,password,server_ip,port,db_type
```

#### Issue 2: INSERT Failure

**Cause:** 
- Table does not exist
- Mismatch between column count and value count
- Data type mismatch

**Solution:**
1. Verify table exists
2. Check column and value counts match
3. Escape single quotes (') in values if present

#### Issue 3: Oracle "NJS-003" Error

**Cause:** Connection reuse issue

**Solution:** Already fixed in v1.1.0. Verify using latest version

#### Issue 4: SELECT Query Duplicate Execution

**Cause:** Bug in previous version

**Solution:** Already fixed in v1.1.0. Verify using latest version

### 📊 Result Comparison

#### v1.0.0 Result:
```
[localhost:1433][MSSQL][sa][TestDB] → [✅ Success] [Permissions: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP]
```

#### v1.1.0 Result:
```
[localhost:1433][MSSQL][sa][TestDB][customers] → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
  └ SELECT: ✅ Success (0.005s) - RowCount: 3
  └ INSERT: ✅ Success (0.002s)
  └ DELETE: ✅ Success (0.001s)
```

### 🎯 Recommended Configurations

#### Production Environment

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProdDB,readonly_user,ReadOnly@2024,prod.db.com,1433,mssql,Production DB,"SELECT TOP 1 * FROM health_check",permission_test,"test_id, test_name","health_check, Prod Monitor"
```

- Use read-only account
- Simple health check query
- Test only minimum permissions

#### Development Environment

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
DevDB,dev_admin,Dev@2024,dev.db.com,3306,mysql,Development DB,"SELECT * FROM users LIMIT 10",users,"id, username, email, status","test_dev_001, Test Account, test@dev.com, active"
```

- Use admin account
- Test similar to actual production queries
- Verify all permissions

### 📞 Support

If issues occur during migration:

1. Check CHANGELOG.md
2. Check log files (`log/` directory)
3. Test with small number of databases using test CSV
4. Document and report error messages

### ✅ Migration Checklist

- [ ] Existing CSV files backed up
- [ ] Converted to new CSV format
- [ ] Test tables created
- [ ] Tested with small number of databases
- [ ] Result CSV format verified
- [ ] Applied to all databases
- [ ] Existing automation scripts updated
- [ ] Documentation and guides updated

---

**Version:** 1.1.0  
**Date:** 2025-10-07  
**Next Update:** TBD

