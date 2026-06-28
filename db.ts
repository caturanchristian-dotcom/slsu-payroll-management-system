import mysql from "mysql2/promise";
import { AsyncLocalStorage } from "async_hooks";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Storage to track active MySQL connection during a transaction
const transactionStorage = new AsyncLocalStorage<mysql.PoolConnection>();

// MySQL connection Pool
let mysqlPool: mysql.Pool | null = null;
const useMysql = true;
export { useMysql as isMysql };

// Connection variables
const rawUrl = process.env.MYSQL_URL || "";
const url = rawUrl.replace(/([&?])ssl-mode=[^&]*/gi, '$1').replace(/\?&/, '?').replace(/&$/, '').replace(/\?$/, '');
const host = process.env.MYSQL_HOST || "";
const user = process.env.MYSQL_USER || "";
const password = process.env.MYSQL_PASSWORD || "";
const database = process.env.MYSQL_DATABASE || "";
const port = Number(process.env.MYSQL_PORT || 3306);

console.log("Database Mode: MySQL active.");

export function getPool(): mysql.Pool {
  if (!mysqlPool) {
    if (url) {
      mysqlPool = mysql.createPool({
        uri: url,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
    } else {
      mysqlPool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
      });
    }
  }
  return mysqlPool;
}

// Centralizer for SQLite to MySQL translation rules
function translateSql(sql: string): string {
  let finalSql = sql;
  
  // Translate SQLite-specific PRAGMA queries to MySQL INFORMATION_SCHEMA
  if (/PRAGMA\s+table_info\s*\(\s*(\w+)\s*\)/i.test(finalSql)) {
    const match = finalSql.match(/PRAGMA\s+table_info\s*\(\s*(\w+)\s*\)/i);
    const tableName = match ? match[1] : "";
    if (tableName) {
      finalSql = `
        SELECT COLUMN_NAME as name, DATA_TYPE as type 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = DATABASE()
      `;
    }
  } else if (/PRAGMA\s+foreign_key_list\s*\(\s*(\w+)\s*\)/i.test(finalSql)) {
    const match = finalSql.match(/PRAGMA\s+foreign_key_list\s*\(\s*(\w+)\s*\)/i);
    const tableName = match ? match[1] : "";
    if (tableName) {
      finalSql = `
        SELECT 
          REFERENCED_TABLE_NAME as \`table\`,
          REFERENCED_COLUMN_NAME as \`to\`
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = '${tableName}' 
          AND REFERENCED_TABLE_NAME IS NOT NULL 
          AND TABLE_SCHEMA = DATABASE()
      `;
    }
  }

  // Translate SQLite-specific keywords to MySQL
  finalSql = finalSql.replace(/INSERT OR IGNORE/gi, "INSERT IGNORE");
  finalSql = finalSql.replace(/INSERT OR REPLACE/gi, "REPLACE");

  return finalSql;
}

// Execute queries robustly
async function executeQuery(sql: string, params: any[], type: "run" | "get" | "all") {
  const finalSql = translateSql(sql);
  
  const pool = getPool();
  const connection = transactionStorage.getStore() || pool;
  
  // Convert undefined to null
  const convertedParams = params.map(p => {
    if (p === undefined) return null;
    return p;
  });

  let attempts = 0;
  while (attempts < 2) {
    try {
      const [rows]: any = await connection.execute(finalSql, convertedParams);
      
      if (type === "run") {
        return {
          changes: rows.affectedRows ?? 0,
          lastInsertRowid: rows.insertId ?? 0,
        };
      } else if (type === "get") {
        return Array.isArray(rows) ? rows[0] : undefined;
      } else {
        return rows;
      }
    } catch (err: any) {
      attempts++;
      const isConnectionError = 
        err.code === "ECONNRESET" || 
        err.code === "PROTOCOL_CONNECTION_LOST" || 
        err.message?.includes("ECONNRESET") || 
        err.message?.includes("connection") || 
        err.message?.includes("lost");
        
      if (attempts < 2 && isConnectionError && !transactionStorage.getStore()) {
        console.warn(`Database connection reset detected: ${err.message}. Retrying query execution once...`);
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }
      console.error("MySQL query error:", err.message, "SQL:", finalSql);
      throw err;
    }
  }
}

