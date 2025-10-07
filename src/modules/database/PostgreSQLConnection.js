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
      deleteQuery: '',
      selectError: '',
      insertError: '',
      deleteError: ''
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
            const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map((val, idx) => `$${idx + 1}`).join(', ')})`;
            const insertSqlWithValues = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.map(val => `'${val}'`).join(', ')})`;
            permissions.insertQuery = insertSqlWithValues; // CSV에는 실제 값이 포함된 쿼리 저장
            console.log(`  └ INSERT Query: ${insertSql}`);
            console.log(`  └ INSERT Values: [${values.join(', ')}]`);
            await this.pool.query(insertSql, values);
            permissions.insert = true;
            console.log(`  └ INSERT: ✅ Success`);

            // DELETE permission check
            try {
              const whereConditions = columns.map((col, idx) => `${col} = $${idx + 1}`).join(' AND ');
              const deleteSql = `DELETE FROM ${table} WHERE ${whereConditions}`;
              const deleteSqlWithValues = `DELETE FROM ${table} WHERE ${columns.map((col, idx) => `${col} = '${values[idx]}'`).join(' AND ')}`;
              permissions.deleteQuery = deleteSqlWithValues; // CSV에는 실제 값이 포함된 쿼리 저장
              console.log(`  └ DELETE Query: ${deleteSql}`);
              console.log(`  └ DELETE Values: [${values.join(', ')}]`);
              await this.pool.query(deleteSql, values);
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
      type: 'PostgreSQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = PostgreSQLConnection;
