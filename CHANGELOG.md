# 변경 이력 (Changelog)

## [1.1.0] - 2025-10-07

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


**Version:** 1.1.0  
**Date:** 2025-10-07  
**Next Update:** TBD

