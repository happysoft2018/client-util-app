# 마이그레이션 가이드 (Migration Guide)

## v1.0.0 → v1.1.0 업그레이드 가이드

### 📋 개요

버전 1.1.0에서는 데이터베이스 권한 체크 방식이 크게 개선되었습니다. 이 가이드는 기존 v1.0.0 사용자가 v1.1.0으로 업그레이드할 때 필요한 작업을 안내합니다.

### 🔄 주요 변경사항

#### 1. CSV 파일 형식 변경

**v1.0.0 형식:**
```csv
db_name,server_ip,port,corp,proc,env_type,db_type
SampleDB,192.168.1.100,1433,본사,ERP,PRD,mssql
```

**v1.1.0 형식 (최소):**
```csv
db_name,username,password,server_ip,port,db_type,db_title
SampleDB,sa,password123,192.168.1.100,1433,mssql,샘플 데이터베이스
```

**v1.1.0 형식 (전체 권한 체크):**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,pass123,localhost,1433,mssql,샘플DB,"SELECT top 3 name from customers",customers,"id, name, email","test001, 테스트, test@test.com"
```

#### 2. 권한 체크 항목 변경

| 권한 | v1.0.0 | v1.1.0 | 비고 |
|------|--------|--------|------|
| SELECT | ✅ | ✅ | 실제 쿼리 실행으로 변경 |
| INSERT | ✅ | ✅ | 실제 테이블 사용으로 변경 |
| UPDATE | ✅ | ❌ 제거 | 안전성 고려 |
| DELETE | ✅ | ✅ | 실제 테이블 사용으로 변경 |
| CREATE | ✅ | ❌ 제거 | 안전성 고려 |
| DROP | ✅ | ❌ 제거 | 안전성 고려 |

#### 3. 결과 CSV 형식 변경

**v1.0.0 결과 컬럼:**
```
...,perm_select,perm_insert,perm_update,perm_delete,perm_create,perm_drop,...
```

**v1.1.0 결과 컬럼:**
```
...,perm_select,perm_insert,perm_delete,insert_success,delete_success
```

### 📝 마이그레이션 단계

#### Step 1: 기존 CSV 파일 백업

```bash
# Windows
copy request_resources\db_check\*.csv request_resources\db_check\backup\

