# 사용자 매뉴얼 v1.3.4

## 📖 목차

1. [소개](#소개)
2. [주요 변경사항](#주요-변경사항)
3. [CSV 파일 작성 가이드](#csv-파일-작성-가이드)
4. [데이터베이스 권한 체크](#데이터베이스-권한-체크)
5. [실행 방법](#실행-방법)
6. [결과 확인](#결과-확인)
7. [데이터베이스 SQL 실행 기능](#데이터베이스-sql-실행-기능)
8. [문제 해결](#문제-해결)
9. [모범 사례](#모범-사례)

---

## 소개

이 매뉴얼은 Node.js 통합 유틸리티 도구 v1.3.4의 데이터베이스 연결, 권한 체크 및 SQL 실행 기능 사용법을 안내합니다.

### v1.3.4의 주요 특징

#### 다국어 지원 🌏
- ✅ **언어 선택**: `--lang` 파라미터로 UI 언어 선택
  - 영어: `run.bat` 실행 또는 `node app.js --lang=en`
  - 한국어: `실행하기.bat` 실행 또는 `node app.js --lang=kr`
- ✅ **국제화된 UI**: 모든 메뉴, 프롬프트, 메시지가 두 언어로 제공
- ✅ **원활한 경험**: 60개 이상의 메시지 번역

#### CSV 인코딩 지원 📝
- ✅ **UTF-8 인코딩**: 모든 CSV 파일은 UTF-8 인코딩으로 저장 필수
- ✅ **한글 문자 지원**: 한글, 중국어, 일본어 등 올바른 표시
- ✅ **범용 호환성**: 모든 플랫폼과 도구에서 정상 작동
- ✅ **안정적인 처리**: 개발 환경과 배포 환경에서 일관된 동작

### v1.3.3의 주요 특징

#### 중요 버그 수정
- ✅ **경로 해석 수정**: 배포판이 이제 실행 파일 디렉토리의 리소스를 올바르게 읽음
- ✅ **이식성 향상**: 실행 파일이 어디서 실행되든 올바르게 작동
- ✅ **근본 원인 수정**: `process.cwd()`에서 `path.dirname(process.execPath)`로 변경

### v1.3.0의 주요 특징

#### Database SQL Executor 개선
- ✅ **CSV 결과 파일 생성**: SQL 실행 결과를 구조화된 CSV 파일로 자동 저장
- ✅ **전처리 지시자**: `#DATABASE` 또는 `#DB`로 SQL 파일에서 접속 DB 명시
- ✅ **JSON 파라미터 지원**: CSV와 함께 JSON 형식 파라미터 파일 지원
- ✅ **조건별 결과 구분**: 각 파라미터 세트별로 결과를 명확히 구분하여 표시

#### 데이터베이스 지원 확장
- ✅ **MariaDB 지원**: MySQL 호환 드라이버로 MariaDB 데이터베이스 지원 추가

#### 기존 기능 (v1.2.0)
- ✅ **안전한 권한 체크**: 임시 테이블 생성 대신 실제 테이블 사용
- ✅ **실제 쿼리 테스트**: CSV에 지정한 실제 쿼리 실행
- ✅ **향상된 안정성**: Oracle 연결 오류 수정
- ✅ **간소화된 결과**: 필요한 권한만 체크 (SELECT, INSERT, DELETE)
- ✅ **향상된 로그 출력**: 데이터베이스별 구분선과 줄바꿈으로 가독성 개선
- ✅ **에러 메시지 캡처**: SELECT/INSERT/DELETE 작업의 상세 에러 정보 CSV 저장
- ✅ **파일 구조 개선**: CSV 파일 위치 통합 및 자동 필터링

---

## 주요 변경사항

### 권한 체크 항목

| 권한 | v1.0.0 | v1.1.0 | v1.2.0 | 설명 |
|------|:------:|:------:|:------:|------|
| SELECT | ✅ | ✅ | ✅ | CSV의 실제 쿼리 실행 |
| INSERT | ✅ | ✅ | ✅ | 실제 테이블에 데이터 삽입 |
| DELETE | ✅ | ✅ | ✅ | 삽입한 데이터 삭제 |
| UPDATE | ✅ | ❌ | ❌ | 제거 (안전성) |
| CREATE | ✅ | ❌ | ❌ | 제거 (안전성) |
| DROP | ✅ | ❌ | ❌ | 제거 (안전성) |

### v1.2.0의 새로운 기능

**로그 출력 개선:**
- 데이터베이스별 구분선과 줄바꿈으로 가독성 향상
- 각 체크 결과가 명확하게 구분되어 표시

**에러 메시지 상세화:**
- SELECT/INSERT/DELETE 작업의 구체적인 에러 메시지 CSV 저장
- 문제 진단 및 해결에 필요한 상세 정보 제공

**파일 구조 개선:**
- CSV 파일 위치를 `request_resources/` 바로 아래로 통합
- 파일명 기반 자동 필터링 (DB 체크: `DB_`로 시작, Telnet 체크: `server_`로 시작)

### 왜 변경되었나요?

**안전성 향상:**
- CREATE/DROP 테스트는 운영 환경에서 위험
- 임시 테이블 생성으로 인한 불필요한 리소스 사용 방지

**실용성 향상:**
- 실제 사용하는 쿼리와 테이블로 테스트
- 운영 환경과 동일한 조건 확인 가능

**사용성 향상:**
- 로그 출력이 더 깔끔하고 읽기 쉬움
- 파일 관리가 더 간편해짐
- 에러 분석이 더 정확해짐

---

## CSV 파일 작성 가이드

### 파일 위치 및 명명 규칙

**v1.2.0부터 모든 CSV 파일은 `request_resources/` 바로 아래에 위치합니다:**

```
request_resources/
├── DB_sample.csv          ← DB 체크용 (DB_로 시작)
├── DB_production.csv      ← DB 체크용 (DB_로 시작)
├── server_sample.csv      ← Telnet 체크용 (server_로 시작)
└── server_production.csv  ← Telnet 체크용 (server_로 시작)
```

**파일명 규칙:**
- **DB 체크용**: `DB_`로 시작하는 파일명
- **Telnet 체크용**: `server_`로 시작하는 파일명
- **확장자**: 반드시 `.csv`

### CSV 파일 인코딩 📝

**⚠️ 중요: UTF-8 인코딩 필수**

모든 CSV 파일은 **반드시** UTF-8 인코딩으로 저장해야 합니다. 다른 인코딩(EUC-KR, ANSI 등)은 **지원하지 않으며** 한글이 깨져서 표시됩니다.

**UTF-8을 사용하는 이유:**
- 🌍 모든 플랫폼에서 범용 호환성
- 📊 최신 도구(Excel, VS Code 등)에서 더 나은 지원
- 🔄 국제적으로 공유 및 협업이 쉬움
- 🚀 패키지 빌드 및 CI/CD 환경에서 더 안정적
- ✅ 한글, 중국어, 일본어 등 모든 언어에서 글자 깨짐 없음

**UTF-8로 저장하는 방법:**

1. **Excel (권장 방법)**:
   - 파일 → 다른 이름으로 저장 → 파일 형식: "CSV UTF-8(쉼표로 분리) (*.csv)"
   - ⚠️ 일반 "CSV(쉼표로 분리)"는 사용하지 마세요 - ANSI 인코딩을 사용합니다

2. **메모장 / Notepad++**:
   - 파일 → 다른 이름으로 저장 → 인코딩: "UTF-8"

3. **VS Code**:
   - 하단 상태바의 인코딩 표시 클릭 (우측 하단)
   - "인코딩하여 저장" 선택
   - "UTF-8" 선택

4. **LibreOffice Calc**:
   - 파일 → 다른 이름으로 저장 → 문자 집합: "Unicode (UTF-8)"

**확인 방법:**
- CSV 파일을 메모장이나 VS Code로 열기
- 상태바나 파일 속성에서 인코딩 확인
- 한글이 정상적으로 보이면 인코딩이 올바릅니다

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
| `db_type` | DB 타입 | `mssql`, `mysql`, `mariadb`, `postgresql`, `oracle` |
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
MariaTestDB,devuser,DevPass123,dev.company.com,3306,mariadb,MariaDB 테스트 데이터베이스
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

**MariaDB:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
MariaTestDB,root,Pass123,localhost,3306,mariadb,MariaDB테스트,"SELECT * FROM products WHERE price > 1000 LIMIT 10",products,"product_id, product_name, price","test001, 테스트상품, 5000"
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

### 텔넷 체크 CSV 형식

#### 기본 형식:
```csv
server_ip,port,server_name
192.168.1.100,8080,본사 ERP 웹서버
192.168.1.101,3306,본사 WMS DB서버
192.168.1.102,22,지사 CRM SSH서버
10.0.0.50,443,운영 API 서버
```

**컬럼 설명:**
- `server_ip` (필수): 체크할 서버 IP 주소 또는 호스트명
- `port` (필수): 체크할 포트 번호
- `server_name` (선택): 서버 식별을 위한 설명

**결과 CSV 컬럼:**
```csv
timestamp,pc_ip,server_ip,port,server_name,result_code,error_code,error_msg,collapsed_time
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

**영어 UI:**
```batch
# Windows
run.bat
```

**한국어 UI:**
```batch
# Windows
실행하기.bat
```

메뉴에서 `1. 데이터베이스 연결 및 권한 체크` 선택

### 방법 2: 직접 실행

**영어:**
```bash
# Node.js 직접 실행 (영어 UI)
node app.js --lang=en

# 또는 npm 사용
npm start
```

**한국어:**
```bash
# Node.js 직접 실행 (한국어 UI)
node app.js --lang=kr
```

**기본값 (언어 파라미터 없음):**
```bash
# 기본값은 영어
node app.js
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
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_delete,insert_success,delete_success,insert_query,delete_query,operation_errors
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
| `insert_query` | 실행된 INSERT 쿼리 | 실제 실행된 쿼리문 |
| `delete_query` | 실행된 DELETE 쿼리 | 실제 실행된 쿼리문 |
| `operation_errors` | 작업별 에러 메시지 | SELECT/INSERT/DELETE 에러 상세 정보 |

### 결과 예시

```csv
2025-10-07T14:30:22.123Z,192.168.1.50,localhost,1433,SampleDB,mssql,sa,SUCCESS,,,0.15,Y,Y,Y,SUCCESS,SUCCESS,"INSERT INTO users (id, name, email) VALUES ('TEST_001', 'Test User', 'test@example.com')","DELETE FROM users WHERE id = 'TEST_001' AND name = 'Test User' AND email = 'test@example.com'",
2025-10-07T14:30:23.456Z,192.168.1.50,localhost,3306,TestDB,mysql,root,FAILED,ER_ACCESS_DENIED_ERROR,Access denied for user 'root'@'localhost',0.05,N,N,N,SKIPPED,SKIPPED,,"","SELECT: Access denied for user 'root'@'localhost'"
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
DevelopDB,dev_admin,DevPass123,dev.db.com,3306,mariadb,개발DB,"SELECT * FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) LIMIT 100",test_users,"user_id, username, email, created_at","DEV_TEST_001, 테스트계정, devtest@test.com, NOW()"
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

-- MySQL / MariaDB
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

## 데이터베이스 SQL 실행 기능

### 개요

Database SQL Execution 기능을 사용하면 파라미터화된 SQL 쿼리를 여러 조건으로 반복 실행하고 결과를 CSV 파일로 저장할 수 있습니다.

### 지원하는 데이터베이스

- **Microsoft SQL Server** (mssql)
- **MySQL** (mysql)
- **MariaDB** (mariadb) ⭐ v1.2.0+
- **PostgreSQL** (postgresql)
- **Oracle** (oracle)

### 파일 구조

```
request_resources/
└── sql_files/
    ├── SQL_001.sql      ← SQL 쿼리 파일
    ├── SQL_001.csv      ← 파라미터 파일 (CSV)
    ├── SQL_001.json     ← 파라미터 파일 (JSON)
    ├── SQL_002.sql
    └── SQL_002.json

results/
└── sql_files/
    ├── SQL_001_sampleDB_20251008_143025.csv   ← 실행 결과
    └── SQL_002_mysqlDB_20251008_150130.csv
```

**참고:** CSV 또는 JSON 중 하나만 있어도 됩니다. 둘 다 있으면 JSON이 우선 사용됩니다.

### SQL 파일 작성 (.sql)

#### 기본 형식

파라미터를 `@변수명` 형식으로 작성합니다:

```sql
-- SQL_001.sql 예시
SELECT p.*
FROM product p
WHERE price >= @min_price
  AND price <= @max_price;
```

#### 접속 DB 명시 (선택사항)

SQL 파일 상단에 전처리 지시자(preprocessor directive)로 접속할 DB를 명시할 수 있습니다:

```sql
#DATABASE sampleDB

SELECT p.*
FROM product p
WHERE price >= @min_price
  AND price <= @max_price;
```

또는

```sql
#DB mysqlDB

SELECT * FROM users;
```

**규칙:**
- SQL 파일 첫 부분에 `#DATABASE DB명` 또는 `#DB DB명` 형식으로 작성
- `#` 기호로 시작 (C/C++ 스타일 전처리 지시자)
- 대소문자 구분 없음 (#DB, #db, #Database, #database 모두 가능)
- DB명은 `config/dbinfo.json`에 정의된 이름과 일치해야 함
- DB명을 명시하지 않으면 실행 시 CLI에서 선택 가능

**장점:**
- ✅ `#` 기호로 명령어/지시자임을 명확히 표시 (주석이 아님)
- ✅ 자주 사용하는 DB를 미리 지정하여 매번 선택할 필요 없음
- ✅ 특정 DB 전용 쿼리를 명확히 구분
- ✅ 잘못된 DB에 실행하는 실수 방지
- ✅ 한눈에 특별한 기능임을 인지 가능

### 파라미터 파일 작성 (.csv 또는 .json)

SQL 파일과 같은 이름의 CSV 또는 JSON 파일에 파라미터 값을 작성합니다.

#### CSV 형식:

```csv
min_price,max_price
1000000,2000000
1000,100000
5000,50000
```

**규칙:**
- 첫 줄은 헤더 (파라미터명)
- 각 행이 하나의 실행 단위
- SQL의 `@변수명`과 CSV 헤더명이 일치해야 함

#### JSON 형식:

**배열 형식 (여러 조건):**
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

**단일 객체 형식 (한 가지 조건):**
```json
{
    "min_price": 1000000,
    "max_price": 2000000
}
```

**규칙:**
- 배열 형식 또는 단일 객체 형식 지원
- SQL의 `@변수명`과 JSON 키(key)가 일치해야 함
- JSON과 CSV가 모두 있으면 JSON이 우선 사용됨

### 실행 방법

1. 메인 메뉴에서 `3. Database SQL Execution` 선택
2. 실행할 SQL 파일 선택
3. 접속할 데이터베이스 선택 (SQL 파일에 DB가 명시되어 있으면 자동 선택)
4. 자동 실행

**실행 시나리오:**

**시나리오 1: DB가 SQL 파일에 명시된 경우**
```
📄 SQL file: SQL_001.sql
📄 Parameter file (CSV): SQL_001.csv

📌 Specified DB in SQL file: sampleDB
✅ Using specified database: sampleDB

🗄️ Database in use: sampleDB
   DB type: mssql
   ...
```

**시나리오 2: DB가 명시되지 않은 경우**
```
📄 SQL file: SQL_002.sql
📄 Parameter file (JSON): SQL_002.json

🗄️ Available Databases:
  1. sampleDB (mssql) - localhost:1433/SampleDB
  2. mysqlDB (mysql) - localhost:3306/mydb
  3. mariaDB (mariadb) - localhost:3306/mariadb_testdb

Select database to use (1-3): _
```

### 결과 CSV 파일 형식

결과 파일은 `results/sql_files/` 폴더에 생성되며 다음 정보를 포함합니다:

#### 1. 데이터베이스 정보 (상단)
```csv
Database Information
DB Name,sampleDB
DB Type,mssql
Server,localhost:1433
Database,SampleDB
Execution Time,2025-10-08T14:30:25.123Z
```

#### 2. 조건별 결과 (구분되어 표시)
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

### 파일명 형식

결과 파일명: `{SQL파일명}_{DB명}_{실행시간}.csv`

예시:
- `SQL_001_sampleDB_20251008_143025.csv`
- `상품조회_mysqlDB_20251008_150130.csv`
- `재고현황_mariaDB_20251008_153045.csv`

### 사용 예시

#### 예시 1: 가격대별 상품 조회

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

**또는 SQL_product_search.json:**
```json
[
    { "min_price": 0, "max_price": 10000 },
    { "min_price": 10000, "max_price": 50000 },
    { "min_price": 50000, "max_price": 100000 },
    { "min_price": 100000, "max_price": 1000000 }
]
```

#### 예시 2: 기간별 주문 조회

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

**또는 SQL_order_search.json:**
```json
[
    { "start_date": "2025-01-01", "end_date": "2025-02-01" },
    { "start_date": "2025-02-01", "end_date": "2025-03-01" },
    { "start_date": "2025-03-01", "end_date": "2025-04-01" }
]
```

#### 예시 3: 다중 파라미터 복합 조회

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
서울,2025-01-01,100000
부산,2025-01-01,100000
대구,2025-01-01,100000
```

**또는 SQL_complex_search.json:**
```json
[
    { "region": "서울", "start_date": "2025-01-01", "min_amount": 100000 },
    { "region": "부산", "start_date": "2025-01-01", "min_amount": 100000 },
    { "region": "대구", "start_date": "2025-01-01", "min_amount": 100000 }
]
```

### config/dbinfo.json 설정

SQL Executor는 `config/dbinfo.json`에 정의된 데이터베이스를 사용합니다:

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

### 주의사항

⚠️ **대용량 결과 처리**
- 결과가 너무 많으면 CSV 파일이 매우 커질 수 있음
- LIMIT 절을 사용하여 결과 수 제한 권장

⚠️ **파라미터명 일치**
- SQL의 `@변수명`과 CSV 헤더명이 정확히 일치해야 함
- 대소문자 구분

⚠️ **SQL Injection 방지**
- 파라미터는 자동으로 바인딩되어 안전함
- CSV 파일 관리에 주의

⚠️ **한글 파일명**
- SQL 파일명에 한글 사용 가능
- 예: `상품조회.sql`, `상품조회.csv`

### 로그 파일

SQL 실행 중 JSON 로그도 생성됩니다:

```
log/
└── 20251008/
    ├── SQL_001_143025.log
    └── SQL_001_143026.log
```

---

## 추가 리소스

- **변경 이력**: `CHANGELOG.md` 참조
- **마이그레이션**: `MIGRATION_GUIDE.md` 참조
- **전체 문서**: `README.md`, `README_KR.md` 참조
- **영문 매뉴얼**: `USER_MANUAL.md` 참조

---
