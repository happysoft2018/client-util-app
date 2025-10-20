# 변경 이력 (Changelog)

## [1.3.5] - 2025-10-20

### 🔧 개선 사항

#### 다국어 처리 확장
- **추가 모듈 다국어 지원**: DBConnectionChecker, DBExecutor, TelnetChecker 모듈에 다국어 메시지 추가
- **일관성 개선**: 모든 사용자 메시지가 영어/한국어로 통일
- **오류 메시지 번역**: 데이터베이스 연결 오류, SQL 실행 오류 등 모든 오류 메시지 번역
- **프롬프트 메시지 개선**: 사용자 입력 프롬프트의 번역 품질 향상

### 📝 문서 업데이트
- 요청 문서 업데이트
- 사용자 매뉴얼 업데이트
- 버전 정보 동기화

## [1.3.4] - 2025-10-18

### ✨ 새로운 기능

#### 다국어 지원 (영어/한국어)
- **언어 선택 기능**: `--lang` 파라미터로 UI 언어 선택 가능
  - 영어: `node app.js --lang=en` 또는 `run.bat` 사용
  - 한국어: `node app.js --lang=kr` 또는 `실행하기.bat` 사용
- **이중 실행 스크립트**:
  - `run.bat`: 영어로 애플리케이션 실행
  - `실행하기.bat`: 한국어로 애플리케이션 실행
- **국제화된 UI**: 모든 사용자 인터페이스 메시지가 두 언어 모두 지원
  - 메인 메뉴, 오류 메시지, 프롬프트, 상태 메시지
  - 60개 이상의 메시지가 번역되어 원활한 사용 경험 제공

#### CSV 인코딩 지원
- **UTF-8 인코딩 필수**: 모든 CSV 파일은 UTF-8 인코딩으로 저장 필수
- **한글 문자 지원**: CSV 파일의 한글 깨짐 문제 해결
- **구현 간소화**: 안정성 향상을 위해 복잡한 인코딩 감지 제거
- **참고**: EUC-KR 및 기타 인코딩은 지원하지 않음
- **영향받는 모듈**:
  - `DBConnectionChecker.js`: 데이터베이스 연결 확인 CSV 파일
  - `TelnetChecker.js`: 서버 연결 확인 CSV 파일
  - `DBExecutor.js`: SQL 파라미터 CSV 파일

### 🔧 개선 사항

#### 릴리스 스크립트 개선
- **자동 버전 읽기**: `release.bat`이 이제 `package.json`에서 버전을 자동으로 읽음
- **이중 런처 생성**: 영어 및 한국어 실행 스크립트를 자동으로 생성
- **ZIP 아카이브 생성**: 압축된 릴리스 패키지를 자동으로 생성

### 📝 문서 업데이트
- 새로운 다국어 기능을 반영하여 모든 문서 업데이트
- 사용자 매뉴얼에 인코딩 지원 정보 추가
- 릴리스 노트에 언어 옵션 추가

## [1.3.3] - 2025-10-16

### 🐛 중요 버그 수정

#### 배포판 경로 해석 문제 해결
- **pkg 실행파일 경로 해석 수정**: `process.cwd()`에서 `path.dirname(process.execPath)`로 변경
  - **근본 원인**: `process.cwd()`는 명령이 실행된 디렉토리를 반환하며, 실행 파일이 위치한 디렉토리가 아님
  - **해결 방법**: `path.dirname(process.execPath)`를 사용하여 실행 파일의 올바른 디렉토리 경로 획득
  - 배포판이 이제 실행 파일 디렉토리의 `request_resources/`를 올바르게 읽음
  - 설정 파일 (`config/dbinfo.json`)이 올바른 위치에서 로드됨
  - 결과 및 로그가 실행 파일 기준 올바른 디렉토리에 저장됨

#### 영향
- 수정 전: 다른 디렉토리에서 실행 파일을 실행하면 리소스를 찾지 못함
- 수정 후: 실행 파일이 어디서 실행되든 올바르게 작동