# Linux/Mac
cp request_resources/db_check/*.csv request_resources/db_check/backup/
```

#### Step 2: CSV 파일 형식 변경

기존 CSV 파일에 새로운 컬럼을 추가해야 합니다.

**Excel/LibreOffice 사용:**
1. CSV 파일을 Excel에서 열기
2. 다음 컬럼 추가:
   - `username`: 데이터베이스 사용자명
   - `password`: 데이터베이스 비밀번호
   - `db_title`: (선택) 데이터베이스 설명
   - `select_sql`: (선택) 실행할 SELECT 쿼리
   - `crud_test_table`: (선택) 테스트할 테이블명
   - `crud_test_columns`: (선택) 테스트할 컬럼들
   - `crud_test_values`: (선택) 테스트할 값들
3. UTF-8 인코딩으로 저장

**Python 스크립트 사용:**
```python
import pandas as pd

# 기존 CSV 읽기
df = pd.read_csv('DB_sample_old.csv')

# 새 컬럼 추가 (기본값 설정)
df['username'] = 'sa'  # 실제 값으로 변경 필요
df['password'] = ''    # 실제 값으로 변경 필요
df['db_title'] = df['db_name']
df['select_sql'] = ''
df['crud_test_table'] = ''
df['crud_test_columns'] = ''
df['crud_test_values'] = ''

# 새 CSV로 저장
df.to_csv('DB_sample.csv', index=False, encoding='utf-8')
```

#### Step 3: 권한 체크를 위한 테스트 테이블 준비

각 데이터베이스에 권한 테스트용 테이블을 준비합니다.

**MSSQL 예시:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name NVARCHAR(100),
    test_email VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE()
);
```

**MySQL 예시:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**PostgreSQL 예시:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Oracle 예시:**
```sql
CREATE TABLE permission_test (
    test_id VARCHAR2(50) PRIMARY KEY,
    test_name VARCHAR2(100),
    test_email VARCHAR2(100),
    created_at TIMESTAMP DEFAULT SYSDATE
);
```

#### Step 4: CSV 파일 예시 작성

**최소 구성 (연결 체크만):**
```csv
db_name,username,password,server_ip,port,db_type,db_title
ProductionDB,produser,Prod@2024,192.168.1.100,1433,mssql,운영 데이터베이스
DevelopDB,devuser,Dev@2024,192.168.1.101,3306,mysql,개발 데이터베이스
```

**권한 체크 포함:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProductionDB,produser,Prod@2024,192.168.1.100,1433,mssql,운영DB,"SELECT TOP 5 * FROM users",permission_test,"test_id, test_name, test_email","perm001, 권한테스트, test@example.com"
DevelopDB,devuser,Dev@2024,192.168.1.101,3306,mysql,개발DB,"SELECT * FROM users LIMIT 5",permission_test,"test_id, test_name, test_email","perm001, 권한테스트, test@example.com"
```

#### Step 5: 테스트 실행

1. 소수의 데이터베이스로 먼저 테스트
2. 결과 CSV 파일 확인
3. 문제가 없으면 전체 데이터베이스에 적용

```bash
# 통합 실행 도구 실행
run.bat

# 또는 직접 실행
node app.js
```

### ⚠️ 주의사항

#### 1. 비밀번호 보안

CSV 파일에 비밀번호가 평문으로 저장됩니다. 다음 조치를 권장합니다:

- CSV 파일의 접근 권한 제한
- 읽기 전용 계정 사용
- 민감한 데이터베이스는 별도 관리
- .gitignore에 CSV 파일 추가

#### 2. 테스트 데이터 정리

INSERT 후 DELETE가 실패하면 데이터가 남을 수 있습니다:

**권장 사항:**
- 고유한 test_id 사용 (예: `perm_test_001`, `perm_test_002`)
- 주기적으로 테스트 데이터 정리
- 트랜잭션 지원 고려 (향후 버전)

**정리 쿼리 예시:**
```sql
-- MSSQL/MySQL/PostgreSQL
DELETE FROM permission_test WHERE test_id LIKE 'perm_%';

-- Oracle
DELETE FROM permission_test WHERE test_id LIKE 'perm_%';
COMMIT;
```

#### 3. 권한 체크 제한사항

v1.1.0에서는 다음 권한을 직접 확인하지 않습니다:

- **CREATE TABLE**: 제거됨
- **DROP TABLE**: 제거됨
- **UPDATE**: 제거됨 (INSERT/DELETE로 유추)

이러한 권한이 필요한 경우 별도로 확인해야 합니다.

### 🔍 트러블슈팅

#### 문제 1: "Column not found" 에러

**원인:** CSV 파일에 필수 컬럼이 없음

**해결:**
```csv
# 필수 컬럼 확인
db_name,username,password,server_ip,port,db_type
```

#### 문제 2: INSERT 실패

**원인:** 
- 테이블이 존재하지 않음
- 컬럼 개수와 값 개수 불일치
- 데이터 타입 불일치

**해결:**
1. 테이블 존재 확인
2. 컬럼과 값 개수 일치 확인
3. 값에 따옴표(')가 포함된 경우 이스케이프 처리

#### 문제 3: Oracle "NJS-003" 에러

**원인:** 연결 재사용 문제

**해결:** v1.1.0에서 이미 수정됨. 최신 버전 사용 확인

#### 문제 4: SELECT 쿼리 중복 실행

**원인:** 이전 버전의 버그

**해결:** v1.1.0에서 이미 수정됨. 최신 버전 사용 확인

### 📊 결과 비교

#### v1.0.0 결과:
```
[localhost:1433][MSSQL][sa][TestDB] → [✅ Success] [Permissions: SELECT, INSERT, UPDATE, DELETE, CREATE, DROP]
```

#### v1.1.0 결과:
```
[localhost:1433][MSSQL][sa][TestDB][customers] → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
  └ SELECT: ✅ Success (0.005s) - RowCount: 3
  └ INSERT: ✅ Success (0.002s)
  └ DELETE: ✅ Success (0.001s)
```

### 🎯 권장 구성

#### 운영 환경

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProdDB,readonly_user,ReadOnly@2024,prod.db.com,1433,mssql,운영DB,"SELECT TOP 1 * FROM health_check",permission_test,"test_id, test_name","health_check, Prod Monitor"
```

- 읽기 전용 계정 사용
- 간단한 health check 쿼리
- 최소한의 권한만 테스트

#### 개발 환경

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
DevDB,dev_admin,Dev@2024,dev.db.com,3306,mysql,개발DB,"SELECT * FROM users LIMIT 10",users,"id, username, email, status","test_dev_001, 테스트계정, test@dev.com, active"
```

- 관리자 계정 사용
- 실제 운영 쿼리와 유사한 테스트
- 전체 권한 확인

### 📞 지원

마이그레이션 과정에서 문제가 발생하면:

1. CHANGELOG.md 확인
2. 로그 파일 확인 (`log/` 디렉토리)
3. 테스트 CSV로 소수 데이터베이스부터 시도
4. 에러 메시지를 기록하여 문의

### ✅ 마이그레이션 체크리스트

- [ ] 기존 CSV 파일 백업 완료
- [ ] 새로운 CSV 형식으로 변환 완료
- [ ] 테스트용 테이블 생성 완료
- [ ] 소수 데이터베이스로 테스트 완료
- [ ] 결과 CSV 형식 확인 완료
- [ ] 전체 데이터베이스 적용 완료
- [ ] 기존 자동화 스크립트 업데이트 완료
- [ ] 문서 및 가이드 업데이트 완료

---

**Version:** 1.1.0  
**Date:** 2025-10-07  
**Next Update:** TBD

