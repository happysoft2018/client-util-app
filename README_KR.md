# Node.js 통합 유틸리티 도구 v1.3.3

로컬환경에서 사용하는 각종 유틸리티를 통합 관리하는 도구입니다.

## 📁 프로젝트 구조

```
my-node-client-util-app/
├── app.js                          # 🚀 메인 통합 애플리케이션
├── src/
│   └── modules/                    # 📦 모듈화된 기능들
│       ├── ConfigManager.js        # 설정 관리
│       ├── DBConnectionChecker.js  # 범용 DB 연결 및 권한 체크
│       ├── DBExecutor.js           # 범용 DB SQL 실행
│       ├── TelnetChecker.js        # 서버 Telnet 연결 체크
│       └── database/               # DB 타입별 연결 클래스들
│           ├── DatabaseFactory.js  # DB 연결 팩토리
│           ├── MSSQLConnection.js  # MSSQL 연결 클래스
│           ├── MySQLConnection.js  # MySQL 연결 클래스
│           ├── PostgreSQLConnection.js # PostgreSQL 연결 클래스
│           └── OracleConnection.js # Oracle 연결 클래스
├── config/
│   └── dbinfo.json                 # DB 연결 정보 설정
├── request_resources/              # 리소스 파일 디렉토리 (v1.2.0+)
│   ├── DB_sample.csv               # DB 체크 CSV 파일들 (DB_로 시작)
│   ├── server_sample.csv           # 텔넷 체크 CSV 파일들 (server_로 시작)
│   └── sql_files/                  # SQL 파일 디렉토리
│       ├── SQL_001.sql             # SQL 쿼리 템플릿
│       └── SQL_001.csv             # SQL 파라미터 템플릿
├── log/                            # 실행 로그 (자동 생성)
└── 프로그램실행하기.bat               # 🎯 통합 실행 도구
```

## 🆕 최신 업데이트

### v1.3.3 - 중요 버그 수정 (2025-10-16) 🔧

**배포판 경로 해석 문제 해결:**
- pkg 실행파일 경로 해석 수정: `process.cwd()`에서 `path.dirname(process.execPath)`로 변경
- **근본 원인**: `process.cwd()`는 명령이 실행된 디렉토리를 반환하며, 실행 파일이 위치한 디렉토리가 아님
- **영향**: 배포판이 이제 어디서 실행되든 실행 파일 디렉토리의 리소스를 올바르게 읽음
- 영향 받는 디렉토리: `request_resources/`, `config/dbinfo.json`, `results/`, `log/`

### v1.3.0 - Database SQL Executor 대폭 개선 ⭐
- **CSV 결과 파일 생성**: SQL 실행 결과를 구조화된 CSV로 자동 저장
  - 파일 위치: `results/sql_files/`
  - 파일명: `{SQL명}_{DB명}_{타임스탬프}.csv`
  - DB 정보 헤더 및 조건별 구분 표시

- **전처리 지시자**: `#DATABASE` 또는 `#DB`로 SQL 파일에서 접속 DB 명시
  ```sql
  #DATABASE sampleDB
  
  SELECT * FROM users WHERE id = @user_id;
  ```

- **JSON 파라미터 지원**: CSV와 함께 JSON 형식 파라미터 파일 지원
  ```json
  [
      { "user_id": 1 },
      { "user_id": 2 }
  ]
  ```

### MariaDB 지원 추가
- **MariaDB 데이터베이스**: MySQL 호환 드라이버로 MariaDB 지원
- **지원 DB**: MSSQL, MySQL, **MariaDB** ⭐, PostgreSQL, Oracle

### v1.2.0 기존 기능

#### 향상된 로그 출력
- **데이터베이스별 구분선**: 각 데이터베이스 체크 간 명확한 시각적 구분
- **가독성 개선**: 줄바꿈과 이모지로 더 나은 포맷팅
- **실시간 진행상황**: 체크 중 향상된 콘솔 출력

#### 상세한 에러 캡처
- **작업별 에러**: SELECT/INSERT/DELETE 에러 메시지를 CSV에 저장
- **포괄적인 로깅**: 최대 500자까지의 상세 에러 정보
- **문제 해결 개선**: 문제 진단을 위한 구체적인 에러 세부사항

#### 간소화된 파일 관리
- **통합 CSV 위치**: 모든 CSV 파일이 이제 `request_resources/` 바로 아래에 위치
- **스마트 필터링**: 명명 규칙 기반 자동 파일 필터링
  - DB 체크: `DB_`로 시작하는 파일
  - Telnet 체크: `server_`로 시작하는 파일
- **단순화된 구조**: CSV 파일용 하위 디렉토리 제거

## 🚀 사용법

