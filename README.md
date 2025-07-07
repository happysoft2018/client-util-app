# Node.js 클라이언트 유틸리티 앱

로컬환경에서 사용하는 각종 유틸리티 모음입니다.

## 📁 프로젝트 구조

```
my-node-client-util-app/
├── src/
│   ├── server-telnet-checker.js    # 서버 Telnet 연결 체크
│   ├── mssql-connection-checker.js # MSSQL 연결 체크
│   └── execute-mssql-sql.js        # MSSQL SQL 실행
├── sample/                         # 샘플 파일들
├── templet/                        # 템플릿 파일들
├── run-telnet-checker.bat          # Telnet 체크 실행
├── run-mssql-checker.bat           # MSSQL 체크 실행
├── run-mssql-executor.bat          # MSSQL SQL 실행
└── 프로그램실행하기.bat               # 통합 실행 도구
```

## 🚀 사용법

### 1. 개별 실행
각 유틸리티를 개별적으로 실행할 수 있습니다:

- **`run-telnet-checker.bat`** - 서버 Telnet 연결 체크
- **`run-mssql-checker.bat`** - MSSQL 연결 체크  
- **`run-mssql-executor.bat`** - MSSQL SQL 실행

### 2. 통합 실행
**`run-all-utils.bat`**를 실행하면 메뉴에서 원하는 도구를 선택할 수 있습니다:

```
========================================
    Node.js 유틸리티 도구 모음
========================================

[1] 서버 Telnet 연결 체크
[2] MSSQL 연결 체크
[3] MSSQL SQL 실행
[4] 모든 도구 실행
[5] 종료

실행할 도구를 선택하세요 (1-5):
```

## ⚙️ 사전 요구사항

1. **Node.js 설치**
   - Node.js 14.0.0 이상 필요
   - https://nodejs.org/ 에서 다운로드

2. **의존성 패키지**
   - 배치파일 실행 시 자동으로 `npm install` 실행
   - 필요한 패키지: axios, csv-parser, dotenv, mssql, mysql2, telnet-client

## 🔧 설정

각 스크립트는 환경변수나 설정 파일을 통해 데이터베이스 연결 정보를 관리합니다.
자세한 설정 방법은 각 스크립트 파일의 주석을 참조하세요.

## 📝 주의사항

- 배치파일은 Windows 환경에서만 실행됩니다.
- 한글 출력을 위해 UTF-8 인코딩을 사용합니다.
- 실행 전 Node.js가 설치되어 있는지 확인하세요.