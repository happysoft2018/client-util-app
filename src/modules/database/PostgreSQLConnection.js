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
    
    // Test the connection by getting a client from the pool
    try {
      const client = await this.pool.connect();
      client.release(); // Release the client back to the pool
      return this.pool;
    } catch (error) {
      // If connection fails, ensure pool is properly closed
      if (this.pool && !this.pool.ended) {
        await this.pool.end();
      }
      throw error;
    }
  }

  async disconnect() {
    if (this.pool && !this.pool.ended) {
      try {
        await this.pool.end();
      } catch (error) {
        // Ignore errors when pool is already ended
        console.warn('Warning: Pool already ended or error during disconnect:', error.message);
      }
    }
  }

  async executeQuery(query, params = {}) {
    // Use $1, $2 format for PostgreSQL parameter binding
    let processedQuery = query;
    const values = [];
    
    // Convert @param format to $1, $2 format
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
      return { success: true, message: 'PostgreSQL connection successful' };
    } catch (error) {
      // Ensure disconnect is called even on connection failure
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
      deleteQuery: ''
    };

    try {
      // Only connect if not already connected
      const shouldDisconnect = !this.pool || this.pool.ended;
      if (shouldDisconnect) {
        await this.connect();
      }
      
      // SELECT permission check using custom query if provided
      try {
        const selectQuery = testTableInfo?.selectSql || 'SELECT 1 FROM information_schema.tables LIMIT 1';
        await this.executeQuery(selectQuery);
        permissions.select = true;
      } catch (err) {
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
            const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map((val, idx) => `$${idx + 1}`).join(', ')})`;
            permissions.insertQuery = insertSql;
            await this.pool.query(insertSql, values);
            permissions.insert = true;
            console.log(`  └ INSERT: ✅ Success`);

            // DELETE permission check
            try {
              const deleteSql = `DELETE FROM ${table} WHERE ${columns[0]} = $1`;
              permissions.deleteQuery = deleteSql;
              await this.pool.query(deleteSql, [values[0]]);
              permissions.delete = true;
              console.log(`  └ DELETE: ✅ Success`);
            } catch (err) {
              console.log(`  └ DELETE: ❌ Failed - ${err.message.substring(0, 200)}...`);
            }

          } catch (err) {
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
      type: 'PostgreSQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = PostgreSQLConnection;
