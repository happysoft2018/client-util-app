# Node.js 통합 유틸리티 도구

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
│   ├── dbinfo.json                 # DB 연결 정보 설정
│   └── user-config.json            # 사용자 기본 설정 (자동 생성)
├── templet/                        # 템플릿 파일들
│   ├── DB_sample.csv               # DB 체크용 CSV 샘플
│   ├── SQL_001.sql                 # SQL 쿼리 템플릿
│   └── SQL_001.csv                 # SQL 파라미터 템플릿
├── log/                            # 실행 로그 (자동 생성)
└── 프로그램실행하기.bat               # 🎯 통합 실행 도구
```

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
- **설정 저장**: 자주 사용하는 설정을 저장하여 재사용 가능
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

2. **데이터베이스 권한 체크**
   - **SELECT 권한**: 시스템 테이블 조회 테스트
   - **INSERT 권한**: 임시 테이블에 데이터 삽입 테스트
   - **UPDATE 권한**: 임시 테이블 데이터 수정 테스트  
   - **DELETE 권한**: 임시 테이블 데이터 삭제 테스트
   - **CREATE 권한**: 테이블 생성 테스트
   - **DROP 권한**: 테이블 삭제 테스트

3. **결과 표시**
   ```
   [192.168.1.100:1433][MSSQL][PRDDB][본사_ERP][SampleDB] → [✅ 성공] [권한: SELECT, INSERT, UPDATE, DELETE]
   [192.168.1.101:3306][MYSQL][DEVDB][본사_WMS][TestDB]   → [❌ 실패] [LOGIN_FAILED] 로그인 실패
   ```

4. **API 연동**
   - 체크 결과를 자동으로 서버 API로 전송
   - DB 타입 및 권한 정보까지 포함하여 이력 관리

### 📋 **CSV 파일 형식**

#### DB 체크용 CSV:
```csv
db_name,server_ip,port,corp,proc,env_type,db_type
SampleDB,192.168.1.100,1433,본사,ERP,PRD,mssql
TestDB,192.168.1.101,3306,본사,WMS,DEV,mysql
UserDB,192.168.1.102,5432,지사,CRM,STG,postgresql
```

**필수 컬럼**: `db_name`, `server_ip`, `port`
**선택 컬럼**: `corp`, `proc`, `env_type`, `db_type`
- `db_type`: mssql, mysql, postgresql, oracle (기본값: mssql)

## ⚙️ 사전 요구사항

1. **Node.js 설치**
   - Node.js 14.0.0 이상 필요
   - https://nodejs.org/ 에서 다운로드

2. **의존성 패키지**
   - 배치파일 실행 시 자동으로 `npm install` 실행
   - 필요한 패키지: axios, csv-parser, dotenv, mssql, mysql2, pg, oracledb, telnet-client

## 🔧 설정

### 데이터베이스 설정

#### 🗄️ **DB 연결 정보 설정 (`config/dbinfo.json`)**
데이터베이스 연결 정보는 `config/dbinfo.json` 파일에서 관리됩니다:

```json
{
  "dbs": {
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
}
```

#### 🌍 **환경변수 설정 (`.env` 파일)**
다음 환경변수들을 설정할 수 있습니다:

```env
# API 서버 설정 (선택사항)
API_URL=http://localhost:3000

# 로컬 데이터베이스 설정 (MySQL - 로깅용, 선택사항)
LOCALDB_HOST=localhost
LOCALDB_USER=root
LOCALDB_PASSWORD=password
LOCALDB_DATABASE=util_logs
LOCALDB_PORT=3306
```

### 사용자 설정 관리
통합 애플리케이션의 **설정 관리** 메뉴에서 자주 사용하는 설정을 저장할 수 있습니다:
- **DB 선택**: `config/dbinfo.json`에서 정의된 DB 중 선택
- **DB 체크 설정**: CSV 파일 경로, 선택된 DB, 타임아웃
- **Telnet 체크 설정**: CSV 파일 경로, 타임아웃
- **SQL 실행 설정**: 템플릿 경로, 선택된 DB
- 설정은 `config/user-config.json`에 자동 저장됩니다.

## 📝 주의사항

- 배치파일은 Windows 환경에서만 실행됩니다.
- 한글 출력을 위해 UTF-8 인코딩을 사용합니다.
- 실행 전 Node.js가 설치되어 있는지 확인하세요.

---

## 🌐 다국어 지원

이 애플리케이션은 다국어 인터페이스를 지원합니다:
- **한국어**: 이 파일 (`README.md`) - 한국어 문서
- **English**: `README_EN.md` - English documentation

애플리케이션 실행 시 모든 사용자 인터페이스 메시지와 로그가 영문으로 표시됩니다.