### 🎯 **통합 실행 (권장)**
**`프로그램실행하기.bat`**를 더블클릭하면 통합 메뉴가 나타납니다:

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

실행할 기능을 선택하세요 (1-6):
```

### 🔧 **Node.js 명령어 실행**
```bash
# 통합 애플리케이션 실행
npm start
# 또는
node app.js
```

### 📦 **주요 개선사항**
- **다중 DB 지원**: MSSQL, MySQL, PostgreSQL, Oracle 지원
- **통합 관리**: 모든 기능을 하나의 애플리케이션에서 관리
- **CSV 결과 저장**: 모든 체크 결과가 자동으로 CSV 파일로 저장
- **일괄 처리**: 모든 체크를 한 번에 실행
- **모듈화**: 코드 구조 개선으로 유지보수성 향상
- **사용자 친화적**: 직관적인 메뉴 시스템

## 🔍 주요 기능

### 🗄️ **다중 데이터베이스 지원**
다음 데이터베이스들을 지원합니다:
- **Microsoft SQL Server** (MSSQL)
- **MySQL** 
- **PostgreSQL**
- **Oracle Database**

### 📊 **데이터베이스 연결 및 권한 체크**
`DBConnectionChecker.js`는 다음과 같은 종합적인 체크를 수행합니다:

1. **기본 연결 테스트**
   - 지정된 서버:포트로 데이터베이스 연결 시도
   - 연결 성공/실패 및 소요 시간 측정

2. **데이터베이스 권한 체크** (v1.1.0 업데이트)
   - **SELECT 권한**: CSV에 지정된 실제 쿼리 실행 테스트
   - **INSERT 권한**: CSV에 지정된 실제 테이블에 데이터 삽입 테스트
   - **DELETE 권한**: 삽입한 테스트 데이터 삭제 테스트
   
   > ⚠️ **주의**: CREATE, DROP, UPDATE 권한 체크는 안전성을 위해 제거되었습니다.

3. **실제 쿼리 테스트**
   - CSV 파일에 명시한 SELECT 쿼리를 직접 실행
   - 쿼리 실행 성공 여부 및 결과 확인
   - 실제 운영 환경과 동일한 조건으로 테스트

4. **결과 표시**
   ```
   [192.168.1.100:1433][MSSQL][sa][SampleDB][customers] → [✅ Success] [Permissions: SELECT, INSERT, DELETE]
   [192.168.1.101:3306][MYSQL][root][TestDB][users]    → [❌ Failed] [LOGIN_FAILED] 로그인 실패
   ```

5. **결과 자동 저장**
   - 모든 체크 결과를 타임스탬프가 포함된 CSV 파일로 저장
   - `results/` 디렉토리에 자동 저장
   - 권한별 성공/실패 상태 기록

### 📋 **CSV 파일 형식** (v1.1.0 업데이트)

#### DB 체크용 CSV (기본 연결 체크만):
```csv
db_name,username,password,server_ip,port,db_type,db_title
SampleDB,sa,1111,localhost,1433,mssql,샘플 MSSQL DB
TestDB,root,1111,localhost,3306,mysql,테스트 MySQL DB
UserDB,postgres,1111,localhost,5432,postgresql,사용자 PostgreSQL DB
```

**필수 컬럼**: `db_name`, `username`, `password`, `server_ip`, `port`, `db_type`
**선택 컬럼**: `db_title`

#### DB 체크용 CSV (전체 권한 체크 포함):
```csv
db_name,username,password,server_ip,port,db_type,db_title,select_sql,crud_test_table,crud_test_columns,crud_test_values
SampleDB,sa,1111,localhost,1433,mssql,샘플DB,"SELECT top 3 customername from customers",customers,"customercode, customername","test001, 테스트고객"
TestDB,root,1111,localhost,3306,mysql,테스트DB,"SELECT title from boards",boards,"title, content, userid","test, test content, admin"
UserDB,postgres,1111,localhost,5432,postgresql,사용자DB,"SELECT name from servers",users,"id, email, name","test001, test@example.com, 테스트"
```

**추가 컬럼 (권한 체크용)**:
- `select_sql`: 실행할 SELECT 쿼리
- `crud_test_table`: INSERT/DELETE 테스트할 테이블명
- `crud_test_columns`: 테스트할 컬럼명 (쉼표로 구분)
- `crud_test_values`: 테스트할 값 (쉼표로 구분)

**데이터베이스 타입**:
- `db_type`: mssql, mysql, postgresql, oracle

#### 텔넷 체크 CSV:
```csv
server_ip,port,server_name
192.168.1.100,8080,본사 ERP 웹서버
192.168.1.101,3306,본사 WMS DB서버
192.168.1.102,22,지사 CRM SSH서버
```

**필수 컬럼**: `server_ip`, `port`
**선택 컬럼**: `server_name` (서버 식별을 위한 설명)

## ⚙️ 사전 요구사항

1. **Node.js 설치**
   - Node.js 14.0.0 이상 필요
   - https://nodejs.org/ 에서 다운로드

2. **의존성 패키지**
   - 배치파일 실행 시 자동으로 `npm install` 실행
   - 필요한 패키지: csv-parser, mssql, mysql2, pg, oracledb, telnet-client

## 🔧 설정

### 데이터베이스 설정

#### 🗄️ **DB 연결 정보 설정 (`config/dbinfo.json`)**
데이터베이스 연결 정보는 `config/dbinfo.json` 파일에서 관리됩니다:

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

### 설정 관리
애플리케이션은 시스템 정보를 위한 **설정 관리** 메뉴를 제공합니다:
- **시스템 정보**: 시스템 세부사항 및 설정 파일 상태 확인
- **사용 가능한 데이터베이스**: `config/dbinfo.json`에서 설정된 모든 데이터베이스 보기

## 📝 주의사항

- 배치파일은 Windows 환경에서만 실행됩니다.
- 한글 출력을 위해 UTF-8 인코딩을 사용합니다.
- 실행 전 Node.js가 설치되어 있는지 확인하세요.

---

## 🏗️ 빌드 및 배포

### 빌드 스크립트

**`build.bat`** - 실행 파일만 빌드

```batch
build.bat
```

**작업 내용:**
1. Node.js 및 npm 환경 확인
2. 의존성 패키지 설치 (npm install)
3. pkg를 사용하여 실행 파일 생성
4. 출력: `dist\my-node-client-util-app.exe`

**사용 시기:** 빌드만 빠르게 테스트하고 싶을 때

### 릴리즈 스크립트 (올인원)

**`release.bat`** - 빌드 + 배포 패키징 자동화 ⭐

```batch
release.bat
```

**작업 내용:**
1. 이전 릴리즈 정리
2. 애플리케이션 빌드 (npm run build)
3. release/my-node-client-util-app-v1.3.0/ 폴더 생성
4. 실행 파일 복사
5. 설정 파일 복사 (config/)
6. 샘플 파일 복사 (request_resources/)
7. 결과/로그 폴더 생성 (results/, log/)
8. 문서 복사 (README, 매뉴얼, 변경이력 등 8개 파일)
9. 런처 스크립트 생성 (run.bat)
10. 버전 정보 파일 생성 (VERSION_INFO.txt)
11. 릴리즈 노트 생성 (RELEASE_NOTES.txt)

**출력:**
- `release/my-node-client-util-app-v1.3.0/` - 배포 패키지
- `release/my-node-client-util-app-v1.3.0.zip` - ZIP 아카이브 (선택)

**사용 시기:** 완전한 배포 패키지를 만들 때 (권장)

### 배포 워크플로우

#### 개발자용:
```batch
# 1. 코드 수정 및 테스트
node app.js