#### 영향받는 파일
- `app.js`: `APP_ROOT = process.pkg ? process.cwd() : __dirname` → `APP_ROOT = process.pkg ? path.dirname(process.execPath) : __dirname`으로 변경
- `ConfigManager.js`: 동일한 APP_ROOT 수정
- `DBExecutor.js`: 동일한 APP_ROOT 수정 + 경로 로직 간소화
- `DBConnectionChecker.js`: APP_ROOT 상수 추가 및 fallback 로직 제거
- `TelnetChecker.js`: APP_ROOT 상수 추가 및 fallback 로직 제거

## [1.3.2] - 2025-10-14

### 🐛 버그 수정

#### 실행파일 경로 문제 해결
- **현재 작업 디렉토리 사용**: pkg 실행파일에서 `process.execPath` 대신 `process.cwd()` 사용
  - 실행파일이 현재 디렉토리의 `request_resources/` 폴더를 올바르게 인식
  - 실행파일이 현재 디렉토리의 `config/` 폴더를 올바르게 인식
  - 실행파일이 현재 디렉토리의 `results/` 폴더에 결과 저장
  - 실행파일이 현재 디렉토리의 `log/` 폴더에 로그 저장

#### 영향받는 파일
- `app.js`: APP_ROOT를 process.cwd()로 변경
- `DBExecutor.js`: APP_ROOT, logDir, resultsDir을 process.cwd() 기반으로 변경
- `ConfigManager.js`: APP_ROOT를 process.cwd()로 변경
- `DBConnectionChecker.js`: getResultsDir()를 process.cwd() 기반으로 변경
- `TelnetChecker.js`: getResultsDir()를 process.cwd() 기반으로 변경

## [1.3.1] - 2025-10-14

### 🔧 기술적 개선

#### pkg 환경 파일 경로 처리 개선
- **APP_ROOT 상수 추가**: pkg 환경과 개발 환경 모두에서 올바른 파일 경로 사용
  - `app.js`: APP_ROOT 상수 추가 및 __dirname → APP_ROOT 변경
  - `DBExecutor.js`: sqlFilesDir 경로를 APP_ROOT 사용하도록 수정
  - `ConfigManager.js`: dbConfigFile 및 resultsDir 경로를 APP_ROOT 사용하도록 수정

#### dbinfo.json 구조 개선
- **dbs 래퍼 제거**: DB 설정을 직접 루트에 배치
  - 변경 전: `{"dbs": {"sampleDB": {...}}}`
  - 변경 후: `{"sampleDB": {...}}`
  - 더 간결한 구조로 가독성 향상

#### pkg 설정 개선
- **assets 확장**: config 디렉토리의 모든 JSON 파일 포함
- **문서 파일 추가**: USER_MANUAL, CHANGELOG 등 문서 파일 포함
- **app.js 스크립트 추가**: pkg 빌드 시 app.js 포함

### 🐛 버그 수정
- **exe 파일에서 request_resources 접근 오류**: pkg 환경에서 __dirname 대신 APP_ROOT 사용으로 해결
- **exe 파일에서 config 파일 접근 오류**: pkg 환경에서 올바른 경로 사용

## [1.3.0] - 2025-10-08

### 🎯 주요 변경사항

#### Database SQL Executor 대폭 개선
- **CSV 결과 파일 생성**: SQL 실행 결과를 구조화된 CSV 파일로 자동 저장
  - 파일 위치: `results/sql_files/`
  - 파일명 형식: `{SQL명}_{DB명}_{타임스탬프}.csv`
  - 예시: `SQL_001_sampleDB_20251008_143025.csv`

- **결과 파일 구조**:
  - **DB 정보 헤더**: DB명, 타입, 서버, 실행시간 등 메타데이터 표시
  - **조건별 구분**: 각 파라미터 세트별로 명확히 구분하여 결과 표시
  - **파라미터 정보**: 각 실행 조건의 파라미터 값 명시
  - **결과 카운트**: 각 조건별 결과 행 수 표시

