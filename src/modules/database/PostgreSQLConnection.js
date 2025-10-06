const { Pool } = require('pg');

class PostgreSQLConnection {
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
      connectionTimeoutMillis: this.config.options?.connectionTimeout || 30000,
      query_timeout: this.config.options?.requestTimeout || 300000,
      ssl: this.config.options?.ssl || false,
      ...this.config.options
    };

    this.pool = new Pool(connectionConfig);
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async executeQuery(query, params = {}) {
    // PostgreSQL 파라미터 바인딩을 위해 $1, $2 형태 사용
    let processedQuery = query;
    const values = [];
    
    // @param 형태를 $1, $2 형태로 변환
    const paramKeys = Object.keys(params);
    paramKeys.forEach((key, index) => {
      const placeholder = `@${key}`;
      const newPlaceholder = `$${index + 1}`;
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), newPlaceholder);
        values.push(params[key]);
      }
    });

    const result = await this.pool.query(processedQuery, values);
    return {
      rows: result.rows,
      rowCount: result.rowCount,
      affectedRows: result.rowCount
    };
  }

  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test');
      await this.disconnect();
      return { success: true, message: 'PostgreSQL 연결 성공' };
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
        await this.executeQuery(`CREATE TABLE ${testTableName} (id INTEGER, test_data VARCHAR(50))`);
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
      type: 'PostgreSQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = PostgreSQLConnection;
