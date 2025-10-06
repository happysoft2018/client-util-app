const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// 모듈 import
const MssqlChecker = require('./src/modules/MssqlChecker');
const TelnetChecker = require('./src/modules/TelnetChecker');
const SqlExecutor = require('./src/modules/SqlExecutor');
const ConfigManager = require('./src/modules/ConfigManager');

class NodeUtilApp {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.configManager = new ConfigManager();
    this.mssqlChecker = new MssqlChecker(this.configManager);
    this.telnetChecker = new TelnetChecker();
    this.sqlExecutor = new SqlExecutor(this.configManager);
  }

  async start() {
    console.clear();
    console.log('='.repeat(50));
    console.log('    Node.js 통합 유틸리티 도구');
    console.log('='.repeat(50));
    console.log();
    
    await this.showMainMenu();
  }

  async showMainMenu() {
    console.log('📋 메인 메뉴');
    console.log('1. MSSQL 연결 및 권한 체크');
    console.log('2. 서버 Telnet 연결 체크');
    console.log('3. MSSQL SQL 실행');
    console.log('4. 설정 관리');
    console.log('5. 모든 체크 실행 (일괄 처리)');
    console.log('6. 종료');
    console.log();

    const choice = await this.askQuestion('실행할 기능을 선택하세요 (1-6): ');
    
    switch(choice.trim()) {
      case '1':
        await this.runMssqlCheck();
        break;
      case '2':
        await this.runTelnetCheck();
        break;
      case '3':
        await this.runSqlExecution();
        break;
      case '4':
        await this.showConfigMenu();
        break;
      case '5':
        await this.runAllChecks();
        break;
      case '6':
        await this.exitApp();
        break;
      default:
        console.log('❌ 잘못된 선택입니다. 다시 선택해주세요.');
        await this.waitAndContinue();
        await this.showMainMenu();
    }
  }

  async runMssqlCheck() {
    console.clear();
    console.log('🔍 MSSQL 연결 및 권한 체크');
    console.log('='.repeat(40));
    
    try {
      // 설정에서 기본값 가져오기
      const defaultConfig = this.configManager.getDefaultConfig();
      
      console.log('\n📁 CSV 파일 설정:');
      const csvPath = await this.askQuestion(
        `CSV 파일 경로 (기본값: ${defaultConfig.mssql.csvPath || '입력 필요'}): `,
        defaultConfig.mssql.csvPath
      );
      
      console.log('\n🔐 데이터베이스 인증 정보:');
      const dbUser = await this.askQuestion(
        `DB 계정 ID (기본값: ${defaultConfig.mssql.dbUser || '입력 필요'}): `,
        defaultConfig.mssql.dbUser
      );
      
      const dbPassword = await this.askQuestion(
        `DB 패스워드 (기본값: ${defaultConfig.mssql.dbPassword ? '***' : '입력 필요'}): `,
        defaultConfig.mssql.dbPassword
      );
      
      console.log('\n⏱️  타임아웃 설정:');
      const timeout = await this.askQuestion(
        `타임아웃(초) (기본값: ${defaultConfig.mssql.timeout || 5}): `,
        defaultConfig.mssql.timeout || 5
      );

      console.log('\n🚀 MSSQL 연결 체크를 시작합니다...');
      console.log('-'.repeat(40));
      
      await this.mssqlChecker.run({
        csvPath: csvPath || defaultConfig.mssql.csvPath,
        dbUser: dbUser || defaultConfig.mssql.dbUser,
        dbPassword: dbPassword || defaultConfig.mssql.dbPassword,
        timeout: parseInt(timeout) || 5
      });
      
      console.log('\n✅ MSSQL 연결 체크가 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ MSSQL 연결 체크 중 오류가 발생했습니다:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runTelnetCheck() {
    console.clear();
    console.log('🌐 서버 Telnet 연결 체크');
    console.log('='.repeat(40));
    
    try {
      const defaultConfig = this.configManager.getDefaultConfig();
      
      console.log('\n📁 CSV 파일 설정:');
      const csvPath = await this.askQuestion(
        `CSV 파일 경로 (기본값: ${defaultConfig.telnet.csvPath || '입력 필요'}): `,
        defaultConfig.telnet.csvPath
      );
      
      console.log('\n⏱️  타임아웃 설정:');
      const timeout = await this.askQuestion(
        `타임아웃(초) (기본값: ${defaultConfig.telnet.timeout || 3}): `,
        defaultConfig.telnet.timeout || 3
      );

      console.log('\n🚀 Telnet 연결 체크를 시작합니다...');
      console.log('-'.repeat(40));
      
      await this.telnetChecker.run({
        csvPath: csvPath || defaultConfig.telnet.csvPath,
        timeout: parseInt(timeout) || 3
      });
      
      console.log('\n✅ Telnet 연결 체크가 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ Telnet 연결 체크 중 오류가 발생했습니다:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async runSqlExecution() {
    console.clear();
    console.log('⚙️  MSSQL SQL 실행');
    console.log('='.repeat(40));
    
    try {
      // templet 폴더의 SQL 파일 목록 가져오기
      const templateDir = path.join(__dirname, 'templet');
      const sqlFiles = fs.readdirSync(templateDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));

      if (sqlFiles.length === 0) {
        console.log('❌ templet 폴더에 SQL 파일이 없습니다.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log('\n📄 사용 가능한 SQL 파일:');
      sqlFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });
      console.log();

      const fileChoice = await this.askQuestion(
        `실행할 SQL 파일 번호를 선택하세요 (1-${sqlFiles.length}): `
      );
      
      const selectedFile = sqlFiles[parseInt(fileChoice) - 1];
      if (!selectedFile) {
        console.log('❌ 잘못된 파일 번호입니다.');
        await this.waitAndContinue();
        await this.showMainMenu();
        return;
      }

      console.log(`\n🚀 SQL 실행을 시작합니다: ${selectedFile}`);
      console.log('-'.repeat(40));
      
      await this.sqlExecutor.run(selectedFile);
      
      console.log('\n✅ SQL 실행이 완료되었습니다.');
      
    } catch (error) {
      console.error('❌ SQL 실행 중 오류가 발생했습니다:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async showConfigMenu() {
    console.clear();
    console.log('⚙️  설정 관리');
    console.log('='.repeat(40));
    console.log('1. 현재 설정 보기');
    console.log('2. 기본 설정 변경');
    console.log('3. 설정 초기화');
    console.log('4. 환경변수 확인');
    console.log('5. 메인 메뉴로 돌아가기');
    console.log();

    const choice = await this.askQuestion('선택하세요 (1-5): ');
    
    switch(choice.trim()) {
      case '1':
        this.configManager.showCurrentConfig();
        break;
      case '2':
        await this.configManager.updateDefaultConfig(this);
        break;
      case '3':
        this.configManager.resetConfig();
        console.log('✅ 설정이 초기화되었습니다.');
        break;
      case '4':
        this.configManager.showEnvironmentVariables();
        break;
      case '5':
        await this.showMainMenu();
        return;
      default:
        console.log('❌ 잘못된 선택입니다.');
    }
    
    await this.waitAndContinue();
    await this.showConfigMenu();
  }

  async runAllChecks() {
    console.clear();
    console.log('🔄 모든 체크 실행 (일괄 처리)');
    console.log('='.repeat(40));
    
    const defaultConfig = this.configManager.getDefaultConfig();
    
    try {
      console.log('\n🚀 모든 체크를 순차적으로 실행합니다...');
      console.log('='.repeat(40));
      
      // 1. Telnet 체크
      if (defaultConfig.telnet.csvPath && fs.existsSync(defaultConfig.telnet.csvPath)) {
        console.log('\n1️⃣ Telnet 연결 체크 시작...');
        await this.telnetChecker.run({
          csvPath: defaultConfig.telnet.csvPath,
          timeout: defaultConfig.telnet.timeout || 3
        });
        console.log('✅ Telnet 체크 완료');
      } else {
        console.log('⚠️  Telnet 체크: CSV 파일 경로가 설정되지 않았거나 파일이 존재하지 않습니다.');
      }
      
      // 2. MSSQL 체크
      if (defaultConfig.mssql.csvPath && fs.existsSync(defaultConfig.mssql.csvPath) && 
          defaultConfig.mssql.dbUser && defaultConfig.mssql.dbPassword) {
        console.log('\n2️⃣ MSSQL 연결 체크 시작...');
        await this.mssqlChecker.run({
          csvPath: defaultConfig.mssql.csvPath,
          dbUser: defaultConfig.mssql.dbUser,
          dbPassword: defaultConfig.mssql.dbPassword,
          timeout: defaultConfig.mssql.timeout || 5
        });
        console.log('✅ MSSQL 체크 완료');
      } else {
        console.log('⚠️  MSSQL 체크: 필요한 설정이 완료되지 않았습니다.');
      }
      
      console.log('\n🎉 모든 체크가 완료되었습니다!');
      
    } catch (error) {
      console.error('❌ 일괄 처리 중 오류가 발생했습니다:', error.message);
    }
    
    await this.waitAndContinue();
    await this.showMainMenu();
  }

  async exitApp() {
    console.log('\n👋 프로그램을 종료합니다.');
    this.rl.close();
    process.exit(0);
  }

  askQuestion(question, defaultValue = '') {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question}` : question;
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async waitAndContinue() {
    console.log('\n⏳ 계속하려면 Enter 키를 누르세요...');
    return new Promise((resolve) => {
      this.rl.once('line', () => resolve());
    });
  }
}

// 애플리케이션 시작
if (require.main === module) {
  const app = new NodeUtilApp();
  app.start().catch(error => {
    console.error('❌ 애플리케이션 시작 중 오류:', error);
    process.exit(1);
  });
}

module.exports = NodeUtilApp;
