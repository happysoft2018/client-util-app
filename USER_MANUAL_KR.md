# 사용자 매뉴얼 v1.1.0

## 📖 목차

1. [소개](#소개)
2. [주요 변경사항](#주요-변경사항)
3. [CSV 파일 작성 가이드](#csv-파일-작성-가이드)
4. [데이터베이스 권한 체크](#데이터베이스-권한-체크)
5. [실행 방법](#실행-방법)
6. [결과 확인](#결과-확인)
7. [문제 해결](#문제-해결)
8. [모범 사례](#모범-사례)

---

## 소개

이 매뉴얼은 Node.js 통합 유틸리티 도구 v1.1.0의 데이터베이스 연결 및 권한 체크 기능 사용법을 안내합니다.

### v1.1.0의 주요 특징

- ✅ **안전한 권한 체크**: 임시 테이블 생성 대신 실제 테이블 사용
- ✅ **실제 쿼리 테스트**: CSV에 지정한 실제 쿼리 실행
- ✅ **향상된 안정성**: Oracle 연결 오류 수정
- ✅ **간소화된 결과**: 필요한 권한만 체크 (SELECT, INSERT, DELETE)

---

## 주요 변경사항

### 권한 체크 항목

| 권한 | v1.0.0 | v1.1.0 | 설명 |
|------|:------:|:------:|------|
| SELECT | ✅ | ✅ | CSV의 실제 쿼리 실행 |
| INSERT | ✅ | ✅ | 실제 테이블에 데이터 삽입 |
| DELETE | ✅ | ✅ | 삽입한 데이터 삭제 |
| UPDATE | ✅ | ❌ | 제거 (안전성) |
| CREATE | ✅ | ❌ | 제거 (안전성) |
| DROP | ✅ | ❌ | 제거 (안전성) |

### 왜 변경되었나요?

**안전성 향상:**
- CREATE/DROP 테스트는 운영 환경에서 위험
- 임시 테이블 생성으로 인한 불필요한 리소스 사용 방지

**실용성 향상:**
- 실제 사용하는 쿼리와 테이블로 테스트
- 운영 환경과 동일한 조건 확인 가능

---

## CSV 파일 작성 가이드

### 필수 컬럼

모든 CSV 파일에는 다음 컬럼이 **반드시** 필요합니다:

```csv
db_name,username,password,server_ip,port,db_type,db_title
```

| 컬럼 | 설명 | 예시 |
|------|------|------|
| `db_name` | 데이터베이스명 | `SampleDB` |
| `username` | 사용자명 | `sa`, `root`, `postgres` |
| `password` | 비밀번호 | `password123` |
| `server_ip` | 서버 IP 또는 호스트명 | `localhost`, `192.168.1.100` |
| `port` | 포트 번호 | `1433`, `3306`, `5432`, `1521` |
| `db_type` | DB 타입 | `mssql`, `mysql`, `postgresql`, `oracle` |
| `db_title` | 설명 (선택) | `운영 데이터베이스` |

### 권한 체크 컬럼 (선택사항)

권한 체크를 수행하려면 다음 컬럼을 추가합니다:

```csv
select_sql,crud_test_table,crud_test_columns,crud_test_values
```

| 컬럼 | 설명 | 예시 |
|------|------|------|
| `select_sql` | 실행할 SELECT 쿼리 | `SELECT TOP 3 name FROM users` |
| `crud_test_table` | 테스트할 테이블명 | `users` |
| `crud_test_columns` | 컬럼명 (쉼표 구분) | `id, name, email` |
| `crud_test_values` | 값 (쉼표 구분) | `test001, 테스트, test@test.com` |

### CSV 파일 예시

#### 예시 1: 기본 연결 체크만

```csv
db_name,username,password,server_ip,port,db_type,db_title
ProductionDB,readonly,ReadPass123,prod.company.com,1433,mssql,운영 데이터베이스
DevelopDB,devuser,DevPass123,dev.company.com,3306,mysql,개발 데이터베이스
TestDB,testuser,TestPass123,test.company.com,5432,postgresql,테스트 데이터베이스
```

**결과:**
- 데이터베이스 연결 성공/실패 확인
- 기본 SELECT 권한만 확인

#### 예시 2: 전체 권한 체크 포함

**MSSQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,Pass123,localhost,1433,mssql,샘플DB,"SELECT TOP 5 CustomerName FROM Customers WHERE Active = 1",Customers,"CustomerID, CustomerName, Email","TEST001, 테스트고객, test@test.com"
```

**MySQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
TestDB,root,Pass123,localhost,3306,mysql,테스트DB,"SELECT * FROM users WHERE status = 'active' LIMIT 10",users,"user_id, username, email, status","test001, testuser, test@test.com, active"
```

**PostgreSQL:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
UserDB,postgres,Pass123,localhost,5432,postgresql,사용자DB,"SELECT name, email FROM accounts WHERE active = true LIMIT 5",accounts,"account_id, name, email, active","test001, 테스트계정, test@test.com, true"
```

**Oracle:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
OracleDB,system,Pass123,localhost,1521,oracle,오라클DB,"SELECT employee_name FROM employees WHERE rownum <= 5",employees,"employee_id, employee_name, department","E001, 홍길동, IT"
```

---

## 데이터베이스 권한 체크

### 체크 프로세스

```
1. 연결 테스트
   ↓
2. SELECT 권한 체크 (CSV의 select_sql 실행)
   ↓
3. INSERT 권한 체크 (crud_test_table에 데이터 삽입)
   ↓
4. DELETE 권한 체크 (삽입한 데이터 삭제)
   ↓
5. 결과 저장
```

### 각 단계별 설명

#### 1단계: 연결 테스트
```
목적: 데이터베이스 서버 접근 가능 여부 확인
실패 시: 이후 단계 모두 스킵
성공 시: 다음 단계 진행
```

#### 2단계: SELECT 권한 체크
```sql
-- CSV에 지정한 쿼리 실행 (MSSQL 예시)
SELECT TOP 5 CustomerName FROM Customers WHERE Active = 1
```

**결과:**
- ✅ 성공: `perm_select = Y`
- ❌ 실패: `perm_select = N`

#### 3단계: INSERT 권한 체크
```sql
-- CSV 정보로 INSERT 쿼리 생성 (MSSQL 예시)
INSERT INTO Customers (CustomerID, CustomerName, Email) 
VALUES ('TEST001', '테스트고객', 'test@test.com')
```

**결과:**
- ✅ 성공: `perm_insert = Y`, `insert_success = SUCCESS`
- ❌ 실패: `perm_insert = N`, `insert_success = FAILED`
- ⏭️ 스킵: `insert_success = SKIPPED` (테이블 정보 없음)

#### 4단계: DELETE 권한 체크
```sql
-- 첫 번째 컬럼 기준으로 DELETE (MSSQL 예시)
DELETE FROM Customers WHERE CustomerID = 'TEST001'
```

**결과:**
- ✅ 성공: `perm_delete = Y`, `delete_success = SUCCESS`
- ❌ 실패: `perm_delete = N`, `delete_success = FAILED`
- ⏭️ 스킵: `delete_success = SKIPPED` (INSERT 실패 시)

### 주의사항

#### ⚠️ 데이터 정리

DELETE가 실패하면 테스트 데이터가 남을 수 있습니다.

**권장 방법:**
1. 고유한 ID 사용 (예: `TEST_PERM_001`)
2. 주기적으로 테스트 데이터 정리
3. 테스트 전용 테이블 사용

**정리 스크립트:**
```sql
-- MSSQL
DELETE FROM test_table WHERE id LIKE 'TEST_%';

-- MySQL/PostgreSQL
DELETE FROM test_table WHERE id LIKE 'TEST_%';

-- Oracle
DELETE FROM test_table WHERE id LIKE 'TEST_%';
COMMIT;
```

#### 🔒 보안

CSV 파일에 비밀번호가 평문으로 저장됩니다.

**보안 조치:**
1. CSV 파일 접근 권한 제한
2. .gitignore에 추가
3. 읽기 전용 계정 사용 권장
4. 민감한 DB는 별도 관리

---

## 실행 방법

### 방법 1: 배치 파일 사용 (권장)

```batch
# Windows
run.bat
```

메뉴에서 `1. 데이터베이스 연결 및 권한 체크` 선택

### 방법 2: 직접 실행

```bash
# Node.js 직접 실행
node app.js

# 또는 npm 사용
npm start
```

### 실행 화면

```
========================================
    Node.js 통합 유틸리티 도구
========================================

📋 메인 메뉴
1. 데이터베이스 연결 및 권한 체크
2. 서버 Telnet 연결 체크  
3. 데이터베이스 SQL 실행
4. 설정 관리
5. 모든 체크 실행 (일괄 처리)
6. 종료

실행할 기능을 선택하세요 (1-6): 1

📁 사용 가능한 CSV 파일:
  1. DB_sample.csv

사용할 CSV 파일 선택 (1): 1

⏱️  연결 타임아웃 (기본값: 5초): 

🔍 데이터베이스 연결 체크 시작...
4개의 DB 정보를 읽었습니다.
```

### 실행 중 메시지

```
[localhost:1433][MSSQL][sa][SampleDB][Customers]
  → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
  └ SELECT: ✅ Success (0.005s) - RowCount: 3
  └ INSERT: ✅ Success (0.002s)
  └ DELETE: ✅ Success (0.001s)

[localhost:3306][MYSQL][root][TestDB][users]
  → [❌ Failed] [ER_ACCESS_DENIED_ERROR] 접근 거부
```

---

## 결과 확인

### 결과 파일 위치

```
results/
  └── DB_sample__20251007143022.csv
```

파일명 형식: `[원본CSV파일명]__[타임스탬프].csv`

### 결과 CSV 형식

```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_delete,insert_success,delete_success
```

### 컬럼 설명

| 컬럼 | 설명 | 값 |
|------|------|-----|
| `timestamp` | 체크 시각 | ISO 8601 형식 |
| `pc_ip` | 체크 수행 PC IP | 자동 감지 |
| `server_ip` | DB 서버 IP | CSV 입력값 |
| `port` | DB 포트 | CSV 입력값 |
| `db_name` | 데이터베이스명 | CSV 입력값 |
| `db_type` | DB 타입 | mssql/mysql/postgresql/oracle |
| `db_userid` | 사용자 ID | CSV 입력값 |
| `result_code` | 연결 결과 | SUCCESS / FAILED |
| `error_code` | 에러 코드 | 실패 시 에러 코드 |
| `error_msg` | 에러 메시지 | 실패 시 에러 메시지 |
| `collapsed_time` | 소요 시간 | 초 단위 |
| `perm_select` | SELECT 권한 | Y / N |
| `perm_insert` | INSERT 권한 | Y / N |
| `perm_delete` | DELETE 권한 | Y / N |
| `insert_success` | INSERT 실행 결과 | SUCCESS / FAILED / SKIPPED |
| `delete_success` | DELETE 실행 결과 | SUCCESS / FAILED / SKIPPED |

### 결과 예시

```csv
2025-10-07T14:30:22.123Z,192.168.1.50,localhost,1433,SampleDB,mssql,sa,SUCCESS,,,0.15,Y,Y,Y,SUCCESS,SUCCESS
2025-10-07T14:30:23.456Z,192.168.1.50,localhost,3306,TestDB,mysql,root,FAILED,ER_ACCESS_DENIED_ERROR,Access denied for user 'root'@'localhost',0.05,N,N,N,SKIPPED,SKIPPED
```

### Excel에서 결과 분석

1. CSV 파일을 Excel에서 열기
2. 필터 기능 사용
   - `result_code = FAILED`인 항목만 보기
   - `perm_insert = N`인 항목만 보기
3. 피벗 테이블로 통계 생성
   - DB 타입별 성공률
   - 권한별 통계

---

## 문제 해결

### 자주 발생하는 문제

#### 1. "CSV file not found" 에러

**원인:** CSV 파일 경로가 잘못됨

**해결:**
```
✅ 올바른 경로: request_resources/db_check/DB_sample.csv
❌ 잘못된 경로: DB_sample.csv
```

#### 2. "Column not found" 에러

**원인:** CSV 파일에 필수 컬럼이 없음

**해결:**
```csv
# 최소한 이 컬럼들이 필요합니다
db_name,username,password,server_ip,port,db_type
```

#### 3. INSERT 실패

**원인:**
- 테이블이 존재하지 않음
- 컬럼 개수와 값 개수 불일치
- 데이터 타입 불일치
- Primary Key 중복

**해결:**
1. 테이블 존재 확인
2. 컬럼과 값 개수 일치 확인
   ```csv
   # 잘못됨 - 컬럼 3개, 값 2개
   crud_test_columns,"id, name, email"
   crud_test_values,"test001, 테스트"
   
   # 올바름 - 컬럼 3개, 값 3개
   crud_test_columns,"id, name, email"
   crud_test_values,"test001, 테스트, test@test.com"
   ```
3. 고유한 ID 사용

#### 4. DELETE 실패

**원인:**
- DELETE 권한 없음
- WHERE 조건이 맞지 않음

**해결:**
1. DELETE 권한 확인
2. 첫 번째 컬럼이 Primary Key인지 확인
3. 수동으로 데이터 정리

```sql
-- 수동 정리
DELETE FROM test_table WHERE id = 'TEST001';
```

#### 5. Oracle "NJS-003" 에러

**원인:** 이전 버전의 버그

**해결:** v1.1.0은 이미 수정됨. 버전 확인

```bash
# 버전 확인
node app.js --version
```

#### 6. 한글 깨짐

**원인:** CSV 파일 인코딩 문제

**해결:**
1. CSV 파일을 UTF-8 인코딩으로 저장
2. Excel 사용 시:
   - 파일 → 다른 이름으로 저장
   - 인코딩: UTF-8 선택

---

## 모범 사례

### 운영 환경

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
ProductionDB,readonly_monitor,SecurePass123,prod.db.com,1433,mssql,운영DB,"SELECT TOP 1 status FROM health_check",health_check,"check_id, check_name, check_time","HC001, DB 모니터, GETDATE()"
```

**특징:**
- ✅ 읽기 전용 계정 사용
- ✅ health check 전용 테이블
- ✅ 최소한의 권한만 확인
- ✅ 간단한 쿼리

### 개발 환경

```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
DevelopDB,dev_admin,DevPass123,dev.db.com,3306,mysql,개발DB,"SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 100",test_users,"user_id, username, email, created_at","DEV_TEST_001, 테스트계정, devtest@test.com, NOW()"
```

**특징:**
- ✅ 관리자 계정 사용
- ✅ 실제 운영 쿼리와 유사
- ✅ 전체 권한 확인
- ✅ 테스트 전용 테이블

### 테이블 준비

각 데이터베이스에 테스트용 테이블을 미리 준비하세요:

```sql
-- MSSQL
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name NVARCHAR(100),
    test_description NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

-- MySQL
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PostgreSQL
CREATE TABLE permission_test (
    test_id VARCHAR(50) PRIMARY KEY,
    test_name VARCHAR(100),
    test_description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oracle
CREATE TABLE permission_test (
    test_id VARCHAR2(50) PRIMARY KEY,
    test_name VARCHAR2(100),
    test_description VARCHAR2(500),
    created_at TIMESTAMP DEFAULT SYSTIMESTAMP
);
```

### 정기 점검 스크립트

```batch
@echo off
echo ======================================
echo 데이터베이스 권한 체크 - 일일 점검
echo ======================================
echo.

cd /d "D:\tools\db-check"
node app.js --auto --csv=DB_production.csv --timeout=10

echo.
echo 체크 완료. results 폴더를 확인하세요.
pause
```

### 결과 모니터링

```python
# Python 스크립트로 결과 분석
import pandas as pd
import glob
import os

# 최신 결과 파일 찾기
files = glob.glob('results/DB_*.csv')
latest = max(files, key=os.path.getctime)

# 결과 로드
df = pd.read_csv(latest)

# 실패한 항목만 출력
failed = df[df['result_code'] == 'FAILED']
print(f"실패한 체크: {len(failed)}개")
print(failed[['server_ip', 'db_name', 'error_msg']])

# 권한 통계
print(f"\nSELECT 권한: {df['perm_select'].value_counts()}")
print(f"INSERT 권한: {df['perm_insert'].value_counts()}")
print(f"DELETE 권한: {df['perm_delete'].value_counts()}")
```

---

## 추가 리소스

- **변경 이력**: `CHANGELOG.md` 참조
- **마이그레이션**: `MIGRATION_GUIDE.md` 참조
- **전체 문서**: `README.md`, `README_KR.md` 참조
- **영문 매뉴얼**: `USER_MANUAL.md` 참조

---

**버전:** 1.1.0  
**최종 수정:** 2025-10-07  
**작성자:** Development Team

