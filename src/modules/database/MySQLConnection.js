const mysql = require('mysql2/promise');

class MySQLConnection {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.pool && this.isConnected) {
      return this.pool;
    }

    const connectionConfig = {
      host: this.config.server,
      port: parseInt(this.config.port, 10),
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: this.config.options?.connectionTimeout || 30000,
      ssl: this.config.options?.ssl || false,
      // Connection pool settings
      connectionLimit: 1,
      acquireTimeout: this.config.options?.connectionTimeout || 30000,
      timeout: this.config.options?.requestTimeout || 300000
    };

    this.pool = await mysql.createConnection(connectionConfig);
    this.isConnected = true;
    return this.pool;
  }

  async disconnect() {
    if (this.pool && this.isConnected) {
      try {
        await this.pool.end();
        this.isConnected = false;
        this.pool = null;
      } catch (error) {
        console.warn('Warning: MySQL disconnect error:', error.message);
        this.isConnected = false;
        this.pool = null;
      }
    }
  }

  async executeQuery(query, params = {}) {
    // Ensure connection is available
    if (!this.pool || !this.isConnected) {
      await this.connect();
    }

    // Use ? placeholders for MySQL parameter binding
    let processedQuery = query;
    const values = [];
    
    // Convert @param format to ? format
    Object.entries(params).forEach(([key, value]) => {
      const placeholder = `@${key}`;
      if (processedQuery.includes(placeholder)) {
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), '?');
        values.push(value);
      }
    });

    try {
      const [rows] = await this.pool.execute(processedQuery, values);
      return {
        rows: rows,
        rowCount: Array.isArray(rows) ? rows.length : 0,
        affectedRows: this.pool.affectedRows || 0
      };
    } catch (error) {
      // If connection error, try to reconnect
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNRESET') {
        this.isConnected = false;
        this.pool = null;
        await this.connect();
        const [rows] = await this.pool.execute(processedQuery, values);
        return {
          rows: rows,
          rowCount: Array.isArray(rows) ? rows.length : 0,
          affectedRows: this.pool.affectedRows || 0
        };
      }
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.connect();
      const result = await this.executeQuery('SELECT 1 as test');
      return { success: true, message: 'MySQL connection successful' };
    } catch (error) {
      try {
        await this.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      return { success: false, message: error.message, code: error.code };
    }
  }

  async checkPermissions(testTableInfo = null) {
    const permissions = {
      select: false,
      insert: false,
      delete: false,
      insertQuery: '',
      deleteQuery: '',
      selectError: '',
      insertError: '',
      deleteError: ''
    };

    try {
      // Only connect if not already connected
      const shouldDisconnect = !this.pool || !this.isConnected;
      if (shouldDisconnect) {
        await this.connect();
      }
      
      // SELECT permission check using custom query if provided
      try {
        const selectQuery = testTableInfo?.selectSql || 'SELECT 1 FROM information_schema.tables LIMIT 1';
        await this.executeQuery(selectQuery);
        permissions.select = true;
      } catch (err) {
        permissions.selectError = err.message.substring(0, 500);
        console.log(`  └ No SELECT permission: ${err.message.substring(0, 200)}...`);
      }

      // INSERT/DELETE permission check using test table info if provided
      if (testTableInfo && testTableInfo.table && testTableInfo.columns && testTableInfo.values) {
        const { table, columns, values } = testTableInfo;
        
        // Validate columns and values arrays
        if (!Array.isArray(columns) || !Array.isArray(values) || columns.length === 0 || values.length === 0) {
          console.log(`  └ Warning: Invalid columns or values for INSERT/DELETE test`);
        } else {
          try {
            // INSERT permission check
            const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
            permissions.insertQuery = insertSql;
            await this.executeQuery(insertSql);
            permissions.insert = true;
            console.log(`  └ INSERT: ✅ Success`);

            // DELETE permission check
               try {
                 const whereConditions = columns.map((col, idx) => `${col} = '${values[idx]}'`).join(' AND ');
                 const deleteSql = `DELETE FROM ${table} WHERE ${whereConditions}`;
                 permissions.deleteQuery = deleteSql;
                 await this.executeQuery(deleteSql);
                 permissions.delete = true;
                 console.log(`  └ DELETE: ✅ Success`);
               } catch (err) {
                 permissions.deleteError = err.message.substring(0, 500);
                 console.log(`  └ DELETE: ❌ Failed - ${err.message.substring(0, 200)}...`);
               }

          } catch (err) {
            permissions.insertError = err.message.substring(0, 500);
            console.log(`  └ INSERT: ❌ Failed - ${err.message.substring(0, 200)}...`);
          }
        }
      }

      // Only disconnect if we connected in this method
      if (shouldDisconnect) {
        await this.disconnect();
      }
      return permissions;

    } catch (error) {
      console.log(`  └ Error during permission check: ${error.message.substring(0, 200)}...`);
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
