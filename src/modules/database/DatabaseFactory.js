const MSSQLConnection = require('./MSSQLConnection');
const MySQLConnection = require('./MySQLConnection');
const PostgreSQLConnection = require('./PostgreSQLConnection');
const OracleConnection = require('./OracleConnection');

class DatabaseFactory {
  static createConnection(dbType, config) {
    const normalizedType = dbType.toLowerCase();
    
    switch (normalizedType) {
      case 'mssql':
      case 'sqlserver':
        return new MSSQLConnection(config);
      
      case 'mysql':
        return new MySQLConnection(config);
      
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLConnection(config);
      
      case 'oracle':
        return new OracleConnection(config);
      
      default:
        throw new Error(`지원하지 않는 데이터베이스 타입입니다: ${dbType}`);
    }
  }

  static getSupportedTypes() {
    return [
      { type: 'mssql', name: 'Microsoft SQL Server', port: 1433 },
      { type: 'mysql', name: 'MySQL', port: 3306 },
      { type: 'postgresql', name: 'PostgreSQL', port: 5432 },
      { type: 'oracle', name: 'Oracle Database', port: 1521 }
    ];
  }

  static getDefaultPort(dbType) {
    const typeInfo = this.getSupportedTypes().find(t => t.type === dbType.toLowerCase());
    return typeInfo ? typeInfo.port : null;
  }

  static validateConfig(dbType, config) {
    const requiredFields = ['server', 'port', 'database', 'user', 'password'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`필수 설정이 누락되었습니다: ${missingFields.join(', ')}`);
    }

    // 포트 번호 검증
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('포트 번호는 1-65535 사이의 숫자여야 합니다.');
    }

    return true;
  }
}

module.exports = DatabaseFactory;
