const mysql = require('mysql2/promise');

class MySQLConnection {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    const connectionConfig = {
      host: this.config.server,
      port: parseInt(this.config.port, 10),
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: this.config.options?.connectionTimeout || 30000,
      acquireTimeout: this.config.options?.acquireTimeout || 60000,
      timeout: this.config.options?.requestTimeout || 300000,
      ssl: this.config.options?.ssl || false,
      ...this.config.options
    };

    this.pool = await mysql.createConnection(connectionConfig);
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async executeQuery(query, params = {}) {
    // MySQL 파라미터 바인딩을 위해 ? 플레이스홀더 사용
    let processedQuery = query;
    const values = [];
    
    // @param 형태를 ? 형태로 변환
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `@${key}`;
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), '?');
        values.push(value);
      }
    });

    const [rows] = await this.pool.execute(processedQuery, values);
    return {
      rows: rows,
      rowCount: Array.isArray(rows) ? rows.length : 0,
      affectedRows: this.pool.affectedRows || 0
    };
  }

  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test');
      await this.disconnect();
      return { success: true, message: 'MySQL 연결 성공' };
    } catch (error) {
      return { success: false, message: error.message, code: error.code };
    }
  }

  async checkPermissions() {
    const permissions = {
      select: false,
      insert: false,
      update: false,
      delete: false,
      create: false,
      drop: false
    };

    try {
      await this.connect();
      
      // SELECT 권한 체크
      try {
        await this.executeQuery('SELECT 1 FROM information_schema.tables LIMIT 1');
        permissions.select = true;
      } catch (err) {
        console.log(`  └ No SELECT permission: ${err.message.substring(0, 50)}...`);
      }

      // Permission check through test table creation/deletion
      const testTableName = `temp_permission_test_${Date.now()}`;
      
      try {
        // CREATE TABLE permission check
        await this.executeQuery(`CREATE TABLE ${testTableName} (id INT, test_data VARCHAR(50))`);
        permissions.create = true;

        try {
          // INSERT permission check
          await this.executeQuery(`INSERT INTO ${testTableName} (id, test_data) VALUES (1, 'test')`);
          permissions.insert = true;

          // UPDATE permission check
          try {
            await this.executeQuery(`UPDATE ${testTableName} SET test_data = 'updated' WHERE id = 1`);
            permissions.update = true;
          } catch (err) {
            console.log(`  └ No UPDATE permission: ${err.message.substring(0, 50)}...`);
          }

          // DELETE permission check
          try {
            await this.executeQuery(`DELETE FROM ${testTableName} WHERE id = 1`);
            permissions.delete = true;
          } catch (err) {
            console.log(`  └ No DELETE permission: ${err.message.substring(0, 50)}...`);
          }

        } catch (err) {
          console.log(`  └ No INSERT permission: ${err.message.substring(0, 50)}...`);
        }

        // DROP TABLE permission check
        try {
          await this.executeQuery(`DROP TABLE ${testTableName}`);
          permissions.drop = true;
        } catch (err) {
          console.log(`  └ No DROP TABLE permission: ${err.message.substring(0, 50)}...`);
        }

      } catch (err) {
        console.log(`  └ No CREATE TABLE permission: ${err.message.substring(0, 50)}...`);
      }

      await this.disconnect();
      return permissions;

    } catch (error) {
      console.log(`  └ Error during permission check: ${error.message.substring(0, 50)}...`);
      return permissions;
    }
  }

  getConnectionInfo() {
    return {
      type: 'MySQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = MySQLConnection;