- **전처리 지시자 도입**: SQL 파일에서 접속 DB 명시 가능
  - 형식: `#DATABASE dbname` 또는 `#DB dbname`
  - 지시자 라인은 실행 전 자동 제거 (DB 엔진 호환성)
  - 명시하지 않으면 CLI에서 선택 가능

#### 파라미터 파일 확장
- **JSON 파일 지원**: CSV와 함께 JSON 형식 파라미터 파일 지원
  - 배열 형식: `[{...}, {...}]` (여러 조건)
  - 단일 객체: `{...}` (한 가지 조건)
  - JSON과 CSV 모두 있으면 JSON 우선 사용

#### 데이터베이스 지원 확장
- **MariaDB 추가**: MySQL 호환 드라이버로 MariaDB 지원
  - DatabaseFactory에 mariadb 타입 추가
  - config/dbinfo.json 예제 추가
  - 사용자 매뉴얼 업데이트

### 🔧 기술적 개선

#### DBExecutor 개선
- **파라미터 파싱 통합**: CSV와 JSON 파일 모두 처리 가능
- **DB 정보 전달**: 실행 결과에 DB 메타데이터 포함
- **전처리 파싱**: SQL 지시자 추출 및 제거 로직

#### 사용자 경험 향상
- **자동 DB 선택**: SQL 파일에 DB 명시 시 자동 선택
- **구조화된 출력**: 파라미터와 결과를 명확히 구분한 CSV
- **에러 처리**: 잘못된 DB명 명시 시 사용 가능한 DB 목록 표시

### 🐛 버그 수정
- **CSV 파라미터 형식**: JSON 배열 형식을 표준 CSV 형식으로 수정
  - 변경 전: `[{min_price:1000000, max_price:2000000}]`
  - 변경 후: `min_price,max_price\n1000000,2000000`

### 📚 문서 업데이트
- **USER_MANUAL_KR.md / USER_MANUAL.md**:
  - Database SQL Execution 섹션 대폭 확장
  - JSON 파라미터 파일 작성법 추가
  - #DATABASE 지시자 사용법 추가
  - 3가지 사용 예시 추가 (가격대별 상품 조회, 기간별 주문 조회, 복합 조회)
  - MariaDB 관련 내용 추가

---

## [1.2.0] - 2025-01-07

### 🎯 주요 변경사항

#### 로그 출력 개선
- **데이터베이스별 구분선**: 각 DB 체크 간 명확한 시각적 구분
- **향상된 가독성**: 줄바꿈과 이모지로 더 나은 포맷팅
- **실시간 진행상황**: 체크 중 향상된 콘솔 출력

#### 에러 메시지 상세화
- **작업별 에러 캡처**: SELECT/INSERT/DELETE 작업의 구체적인 에러 메시지 CSV 저장
- **포괄적인 로깅**: 최대 500자까지의 상세 에러 정보
- **문제 진단 개선**: 구체적인 에러 세부사항으로 문제 해결 지원

#### 파일 구조 개선
- **통합 CSV 위치**: 모든 CSV 파일을 `request_resources/` 바로 아래로 통합
- **스마트 필터링**: 파일명 기반 자동 필터링
  - DB 체크: `DB_`로 시작하는 파일만 표시
  - Telnet 체크: `server_`로 시작하는 파일만 표시
- **단순화된 구조**: 하위 디렉토리 제거로 파일 관리 간소화

#### DELETE 작업 향상
- **다중 컬럼 조건**: DELETE 쿼리가 CSV에 명시된 모든 컬럼을 조건으로 사용
- **더 안전한 테스트**: 정확한 권한 체크를 위한 정밀한 데이터 삭제
- **쿼리 로깅 개선**: 실제 실행된 쿼리를 결과 CSV에 저장

### 🔧 기술적 개선

#### CSV 결과 형식 확장
- **새로운 컬럼 추가**:
  - `insert_query`: 실행된 INSERT 쿼리문
  - `delete_query`: 실행된 DELETE 쿼리문
  - `operation_errors`: 작업별 에러 메시지 (SELECT/INSERT/DELETE)

