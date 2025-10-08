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
      case 'mariadb':
        return new MySQLConnection(config);
      
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLConnection(config);
      
      case 'oracle':
        return new OracleConnection(config);
      
      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  }

  static getSupportedTypes() {
    return [
      { type: 'mssql', name: 'Microsoft SQL Server', port: 1433 },
      { type: 'mysql', name: 'MySQL', port: 3306 },
      { type: 'mariadb', name: 'MariaDB', port: 3306 },
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
      throw new Error(`Required configuration is missing: ${missingFields.join(', ')}`);
    }

    // Port number validation
    const port = parseInt(config.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('Port number must be a number between 1-65535.');
    }

    return true;
  }
}

module.exports = DatabaseFactory;