// Expose same interface as better-sqlite3 but fully async-ready
class PreparedStatement {
  constructor(private sql: string) {}

  async run(...params: any[]) {
    // Handle list arguments flattened
    const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return await executeQuery(this.sql, flattened, "run");
  }

  async get(...params: any[]) {
    const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return await executeQuery(this.sql, flattened, "get");
  }

  async all(...params: any[]) {
    const flattened = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return await executeQuery(this.sql, flattened, "all");
  }
}

export const db: any = {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  },

  async exec(sql: string) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith("PRAGMA")) {
      return;
    }
    
    const pool = getPool();
    const connection = transactionStorage.getStore() || pool;
    
    // Split and run statements if they are multiple statements in one block
    let execAttempts = 0;
    while (execAttempts < 2) {
      try {
        const statements = sql
          .split(";")
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.toUpperCase().startsWith("PRAGMA"));
          
        for (const statement of statements) {
          const finalStatement = translateSql(statement);
          await connection.query(finalStatement);
        }
        break; // success
      } catch (err: any) {
        execAttempts++;
        const isConnectionError = 
          err.code === "ECONNRESET" || 
          err.code === "PROTOCOL_CONNECTION_LOST" || 
          err.message?.includes("ECONNRESET") || 
          err.message?.includes("connection") || 
          err.message?.includes("lost");
          
        if (execAttempts < 2 && isConnectionError && !transactionStorage.getStore()) {
          console.warn(`MySQL exec connection reset detected: ${err.message}. Retrying query execution once...`);
          await new Promise(resolve => setTimeout(resolve, 50));
          continue;
        }
        console.error("MySQL exec error:", err.message);
        throw err;
      }
    }
  },

  async pragma(arg: string) {
    // No-op for MySQL
    return;
  },

  transaction(fn: any) {
    return async (...args: any[]) => {
      const pool = getPool();
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await transactionStorage.run(connection, async () => {
          return await fn(...args);
        });
        await connection.commit();
        return result;
      } catch (err) {
        await connection.rollback();
        console.error("MySQL Transaction Rollback:", err);
        throw err;
      } finally {
        connection.release();
      }
    };
  },
};

// Auto-run schema.sql on startup if MySQL is active
try {
  const schemaPath = path.resolve(process.cwd(), "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    console.log("Loading MySQL schema from schema.sql...");
    
    // Initialize pool and connection
    const pool = getPool();
    const connection = await pool.getConnection();
    
    try {
      // Parse statements separated by custom blocks or simple semicolons
      const statements = schemaSql
        .split(";")
        .map(s => {
          // Remove empty lines and lines starting with -- or /* to isolate the actual statement
          const cleanedLines = s.split("\n").filter(line => {
            const trimmedLine = line.trim();
            return trimmedLine.length > 0 && !trimmedLine.startsWith("--") && !trimmedLine.startsWith("/*");
          });
          return {
            original: s.trim(),
            cleaned: cleanedLines.join("\n").trim()
          };
        })
        .filter(stmt => {
          const up = stmt.cleaned.toUpperCase();
          return stmt.cleaned.length > 0 && !up.startsWith("CREATE DATABASE") && !up.startsWith("USE ");
        });
        
      console.log(`Executing ${statements.length} statements from schema.sql to initialize MySQL...`);
      for (const statement of statements) {
        // Avoid database-wide creation if it blocks, but support USE or tables
        try {
          await connection.query(statement.cleaned);
        } catch (stmtErr: any) {
          // Ignore database-wide and USE warnings or known duplicate table names
          const sqlUpper = statement.cleaned.toUpperCase();
          if (!sqlUpper.startsWith("CREATE DATABASE") && !sqlUpper.startsWith("USE")) {
            console.warn(`Statement warning: ${stmtErr.message} on statement: \n${statement.cleaned}`);
          }
        }
      }
      console.log("MySQL schema setup successful!");
    } catch (err: any) {
      console.error("Error setting up MySQL schema:", err);
    } finally {
      connection.release();
    }
  }
} catch (err) {
  console.error("Failed to read/execute schema.sql for MySQL:", err);
}

