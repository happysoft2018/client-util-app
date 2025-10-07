const oracledb = require('oracledb');

class OracleConnection {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    // Oracle connection configuration
    const connectionConfig = {
      user: this.config.user,
      password: this.config.password,
      connectString: `${this.config.server}:${this.config.port}/${this.config.database}`,
      ...this.config.options
    };

    // Set connection timeout if specified
    if (this.config.options?.connectionTimeout) {
      const timeoutMs = this.config.options.connectionTimeout;
      
      // Oracle connection timeout is handled differently - we'll use Promise.race
      const connectionPromise = oracledb.getConnection(connectionConfig);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
      });
      
      this.connection = await Promise.race([connectionPromise, timeoutPromise]);
    } else {
      this.connection = await oracledb.getConnection(connectionConfig);
    }
    
    return this.connection;
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
    }
  }

  async executeQuery(query, params = {}) {
    // Oracle parameter binding
    const bindVars = {};
    let processedQuery = query;
    
    // Convert @param format to :param format (Oracle format)
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `@${key}`;
      const bindVar = `:${key}`;
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), bindVar);
        bindVars[key] = value;
      }
    });

    const result = await this.connection.execute(processedQuery, bindVars);
    return {
      rows: result.rows || [],
      rowCount: result.rows ? result.rows.length : 0,
      affectedRows: result.rowsAffected || 0
    };
  }

  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test FROM dual');
      await this.disconnect();
      return { success: true, message: 'Oracle connection successful' };
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
      const shouldDisconnect = !this.connection;
      if (shouldDisconnect) {
        await this.connect();
      }
      
      // SELECT permission check using custom query if provided
      try {
        const selectQuery = testTableInfo?.selectSql || 'SELECT 1 FROM user_tables WHERE rownum = 1';
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
      type: 'Oracle',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = OracleConnection;
