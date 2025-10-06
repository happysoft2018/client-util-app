const mssql = require('mssql');

class MSSQLConnection {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    const connectionConfig = {
      user: this.config.user,
      password: this.config.password,
      server: this.config.server,
      port: parseInt(this.config.port, 10),
      database: this.config.database,
      options: {
        encrypt: this.config.options?.encrypt || true,
        trustServerCertificate: this.config.options?.trustServerCertificate || true,
        requestTimeout: this.config.options?.requestTimeout || 300000,
        connectionTimeout: this.config.options?.connectionTimeout || 30000,
        ...this.config.options
      }
    };

    this.pool = await mssql.connect(connectionConfig);
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.close();
    }
  }

  async executeQuery(query, params = {}) {
    const request = this.pool.request();
    
    // 파라미터 바인딩
    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    const result = await request.query(query);
    return {
      rows: result.recordset,
      rowCount: result.recordset.length,
      affectedRows: result.rowsAffected?.[0] || 0
    };
  }

  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test');
      await this.disconnect();
      return { success: true, message: 'MSSQL 연결 성공' };
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
        await this.executeQuery('SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES');
        permissions.select = true;
      } catch (err) {
        console.log(`  └ No SELECT permission: ${err.message.substring(0, 50)}...`);
      }

      // Permission check through test table creation/deletion
      const testTableName = `temp_permission_test_${Date.now()}`;
      
      try {
        // CREATE TABLE permission check
        await this.executeQuery(`CREATE TABLE ${testTableName} (id INT, test_data NVARCHAR(50))`);
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
      type: 'MSSQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = MSSQLConnection;
