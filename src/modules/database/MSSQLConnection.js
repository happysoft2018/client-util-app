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
      connectionTimeout: this.config.options?.connectionTimeout || 30000,
      requestTimeout: this.config.options?.requestTimeout || 300000,
      options: {
        encrypt: this.config.options?.encrypt || true,
        trustServerCertificate: this.config.options?.trustServerCertificate || true,
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
    
    // Parameter binding
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
      return { success: true, message: 'MSSQL connection successful' };
    } catch (error) {
      return { success: false, message: error.message, code: error.code };
    }
  }

  async checkPermissions(testTableInfo = null) {
    const permissions = {
      select: false,
      insert: false,
      delete: false
    };

    try {
      // Only connect if not already connected
      const shouldDisconnect = !this.pool;
      if (shouldDisconnect) {
        await this.connect();
      }
      
      // SELECT permission check using custom query if provided
      try {
        const selectQuery = testTableInfo?.selectSql || 'SELECT TOP 1 1 FROM INFORMATION_SCHEMA.TABLES';
        await this.executeQuery(selectQuery);
        permissions.select = true;
      } catch (err) {
        console.log(`  └ No SELECT permission: ${err.message.substring(0, 50)}...`);
      }

      // INSERT/DELETE permission check using test table info if provided
      if (testTableInfo && testTableInfo.table && testTableInfo.columns && testTableInfo.values) {
        const { table, columns, values } = testTableInfo;
        
        try {
          // INSERT permission check
          const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
          await this.executeQuery(insertSql);
          permissions.insert = true;

          // DELETE permission check
          try {
            const deleteSql = `DELETE FROM ${table} WHERE ${columns[0]} = '${values[0]}'`;
            await this.executeQuery(deleteSql);
            permissions.delete = true;
          } catch (err) {
            console.log(`  └ No DELETE permission: ${err.message.substring(0, 50)}...`);
          }

        } catch (err) {
          console.log(`  └ No INSERT permission: ${err.message.substring(0, 50)}...`);
        }
      }

      // Only disconnect if we connected in this method
      if (shouldDisconnect) {
        await this.disconnect();
      }
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
