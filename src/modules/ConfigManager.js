const fs = require('fs');
const path = require('path');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configFile = path.join(__dirname, '../../config/user-config.json');
    this.dbConfigFile = path.join(__dirname, '../../config/dbinfo.json');
    this.defaultConfig = {
      mssql: {
        csvPath: '',
        dbUser: '',
        dbPassword: '',
        timeout: 5,
        selectedDb: ''
      },
      telnet: {
        csvPath: '',
        timeout: 3
      },
      sql: {
        templatePath: path.join(__dirname, '../../templet'),
        selectedDb: ''
      }
    };
    
    this.loadConfig();
    this.loadDbConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        this.config = { ...this.defaultConfig, ...JSON.parse(configData) };
      } else {
        this.config = { ...this.defaultConfig };
        this.saveConfig();
      }
    } catch (error) {
      console.warn('⚠️  설정 파일 로드 중 오류:', error.message);
      this.config = { ...this.defaultConfig };
    }
  }

  loadDbConfig() {
    try {
      if (fs.existsSync(this.dbConfigFile)) {
        const dbConfigData = fs.readFileSync(this.dbConfigFile, 'utf8');
        this.dbConfig = JSON.parse(dbConfigData);
      } else {
        this.dbConfig = { dbs: {} };
        console.warn('⚠️  DB 설정 파일을 찾을 수 없습니다:', this.dbConfigFile);
      }
    } catch (error) {
      console.warn('⚠️  DB 설정 파일 로드 중 오류:', error.message);
      this.dbConfig = { dbs: {} };
    }
  }

  getDbConfig(dbName) {
    return this.dbConfig.dbs[dbName] || null;
  }

  getAvailableDbs() {
    return Object.keys(this.dbConfig.dbs || {});
  }

  saveConfig() {
    try {
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.warn('⚠️  설정 파일 저장 중 오류:', error.message);
    }
  }

  getDefaultConfig() {
    return this.config;
  }

  updateConfig(section, key, value) {
    if (!this.config[section]) {
      this.config[section] = {};
    }
    this.config[section][key] = value;
    this.saveConfig();
  }

  async updateDefaultConfig(app) {
    console.clear();
    console.log('⚙️  기본 설정 변경');
    console.log('='.repeat(40));

    // 사용 가능한 DB 목록 표시
    const availableDbs = this.getAvailableDbs();
    if (availableDbs.length > 0) {
      console.log('\n🗄️  사용 가능한 데이터베이스:');
      availableDbs.forEach((dbName, index) => {
        const dbInfo = this.getDbConfig(dbName);
        console.log(`  ${index + 1}. ${dbName} (${dbInfo.server}:${dbInfo.port}/${dbInfo.database})`);
      });
      console.log();
    }

    console.log('\n🔍 MSSQL 설정:');
    const mssqlCsvPath = await app.askQuestion(
      `CSV 파일 경로 (현재: ${this.config.mssql.csvPath || '미설정'}): `,
      this.config.mssql.csvPath
    );
    
    // DB 선택
    if (availableDbs.length > 0) {
      const dbChoice = await app.askQuestion(
        `사용할 DB 선택 (1-${availableDbs.length}) (현재: ${this.config.mssql.selectedDb || '미설정'}): `,
        availableDbs.indexOf(this.config.mssql.selectedDb) + 1
      );
      
      const selectedDbIndex = parseInt(dbChoice) - 1;
      if (selectedDbIndex >= 0 && selectedDbIndex < availableDbs.length) {
        const selectedDb = availableDbs[selectedDbIndex];
        this.config.mssql.selectedDb = selectedDb;
        const dbConfig = this.getDbConfig(selectedDb);
        this.config.mssql.dbUser = dbConfig.user;
        this.config.mssql.dbPassword = dbConfig.password;
        console.log(`✅ DB 설정 적용: ${selectedDb}`);
      }
    } else {
      // 수동 입력 (레거시)
      const mssqlDbUser = await app.askQuestion(
        `DB 계정 ID (현재: ${this.config.mssql.dbUser || '미설정'}): `,
        this.config.mssql.dbUser
      );
      
      const mssqlDbPassword = await app.askQuestion(
        `DB 패스워드 (현재: ${this.config.mssql.dbPassword ? '***' : '미설정'}): `,
        this.config.mssql.dbPassword
      );
      
      if (mssqlDbUser) this.config.mssql.dbUser = mssqlDbUser;
      if (mssqlDbPassword) this.config.mssql.dbPassword = mssqlDbPassword;
    }
    
    const mssqlTimeout = await app.askQuestion(
      `타임아웃(초) (현재: ${this.config.mssql.timeout}): `,
      this.config.mssql.timeout.toString()
    );

    console.log('\n🌐 Telnet 설정:');
    const telnetCsvPath = await app.askQuestion(
      `CSV 파일 경로 (현재: ${this.config.telnet.csvPath || '미설정'}): `,
      this.config.telnet.csvPath
    );
    
    const telnetTimeout = await app.askQuestion(
      `타임아웃(초) (현재: ${this.config.telnet.timeout}): `,
      this.config.telnet.timeout.toString()
    );

    // SQL 실행용 DB 선택
    if (availableDbs.length > 0) {
      console.log('\n⚙️  SQL 실행 설정:');
      const sqlDbChoice = await app.askQuestion(
        `SQL 실행용 DB 선택 (1-${availableDbs.length}) (현재: ${this.config.sql.selectedDb || '미설정'}): `,
        availableDbs.indexOf(this.config.sql.selectedDb) + 1
      );
      
      const selectedSqlDbIndex = parseInt(sqlDbChoice) - 1;
      if (selectedSqlDbIndex >= 0 && selectedSqlDbIndex < availableDbs.length) {
        this.config.sql.selectedDb = availableDbs[selectedSqlDbIndex];
        console.log(`✅ SQL 실행 DB 설정: ${this.config.sql.selectedDb}`);
      }
    }

    // 설정 업데이트
    if (mssqlCsvPath) this.config.mssql.csvPath = mssqlCsvPath;
    if (mssqlTimeout) this.config.mssql.timeout = parseInt(mssqlTimeout) || 5;
    
    if (telnetCsvPath) this.config.telnet.csvPath = telnetCsvPath;
    if (telnetTimeout) this.config.telnet.timeout = parseInt(telnetTimeout) || 3;

    this.saveConfig();
    console.log('\n✅ 설정이 저장되었습니다.');
  }

  resetConfig() {
    this.config = { ...this.defaultConfig };
    this.saveConfig();
  }

  showCurrentConfig() {
    console.clear();
    console.log('📋 현재 설정');
    console.log('='.repeat(40));
    
    console.log('\n🔍 MSSQL 설정:');
    console.log(`  CSV 파일 경로: ${this.config.mssql.csvPath || '미설정'}`);
    if (this.config.mssql.selectedDb) {
      const dbConfig = this.getDbConfig(this.config.mssql.selectedDb);
      console.log(`  선택된 DB: ${this.config.mssql.selectedDb}`);
      console.log(`  서버: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`  데이터베이스: ${dbConfig.database}`);
      console.log(`  계정: ${dbConfig.user}`);
    } else {
      console.log(`  DB 계정 ID: ${this.config.mssql.dbUser || '미설정'}`);
      console.log(`  DB 패스워드: ${this.config.mssql.dbPassword ? '***' : '미설정'}`);
    }
    console.log(`  타임아웃: ${this.config.mssql.timeout}초`);
    
    console.log('\n🌐 Telnet 설정:');
    console.log(`  CSV 파일 경로: ${this.config.telnet.csvPath || '미설정'}`);
    console.log(`  타임아웃: ${this.config.telnet.timeout}초`);
    
    console.log('\n⚙️  SQL 설정:');
    console.log(`  템플릿 경로: ${this.config.sql.templatePath}`);
    if (this.config.sql.selectedDb) {
      const dbConfig = this.getDbConfig(this.config.sql.selectedDb);
      console.log(`  선택된 DB: ${this.config.sql.selectedDb}`);
      console.log(`  서버: ${dbConfig.server}:${dbConfig.port}`);
      console.log(`  데이터베이스: ${dbConfig.database}`);
    }
    
    // 사용 가능한 DB 목록 표시
    const availableDbs = this.getAvailableDbs();
    if (availableDbs.length > 0) {
      console.log('\n🗄️  사용 가능한 데이터베이스:');
      availableDbs.forEach(dbName => {
        const dbInfo = this.getDbConfig(dbName);
        const isSelected = dbName === this.config.mssql.selectedDb || dbName === this.config.sql.selectedDb;
        const status = isSelected ? ' (선택됨)' : '';
        console.log(`  - ${dbName}: ${dbInfo.server}:${dbInfo.port}/${dbInfo.database}${status}`);
      });
    }
  }

  showEnvironmentVariables() {
    console.clear();
    console.log('🌍 환경변수 정보');
    console.log('='.repeat(40));
    
    const envVars = [
      'API_URL',
      'LOCALDB_HOST',
      'LOCALDB_USER', 
      'LOCALDB_PASSWORD',
      'LOCALDB_DATABASE',
      'LOCALDB_PORT',
      'REMOTEDB_HOST',
      'REMOTEDB_USER',
      'REMOTEDB_PASSWORD',
      'REMOTEDB_DATABASE',
      'REMOTEDB_PORT'
    ];
    
    console.log('\n📋 주요 환경변수:');
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        const displayValue = varName.includes('PASSWORD') ? '***' : value;
        console.log(`  ${varName}: ${displayValue}`);
      } else {
        console.log(`  ${varName}: 미설정`);
      }
    });
    
    console.log('\n💻 시스템 정보:');
    console.log(`  운영체제: ${os.platform()} ${os.arch()}`);
    console.log(`  Node.js 버전: ${process.version}`);
    console.log(`  현재 디렉토리: ${process.cwd()}`);
  }
}

module.exports = ConfigManager;
