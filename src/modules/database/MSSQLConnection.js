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
      if (value instanceof Date) {
        request.input(key, mssql.DateTime2, value);
      } else {
        request.input(key, value);
      }
    });

    const result = await request.query(query);
    return {
      rows: result.recordset || [],
      rowCount: result.recordset ? result.recordset.length : 0,
      affectedRows: result.rowsAffected?.[0] || 0
    };
  }

  // Returns array of identity column names for a given table. Supports schema-qualified names (defaults to dbo).
  async getIdentityColumns(tableName) {
    if (!this.pool) {
      throw new Error('Not connected');
    }
    const cleanName = String(tableName).replace(/[\[\]]/g, '');
    const parts = cleanName.split('.');
    const hasSchema = parts.length > 1;
    const schema = hasSchema ? parts[0] : null;
    const table = hasSchema ? parts[1] : parts[0];

    const sql = hasSchema
      ? `
      SELECT c.name AS column_name
      FROM sys.columns AS c
      JOIN sys.objects AS o ON c.object_id = o.object_id
      JOIN sys.schemas AS s ON o.schema_id = s.schema_id
      WHERE o.type = 'U'
        AND s.name = @schema
        AND o.name = @table
        AND c.is_identity = 1
    `
      : `
      SELECT c.name AS column_name
      FROM sys.columns AS c
      JOIN sys.objects AS o ON c.object_id = o.object_id
      JOIN sys.schemas AS s ON o.schema_id = s.schema_id
      WHERE o.type = 'U'
        AND o.name = @table
        AND c.is_identity = 1
    `;
    const { rows } = hasSchema
      ? await this.executeQuery(sql, { schema, table })
      : await this.executeQuery(sql, { table });
    return rows.map(r => r.column_name);
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
      delete: false,
      insertQuery: '',
      deleteQuery: '',
      selectError: '',
      insertError: '',
      deleteError: ''
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
      type: 'MSSQL',
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user
    };
  }
}

module.exports = MSSQLConnection;