#### 코드 개선
- **에러 처리 강화**: 모든 데이터베이스 연결 클래스에서 에러 메시지 캡처
- **로그 포맷팅**: 일관된 로그 출력 형식 적용
- **파일 필터링**: 효율적인 CSV 파일 선택 로직

### 🐛 버그 수정
- **PostgreSQL 매개변수 바인딩**: INSERT/DELETE 쿼리에서 실제 값이 CSV에 저장되도록 수정
- **Oracle 연결 재사용**: NJS-003 에러 방지를 위한 연결 재사용 로직 개선
- **MSSQL DML 쿼리**: INSERT/DELETE 작업에서 recordset undefined 에러 수정

---

## [1.1.0] - 2025-10-05

### 🎯 주요 변경사항

#### 데이터베이스 권한 체크 로직 개선

**변경된 권한 체크 항목:**
- ✅ **유지**: SELECT, INSERT, DELETE 권한 체크
- ❌ **제거**: CREATE TABLE, DROP TABLE, UPDATE 권한 체크

**변경 이유:**
- 실제 운영 환경에서 CREATE/DROP 권한을 테스트하는 것은 위험성이 높음
- 임시 테이블 생성으로 인한 불필요한 리소스 사용 방지
- UPDATE 권한은 INSERT/DELETE로 충분히 확인 가능

### 🔧 기능 개선

#### 1. CSV 파일 형식 확장
**새로운 컬럼 추가:**
- `select_sql`: 실행할 SELECT 쿼리 지정
- `crud_test_table`: 권한 테스트에 사용할 테이블명
- `crud_test_columns`: 테스트에 사용할 컬럼명 (쉼표로 구분)
- `crud_test_values`: 테스트에 사용할 값 (쉼표로 구분)

**CSV 형식 예시:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,user,pass,localhost,1433,mssql,샘플DB,"SELECT top 3 name from customers",customers,"customercode, customername","test001, 테스트고객"
```

#### 2. 권한 체크 방식 변경
**이전 방식:**
- 임시 테이블(`temp_permission_test_[timestamp]`) 생성
- 임시 테이블에 대해 INSERT/UPDATE/DELETE 테스트
- 테이블 DROP으로 정리

**현재 방식:**
- CSV에 명시된 실제 테이블 사용
- SELECT: CSV의 `select_sql` 쿼리 실행
- INSERT: CSV의 테이블/컬럼/값을 사용하여 데이터 삽입
- DELETE: 삽입한 데이터를 첫 번째 컬럼 기준으로 삭제

**장점:**
- 실제 운영 테이블에 대한 권한 확인 가능
- 임시 테이블 생성/삭제 불필요
- 실제 쿼리 성능 측정 가능

### 🐛 버그 수정

#### 1. Oracle 데이터베이스 연결 오류 수정
**문제:** `NJS-003: invalid or closed connection` 에러 발생

**원인:**
- `checkPermissions()` 메서드가 이미 연결된 상태에서 재연결 시도
- 메서드 종료 시 연결을 닫아버려 후속 작업 실패

**해결:**
- 연결 상태 확인 로직 추가
- 이미 연결되어 있으면 기존 연결 재사용
- 메서드 내에서 연결한 경우에만 disconnect 수행

**적용 대상:**
- `MSSQLConnection.js`
- `MySQLConnection.js`
- `OracleConnection.js`
- `PostgreSQLConnection.js`

#### 2. SELECT 쿼리 중복 실행 문제 수정
**문제:** SELECT 쿼리가 여러 번 실행되어 성공/실패 메시지 중복 출력

**원인:**
- `checkPermissions()`에서 1회 실행
- `checkDbConnection()`에서 1회 실행
- `testCrudOperations()`에서 1회 실행

**해결:**
- `checkPermissions()`에서만 SELECT 쿼리 실행
- 중복 실행 코드 제거
- `testCrudOperations()`는 INSERT/DELETE만 담당

### 📊 결과 CSV 형식 변경

**이전 헤더:**
```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_update,perm_delete,perm_create,perm_drop,select_result_data,select_elapsed,insert_success,insert_elapsed,update_success,update_elapsed,delete_success,delete_elapsed
```

**현재 헤더:**
```csv
timestamp,pc_ip,server_ip,port,db_name,db_type,db_userid,result_code,error_code,error_msg,collapsed_time,perm_select,perm_insert,perm_delete,insert_success,delete_success
```

**제거된 컬럼:**
- `perm_update`, `perm_create`, `perm_drop`: 권한 체크 제거
- `select_result_data`, `select_elapsed`: 권한 체크에 포함되어 중복
- `insert_elapsed`, `update_success`, `update_elapsed`, `delete_elapsed`: 성공/실패만 표시

### 🔄 마이그레이션 가이드

#### CSV 파일 업데이트
기존 CSV 파일에 새로운 컬럼 추가 필요:

**최소 구성 (권한 체크만):**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
```