# 2. 빌드만 빠르게 테스트
build.bat

# 3. 공식 릴리즈 패키지 생성 (권장)
release.bat
```

#### 최종 사용자용:
```
1. release/my-node-client-util-app-v1.3.0.zip 다운로드
2. 압축 해제
3. config/dbinfo.json 수정 (본인 환경에 맞게)
4. run.bat 실행
```

### 배포 패키지 구조

```
my-node-client-util-app-v1.3.0/
├── my-node-client-util-app.exe    # 실행 파일
├── run.bat                         # 런처 스크립트
├── VERSION_INFO.txt                # 버전 정보
├── RELEASE_NOTES.txt               # 릴리즈 노트
├── config/
│   └── dbinfo.json                 # DB 설정 (사용자 수정 필요)
├── request_resources/
│   ├── DB_sample.csv               # DB 체크 샘플
│   ├── server_sample.csv           # 텔넷 체크 샘플
│   └── sql_files/
│       ├── SQL_001.sql             # SQL 샘플 (#DATABASE 지시자 포함)
│       └── SQL_001.csv             # 파라미터 샘플
├── results/
│   └── sql_files/                  # SQL 실행 결과 저장 위치
├── log/                            # 로그 파일 저장 위치
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

---

## 🌐 다국어 지원

이 애플리케이션은 다국어 인터페이스를 지원합니다:
- **English**: `README.md` - English documentation (메인 문서)
- **한국어**: 이 파일 (`README_KR.md`) - 한국어 문서

애플리케이션 실행 시 모든 사용자 인터페이스 메시지와 로그가 영문으로 표시됩니다.