**권한 체크 없이 연결만 확인:**
```csv
db_name,username,password,server_ip,port,db_type,db_title
TestDB,user,pass,localhost,1433,mssql,테스트DB
```
- `select_sql`, `crud_test_table` 등이 없으면 기본 권한 체크만 수행

**전체 권한 체크:**
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
TestDB,user,pass,localhost,1433,mssql,테스트DB,"SELECT TOP 3 * FROM users",users,"id, name, email","test001, Test User, test@example.com"
```

#### 결과 CSV 해석 변경
- `perm_select`, `perm_insert`, `perm_delete`: Y/N으로 권한 유무 표시
- `insert_success`, `delete_success`: SUCCESS/FAILED/SKIPPED로 실행 결과 표시

### 📝 알려진 제한사항

1. **INSERT/DELETE 테스트**
   - CSV에 테이블 정보가 없으면 권한 체크 스킵
   - 테이블이 실제로 존재해야 함
   - 컬럼 개수와 값 개수가 일치해야 함

2. **데이터 정리**
   - INSERT 후 DELETE로 데이터 정리
   - DELETE 실패 시 데이터가 남을 수 있음
   - 테스트용 고유 ID 사용 권장

3. **권한 체크 정확도**
   - SELECT: CSV의 쿼리 실행 성공 여부로 판단
   - INSERT/DELETE: 실제 테이블에 대한 실행 성공 여부로 판단
   - UPDATE 권한은 직접 확인하지 않음

### 🔜 향후 계획

- [ ] 트랜잭션 지원으로 테스트 데이터 자동 롤백
- [ ] 결과 CSV에 상세 에러 메시지 포함
- [ ] 권한 체크 실패 시 재시도 로직
- [ ] 웹 대시보드를 통한 결과 시각화

---

## [1.0.0] - 2025-08-27 (Initial Release)

### ✨ 초기 릴리스

#### 주요 기능
- 다중 데이터베이스 지원 (MSSQL, MySQL, PostgreSQL, Oracle)
- 데이터베이스 연결 및 권한 체크
- 서버 Telnet 연결 체크
- SQL 실행 및 결과 저장
- 통합 메뉴 시스템
- CSV 결과 자동 저장

#### 지원 데이터베이스
- Microsoft SQL Server (MSSQL)
- MySQL
- PostgreSQL
- Oracle Database

#### 핵심 모듈
- `ConfigManager.js`: 설정 관리
- `DBConnectionChecker.js`: DB 연결 및 권한 체크
- `DBExecutor.js`: SQL 실행
- `TelnetChecker.js`: Telnet 연결 체크
- `DatabaseFactory.js`: DB 연결 팩토리 패턴

---

## 범례 (Legend)

- ✨ **Added**: 새로운 기능
- 🔧 **Changed**: 기존 기능 변경
- 🐛 **Fixed**: 버그 수정
- ❌ **Removed**: 제거된 기능
- 📝 **Deprecated**: 향후 제거 예정
- 🔒 **Security**: 보안 관련 수정
