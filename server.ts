import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { db, isMysql } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// db instance imported from db.ts

// Helper to write to Audit Logs
async function logAudit(req: any, action: string, detail: string) {
  try {
    const userEmail = req?.headers?.['x-user-email'] || req?.headers?.['user-email'] || req?.body?.userEmail || req?.body?.email || req?.query?.userEmail || 'system';
    const userId = req?.headers?.['x-user-id'] || req?.headers?.['user-id'] || req?.body?.userId || req?.query?.userId || 'system';
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.prepare("INSERT INTO audit_logs (id, userId, userEmail, action, detail, ipAddress) VALUES (?, ?, ?, ?, ?, ?)").run(
      id, String(userId), String(userEmail), action, detail, String(ipAddress)
    );
  } catch (e) {
    console.error("Failed to insert audit log:", e);
  }
}

// Initialize Database Tables
async function initDb() {
  try {
    if (!isMysql) {
      // Create tables
      await db.exec(`
        PRAGMA foreign_keys = ON;
        
        -- Schema validation/migration check
        -- If schedules table exists but references employeeId instead of id, we might need a reset
        -- For this specific app environment, we'll try to ensure consistent schema
      `);

      // Check if we need to migrate or reset due to primary key changes
      const tableInfo = await db.prepare("PRAGMA table_info(employees)").all();
      const hasId = tableInfo.some((c: any) => c.name === 'id');
      
      // If employees table is very old (no id column), we must recreate
      if (!hasId) {
        await db.exec(`
          DROP TABLE IF EXISTS dtr_logs;
          DROP TABLE IF EXISTS schedules;
          DROP TABLE IF EXISTS deductions;
          DROP TABLE IF EXISTS payroll_entries;
          DROP TABLE IF EXISTS employees;
          DROP TABLE IF EXISTS users;
        `);
      }

      // Check if dtr_logs references 'id' or the old 'employeeId'
      const fkDtr = await db.prepare("PRAGMA foreign_key_list(dtr_logs)").all() as any[];
      const dtrRefsEmployeeId = fkDtr.some(f => f.table === 'employees' && f.to === 'employeeId');
      
      if (dtrRefsEmployeeId) {
        await db.exec(`
          DROP TABLE IF EXISTS dtr_logs;
          DROP TABLE IF EXISTS schedules;
          DROP TABLE IF EXISTS deductions;
          DROP TABLE IF EXISTS payroll_entries;
          -- Not dropping employees/users here as they might be okay, 
          -- but if child tables are old, it's safer to refresh everything to match UUID logic
          DROP TABLE IF EXISTS employees;
          DROP TABLE IF EXISTS users;
        `);
      }

      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          password TEXT,
          displayName TEXT,
          role TEXT DEFAULT 'employee',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS employees (
          id TEXT PRIMARY KEY,
          employeeId TEXT UNIQUE,
          firstName TEXT,
          lastName TEXT,
          email TEXT,
          password TEXT,
          category TEXT,
          basicSalary DECIMAL(15, 2),
          salaryType TEXT DEFAULT 'monthly',
          status TEXT DEFAULT 'active',
          phoneNumber TEXT DEFAULT '09171234567',
          hireDate DATE,
          hasSss INTEGER DEFAULT 0,
          hasPhilhealth INTEGER DEFAULT 0,
          hasPagibig INTEGER DEFAULT 0,
          bpno TEXT,
          mi TEXT,
          prefix TEXT,
          appellation TEXT,
          birthDate TEXT,
          crn TEXT,
          effectivityDate TEXT,
          position TEXT,
          gender TEXT DEFAULT 'MALE',
          profileImage TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payroll_cycles (
          id TEXT PRIMARY KEY,
          name TEXT,
          startDate DATE,
          endDate DATE,
          type TEXT DEFAULT 'all',
          categoryFilter TEXT DEFAULT 'all',
          status TEXT DEFAULT 'draft',
          totalGross DECIMAL(15, 2) DEFAULT 0.00,
          totalDeductions DECIMAL(15, 2) DEFAULT 0.00,
          totalNet DECIMAL(15, 2) DEFAULT 0.00,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payroll_entries (
          id TEXT PRIMARY KEY,
          cycleId TEXT,
          employeeId TEXT,
          employeeName TEXT,
          basicPay DECIMAL(15, 2),
          overtime DECIMAL(15, 2) DEFAULT 0.00,
          bonuses DECIMAL(15, 2) DEFAULT 0.00,
          allowances DECIMAL(15, 2) DEFAULT 0.00,
          otHours DECIMAL(15, 2) DEFAULT 0.00,
          incentives DECIMAL(15, 2) DEFAULT 0.00,
          teachingHours DECIMAL(15, 2) DEFAULT 0.00,
          grossPay DECIMAL(15, 2) DEFAULT 0.00,
          totalDeductions DECIMAL(15, 2) DEFAULT 0.00,
          netPay DECIMAL(15, 2) DEFAULT 0.00,
          status TEXT DEFAULT 'pending',
          deductions_json TEXT,
          custom_values_json TEXT,
          isValidated INTEGER DEFAULT 0,
          
          -- Government shares columns
          govSecGsis DECIMAL(15, 2) DEFAULT 0.00,
          govSecHdmf DECIMAL(15, 2) DEFAULT 0.00,
          govSecPh DECIMAL(15, 2) DEFAULT 0.00,
          govSecEcip DECIMAL(15, 2) DEFAULT 0.00,

          -- Compensations columns
          compSal2nd DECIMAL(15, 2) DEFAULT 0.00,
          compPera DECIMAL(15, 2) DEFAULT 0.00,
          compGross DECIMAL(15, 2) DEFAULT 0.00,
          absences DECIMAL(15, 2) DEFAULT 0.00,

          -- Deductions columns
          dedPolicyLoan DECIMAL(15, 2) DEFAULT 0.00,
          dedConsolLoan DECIMAL(15, 2) DEFAULT 0.00,
          dedMplLite DECIMAL(15, 2) DEFAULT 0.00,
          dedMpl DECIMAL(15, 2) DEFAULT 0.00,
          dedCpl DECIMAL(15, 2) DEFAULT 0.00,
          dedGfal DECIMAL(15, 2) DEFAULT 0.00,
          dedEmergencyLoan DECIMAL(15, 2) DEFAULT 0.00,
          dedGsisPremPersonal DECIMAL(15, 2) DEFAULT 0.00,
          dedEducAsst DECIMAL(15, 2) DEFAULT 0.00,
          dedPagibigPersonal DECIMAL(15, 2) DEFAULT 0.00,
          dedPagibigMpl DECIMAL(15, 2) DEFAULT 0.00,
          dedSss DECIMAL(15, 2) DEFAULT 0.00,
          dedPagibigMp2 DECIMAL(15, 2) DEFAULT 0.00,
          dedPhilhealthCont DECIMAL(15, 2) DEFAULT 0.00,
          dedCsbLoan DECIMAL(15, 2) DEFAULT 0.00,
          dedTaxWithheld DECIMAL(15, 2) DEFAULT 0.00,

          FOREIGN KEY(cycleId) REFERENCES payroll_cycles(id) ON DELETE CASCADE,
          FOREIGN KEY(employeeId) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS deductions (
          id TEXT PRIMARY KEY,
          employeeId TEXT,
          type TEXT,
          description TEXT,
          amount DECIMAL(15, 2),
          status TEXT DEFAULT 'active',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(employeeId) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS deduction_types (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS employee_categories (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS employee_positions (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE,
          description TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY,
          employeeId TEXT,
          dayOfWeek TEXT,
          startTime TEXT,
          endTime TEXT,
          subject TEXT,
          room TEXT,
          specificDate TEXT,
          effectiveFrom TEXT,
          effectiveTo TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(employeeId) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS dtr_logs (
          id TEXT PRIMARY KEY,
          employeeId TEXT,
          date DATE,
          timeIn DATETIME,
          timeOut DATETIME,
          status TEXT DEFAULT 'present',
          notes TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(employeeId) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          userId TEXT,
          userEmail TEXT,
          action TEXT,
          detail TEXT,
          ipAddress TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sms_logs (
          id TEXT PRIMARY KEY,
          employeeId TEXT,
          phoneNumber TEXT,
          message TEXT,
          status TEXT DEFAULT 'sent',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(employeeId) REFERENCES employees(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS holidays (
          id TEXT PRIMARY KEY,
          name TEXT,
          date TEXT UNIQUE,
          type TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Ensure foreign keys are enabled after table creation too
    await db.pragma('foreign_keys = ON');

    // Schema migration helper
    const ensureColumn = async (table: string, col: string, definition: string) => {
      try {
        let hasColumn = false;
        if (isMysql) {
          const colCheck = await db.prepare(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
              AND COLUMN_NAME = ? 
              AND TABLE_SCHEMA = DATABASE()
          `).get(table, col);
          if (colCheck) {
            hasColumn = true;
          }
        } else {
          // Check sqlite via pragma
          const info = await db.prepare(`PRAGMA table_info(${table})`).all();
          hasColumn = info.some((c: any) => c.name === col);
        }

        if (!hasColumn) {
          let mysqlDef = definition;
          if (isMysql) {
            // Translate TEXT to VARCHAR(255) when there's a default value for MySQL support
            mysqlDef = mysqlDef.replace(/\bTEXT\s+DEFAULT\b/gi, "VARCHAR(255) DEFAULT");
            if (col === "profileImage" || col === "custom_values_json") {
              mysqlDef = mysqlDef.replace(/\bTEXT\b/gi, "LONGTEXT");
            } else {
              mysqlDef = mysqlDef.replace(/\bTEXT\b/gi, "VARCHAR(255)");
            }
            mysqlDef = mysqlDef.replace(/\bINTEGER\s+DEFAULT\b/gi, "INT DEFAULT");
            mysqlDef = mysqlDef.replace(/\bINTEGER\b/gi, "INT");
          }
          await db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${mysqlDef}`);
          console.log(`[Migration] Column ${col} successfully added to ${table}`);
        }
      } catch (err: any) {
        console.warn(`[Migration] Warning: Could not ensure column ${col} in ${table}:`, err.message);
      }
    };

    await ensureColumn("payroll_entries", "isValidated", "INTEGER DEFAULT 0");
    await ensureColumn("payroll_entries", "allowances", "DECIMAL(15,2) DEFAULT 0.00");
    await ensureColumn("payroll_entries", "otHours", "DECIMAL(15,2) DEFAULT 0.00");
    await ensureColumn("payroll_entries", "incentives", "DECIMAL(15,2) DEFAULT 0.00");
    await ensureColumn("payroll_entries", "teachingHours", "DECIMAL(15,2) DEFAULT 0.00");
    await ensureColumn("employees", "phoneNumber", "TEXT DEFAULT '09171234567'");
    await ensureColumn("employees", "hireDate", "DATE");
    await ensureColumn("employees", "hasSss", "INTEGER DEFAULT 0");
    await ensureColumn("employees", "hasPhilhealth", "INTEGER DEFAULT 0");
    await ensureColumn("employees", "hasPagibig", "INTEGER DEFAULT 0");
    for (const col of ['bpno', 'mi', 'prefix', 'appellation', 'birthDate', 'crn', 'effectivityDate', 'position', 'employeeNo']) {
      await ensureColumn("employees", col, "TEXT");
    }
    await ensureColumn("employees", "gender", "TEXT DEFAULT 'MALE'");
    await ensureColumn("employees", "profileImage", "TEXT");
    await ensureColumn("users", "profileImage", "TEXT");

    if (isMysql) {
      try {
        await db.exec("ALTER TABLE employees MODIFY COLUMN profileImage LONGTEXT");
        console.log("[Migration] Successfully modified employees.profileImage to LONGTEXT");
      } catch (err: any) {
        console.warn("[Migration] Could not modify employees.profileImage to LONGTEXT:", err.message);
      }
      try {
        await db.exec("ALTER TABLE users MODIFY COLUMN profileImage LONGTEXT");
        console.log("[Migration] Successfully modified users.profileImage to LONGTEXT");
      } catch (err: any) {
        console.warn("[Migration] Could not modify users.profileImage to LONGTEXT:", err.message);
      }
    }

    // Backfill employee gender if they are not updated or blank
    try {
      const emps = await db.prepare("SELECT id, firstName, lastName, gender FROM employees").all() as any[];
      const femaleLastNames = [
        'AGAD', 'ALMINE', 'BATIANCILA', 'BRUN', 'BUGAIS-PAGOBO', 'CABERTE', 'CAPAPAS', 
        'CARBONILLA', 'CRUZADA', 'CUENCO', 'CUPAT', 'CUTA', 'MARUCOT', 'MEMBREVE', 'NUÑEZ', 
        'ORIAS', 'PAUG', 'PERNITES', 'PIAMONTE', 'PLANA', 'ROSOLADA', 'TIIN', 'DE LA CRUZ',
        'SALUDSOD'
      ];
      await db.transaction(async () => {
        for (const emp of emps) {
          if (!emp.gender || emp.gender === 'MALE') {
            const lName = (emp.lastName || '').toUpperCase().trim();
            const fName = (emp.firstName || '').toUpperCase().trim();
            let gen = 'MALE';
            if (lName === 'SINAHON') {
              if (fName.includes('CHRESTIAN') || fName.includes('JEDE')) {
                gen = 'FEMALE';
              } else {
                gen = 'MALE';
              }
            } else if (lName === 'MANUN-OG' && fName.includes('MADELYN')) {
              gen = 'FEMALE';
            } else if (femaleLastNames.includes(lName) || fName.includes('MARY') || fName.includes('FEMALE')) {
              gen = 'FEMALE';
            }
            
            if (emp.gender !== gen) {
              await db.prepare("UPDATE employees SET gender = ? WHERE id = ?").run(gen, emp.id);
            }
          }
        }
      })();
    } catch (migErr) {}

    await ensureColumn("schedules", "specificDate", "TEXT");
    await ensureColumn("schedules", "effectiveFrom", "TEXT");
    await ensureColumn("schedules", "effectiveTo", "TEXT");
    await ensureColumn("payroll_entries", "custom_values_json", "TEXT");
    await ensureColumn("payroll_cycles", "categoryFilter", "TEXT DEFAULT 'all'");

    const entryColsToMigrate = [
      'govSecGsis', 'govSecHdmf', 'govSecPh', 'govSecEcip',
      'compSal2nd', 'compPera', 'compGross', 'absences',
      'dedPolicyLoan', 'dedConsolLoan', 'dedMplLite', 'dedMpl', 'dedCpl', 'dedGfal', 'dedEmergencyLoan',
      'dedGsisPremPersonal', 'dedEducAsst', 'dedPagibigPersonal', 'dedPagibigMpl', 'dedSss', 'dedPagibigMp2',
      'dedPhilhealthCont', 'dedCsbLoan', 'dedTaxWithheld'
    ];
    for (const col of entryColsToMigrate) {
      await ensureColumn("payroll_entries", col, "DECIMAL(15,2) DEFAULT 0.00");
    }

    // Force-clean old custom values for Pag-IBIG Personal so they recalculate from formula
    try {
      const entriesForCleanup = await db.prepare("SELECT id, custom_values_json FROM payroll_entries").all() as any[];
      await db.transaction(async () => {
        for (const entry of entriesForCleanup) {
          if (entry.custom_values_json) {
            try {
              const custom = JSON.parse(entry.custom_values_json);
              let changed = false;
              if (custom.dedPagibigPersonal !== undefined) {
                delete custom.dedPagibigPersonal;
                changed = true;
              }
              if (changed) {
                await db.prepare("UPDATE payroll_entries SET custom_values_json = ? WHERE id = ?")
                  .run(JSON.stringify(custom), entry.id);
              }
            } catch (jsonErr) {
              // ignore malformed
            }
          }
        }
      })();
    } catch (migErr) {
      // Ignored
    }

    // Seed Deduction Types if empty
    const typeCount = await db.prepare("SELECT COUNT(*) as count FROM deduction_types").get() as any;
    if (typeCount.count === 0) {
      const stmt = await db.prepare("INSERT INTO deduction_types (id, name, description) VALUES (?, ?, ?)");
      const defaultTypes = [
        ['dt-1', 'Loan Payment', 'Employee loans'],
        ['dt-2', 'Insurance', 'Health or life insurance'],
        ['dt-3', 'Additional Tax', 'Withholding tax'],
        ['dt-4', 'Other', 'Miscellaneous deductions']
      ];
      await db.transaction(async () => {
        for (const row of defaultTypes) await stmt.run(row);
      })();
    }

    // Seed/Migrate Employee Categories
    const catCount = await db.prepare("SELECT COUNT(*) as count FROM employee_categories").get() as any;
    if (catCount.count === 0) {
      const stmt = await db.prepare("INSERT INTO employee_categories (id, name, description) VALUES (?, ?, ?)");
      const defaultCats = [
        ['cat-1', 'Regular Employee', 'Fixed monthly salary, Full benefits, Subject to tax'],
        ['cat-2', 'Job Order', 'Paid per day or per hour, Contract-based, Minimal or no benefits'],
        ['cat-3', 'Visiting Instructor', 'Paid per unit or teaching hour, Workload-based computation'],
        ['cat-4', 'FACULTY', 'Academic faculty status with teaching load and standard monthly appointment'],
        ['cat-5', 'STAFF', 'Administrative and support staff with standard monthly appointment']
      ];
      await db.transaction(async () => {
        for (const row of defaultCats) await stmt.run(row);
      })();
    } else {
      // Ensure the specific ones are present and migrate existing data
      try {
        await db.transaction(async () => {
          await db.prepare("INSERT OR IGNORE INTO employee_categories (id, name, description) VALUES ('cat-1', 'Regular Employee', 'Fixed monthly salary, Full benefits, Subject to tax')").run();
          await db.prepare("INSERT OR IGNORE INTO employee_categories (id, name, description) VALUES ('cat-2', 'Job Order', 'Paid per day or per hour, Contract-based, Minimal or no benefits')").run();
          await db.prepare("INSERT OR IGNORE INTO employee_categories (id, name, description) VALUES ('cat-3', 'Visiting Instructor', 'Paid per unit or teaching hour, Workload-based computation')").run();
          await db.prepare("INSERT OR IGNORE INTO employee_categories (id, name, description) VALUES ('cat-4', 'FACULTY', 'Academic faculty status with teaching load and standard monthly appointment')").run();
          await db.prepare("INSERT OR IGNORE INTO employee_categories (id, name, description) VALUES ('cat-5', 'STAFF', 'Administrative and support staff with standard monthly appointment')").run();

          // Migrate any employees using old names
          await db.prepare("UPDATE employees SET category = 'Regular Employee' WHERE category = 'Regular'").run();
          await db.prepare("UPDATE employees SET category = 'Job Order' WHERE category = 'Contractual'").run();
          await db.prepare("UPDATE employees SET category = 'Visiting Instructor' WHERE category = 'Part-time'").run();

          // Delete the old categories
          await db.prepare("DELETE FROM employee_categories WHERE name IN ('Regular', 'Contractual', 'Part-time')").run();
        })();
      } catch (err) {
        // Ignored in silent mode
      }
    }

    // Seed/Migrate Employee Positions
    try {
      const posCount = await db.prepare("SELECT COUNT(*) as count FROM employee_positions").get() as any;
      if (posCount && posCount.count === 0) {
        const stmt = await db.prepare("INSERT INTO employee_positions (id, name, description) VALUES (?, ?, ?)");
        const defaultPositions = [
          // Faculty positions
          ['pos-f1', 'Assistant Professor IV', 'Faculty academic rank IV'],
          ['pos-f2', 'Asst. Prof III', 'Faculty academic rank III'],
          ['pos-f3', 'Assistant Professor I', 'Faculty academic rank I'],
          ['pos-f4', 'Associate Professor II', 'Faculty associate professor rank II'],
          ['pos-f5', 'Assistant Professor II', 'Faculty academic rank II'],
          ['pos-f6', 'Instructor I', 'Faculty instructor rank I'],
          ['pos-f7', 'Associate Professor', 'Faculty associate professor rank'],
          ['pos-f8', 'Associate Professor IV', 'Faculty associate professor rank IV'],
          ['pos-f9', 'Assistant Professor III', 'Faculty academic rank III'],
          ['pos-f10', 'Associate Professor III', 'Faculty associate professor rank III'],
          ['pos-f11', 'Professor VI', 'Faculty high academic rank VI'],
          ['pos-f12', 'Associate Professor V', 'Faculty associate professor rank V'],
          // Staff positions
          ['pos-s1', 'Security Guard II', 'Administrative support staff - Security'],
          ['pos-s2', 'Admin Officer IV', 'Administrative Officer level 4'],
          ['pos-s3', 'ADA6(Clerk3)', 'Administrative Assistant level 6 (Clerk 3)'],
          ['pos-s4', 'FAWK II', 'Farm Worker level 2'],
          ['pos-s5', 'ADA IV', 'Administrative Assistant level 4'],
          ['pos-s6', 'Records Officer I', 'Administrative record keeper level 1'],
          ['pos-s7', 'A.O. 5', 'Administrative Officer level 5'],
          ['pos-s8', 'ADAS V', 'Administrative Assistant level 5'],
          ['pos-s9', 'Property Custodian', 'Administrative support staff - Property custodian'],
          ['pos-s10', 'Cashier II', 'Finance/Treasury support staff level 2'],
          ['pos-s11', 'Clerk III', 'Administrative support staff - Clerk level 3'],
          ['pos-s12', 'Budgeting Assistant', 'Finance/Budget support staff'],
          ['pos-s13', 'Guidance Counselor II', 'Student guidance counselor level 2'],
          ['pos-s14', 'Accountant II', 'Finance/Accountant level 2'],
          ['pos-s15', 'ADAS II( M& Aud.Ast)', 'Administrative Assistant level 2 (M& Aud.Ast)'],
          ['pos-s11_2', 'Cash Clerk', 'Finance/Cash handling clerk'],
          ['pos-s16', 'ADOF 3 (SuppOfficer I)', 'Administrative Officer level 3 (Supply Officer 1)'],
          ['pos-s17', 'HRMO II', 'Human Resource Management Officer level 2'],
          ['pos-s18', 'Supply Officer I', 'Logistics/Supply Officer level 1'],
          ['pos-s19', 'ADA VI (Clerk III)', 'Administrative Assistant level 6 (Clerk 3)'],
          ['pos-s20', 'ADAS3 (SenBkpr)', 'Administrative Assistant level 3 (Senior Bookkeeper)']
        ];
        await db.transaction(async () => {
          for (const row of defaultPositions) {
            await stmt.run(row[0], row[1], row[2]);
          }
        })();
      }
    } catch (e) {
      // Ignored in silent mode
    }

    // Seed Holidays
    try {
      const holidayCount = await db.prepare("SELECT COUNT(*) as count FROM holidays").get() as any;
      if (holidayCount && holidayCount.count === 0) {
        const defaultHolidays = [
          ['hol-1', 'New Year\'s Day', '2026-01-01', 'Regular'],
          ['hol-2', 'Maundy Thursday', '2026-04-02', 'Regular'],
          ['hol-3', 'Good Friday', '2026-04-03', 'Regular'],
          ['hol-4', 'Araw ng Kagitingan', '2026-04-09', 'Regular'],
          ['hol-5', 'Labor Day', '2026-05-01', 'Regular'],
          ['hol-6', 'Independence Day', '2026-06-12', 'Regular'],
          ['hol-7', 'Ninoy Aquino Day', '2026-08-21', 'Special Non-Working'],
          ['hol-8', 'National Heroes Day', '2026-08-31', 'Regular'],
          ['hol-9', 'All Saints\' Day', '2026-11-01', 'Special Non-Working'],
          ['hol-10', 'Bonifacio Day', '2026-11-30', 'Regular'],
          ['hol-11', 'Feast of the Immaculate Conception', '2026-12-08', 'Special Non-Working'],
          ['hol-12', 'Christmas Day', '2026-12-25', 'Regular'],
          ['hol-13', 'Rizal Day', '2026-12-30', 'Regular']
        ];
        const stmt = await db.prepare("INSERT INTO holidays (id, name, date, type) VALUES (?, ?, ?, ?)");
        await db.transaction(async () => {
          for (const row of defaultHolidays) {
            await stmt.run(row[0], row[1], row[2], row[3]);
          }
        });
        console.log("[Seeding] Successfully pre-seeded holidays table with 13 Philippine holidays.");
      }
    } catch (e) {
      console.warn("Failed to seed holidays:", e);
    }

    // Seed Admin
    const adminEmails = ["admin@gmail.com", "caturanchristian@gmail.com", "chancaturan@gmail.com"];
    const adminPassword = "admin123";

    for (let idx = 0; idx < adminEmails.length; idx++) {
      const emailAddress = adminEmails[idx];
      const adminId = `admin-${idx + 1}`;
      const existingAdmin = await db.prepare("SELECT * FROM users WHERE id = ? OR LOWER(email) = ?").get(adminId, emailAddress.toLowerCase()) as any;
      const activeAdminId = existingAdmin ? existingAdmin.id : adminId;
      if (existingAdmin) {
        await db.prepare("UPDATE users SET role = 'admin', password = ?, displayName = ? WHERE id = ?").run(adminPassword, "Admin User", existingAdmin.id);
      } else {
        await db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(activeAdminId, emailAddress.toLowerCase(), adminPassword, "Admin User", "admin");
      }

      // Ensure each admin also exists as an employee for testing features
      const existingAdminEmployee = await db.prepare("SELECT id FROM employees WHERE id = ?").get(activeAdminId);
      if (!existingAdminEmployee) {
        await db.prepare(`
          INSERT INTO employees (id, employeeId, firstName, lastName, email, category, status, basicSalary, hireDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(activeAdminId, `EMP-ADMIN-${idx + 1}`, "Admin", `User ${idx + 1}`, emailAddress.toLowerCase(), "Regular Employee", "active", 50000, new Date().toISOString().split('T')[0]);
      }
    }

    // Seed Accountant
    const accountantEmail = "accountant@example.com";
    const accountantPassword = "accountant123";
    const existingAccountant = await db.prepare("SELECT * FROM users WHERE id = 'accountant-1' OR LOWER(email) = ?").get(accountantEmail.toLowerCase()) as any;
    if (existingAccountant) {
      await db.prepare("UPDATE users SET role = 'accountant', password = ?, displayName = ? WHERE id = ?").run(accountantPassword, "System Accountant", existingAccountant.id);
    } else {
      await db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run("accountant-1", accountantEmail.toLowerCase(), accountantPassword, "System Accountant", "accountant");
    }

    // Seed Department Head
    const deptHeadEmail = "head@gmail.com";
    const deptHeadPassword = "head123";
    const existingDeptHead = await db.prepare("SELECT * FROM users WHERE id = 'depthead-1' OR LOWER(email) = ?").get(deptHeadEmail.toLowerCase()) as any;
    if (existingDeptHead) {
      await db.prepare("UPDATE users SET role = 'department_head', password = ?, displayName = ? WHERE id = ?").run(deptHeadPassword, "Department Head", existingDeptHead.id);
    } else {
      await db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run("depthead-1", deptHeadEmail.toLowerCase(), deptHeadPassword, "Department Head", "department_head");
    }

    // Force run employee category migrations to ensure correct matching
    try {
      await db.prepare("UPDATE employees SET category = 'Regular Employee' WHERE category = 'Regular'").run();
      await db.prepare("UPDATE employees SET category = 'Job Order' WHERE category = 'Contractual'").run();
      await db.prepare("UPDATE employees SET category = 'Visiting Instructor' WHERE category = 'Part-time'").run();
    } catch (migErr) {
      // Ignored in silent mode
    }

    // Seed 48 default employees if empty
    try {
      const empCount = await db.prepare("SELECT COUNT(*) as count FROM employees WHERE id NOT LIKE 'admin-%'").get() as any;
      if (empCount && empCount.count === 0) {
        console.log("[Seeding] Database contains no non-admin employees. Seeding 48 default employees from the registry...");
        const seedEmps = [
          // FACULTY: MALE
          { lastName: "Baclayon", firstName: "Jacinto Jr.", mi: "P.", position: "Assistant Professor IV", category: "FACULTY", gender: "MALE", employeeNo: "94", bpno: "200094" },
          { lastName: "Balili", firstName: "Danilo", mi: "A.", position: "", category: "FACULTY", gender: "MALE", employeeNo: "19", bpno: "200019" },
          { lastName: "Gapasin", firstName: "John Paul", mi: "R.", position: "Asst. Prof III", category: "FACULTY", gender: "MALE", employeeNo: "23", bpno: "200023" },
          { lastName: "Granada", firstName: "Dominador", mi: "P.", position: "Assistant Professor I", category: "FACULTY", gender: "MALE", employeeNo: "178", bpno: "200178" },
          { lastName: "Lim", firstName: "Wade", mi: "C.", position: "Associate Professor II", category: "FACULTY", gender: "MALE", employeeNo: "15", bpno: "200015" },
          { lastName: "Manun-og", firstName: "Mondani", mi: "R.", position: "Associate Professor II", category: "FACULTY", gender: "MALE", employeeNo: "29", bpno: "200029" },
          { lastName: "Manun-og", firstName: "Ruther", mi: "B.", position: "Assistant Professor II", category: "FACULTY", gender: "MALE", employeeNo: "85", bpno: "200085" },
          { lastName: "Mondragon", firstName: "G-mar", mi: "D.", position: "Instructor I", category: "FACULTY", gender: "MALE", employeeNo: "156", bpno: "200156" },
          { lastName: "Napala", firstName: "Irvin Lito", mi: "O.", position: "Associate Professor", category: "FACULTY", gender: "MALE", employeeNo: "23", bpno: "200233" },
          { lastName: "Navarrete", firstName: "Ian", mi: "A.", position: "Associate Professor IV", category: "FACULTY", gender: "MALE", employeeNo: "187", bpno: "200187" },

          // FACULTY: FEMALE
          { lastName: "Almine", firstName: "Mary", mi: "D.", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "188", bpno: "200188" },
          { lastName: "Aquino", firstName: "Ana Mae", mi: "", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "295", bpno: "200295" },
          { lastName: "Capapas", firstName: "Meryl", mi: "V.", position: "Assistant Professor I", category: "FACULTY", gender: "FEMALE", employeeNo: "162", bpno: "200162" },
          { lastName: "Cupat", firstName: "Leonisa", mi: "H.", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "195", bpno: "200195" },
          { lastName: "Manun-og", firstName: "Madelyn", mi: "B.", position: "Assistant Professor IV", category: "FACULTY", gender: "FEMALE", employeeNo: "25", bpno: "200025" },
          { lastName: "Membreve", firstName: "Christselda", mi: "S.", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "414", bpno: "200414" },
          { lastName: "Nuñez", firstName: "Edelyn", mi: "P.", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "415", bpno: "200415" },
          { lastName: "Piamonte", firstName: "Rojelyn", mi: "P.", position: "Instructor I", category: "FACULTY", gender: "FEMALE", employeeNo: "416", bpno: "200416" },
          { lastName: "Pernites", firstName: "Ma. Emma Suzette", mi: "M.", position: "Assistant Professor I", category: "FACULTY", gender: "FEMALE", employeeNo: "161", bpno: "200161" },
          { lastName: "Pille", firstName: "Roxan", mi: "D.", position: "Assistant Professor III", category: "FACULTY", gender: "FEMALE", employeeNo: "123", bpno: "200123" },
          { lastName: "Regis", firstName: "Mary Ann Jully", mi: "B.", position: "Associate Professor III", category: "FACULTY", gender: "FEMALE", employeeNo: "67", bpno: "200067" },
          { lastName: "Rosolada", firstName: "Romecita", mi: "R.", position: "Professor VI", category: "FACULTY", gender: "FEMALE", employeeNo: "21", bpno: "200021" },
          { lastName: "Saludsod", firstName: "Mary beth", mi: "T.", position: "Associate Professor V", category: "FACULTY", gender: "FEMALE", employeeNo: "27", bpno: "200027" },

          // STAFF: MALE
          { lastName: "Amod", firstName: "Gary", mi: "S.", position: "Security Guard II", category: "STAFF", gender: "MALE", employeeNo: "039", bpno: "200039" },
          { lastName: "Bugais", firstName: "Noel", mi: "S.", position: "Admin Officer IV", category: "STAFF", gender: "MALE", employeeNo: "148", bpno: "200148" },
          { lastName: "Butac", firstName: "Cyclaus", mi: "P.", position: "ADA6(Clerk3)", category: "STAFF", gender: "MALE", employeeNo: "431", bpno: "200431" },
          { lastName: "Fiel", firstName: "Ernie", mi: "D.", position: "FAWK II", category: "STAFF", gender: "MALE", employeeNo: "64", bpno: "200064" },
          { lastName: "Humangit", firstName: "Antonio", mi: "N.", position: "ADA IV", category: "STAFF", gender: "MALE", employeeNo: "20", bpno: "200020" },
          { lastName: "Molita", firstName: "Chris Jirah", mi: "E.", position: "Records Officer I", category: "STAFF", gender: "MALE", employeeNo: "200", bpno: "200200" },
          { lastName: "Mulig", firstName: "Gamebert", mi: "T.", position: "A.O. 5", category: "STAFF", gender: "MALE", employeeNo: "", bpno: "200330" },
          { lastName: "Pasayan", firstName: "Jonathan", mi: "L.", position: "ADAS V", category: "STAFF", gender: "MALE", employeeNo: "100", bpno: "200100" },
          { lastName: "Quintana", firstName: "Ariel", mi: "R.", position: "Property Custodian", category: "STAFF", gender: "MALE", employeeNo: "918", bpno: "200918" },
          { lastName: "Roculas", firstName: "Roland", mi: "A.", position: "FAWK II", category: "STAFF", gender: "MALE", employeeNo: "15", bpno: "200016" },
          { lastName: "Rojas", firstName: "Joselito", mi: "S.", position: "Cashier II", category: "STAFF", gender: "MALE", employeeNo: "11", bpno: "200011" },
          { lastName: "Valerio", firstName: "Glen Zimore", mi: "", position: "Clerk III", category: "STAFF", gender: "MALE", employeeNo: "", bpno: "200335" },

          // STAFF: FEMALE
          { lastName: "Agad", firstName: "Rosebeb", mi: "", position: "Clerk III", category: "STAFF", gender: "FEMALE", employeeNo: "423", bpno: "200423" },
          { lastName: "Batiancila", firstName: "Sebian", mi: "M.", position: "Budgeting Assistant", category: "STAFF", gender: "FEMALE", employeeNo: "424", bpno: "200424" },
          { lastName: "Bugais-Pagobo", firstName: "Charisse Ann", mi: "S.", position: "Guidance Counselor II", category: "STAFF", gender: "FEMALE", employeeNo: "411", bpno: "200411" },
          { lastName: "Caberte", firstName: "Leslie Anne", mi: "C.", position: "Accountant II", category: "STAFF", gender: "FEMALE", employeeNo: "225", bpno: "200225" },
          { lastName: "Carbonilla", firstName: "Joje Marie", mi: "P.", position: "ADAS II(M & Aud.Ast)", category: "STAFF", gender: "FEMALE", employeeNo: "457", bpno: "200457" },
          { lastName: "Cuenco", firstName: "Rubie", mi: "P.", position: "Clerk III", category: "STAFF", gender: "FEMALE", employeeNo: "715", bpno: "200715" },
          { lastName: "Cruzada", firstName: "Marjorie", mi: "", position: "Cash Clerk", category: "STAFF", gender: "FEMALE", employeeNo: "735", bpno: "200735" },
          { lastName: "De la Cruz", firstName: "Chanson Angelica", mi: "C.", position: "Clerk III", category: "STAFF", gender: "FEMALE", employeeNo: "263", bpno: "200263" },
          { lastName: "Marucot", firstName: "Azila", mi: "M.", position: "ADOF 3 (SuppOfficer I)", category: "STAFF", gender: "FEMALE", employeeNo: "28", bpno: "200028" },
          { lastName: "Orias", firstName: "Carol Ann", mi: "B.", position: "HRMO II", category: "STAFF", gender: "FEMALE", employeeNo: "22", bpno: "200022" },
          { lastName: "Paug", firstName: "Febie", mi: "D.", position: "Supply Officer I", category: "STAFF", gender: "FEMALE", employeeNo: "56", bpno: "200056" },
          { lastName: "Sinahon", firstName: "Chrestian Jede", mi: "T.", position: "ADA VI (Clerk III)", category: "STAFF", gender: "FEMALE", employeeNo: "248", bpno: "200248" },
          { lastName: "Tiin", firstName: "Clarish", mi: "T.", position: "ADAS3 (SenBkpr)", category: "STAFF", gender: "FEMALE", employeeNo: "425", bpno: "200425" }
        ];

        await db.transaction(async () => {
          for (let i = 0; i < seedEmps.length; i++) {
            const emp = seedEmps[i];
            const id = `emp-${Date.now()}-${i}`;
            const employeeId = emp.bpno;
            const baseSalary = emp.category === "FACULTY" ? 35000 : 25000;
            const email = `${emp.firstName.toLowerCase().replace(/\s+/g, '')}.${emp.lastName.toLowerCase()}@slsu.edu.ph`;

            await db.prepare(`
              INSERT INTO employees (
                id, employeeId, firstName, lastName, email, category, basicSalary, salaryType, status,
                bpno, mi, position, gender, employeeNo, phoneNumber, hasSss, hasPhilhealth, hasPagibig
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id, employeeId, emp.firstName, emp.lastName, email, emp.category, baseSalary, 'monthly', 'active',
              emp.bpno, emp.mi, emp.position, emp.gender, emp.employeeNo, '09171234567', 0, 0, 0
            );

            // Seed as user
            const plainPassword = `${emp.lastName.toLowerCase()}123`;
            await db.prepare(`
              INSERT OR IGNORE INTO users (id, email, password, displayName, role)
              VALUES (?, ?, ?, ?, ?)
            `).run(id, email, plainPassword, `${emp.firstName} ${emp.lastName}`, 'employee');
          }
        })();
        console.log(`[Seeding] Successfully seeded ${seedEmps.length} default employees!`);
      }

      // Automatically update/normalize all existing employees' employeeNo from the image map
      console.log("[Migration] Running automatic employeeNo updates from uploaded image data...");
      const imageEmployeeNoUpdates = [
        // FACULTY: MALE
        { lastName: "Baclayon", firstName: "Jacinto Jr.", employeeNo: "94" },
        { lastName: "Balili", firstName: "Danilo", employeeNo: "19" },
        { lastName: "Gapasin", firstName: "John Paul", employeeNo: "23" },
        { lastName: "Granada", firstName: "Dominador", employeeNo: "178" },
        { lastName: "Lim", firstName: "Wade", employeeNo: "15" },
        { lastName: "Manun-og", firstName: "Mondani", employeeNo: "29" },
        { lastName: "Manun-og", firstName: "Ruther", employeeNo: "85" },
        { lastName: "Mondragon", firstName: "G-mar", employeeNo: "156" },
        { lastName: "Napala", firstName: "Irvin Lito", employeeNo: "23" },
        { lastName: "Navarrete", firstName: "Ian", employeeNo: "187" },

        // FACULTY: FEMALE
        { lastName: "Almine", firstName: "Mary", employeeNo: "188" },
        { lastName: "Aquino", firstName: "Ana Mae", employeeNo: "295" },
        { lastName: "Capapas", firstName: "Meryl", employeeNo: "162" },
        { lastName: "Cupat", firstName: "Leonisa", employeeNo: "195" },
        { lastName: "Manun-og", firstName: "Madelyn", employeeNo: "25" },
        { lastName: "Membreve", firstName: "Christselda", employeeNo: "414" },
        { lastName: "Nuñez", firstName: "Edelyn", employeeNo: "415" },
        { lastName: "Piamonte", firstName: "Rojelyn", employeeNo: "416" },
        { lastName: "Pernites", firstName: "Ma. Emma Suzette", employeeNo: "161" },
        { lastName: "Pille", firstName: "Roxan", employeeNo: "123" },
        { lastName: "Regis", firstName: "Mary Ann Jully", employeeNo: "67" },
        { lastName: "Rosolada", firstName: "Romecita", employeeNo: "21" },
        { lastName: "Saludsod", firstName: "Mary beth", employeeNo: "27" },

        // STAFF: MALE
        { lastName: "Amod", firstName: "Gary", employeeNo: "039" },
        { lastName: "Bugais", firstName: "Noel", employeeNo: "148" },
        { lastName: "Butac", firstName: "Cyclaus", employeeNo: "431" },
        { lastName: "Fiel", firstName: "Ernie", employeeNo: "64" },
        { lastName: "Humangit", firstName: "Antonio", employeeNo: "20" },
        { lastName: "Molita", firstName: "Chris Jirah", employeeNo: "200" },
        { lastName: "Mulig", firstName: "Gamebert", employeeNo: "" },
        { lastName: "Pasayan", Jonathan: "Jonathan", firstName: "Jonathan", employeeNo: "100" },
        { lastName: "Quintana", firstName: "Ariel", employeeNo: "918" },
        { lastName: "Roculas", firstName: "Roland", employeeNo: "15" },
        { lastName: "Rojas", firstName: "Joselito", employeeNo: "11" },
        { lastName: "Valerio", firstName: "Glen Zimore", employeeNo: "" },

        // STAFF: FEMALE
        { lastName: "Agad", firstName: "Rosebeb", employeeNo: "423" },
        { lastName: "Batiancila", firstName: "Sebian", employeeNo: "424" },
        { lastName: "Bugais-Pagobo", firstName: "Charisse Ann", employeeNo: "411" },
        { lastName: "Caberte", firstName: "Leslie Anne", employeeNo: "225" },
        { lastName: "Carbonilla", firstName: "Joje Marie", employeeNo: "457" },
        { lastName: "Cuenco", firstName: "Rubie", employeeNo: "715" },
        { lastName: "Cruzada", firstName: "Marjorie", employeeNo: "" },
        { lastName: "De la Cruz", firstName: "Chanson Angelica", employeeNo: "263" },
        { lastName: "Marucot", firstName: "Azila", employeeNo: "28" },
        { lastName: "Orias", firstName: "Carol Ann", employeeNo: "22" },
        { lastName: "Paug", firstName: "Febie", employeeNo: "56" },
        { lastName: "Sinahon", firstName: "Chrestian Jede", employeeNo: "248" },
        { lastName: "Tiin", firstName: "Clarish", employeeNo: "425" }
      ];

      await db.transaction(async () => {
        for (const item of imageEmployeeNoUpdates) {
          await db.prepare(`
            UPDATE employees 
            SET employeeNo = ? 
            WHERE LOWER(lastName) = LOWER(?) AND LOWER(firstName) = LOWER(?)
          `).run(item.employeeNo, item.lastName, item.firstName);
        }
      })();
      console.log("[Migration] Successfully completed live database employeeNo updates!");
    } catch (e: any) {
      console.warn("Failed to seed default employees:", e.message);
    }

    // Done
  } catch (error: any) {
    console.error("CRITICAL: Database initialization error!", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global Error Handler Middleware
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  const triggerSMS = async (employeeId: string, message: string) => {
    try {
      const emp = await db.prepare("SELECT phoneNumber FROM employees WHERE id = ?").get(employeeId) as any;
      const phone = emp?.phoneNumber || '09171234567';
      const id = `sms-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.prepare("INSERT INTO sms_logs (id, employeeId, phoneNumber, message, status) VALUES (?, ?, ?, ?, 'sent')").run(
        id, employeeId, phone, message
      );
    } catch (error) {
      console.error("Failed to log/send SMS:", error);
    }
  };

  const getManilaTime = () => {
    const options = {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    } as const;
    
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    
    const partMap = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {} as Record<string, string>);
    
    const year = partMap.year;
    const month = partMap.month;
    const day = partMap.day;
    let hour = partMap.hour;
    if (hour === "24") hour = "00";
    const minute = partMap.minute;
    const second = partMap.second;
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  };

  const getManilaDate = () => {
    return getManilaTime().split("T")[0];
  };

  const format12Hour = (timeString: string) => {
    const parts = timeString.split('T')[1]?.split(':') || timeString.split(':');
    if (parts.length < 2) return timeString;
    let h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const autoRecalculatePayrollForEmployee = async (employeeId: string) => {
    try {
      const draftEntries = await db.prepare(`
        SELECT DISTINCT cycleId 
        FROM payroll_entries 
        WHERE employeeId = ? 
          AND cycleId IN (SELECT id FROM payroll_cycles WHERE status = 'draft')
      `).all(employeeId) as { cycleId: string }[];
      for (const entry of draftEntries) {
        await recalculateCycle(entry.cycleId);
      }
    } catch (err) {
      console.error("Auto-recalc payroll failed:", err);
    }
  };

  const recalculateCycle = async (cycleId: string) => {
    try {
      const cycle = await db.prepare("SELECT * FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
        if (!cycle) return;
        const entries = await db.prepare("SELECT * FROM payroll_entries WHERE cycleId = ?").all(cycleId) as any;
        let totalGross = 0, totalDeductions = 0, totalNet = 0;

        for (const entry of entries) {
          const emp = await db.prepare("SELECT * FROM employees WHERE id = ?").get(entry.employeeId) as any;
          
          // Get manual overrides/custom properties
          const custom = entry.custom_values_json ? JSON.parse(entry.custom_values_json) : {};
          
          let computedBasicPay = Number(entry.basicPay);
          let dynamicAbsences = 0.00;
          let baseCyclePay = 0.00;
          let undertimeDeduction = 0.00;

          if (emp) {
            emp.basicSalary = Number(emp.basicSalary || 0);
            if (emp.category === 'Job Order') {
              // Paid per day or per hour. Look up DTR logs within cycle period
              const dtrLogs = await db.prepare("SELECT * FROM dtr_logs WHERE employeeId = ? AND date >= ? AND date <= ?").all(emp.id, cycle.startDate, cycle.endDate) as any;
              if (dtrLogs.length > 0) {
                if (emp.salaryType === 'hourly') {
                  let totalHours = 0;
                  for (const log of dtrLogs) {
                    if (log.timeIn && log.timeOut) {
                      const inDate = new Date(log.timeIn);
                      const outDate = new Date(log.timeOut);
                      const diffMs = outDate.getTime() - inDate.getTime();
                      let hours = Math.max(0, diffMs / (1000 * 60 * 60));
                      
                      const inLocalMinutes = inDate.getHours() * 60 + inDate.getMinutes();
                      const outLocalMinutes = outDate.getHours() * 60 + outDate.getMinutes();
                      if (inLocalMinutes < 12 * 60 && outLocalMinutes > 13 * 60) {
                        hours = Math.max(0, hours - 1);
                      }
                      
                      totalHours += hours;
                    }
                  }
                  computedBasicPay = Number((totalHours * emp.basicSalary).toFixed(2));
                } else {
                  // Clean daily rate: Count unique dates on which the employee had a clock-in record
                  const uniqueDates = new Set(dtrLogs.filter((log: any) => log.timeIn).map((log: any) => {
                    const dVal = log.date;
                    if (!dVal) return '';
                    if (dVal instanceof Date) {
                      try { return dVal.toISOString().split('T')[0]; } catch (e) { return ''; }
                    }
                    return String(dVal).split('T')[0];
                  }));
                  const totalDays = uniqueDates.size;
                  computedBasicPay = Number((totalDays * emp.basicSalary).toFixed(2));
                }
              } else {
                // Fallback graceful values: Hourly -> 80 hours, Daily -> 10 days
                const multiplier = emp.salaryType === 'hourly' ? 80 : 10;
                computedBasicPay = Number((multiplier * emp.basicSalary).toFixed(2));
              }
            } else if (emp.category === 'Visiting Instructor') {
              // Paid per unit or teaching hour. Look up DTR logs within the cycle period
              const dtrLogs = await db.prepare("SELECT * FROM dtr_logs WHERE employeeId = ? AND date >= ? AND date <= ?").all(emp.id, cycle.startDate, cycle.endDate) as any;
              let tHours = 0;

              if (dtrLogs.length > 0) {
                // Fetch the instructor's schedules
                const schedules = await db.prepare("SELECT * FROM schedules WHERE employeeId = ?").all(emp.id) as any;
                
                // Group dtrLogs by date
                const logsByDate: { [date: string]: any[] } = {};
                for (const log of dtrLogs) {
                  const dVal = log.date;
                  let dateKey = '';
                  if (dVal) {
                    if (dVal instanceof Date) {
                      try { dateKey = dVal.toISOString().split('T')[0]; } catch (e) {}
                    } else {
                      dateKey = String(dVal).split('T')[0];
                    }
                  }
                  if (!dateKey) continue;
                  if (!logsByDate[dateKey]) {
                    logsByDate[dateKey] = [];
                  }
                  logsByDate[dateKey].push(log);
                }

                let totalMinutes = 0;
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                for (const [dateStr, dayLogs] of Object.entries(logsByDate)) {
                  // Find day of week for this dateStr (YYYY-MM-DD)
                  const dateParts = dateStr.split('-');
                  if (dateParts.length < 3) continue;
                  const yr = Number(dateParts[0]);
                  const mo = Number(dateParts[1]);
                  const dy = Number(dateParts[2]);
                  const dt = new Date(yr, mo - 1, dy);
                  const dayName = daysOfWeek[dt.getDay()];

                  // Find schedules for this day
                  const matchingSchedules = schedules.filter((s: any) => {
                    const dateVal = dateStr.split('T')[0];
                    if (s.effectiveFrom && dateVal < s.effectiveFrom.split('T')[0]) return false;
                    if (s.effectiveTo && dateVal > s.effectiveTo.split('T')[0]) return false;

                    if (s.specificDate) {
                      const sDate = s.specificDate.split('T')[0];
                      return sDate === dateStr;
                    }
                    return s.dayOfWeek === dayName;
                  });

                  for (const sch of matchingSchedules) {
                    if (sch.startTime && sch.endTime) {
                      let sh = Number(sch.startTime.split(':')[0]);
                      let sm = Number(sch.startTime.split(':')[1] || 0);
                      if (sh > 0 && sh <= 6) sh += 12;

                      let eh = Number(sch.endTime.split(':')[0]);
                      let em = Number(sch.endTime.split(':')[1] || 0);
                      if (eh > 0 && eh <= 6) eh += 12;

                      const schedInMin = sh * 60 + sm;
                      const schedOutMin = eh * 60 + em;

                      // Calculate overlapping minutes
                      let overlapMin = 0;
                      for (const log of dayLogs) {
                        if (log.timeIn && log.timeOut) {
                          const inDate = new Date(log.timeIn);
                          const outDate = new Date(log.timeOut);
                          
                          const logInMin = inDate.getHours() * 60 + inDate.getMinutes();
                          const logOutMin = outDate.getHours() * 60 + outDate.getMinutes();

                          const overlapIn = Math.max(logInMin, schedInMin);
                          const overlapOut = Math.min(logOutMin, schedOutMin);
                          overlapMin += Math.max(0, overlapOut - overlapIn);
                        }
                      }

                      if (overlapMin > 0) {
                        const schedDuration = Math.max(0, schedOutMin - schedInMin);
                        totalMinutes += schedDuration;
                      }
                    }
                  }
                }

                tHours = Number((totalMinutes / 60).toFixed(2));
              }

              // Fallback to schedule-based calculation if no DTR logs found
              if (tHours === 0) {
                const schedules = await db.prepare("SELECT * FROM schedules WHERE employeeId = ?").all(emp.id) as any;
                if (schedules.length > 0) {
                  let totalScheduledHours = 0;
                  const start = new Date(cycle.startDate);
                  const end = new Date(cycle.endDate);
                  
                  const recurringSchedules = schedules.filter((s: any) => !s.specificDate);
                  const specificSchedules = schedules.filter((s: any) => s.specificDate);

                  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  let currentDate = new Date(start);
                  while (currentDate <= end) {
                    const dayName = daysOfWeek[currentDate.getDay()];
                    const dateStr = currentDate.toISOString().split('T')[0];
                    
                    const daySpecifics = specificSchedules.filter((s: any) => {
                      const dateOnly = dateStr.split('T')[0];
                      if (s.effectiveFrom && dateOnly < s.effectiveFrom.split('T')[0]) return false;
                      if (s.effectiveTo && dateOnly > s.effectiveTo.split('T')[0]) return false;
                      const sDate = s.specificDate ? s.specificDate.split('T')[0] : '';
                      return sDate === dateStr;
                    });

                    if (daySpecifics.length > 0) {
                      for (const sch of daySpecifics) {
                        if (sch.startTime && sch.endTime) {
                          let sh = Number(sch.startTime.split(':')[0]);
                          let sm = Number(sch.startTime.split(':')[1] || 0);
                          if (sh > 0 && sh <= 6) sh += 12;

                          let eh = Number(sch.endTime.split(':')[0]);
                          let em = Number(sch.endTime.split(':')[1] || 0);
                          if (eh > 0 && eh <= 6) eh += 12;

                          const diffHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                          totalScheduledHours += Math.max(0, diffHours);
                        }
                      }
                    } else {
                      const dayRecurring = recurringSchedules.filter((s: any) => {
                        const dateOnly = dateStr.split('T')[0];
                        if (s.effectiveFrom && dateOnly < s.effectiveFrom.split('T')[0]) return false;
                        if (s.effectiveTo && dateOnly > s.effectiveTo.split('T')[0]) return false;

                        return s.dayOfWeek === dayName;
                      });
                      for (const sch of dayRecurring) {
                        if (sch.startTime && sch.endTime) {
                          let sh = Number(sch.startTime.split(':')[0]);
                          let sm = Number(sch.startTime.split(':')[1] || 0);
                          if (sh > 0 && sh <= 6) sh += 12;

                          let eh = Number(sch.endTime.split(':')[0]);
                          let em = Number(sch.endTime.split(':')[1] || 0);
                          if (eh > 0 && eh <= 6) eh += 12;

                          const diffHours = (eh * 60 + em - (sh * 60 + sm)) / 60;
                          totalScheduledHours += Math.max(0, diffHours);
                        }
                      }
                    }

                    currentDate.setDate(currentDate.getDate() + 1);
                  }

                  tHours = Number(totalScheduledHours.toFixed(2));
                } else {
                  tHours = 30; // Fallback graceful value
                }
              }

              await db.prepare("UPDATE payroll_entries SET teachingHours = ? WHERE id = ?").run(tHours, entry.id);
              computedBasicPay = Number((tHours * emp.basicSalary).toFixed(2));
            } else {
              // Regular Employee - Salaries and Wages-2nd Tranche based on DTR
              let monthlyRate = emp.basicSalary;
              baseCyclePay = cycle.type === 'semi-monthly' ? (monthlyRate / 2) : monthlyRate;
              undertimeDeduction = 0.00;
              
              // Safe date format helper
              const formatToYYYYMMDD = (dVal: any): string => {
                if (!dVal) return '';
                if (dVal instanceof Date) {
                  const yr = dVal.getFullYear();
                  const mo = String(dVal.getMonth() + 1).padStart(2, '0');
                  const dy = String(dVal.getDate()).padStart(2, '0');
                  return `${yr}-${mo}-${dy}`;
                }
                return String(dVal).split('T')[0];
              };

              const startDateStr = formatToYYYYMMDD(cycle.startDate);
              const endDateStr = formatToYYYYMMDD(cycle.endDate);

              // Fetch DTR logs and schedules for calculation
              const schedules = await db.prepare("SELECT * FROM schedules WHERE employeeId = ?").all(emp.id) as any[];
              const dtrLogs = await db.prepare("SELECT * FROM dtr_logs WHERE employeeId = ? AND date >= ? AND date <= ?").all(emp.id, startDateStr, endDateStr) as any[];
              
              if (dtrLogs.length === 0) {
                computedBasicPay = 0.00;
                dynamicAbsences = baseCyclePay;
                undertimeDeduction = 0.00;
              } else {
                const [sYr, sMn, sDy] = startDateStr.split('-').map(Number);
                const [eYr, eMn, eDy] = endDateStr.split('-').map(Number);
                const start = new Date(sYr, sMn - 1, sDy);
                const end = new Date(eYr, eMn - 1, eDy);
                let currentDate = new Date(start);
                
                const daysOfWeekStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                let totalTardinessMinutes = 0;
                let totalAbsenceDays = 0;
                
                const holidayRows = await db.prepare("SELECT date FROM holidays").all() as any[];
                const holidayDates = new Set(holidayRows.map(h => h.date ? String(h.date).split('T')[0] : ''));

                // Group dtrLogs by date YYYY-MM-DD
                const logsByDate: { [dateStr: string]: any[] } = {};
                for (const log of dtrLogs) {
                  if (log.date) {
                    let logDateStr = '';
                    if (log.date instanceof Date) {
                      try { logDateStr = log.date.toISOString().split('T')[0]; } catch (e) {}
                    } else {
                      logDateStr = String(log.date).split('T')[0];
                    }
                    if (logDateStr) {
                      if (!logsByDate[logDateStr]) {
                        logsByDate[logDateStr] = [];
                      }
                      logsByDate[logDateStr].push(log);
                    }
                  }
                }

                while (currentDate <= end) {
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
                  
                  const dayOfWeek = currentDate.getDay();
                  const dayName = daysOfWeekStr[dayOfWeek];
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const isHoliday = holidayDates.has(dateStr);

                  const daySchedules = schedules.filter(sch => {
                    if (sch.specificDate) {
                      return sch.specificDate.split('T')[0] === dateStr;
                    }
                    return sch.dayOfWeek === dayName;
                  });

                  const hasSchedule = daySchedules.length > 0;
                  // If they have no explicit schedules at all, default to Mon-Fri as regular work days
                  const isWorkDay = hasSchedule || (!isWeekend && schedules.length === 0);

                  // Skip holidays in deduction calculations (regular employees are paid during holidays)
                  if (isHoliday && (!hasSchedule || daySchedules.every(s => !s.specificDate))) {
                    currentDate.setDate(currentDate.getDate() + 1);
                    continue;
                  }

                  if (isWorkDay) {
                    let amStartTimeStr = '08:00';
                    let amEndTimeStr = '12:00';
                    let pmStartTimeStr = '13:00';
                    let pmEndTimeStr = '17:00';

                    if (hasSchedule) {
                      const sortedSchedules = [...daySchedules].sort((a, b) => a.startTime.localeCompare(b.startTime));
                      let schedAm = null;
                      let schedPm = null;
                      if (sortedSchedules.length >= 2) {
                        schedAm = sortedSchedules[0];
                        schedPm = sortedSchedules[1];
                      } else if (sortedSchedules.length === 1) {
                        const firstSched = sortedSchedules[0];
                        const firstStartHour = Number(firstSched.startTime.split(':')[0]);
                        if (firstStartHour < 12) {
                          schedAm = firstSched;
                        } else {
                          schedPm = firstSched;
                        }
                      }

                      if (schedAm) {
                        amStartTimeStr = schedAm.startTime;
                        amEndTimeStr = schedAm.endTime;
                      } else {
                        amStartTimeStr = '00:00';
                        amEndTimeStr = '00:00';
                      }

                      if (schedPm) {
                        pmStartTimeStr = schedPm.startTime;
                        pmEndTimeStr = schedPm.endTime;
                      } else {
                        pmStartTimeStr = '00:00';
                        pmEndTimeStr = '00:00';
                      }
                    }

                    const getMinutesFromTime = (timeStr: string) => {
                      if (!timeStr || timeStr === '00:00') return 0;
                      let [h, m] = timeStr.split(':').map(Number);
                      if (h > 0 && h <= 6) h += 12;
                      return h * 60 + (m || 0);
                    };

                    const amStartMinutes = getMinutesFromTime(amStartTimeStr);
                    const amEndMinutes = getMinutesFromTime(amEndTimeStr);
                    const pmStartMinutes = getMinutesFromTime(pmStartTimeStr);
                    const pmEndMinutes = getMinutesFromTime(pmEndTimeStr);

                    const expectedMinutes = (amStartTimeStr !== '00:00' ? (amEndMinutes - amStartMinutes) : 0) +
                                            (pmStartTimeStr !== '00:00' ? (pmEndMinutes - pmStartMinutes) : 0);

                    const dayLogs = logsByDate[dateStr] || [];

                    if (dayLogs.length === 0) {
                      // Full absence on a work day
                      totalAbsenceDays += 1;
                    } else {
                      // Had punches, compute total worked overlap
                      const sorted = [...dayLogs].sort((a, b) => {
                        const aTime = a.timeIn ? new Date(a.timeIn).getTime() : 0;
                        const bTime = b.timeIn ? new Date(b.timeIn).getTime() : 0;
                        return aTime - bTime;
                      });

                      let amInDate: Date | null = null;
                      let amOutDate: Date | null = null;
                      let pmInDate: Date | null = null;
                      let pmOutDate: Date | null = null;

                      if (sorted.length >= 2) {
                        amInDate = sorted[0].timeIn ? new Date(sorted[0].timeIn) : null;
                        amOutDate = sorted[0].timeOut ? new Date(sorted[0].timeOut) : null;
                        pmInDate = sorted[1].timeIn ? new Date(sorted[1].timeIn) : null;
                        pmOutDate = sorted[1].timeOut ? new Date(sorted[1].timeOut) : null;
                      } else if (sorted.length === 1) {
                        const singleLog = sorted[0];
                        const inDate = singleLog.timeIn ? new Date(singleLog.timeIn) : null;
                        let isAmShift = true;
                        if (inDate) {
                          const hour = inDate.getHours();
                          if (hasSchedule) {
                            if (amStartTimeStr !== '00:00' && pmStartTimeStr === '00:00') {
                              isAmShift = true;
                            } else if (pmStartTimeStr !== '00:00' && amStartTimeStr === '00:00') {
                              isAmShift = false;
                            } else {
                              const amStartMin = getMinutesFromTime(amStartTimeStr);
                              const pmStartMin = getMinutesFromTime(pmStartTimeStr);
                              const logMin = hour * 60 + inDate.getMinutes();
                              isAmShift = Math.abs(logMin - amStartMin) < Math.abs(logMin - pmStartMin);
                            }
                          } else {
                            isAmShift = hour < 12;
                          }
                        }

                        if (isAmShift) {
                          amInDate = inDate;
                          amOutDate = singleLog.timeOut ? new Date(singleLog.timeOut) : null;
                        } else {
                          pmInDate = inDate;
                          pmOutDate = singleLog.timeOut ? new Date(singleLog.timeOut) : null;
                        }
                      }

                      let totalWorkedMinutes = 0;
                      const amStart = amStartTimeStr !== '00:00' ? amStartMinutes : 480;
                      const amEnd = amEndTimeStr !== '00:00' ? amEndMinutes : 720;
                      const pmStart = pmStartTimeStr !== '00:00' ? pmStartMinutes : 780;
                      const pmEnd = pmEndTimeStr !== '00:00' ? pmEndMinutes : 1020;

                      if (amInDate && amOutDate) {
                        const arrivalMin = amInDate.getHours() * 60 + amInDate.getMinutes();
                        const departureMin = amOutDate.getHours() * 60 + amOutDate.getMinutes();
                        const effectiveIn = Math.max(arrivalMin, amStart);
                        const effectiveOut = Math.min(departureMin, amEnd);
                        if (effectiveOut > effectiveIn) {
                          totalWorkedMinutes += (effectiveOut - effectiveIn);
                        }
                      }

                      if (pmInDate && pmOutDate) {
                        const arrivalMin = pmInDate.getHours() * 60 + pmInDate.getMinutes();
                        const departureMin = pmOutDate.getHours() * 60 + pmOutDate.getMinutes();
                        const effectiveIn = Math.max(arrivalMin, pmStart);
                        const effectiveOut = Math.min(departureMin, pmEnd);
                        if (effectiveOut > effectiveIn) {
                          totalWorkedMinutes += (effectiveOut - effectiveIn);
                        }
                      }

                      if (amInDate && pmOutDate && !amOutDate && !pmInDate) {
                        const arrivalMin = amInDate.getHours() * 60 + amInDate.getMinutes();
                        const departureMin = pmOutDate.getHours() * 60 + pmOutDate.getMinutes();
                        let totalSpan = departureMin - arrivalMin;
                        let worked = totalSpan - 60; // noon break (1 hour default)
                        const activeSchedDuration = (amEnd - amStart) + (pmEnd - pmStart);
                        worked = Math.min(worked, activeSchedDuration);
                        if (worked > 0) {
                          totalWorkedMinutes = worked;
                        }
                      }

                      const targetExp = expectedMinutes || 480;
                      if (totalWorkedMinutes < targetExp) {
                        totalTardinessMinutes += (targetExp - totalWorkedMinutes);
                      }
                    }
                  }
                  currentDate.setDate(currentDate.getDate() + 1);
                }

                // Hourly and minute rate derivation based on standard 22 working days monthly
                const hourlyRate = monthlyRate / (22 * 8);
                const minuteRate = hourlyRate / 60;
                undertimeDeduction = totalTardinessMinutes * minuteRate;

                // 22 working days in a month for daily rate equivalence
                const dailyRate = monthlyRate / 22;
                dynamicAbsences = Number((totalAbsenceDays * dailyRate).toFixed(2));

                computedBasicPay = Math.max(0, Number((baseCyclePay - undertimeDeduction - dynamicAbsences).toFixed(2)));
              }
            }
          }

          // Override Salaries/Wages dynamically if input is manual
          if (custom.compSal2nd !== undefined) {
            computedBasicPay = Number(custom.compSal2nd);
          } else if (custom.absences !== undefined) {
            computedBasicPay = Math.max(0, Number((baseCyclePay - undertimeDeduction - Number(custom.absences)).toFixed(2)));
          }

          // Save back computed basicPay to the payroll entry
          await db.prepare("UPDATE payroll_entries SET basicPay = ? WHERE id = ?").run(computedBasicPay, entry.id);

          // PERA (default is PHP 2,000.00)
          const compPera = custom.compPera !== undefined ? Number(custom.compPera) : 2000.00;

          // Absences deduction (default uses dynamic DTR computed value)
          const absences = custom.absences !== undefined ? Number(custom.absences) : dynamicAbsences;

          // Calculate overtime
          let computedOvertime = Number(entry.overtime || 0);
          if (emp && (emp.category === 'Regular Employee' || emp.category === 'Regular' || emp.category === 'FACULTY' || emp.category === 'STAFF')) {
            const otHours = Number(entry.otHours || 0);
            const monthlySalary = emp.basicSalary || 0;
            const hourlyRate = monthlySalary / (22 * 8);
            computedOvertime = Number((hourlyRate * otHours * 1.25).toFixed(2));
            await db.prepare("UPDATE payroll_entries SET overtime = ? WHERE id = ?").run(computedOvertime, entry.id);
          }

          // Gross Pay calculation (including PERA and other additions)
          let gross = computedBasicPay + compPera + Number(entry.allowances || 0) + computedOvertime + Number(entry.bonuses || 0);
          if (custom.compGross !== undefined) {
            gross = Number(custom.compGross);
          }

          // --- CALCULATE DEFAULTS & CUSTOM VALUES FOR ALL COLUMNS ---
          
          // Load active catalog deductions for this employee from the database
          const activeDeds = emp ? await db.prepare("SELECT type, amount FROM deductions WHERE employeeId = ?").all(emp.id) as any[] : [];
          
          const getDbDeduction = (field: string, defaultVal: number = 0.00) => {
            const mappings: { [key: string]: string[] } = {
              dedConsolLoan: ['consoloan', 'consol loan', 'consolidation loan', 'conso loan', 'consolidation', 'dedconsoloan'],
              dedEmergencyLoan: ['emrgyln', 'gsis emergency loan', 'emergency loan', 'emrgy ln', 'emrgy_ln', 'emergency_loan', 'dedemergencyloan'],
              dedGfal: ['gfal', 'gsis financial assistance loan', 'gsis financial assistance', 'gfal loan', 'dedgfal'],
              dedMpl: ['mpl', 'multipurpose loan', 'multi purpose loan', 'multi-purpose loan', 'mpl loan', 'dedmpl', 'gsis multipurpose loan'],
              dedCpl: ['cpl', 'computer purchase loan', 'computer loan', 'cpl loan', 'dedcpl', 'gsis computer loan', 'cpl_loan'],
              dedMplLite: ['mpllite', 'mpl_lite', 'mpl-lite', 'mpl_lite rlp', 'mplliterlp', 'mpl lite', 'multi-purpose loan lite', 'dedmpllite', 'mpl_lite_rlp'],
              dedEducAsst: ['educasst', 'educ_asst', 'educational assistance', 'educational assistance loan', 'educ asst', 'dededucasst', 'gsis educational assistance'],
              dedPolicyLoan: ['policyloan', 'policy loan', 'gsis policy loan', 'policy_loan', 'dedpolicyloan'],
              dedGsisPremPersonal: ['gsisprem', 'gsispersonal', 'gsisprempersonal', 'gsisEE', 'gsis personal', 'gsis contribution', 'gsis premium', 'gsis ee', 'dedgsisprempersonal', 'gsis prem personal', 'gsis personal share', 'gsis_prem', 'gsis personal premium'],
              dedPagibigPersonal: ['pagibigprem', 'pagibigpersonal', 'pagibigpersonalee', 'pagibigregular', 'pagibigee', 'hdmfpersonal', 'hdmfpersonalee', 'hdmfee', 'pagibig regular', 'pagibig personal', 'pagibig contribution', 'pagibig premium', 'pagibig ee', 'hdmf personal', 'hdmf contribution', 'hdmf ee', 'dedpagibigpersonal', 'pag-ibig personal', 'pag-ibig ee', 'pag-ibig regular', 'pagibig_prem', 'hdmf premium', 'pag-ibig personal(ee)'],
              dedPagibigMpl: ['pagibigmpl', 'pagibig_mpl', 'hdmf_mpl', 'pag-ibig mpl', 'dedpagibigmpl', 'hdmf mpl', 'pag-ibig mpl'],
              dedSss: ['sss', 'dedsss', 'sss contribution', 'sss premium', 'sss ee', 'sss_prem', 'sss share'],
              dedPagibigMp2: ['mp2', 'dedpagibigmp2', 'pagibig mp2', 'pag-ibig mp2', 'mp2 contribution', 'pagibig_mp2', 'hdmf mp2'],
              dedPhilhealthCont: ['philhealth', 'dedphilhealthcont', 'philhealth contribution', 'philhealth premium', 'philhealth ee', 'philhealth cont', 'philhealth_prem', 'ph_prem', 'phee', 'ph ee', 'philhealth ee share', 'philhealth cont.'],
              dedCsbLoan: ['csbloan', 'dedcsbloan', 'csb loan', 'csb', 'csbsalloan', 'csb sal loan'],
              dedTaxWithheld: ['tax', 'dedtaxwithheld', 'withholding tax', 'tax withheld', 'wtax', 'income tax', 'withholding_tax', 'tax_withheld', 'wtax withheld', 'withholding tax(ee)', 'taxwithheld']
            };
            const colKeys = mappings[field] || [];
            const matchedDeds = activeDeds.filter(d => {
              const dT = String(d.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return colKeys.some(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === dT);
            });
            if (matchedDeds.length > 0) {
              return matchedDeds.reduce((sum, d) => sum + Number(d.amount || 0), 0);
            }
            return defaultVal;
          };

          // A. Government Shares
          const isPhRegular = emp && (emp.category === 'Regular Employee' || emp.category === 'Regular' || emp.category === 'FACULTY' || emp.category === 'STAFF');
          const hasPh = isPhRegular || (emp && emp.category === 'Job Order' && emp.hasPhilhealth);
          const hasHdmf = isPhRegular || (emp && emp.category === 'Job Order' && emp.hasPagibig);

          const govSecGsis = custom.govSecGsis !== undefined ? Number(custom.govSecGsis) : (isPhRegular ? Number((computedBasicPay * 0.12).toFixed(2)) : 0.00);
          const govSecHdmf = custom.govSecHdmf !== undefined ? Number(custom.govSecHdmf) : (hasHdmf ? 200.00 : 0.00);
          const govSecPh = custom.govSecPh !== undefined ? Number(custom.govSecPh) : Number(((computedBasicPay * 0.05) / 2).toFixed(2));
          const govSecEcip = custom.govSecEcip !== undefined ? Number(custom.govSecEcip) : (isPhRegular ? 100.00 : 0.00);

          // B. GSIS Loans
          const dedPolicyLoan = custom.dedPolicyLoan !== undefined ? Number(custom.dedPolicyLoan) : getDbDeduction('dedPolicyLoan', 0.00);
          const dedConsolLoan = custom.dedConsolLoan !== undefined ? Number(custom.dedConsolLoan) : getDbDeduction('dedConsolLoan', 0.00);
          const dedMplLite = custom.dedMplLite !== undefined ? Number(custom.dedMplLite) : getDbDeduction('dedMplLite', 0.00);
          const dedMpl = custom.dedMpl !== undefined ? Number(custom.dedMpl) : getDbDeduction('dedMpl', 0.00);
          const dedCpl = custom.dedCpl !== undefined ? Number(custom.dedCpl) : getDbDeduction('dedCpl', 0.00);
          const dedGfal = custom.dedGfal !== undefined ? Number(custom.dedGfal) : getDbDeduction('dedGfal', 0.00);
          const dedEmergencyLoan = custom.dedEmergencyLoan !== undefined ? Number(custom.dedEmergencyLoan) : getDbDeduction('dedEmergencyLoan', 0.00);
          
          // GSIS PERSONAL (EE) - standard 9% of basic salary
          const dedGsisPremPersonal = custom.dedGsisPremPersonal !== undefined ? Number(custom.dedGsisPremPersonal) : 
            getDbDeduction('dedGsisPremPersonal', (emp && (emp.category === 'Regular Employee' || emp.category === 'Regular' || emp.category === 'FACULTY' || emp.category === 'STAFF') ? Number((computedBasicPay * 0.09).toFixed(2)) : 0.00));
            
          const dedEducAsst = custom.dedEducAsst !== undefined ? Number(custom.dedEducAsst) : getDbDeduction('dedEducAsst', 0.00);

          // C. Pag-IBIG Loans & EE
          const isPagibigRegular = emp && (emp.category === 'Regular Employee' || emp.category === 'Regular' || emp.category === 'FACULTY' || emp.category === 'STAFF');
          const hasPagibig = isPagibigRegular || (emp && emp.category === 'Job Order' && emp.hasPagibig);
          const dedPagibigPersonal = custom.dedPagibigPersonal !== undefined ? Number(custom.dedPagibigPersonal) : 
            getDbDeduction('dedPagibigPersonal', (hasPagibig ? Number((computedBasicPay * 0.02).toFixed(2)) : 0.00));
            
          const dedPagibigMpl = custom.dedPagibigMpl !== undefined ? Number(custom.dedPagibigMpl) : getDbDeduction('dedPagibigMpl', 0.00);

          // D. SSS
          const dedSss = custom.dedSss !== undefined ? Number(custom.dedSss) : 
            getDbDeduction('dedSss', (emp && emp.category === 'Job Order' && emp.hasSss ? Number((computedBasicPay * 0.045).toFixed(2)) : 0.00));

          // E. PhilHealth Contribution (PHILHLTH CONT) - standard 2.5% of basic salary EE share
          const dedPagibigMp2 = custom.dedPagibigMp2 !== undefined ? Number(custom.dedPagibigMp2) : getDbDeduction('dedPagibigMp2', 0.00);
          const dedPhilhealthCont = custom.dedPhilhealthCont !== undefined ? Number(custom.dedPhilhealthCont) : 
            getDbDeduction('dedPhilhealthCont', (emp && (emp.category === 'Regular Employee' || emp.category === 'Regular' || emp.category === 'FACULTY' || emp.category === 'STAFF') ? Number((computedBasicPay * 0.025).toFixed(2)) : 
             (emp && emp.category === 'Job Order' && emp.hasPhilhealth ? Number((computedBasicPay * 0.025).toFixed(2)) : 0.00)));

          // F. Other Loans and Tax
          const dedCsbLoan = custom.dedCsbLoan !== undefined ? Number(custom.dedCsbLoan) : getDbDeduction('dedCsbLoan', 0.00);

          // Default Withholding tax (TRAIN Law standard or override)
          let taxVal = 0;
          if (gross > 666666) taxVal = 183541.67 + (gross - 666666) * 0.35;
          else if (gross > 166667) taxVal = 33541.67 + (gross - 166667) * 0.30;
          else if (gross > 66667) taxVal = 8541.67 + (gross - 66667) * 0.25;
          else if (gross > 33333) taxVal = 1875 + (gross - 33333) * 0.20;
          else if (gross > 20833) taxVal = (gross - 20833) * 0.15;
          
          const dedTaxWithheld = custom.dedTaxWithheld !== undefined ? Number(custom.dedTaxWithheld) : getDbDeduction('dedTaxWithheld', Number(taxVal.toFixed(2)));

          // Sum all personal deductions
          const sumDeductions = Number((dedPolicyLoan + dedConsolLoan + dedMplLite + dedMpl + dedCpl + dedGfal + dedEmergencyLoan + 
            dedGsisPremPersonal + dedEducAsst + dedPagibigPersonal + dedPagibigMpl + dedSss + dedPagibigMp2 + 
            dedPhilhealthCont + dedCsbLoan + dedTaxWithheld).toFixed(2));

          const net = Number((gross - sumDeductions).toFixed(2));

          // Map all details into the deductions_json block
          const deductionsMap = {
            govSecGsis,
            govSecHdmf,
            govSecPh,
            govSecEcip,
            compSal2nd: computedBasicPay,
            compPera,
            absences,
            dedPolicyLoan,
            dedConsolLoan,
            dedMplLite,
            dedMpl,
            dedCpl,
            dedGfal,
            dedEmergencyLoan,
            dedGsisPremPersonal,
            dedEducAsst,
            dedPagibigPersonal,
            dedPagibigMpl,
            dedSss,
            dedPagibigMp2,
            dedPhilhealthCont,
            dedCsbLoan,
            dedTaxWithheld
          };

          await db.prepare(`
            UPDATE payroll_entries SET 
              grossPay = ?, 
              deductions_json = ?, 
              totalDeductions = ?, 
              netPay = ?,
              govSecGsis = ?,
              govSecHdmf = ?,
              govSecPh = ?,
              govSecEcip = ?,
              compSal2nd = ?,
              compPera = ?,
              compGross = ?,
              absences = ?,
              dedPolicyLoan = ?,
              dedConsolLoan = ?,
              dedMplLite = ?,
              dedMpl = ?,
              dedCpl = ?,
              dedGfal = ?,
              dedEmergencyLoan = ?,
              dedGsisPremPersonal = ?,
              dedEducAsst = ?,
              dedPagibigPersonal = ?,
              dedPagibigMpl = ?,
              dedSss = ?,
              dedPagibigMp2 = ?,
              dedPhilhealthCont = ?,
              dedCsbLoan = ?,
              dedTaxWithheld = ?
            WHERE id = ?
          `).run(
            gross, 
            JSON.stringify(deductionsMap), 
            sumDeductions, 
            net,
            govSecGsis,
            govSecHdmf,
            govSecPh,
            govSecEcip,
            computedBasicPay, // compSal2nd
            compPera,
            gross, // compGross
            absences,
            dedPolicyLoan,
            dedConsolLoan,
            dedMplLite,
            dedMpl,
            dedCpl,
            dedGfal,
            dedEmergencyLoan,
            dedGsisPremPersonal,
            dedEducAsst,
            dedPagibigPersonal,
            dedPagibigMpl,
            dedSss,
            dedPagibigMp2,
            dedPhilhealthCont,
            dedCsbLoan,
            dedTaxWithheld,
            entry.id
          );

          totalGross = Number((totalGross + gross).toFixed(2));
          totalDeductions = Number((totalDeductions + sumDeductions).toFixed(2));
          totalNet = Number((totalNet + net).toFixed(2));
        }

        await db.prepare("UPDATE payroll_cycles SET totalGross = ?, totalDeductions = ?, totalNet = ? WHERE id = ?").run(totalGross, totalDeductions, totalNet, cycleId);
    } catch (error) {
      throw error;
    }
  };

  // Auth
  app.post("/api/auth/login", asyncHandler(async (req: any, res: any) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password; // No trim for password

    let user = await db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail) as any;
    
    if (!user) {
      const employee = await db.prepare("SELECT * FROM employees WHERE LOWER(email) = ?").get(cleanEmail) as any;
      if (employee) {
        const id = employee.id;
        await db.prepare("INSERT OR REPLACE INTO users (id, email, password, displayName, role, profileImage) VALUES (?, ?, ?, ?, ?, ?)").run(
          id, employee.email, employee.password, `${employee.firstName} ${employee.lastName}`, 'employee', employee.profileImage || ''
        );
        user = await db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
      }
    }

    if (user) {
      if (user.password === cleanPassword) {
        await logAudit({ ...req, headers: { ...req.headers, 'x-user-id': user.id, 'x-user-email': user.email } }, 'USER_LOGIN_SUCCESS', `User logged in successfully: ${user.displayName} (${user.role})`);
        const { password: _, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      } else {
        await logAudit(req, 'USER_LOGIN_FAILED', `Failed login attempt for ${cleanEmail}: Invalid password`);
        return res.status(401).json({ error: "Invalid password" });
      }
    } else {
      await logAudit(req, 'USER_LOGIN_FAILED', `Failed login attempt for ${cleanEmail}: User not found`);
      return res.status(401).json({ error: "User not found" });
    }
  }));

  // Employees
  app.get("/api/employees", asyncHandler(async (req: any, res: any) => {
    const employees = await db.prepare("SELECT * FROM employees ORDER BY lastName ASC, firstName ASC").all();
    res.json(employees);
  }));

  app.post("/api/employees", asyncHandler(async (req: any, res: any) => {
    const { employeeId, firstName, lastName, email, password, category, basicSalary, salaryType, phoneNumber, hasSss, hasPhilhealth, hasPagibig, bpno, mi, prefix, appellation, birthDate, crn, effectivityDate, position, gender, profileImage, employeeNo } = req.body;
    const id = `emp-${Date.now()}`;
    const keySss = hasSss ? 1 : 0;
    const keyPh = hasPhilhealth ? 1 : 0;
    const keyPi = hasPagibig ? 1 : 0;
    const finalEmployeeId = employeeId || bpno || id;
    try {
      await db.transaction(async () => {
        let finalGender = gender || 'MALE';
        if (!gender) {
          const lName = (lastName || '').toUpperCase().trim();
          const fName = (firstName || '').toUpperCase().trim();
          const femaleLastNames = [
            'AGAD', 'ALMINE', 'BATIANCILA', 'BRUN', 'BUGAIS-PAGOBO', 'CABERTE', 'CAPAPAS', 
            'CARBONILLA', 'CRUZADA', 'CUENCO', 'CUPAT', 'CUTA', 'MARUCOT', 'MEMBREVE', 'NUÑEZ', 
            'ORIAS', 'PAUG', 'PERNITES', 'PIAMONTE', 'PLANA', 'ROSOLADA', 'TIIN', 'DE LA CRUZ',
            'SALUDSOD'
          ];
          if (lName === 'SINAHON') {
            if (fName.includes('CHRESTIAN') || fName.includes('JEDE')) {
              finalGender = 'FEMALE';
            }
          } else if (femaleLastNames.includes(lName) || fName.includes('MARY') || fName.includes('FEMALE')) {
            finalGender = 'FEMALE';
          }
        }

        await db.prepare(`INSERT INTO employees (
          id, employeeId, firstName, lastName, email, password, category, basicSalary, salaryType, phoneNumber, hasSss, hasPhilhealth, hasPagibig,
          bpno, mi, prefix, appellation, birthDate, crn, effectivityDate, position, gender, profileImage, employeeNo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          id, finalEmployeeId, firstName, lastName, email, password, category, basicSalary, salaryType || 'monthly', phoneNumber || '09171234567', keySss, keyPh, keyPi,
          bpno || '', mi || '', prefix || '', appellation || '', birthDate || '', crn || '', effectivityDate || '', position || '', finalGender, profileImage || '', employeeNo || ''
        );
        await db.prepare("INSERT OR REPLACE INTO users (id, email, password, displayName, role, profileImage) VALUES (?, ?, ?, ?, ?, ?)").run(
          id, email, password, `${firstName} ${lastName}`, 'employee', profileImage || ''
        );
      })();
      res.json({ id, ...req.body, employeeId: finalEmployeeId });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "BPNO/Employee ID or Email already exists" });
      else throw error;
    }
  }));

  app.post("/api/employees/bulk", asyncHandler(async (req: any, res: any) => {
    const { employees } = req.body;
    if (!Array.isArray(employees)) {
      return res.status(400).json({ error: "Invalid data: employees list is required" });
    }

    const inserted: any[] = [];
    const skipped: any[] = [];

    try {
      await db.transaction(async () => {
        for (const emp of employees) {
          const {
            employeeId,
            firstName,
            lastName,
            email,
            password,
            category,
            basicSalary,
            salaryType,
            phoneNumber,
            hasSss,
            hasPhilhealth,
            hasPagibig,
            bpno,
            mi,
            prefix,
            appellation,
            birthDate,
            crn,
            effectivityDate,
            position,
            gender,
            employeeNo
          } = emp;

          // Check if employeeId already exists using employees table
          const finalEmployeeId = employeeId || bpno || `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const existingEmployee = await db.prepare("SELECT id FROM employees WHERE employeeId = ?").get(finalEmployeeId);
          if (existingEmployee) {
            skipped.push({ employeeId: finalEmployeeId, reason: "Duplicate employee ID/BPNO" });
            continue;
          }

          const id = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          const keySss = hasSss ? 1 : 0;
          const keyPh = hasPhilhealth ? 1 : 0;
          const keyPi = hasPagibig ? 1 : 0;

          let finalGender = gender || 'MALE';
          if (!gender) {
            const lName = (lastName || '').toUpperCase().trim();
            const fName = (firstName || '').toUpperCase().trim();
            const femaleLastNames = [
              'AGAD', 'ALMINE', 'BATIANCILA', 'BRUN', 'BUGAIS-PAGOBO', 'CABERTE', 'CAPAPAS', 
              'CARBONILLA', 'CRUZADA', 'CUENCO', 'CUPAT', 'CUTA', 'MARUCOT', 'MEMBREVE', 'NUÑEZ', 
              'ORIAS', 'PAUG', 'PERNITES', 'PIAMONTE', 'PLANA', 'ROSOLADA', 'TIIN', 'DE LA CRUZ',
              'SALUDSOD'
            ];
            if (lName === 'SINAHON') {
              if (fName.includes('CHRESTIAN') || fName.includes('JEDE')) {
                finalGender = 'FEMALE';
              }
            } else if (femaleLastNames.includes(lName) || fName.includes('MARY') || fName.includes('FEMALE')) {
              finalGender = 'FEMALE';
            }
          }

          await db.prepare(`INSERT INTO employees (
            id, employeeId, firstName, lastName, email, password, category, basicSalary, salaryType, phoneNumber, status, hasSss, hasPhilhealth, hasPagibig,
            bpno, mi, prefix, appellation, birthDate, crn, effectivityDate, position, gender, employeeNo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, finalEmployeeId, firstName, lastName, email, password, category || 'Regular Employee', basicSalary || 0, salaryType || 'monthly', phoneNumber || '09171234567',
            keySss, keyPh, keyPi,
            bpno || '', mi || '', prefix || '', appellation || '', birthDate || '', crn || '', effectivityDate || '', position || '', finalGender, employeeNo || ''
          );

          await db.prepare("INSERT OR REPLACE INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(
            id, email, password, `${firstName} ${lastName}`, 'employee'
          );

          inserted.push({ employeeId, firstName, lastName });
        }
      })();

      await logAudit(req, 'EMPLOYEES_BULK_UPLOAD', `Successfully imported ${inserted.length} employees, skipped ${skipped.length}`);
      res.json({ success: true, count: inserted.length, skipped });
    } catch (error: any) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: error.message || "Bulk upload failed" });
    }
  }));

  app.put("/api/employees/:id", asyncHandler(async (req: any, res: any) => {
    const { employeeId, firstName, lastName, email, password, category, basicSalary, salaryType, status, phoneNumber, hasSss, hasPhilhealth, hasPagibig, bpno, mi, prefix, appellation, birthDate, crn, effectivityDate, position, gender, profileImage, employeeNo } = req.body;
    const keySss = hasSss ? 1 : 0;
    const keyPh = hasPhilhealth ? 1 : 0;
    const keyPi = hasPagibig ? 1 : 0;
    const finalEmployeeId = employeeId || bpno || req.params.id;
    try {
      await db.transaction(async () => {
        let empQuery = "UPDATE employees SET employeeId = ?, firstName = ?, lastName = ?, email = ?, category = ?, basicSalary = ?, salaryType = ?, status = ?, phoneNumber = ?, hasSss = ?, hasPhilhealth = ?, hasPagibig = ?, bpno = ?, mi = ?, prefix = ?, appellation = ?, birthDate = ?, crn = ?, effectivityDate = ?, position = ?, gender = ?, profileImage = ?, employeeNo = ?";
        let empParams: any[] = [
          finalEmployeeId, firstName, lastName, email, category, basicSalary, salaryType || 'monthly', status, phoneNumber || '09171234567',
          keySss, keyPh, keyPi,
          bpno || '', mi || '', prefix || '', appellation || '', birthDate || '', crn || '', effectivityDate || '', position || '', gender || 'MALE', profileImage || '', employeeNo || '',
        ];
        if (password?.trim()) {
          empQuery += ", password = ?";
          empParams.push(password);
        }
        empQuery += " WHERE id = ?";
        empParams.push(req.params.id);
        await db.prepare(empQuery).run(...empParams);

        let userQuery = "UPDATE users SET email = ?, displayName = ?, profileImage = ?";
        let userParams: any[] = [email, `${firstName} ${lastName}`, profileImage || ''];
        if (password?.trim()) {
          userQuery += ", password = ?";
          userParams.push(password);
        }
        userQuery += " WHERE id = ?";
        userParams.push(req.params.id);
        await db.prepare(userQuery).run(...userParams);
      })();
      res.json({ id: req.params.id, ...req.body, employeeId: finalEmployeeId });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "BPNO/Employee ID already exists" });
      else throw error;
    }
  }));

  app.delete("/api/employees/delete/all", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        await db.prepare("DELETE FROM users WHERE role = 'employee'").run();
        await db.prepare("DELETE FROM employees").run();
        await db.prepare("DELETE FROM deductions").run();
      })();
      await logAudit(req, 'EMPLOYEES_DELETE_ALL', `Successfully deleted all employees in the system.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete all employees error:", error);
      res.status(500).json({ error: error.message });
    }
  }));

  app.delete("/api/employees/:id", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        await db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
        await db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      throw error;
    }
  }));

  app.get("/api/employees/:id/payroll-history", asyncHandler(async (req: any, res: any) => {
    const entries = await db.prepare(`
      SELECT pe.*, pc.name as cycleName, pc.startDate, pc.endDate 
      FROM payroll_entries pe
      JOIN payroll_cycles pc ON pe.cycleId = pc.id
      WHERE pe.employeeId = ?
      ORDER BY pc.startDate ASC
    `).all(req.params.id) as any;
    res.json(entries.map((e: any) => ({ ...e, deductions: e.deductions_json ? JSON.parse(e.deductions_json) : {} })));
  }));

  app.get("/api/employees/:id/deduction-history", asyncHandler(async (req: any, res: any) => {
    const deductions = await db.prepare("SELECT * FROM deductions WHERE employeeId = ? ORDER BY createdAt ASC").all(req.params.id);
    res.json(deductions);
  }));

  // Deductions
  app.get("/api/deductions", asyncHandler(async (req: any, res: any) => {
    const deductions = await db.prepare("SELECT * FROM deductions ORDER BY createdAt ASC").all();
    res.json(deductions);
  }));

  app.post("/api/deductions", asyncHandler(async (req: any, res: any) => {
    const { employeeId, type, description, amount } = req.body;
    const id = `ded-${Date.now()}`;
    await db.prepare("INSERT INTO deductions (id, employeeId, type, description, amount) VALUES (?, ?, ?, ?, ?)").run(
      id, employeeId, type, description, amount
    );
    res.json({ id, ...req.body });
  }));

  app.put("/api/deductions/:id", asyncHandler(async (req: any, res: any) => {
    const { employeeId, type, description, amount } = req.body;
    await db.prepare("UPDATE deductions SET employeeId = ?, type = ?, description = ?, amount = ? WHERE id = ?").run(
      employeeId, type, description, amount, req.params.id
    );
    res.json({ id: req.params.id, ...req.body });
  }));

  app.post("/api/deductions/bulk", asyncHandler(async (req: any, res: any) => {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: "Request body must be an array of deductions." });
    }

    let insertedCount = 0;
    try {
      await db.transaction(async () => {
        // Fetch existing deduction types
        const exTypesList = await db.prepare("SELECT name FROM deduction_types").all() as any[];
        const exTypes = new Set(exTypesList.map(t => String(t.name).trim().toLowerCase()));

        for (const item of list) {
          const { employeeId, type, description, amount } = item;
          if (!employeeId || !type || amount === undefined) continue;

          const cleanType = String(type).trim();
          const typeKey = cleanType.toLowerCase();
          if (!exTypes.has(typeKey)) {
            const typeId = `dt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await db.prepare("INSERT OR IGNORE INTO deduction_types (id, name, description) VALUES (?, ?, ?)").run(
              typeId, cleanType, `${cleanType} (Auto-created during Excel import)`
            );
            exTypes.add(typeKey);
          }

          const id = `ded-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
          await db.prepare("INSERT INTO deductions (id, employeeId, type, description, amount) VALUES (?, ?, ?, ?, ?)").run(
            id, employeeId, cleanType, description || 'Imported deduction', Number(amount || 0)
          );
          insertedCount++;
        }
      })();
      res.json({ success: true, count: insertedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to import deductions." });
    }
  }));

  app.delete("/api/deductions", asyncHandler(async (req: any, res: any) => {
    await db.prepare("DELETE FROM deductions").run();
    res.json({ success: true });
  }));

  app.delete("/api/deductions/:id", asyncHandler(async (req: any, res: any) => {
    await db.prepare("DELETE FROM deductions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  }));

  app.delete("/api/deductions/employee/:employeeId", asyncHandler(async (req: any, res: any) => {
    await db.prepare("DELETE FROM deductions WHERE employeeId = ?").run(req.params.employeeId);
    res.json({ success: true });
  }));

  // Deduction Types
  app.get("/api/deduction-types", asyncHandler(async (req: any, res: any) => {
    const types = await db.prepare("SELECT * FROM deduction_types ORDER BY name ASC").all();
    res.json(types);
  }));

  app.post("/api/deduction-types", asyncHandler(async (req: any, res: any) => {
    const { name, description } = req.body;
    const id = `dt-${Date.now()}`;
    try {
      await db.prepare("INSERT INTO deduction_types (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
      res.json({ id, name, description });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Deduction type already exists" });
      else throw error;
    }
  }));

  app.put("/api/deduction-types/:id", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        const { name, description } = req.body;
        const oldType = await db.prepare("SELECT name FROM deduction_types WHERE id = ?").get(req.params.id) as any;
        await db.prepare("UPDATE deduction_types SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
        if (oldType && oldType.name !== name) {
          await db.prepare("UPDATE deductions SET type = ? WHERE type = ?").run(name, oldType.name);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Deduction type name already exists" });
      else throw error;
    }
  }));

  app.delete("/api/deduction-types/:id", asyncHandler(async (req: any, res: any) => {
    const type = await db.prepare("SELECT name FROM deduction_types WHERE id = ?").get(req.params.id) as any;
    if (type) {
      const counts = await db.prepare("SELECT COUNT(*) as count FROM deductions WHERE type = ?").get(type.name) as any;
      if (counts.count > 0) return res.status(400).json({ error: "Cannot delete deduction type that is currently in use" });
    }
    await db.prepare("DELETE FROM deduction_types WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  }));

  // Employee Categories
  app.get("/api/employee-categories", asyncHandler(async (req: any, res: any) => {
    const categories = await db.prepare("SELECT * FROM employee_categories ORDER BY name ASC").all();
    res.json(categories);
  }));

  app.post("/api/employee-categories", asyncHandler(async (req: any, res: any) => {
    const { name, description } = req.body;
    const id = `cat-${Date.now()}`;
    try {
      await db.prepare("INSERT INTO employee_categories (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
      res.json({ id, name, description });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Category already exists" });
      else throw error;
    }
  }));

  app.put("/api/employee-categories/:id", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        const { name, description } = req.body;
        const oldCat = await db.prepare("SELECT name FROM employee_categories WHERE id = ?").get(req.params.id) as any;
        await db.prepare("UPDATE employee_categories SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
        if (oldCat && oldCat.name !== name) {
          await db.prepare("UPDATE employees SET category = ? WHERE category = ?").run(name, oldCat.name);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Category name already exists" });
      else throw error;
    }
  }));

  app.delete("/api/employee-categories/:id", asyncHandler(async (req: any, res: any) => {
    const cat = await db.prepare("SELECT name FROM employee_categories WHERE id = ?").get(req.params.id) as any;
    if (cat) {
      const counts = await db.prepare("SELECT COUNT(*) as count FROM employees WHERE category = ?").get(cat.name) as any;
      if (counts.count > 0) return res.status(400).json({ error: "Cannot delete category that is currently assigned to employees" });
    }
    await db.prepare("DELETE FROM employee_categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  }));

  // Employee Positions
  app.get("/api/employee-positions", asyncHandler(async (req: any, res: any) => {
    const positions = await db.prepare("SELECT * FROM employee_positions ORDER BY name ASC").all();
    res.json(positions);
  }));

  app.post("/api/employee-positions", asyncHandler(async (req: any, res: any) => {
    const { name, description } = req.body;
    const id = `pos-${Date.now()}`;
    try {
      await db.prepare("INSERT INTO employee_positions (id, name, description) VALUES (?, ?, ?)").run(id, name, description);
      res.json({ id, name, description });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Position already exists" });
      else throw error;
    }
  }));

  app.put("/api/employee-positions/:id", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        const { name, description } = req.body;
        const oldPos = await db.prepare("SELECT name FROM employee_positions WHERE id = ?").get(req.params.id) as any;
        await db.prepare("UPDATE employee_positions SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
        if (oldPos && oldPos.name !== name) {
          await db.prepare("UPDATE employees SET position = ? WHERE position = ?").run(name, oldPos.name);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Position name already exists" });
      else throw error;
    }
  }));

  app.delete("/api/employee-positions/:id", asyncHandler(async (req: any, res: any) => {
    const pos = await db.prepare("SELECT name FROM employee_positions WHERE id = ?").get(req.params.id) as any;
    if (pos) {
      const counts = await db.prepare("SELECT COUNT(*) as count FROM employees WHERE position = ?").get(pos.name) as any;
      if (counts.count > 0) return res.status(400).json({ error: "Cannot delete position that is currently assigned to employees" });
    }
    await db.prepare("DELETE FROM employee_positions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  }));

  // Schedules
  app.get("/api/schedules", asyncHandler(async (req: any, res: any) => {
    const schedules = await db.prepare(`
      SELECT s.*, e.firstName, e.lastName, e.category 
      FROM schedules s
      JOIN employees e ON s.employeeId = e.id
      ORDER BY e.lastName ASC, s.dayOfWeek ASC, s.startTime ASC
    `).all();
    res.json(schedules);
  }));

  app.get("/api/schedules/employee/:id", asyncHandler(async (req: any, res: any) => {
    const schedules = await db.prepare(`
      SELECT s.*, e.firstName, e.lastName, e.category 
      FROM schedules s
      JOIN employees e ON s.employeeId = e.id
      WHERE s.employeeId = ? 
      ORDER BY s.dayOfWeek ASC, s.startTime ASC
    `).all(req.params.id);
    res.json(schedules);
  }));

  app.post("/api/schedules", asyncHandler(async (req: any, res: any) => {
    const { employeeId, dayOfWeek, startTime, endTime, subject, room, specificDate, effectiveFrom, effectiveTo } = req.body;
    const id = `sch-${Date.now()}`;
    await db.prepare(`
      INSERT INTO schedules (id, employeeId, dayOfWeek, startTime, endTime, subject, room, specificDate, effectiveFrom, effectiveTo) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, employeeId, dayOfWeek, startTime, endTime, subject, room, specificDate || null, effectiveFrom || null, effectiveTo || null);
    await autoRecalculatePayrollForEmployee(employeeId);
    res.json({ id, success: true });
  }));

  app.put("/api/schedules/:id", asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { employeeId, dayOfWeek, startTime, endTime, subject, room, specificDate, effectiveFrom, effectiveTo } = req.body;
    await db.prepare(`
      UPDATE schedules 
      SET employeeId = ?, dayOfWeek = ?, startTime = ?, endTime = ?, subject = ?, room = ?, specificDate = ?, effectiveFrom = ?, effectiveTo = ?
      WHERE id = ?
    `).run(employeeId, dayOfWeek, startTime, endTime, subject, room, specificDate || null, effectiveFrom || null, effectiveTo || null, id);
    await autoRecalculatePayrollForEmployee(employeeId);
    res.json({ success: true });
  }));

  app.delete("/api/schedules/:id", asyncHandler(async (req: any, res: any) => {
    const sch = await db.prepare("SELECT employeeId FROM schedules WHERE id = ?").get(req.params.id) as any;
    if (sch) {
      await db.prepare("DELETE FROM schedules WHERE id = ?").run(req.params.id);
      await autoRecalculatePayrollForEmployee(sch.employeeId);
    }
    res.json({ success: true });
  }));

  // Payroll Cycles
  app.get("/api/payroll-cycles", asyncHandler(async (req: any, res: any) => {
    // Auto-process draft cycles that have ended in the background
    const today = getManilaDate();
    const endedCycles = await db.prepare("SELECT id FROM payroll_cycles WHERE status = 'draft' AND endDate <= ?").all(today) as any;
    for (const cycle of endedCycles) {
      try {
        await recalculateCycle(cycle.id);
        await db.prepare("UPDATE payroll_cycles SET status = 'completed' WHERE id = ?").run(cycle.id);
        await db.prepare("UPDATE payroll_entries SET status = 'processed' WHERE cycleId = ?").run(cycle.id);
      } catch (error) {
        console.error(`Failed to auto-process cycle ${cycle.id}:`, error);
      }
    }

    const cycles = await db.prepare("SELECT * FROM payroll_cycles ORDER BY startDate ASC").all();
    res.json(cycles);
  }));

  app.post("/api/payroll-cycles", asyncHandler(async (req: any, res: any) => {
    try {
      const { name, startDate, endDate, type, categoryFilter } = req.body;
      const cleanCategoryFilter = categoryFilter || 'all';
      const cycleId = `cycle-${Date.now()}`;
      
      await db.transaction(async () => {
        await db.prepare("INSERT INTO payroll_cycles (id, name, startDate, endDate, type, categoryFilter) VALUES (?, ?, ?, ?, ?, ?)").run(
          cycleId, name, startDate, endDate, type || 'all', cleanCategoryFilter
        );
        
        let employeesQuery = "SELECT * FROM employees WHERE status = 'active'";
        let params: any[] = [];
        
        if (type && type !== 'all') {
          employeesQuery += " AND salaryType = ?";
          params.push(type);
        }

        if (cleanCategoryFilter === 'faculty-staff') {
          employeesQuery += " AND (category = 'FACULTY' OR category = 'STAFF')";
        } else if (cleanCategoryFilter === 'visiting-instructor') {
          employeesQuery += " AND category = 'Visiting Instructor'";
        } else if (cleanCategoryFilter === 'job-order') {
          employeesQuery += " AND category = 'Job Order'";
        }
        
        const employees = await db.prepare(employeesQuery).all(...params) as any;
        const cycleType = type || 'all';
        
        for (const emp of employees) {
          let basicPay = Number(emp.basicSalary || 0);
          if (cycleType !== 'monthly' && emp.salaryType === 'monthly') {
            basicPay = basicPay / 2;
          }
          
          await db.prepare("INSERT INTO payroll_entries (id, cycleId, employeeId, employeeName, basicPay, grossPay, netPay) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
            `entry-${Date.now()}-${emp.id}`, cycleId, emp.id, `${emp.lastName}, ${emp.firstName}`, basicPay, basicPay, basicPay
          );
        }
      })();
      
      await recalculateCycle(cycleId);
      res.json({ id: cycleId, name, startDate, endDate, type: type || 'all', categoryFilter: cleanCategoryFilter });
    } catch (error: any) {
      throw error;
    }
  }));

  app.get("/api/payroll-cycles/:id/entries", asyncHandler(async (req: any, res: any) => {
    const cycle = await db.prepare("SELECT status FROM payroll_cycles WHERE id = ?").get(req.params.id) as any;
    if (cycle && cycle.status === 'draft') {
      await recalculateCycle(req.params.id);
    }
    const entries = await db.prepare(`
      SELECT pe.*, COALESCE(NULLIF(e.employeeNo, ''), e.employeeId) as friendlyEmployeeId, e.category, e.basicSalary, e.salaryType, e.hasSss, e.hasPhilhealth, e.hasPagibig, e.bpno, e.firstName, e.lastName, e.position, e.gender
      FROM payroll_entries pe
      JOIN employees e ON pe.employeeId = e.id
      WHERE pe.cycleId = ?
    `).all(req.params.id) as any;
    res.json(entries.map((e: any) => ({ 
      ...e, 
      deductions: e.deductions_json ? JSON.parse(e.deductions_json) : {},
      customValues: e.custom_values_json ? JSON.parse(e.custom_values_json) : {}
    })));
  }));

  app.post("/api/payroll-cycles/:id/import-deductions", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    const cycle = await db.prepare("SELECT status, type FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    if (!cycle) return res.status(404).json({ error: "Payroll cycle not found" });
    if (cycle.status !== 'draft') {
      return res.status(400).json({ error: "Deductions can only be imported for draft payroll cycles." });
    }

    const updates = req.body; // Expect an array of { id: string, employeeId?: string, customValues: { ... } }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: "Request body must be an array of updates." });
    }

    const cycleType = cycle.type || 'all';

    await db.transaction(async () => {
      for (const update of updates) {
        const { id, employeeId, customValues } = update;
        let targetEntryId = id;

        // Strip prefix if any client-side template prefix is present
        const cleanId = String(id || '');
        let targetEmpId = employeeId;
        
        if (cleanId.startsWith("new-emp-") || cleanId.startsWith("auto-add-")) {
          targetEmpId = cleanId.replace("new-emp-", "").replace("auto-add-", "");
          targetEntryId = null;
        }

        if (!targetEntryId && targetEmpId) {
          // Check if an entry for this employee already exists in this cycle
          const existing = await db.prepare("SELECT id FROM payroll_entries WHERE cycleId = ? AND employeeId = ?").get(cycleId, targetEmpId) as any;
          if (existing) {
            targetEntryId = existing.id;
          } else {
            // Find employee details to create high-integrity payroll_entry
            const emp = await db.prepare("SELECT * FROM employees WHERE id = ?").get(targetEmpId) as any;
            if (emp) {
              let basicPay = Number(emp.basicSalary || 0);
              if (cycleType !== 'monthly' && emp.salaryType === 'monthly') {
                basicPay = basicPay / 2;
              }
              const newEntryId = `entry-${Date.now()}-${Math.floor(Math.random() * 1000000)}-${emp.id}`;
              await db.prepare("INSERT INTO payroll_entries (id, cycleId, employeeId, employeeName, basicPay, grossPay, netPay) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
                newEntryId, cycleId, emp.id, `${emp.lastName}, ${emp.firstName}`, basicPay, basicPay, basicPay
              );
              targetEntryId = newEntryId;
            }
          }
        }

        if (!targetEntryId) continue;

        // Apply customValues overrides
        const entry = await db.prepare("SELECT custom_values_json FROM payroll_entries WHERE id = ? AND cycleId = ?").get(targetEntryId, cycleId) as any;
        if (!entry) continue;

        const currentCustom = entry.custom_values_json ? JSON.parse(entry.custom_values_json) : {};
        const mergedCustom = { ...currentCustom, ...customValues };
        
        await db.prepare("UPDATE payroll_entries SET custom_values_json = ? WHERE id = ?").run(
          JSON.stringify(mergedCustom),
          targetEntryId
        );
      }
    })();

    await recalculateCycle(cycleId);
    res.json({ success: true, count: updates.length });
  }));

  app.put("/api/payroll-entries/:id", asyncHandler(async (req: any, res: any) => {
    const entry = await db.prepare("SELECT * FROM payroll_entries WHERE id = ?").get(req.params.id) as any;
    if (!entry) return res.status(404).json({ error: "Payroll entry not found" });

    const keyMap = ['overtime', 'bonuses', 'allowances', 'otHours', 'incentives', 'teachingHours', 'basicPay'];
    const updates: string[] = [];
    const values: any[] = [];

    for (const key of keyMap) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (updates.length > 0) {
      values.push(req.params.id);
      await db.prepare(`UPDATE payroll_entries SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (req.body.customValues !== undefined) {
      const currentCustom = entry.custom_values_json ? JSON.parse(entry.custom_values_json) : {};
      const mergedCustom = { ...currentCustom, ...req.body.customValues };
      await db.prepare("UPDATE payroll_entries SET custom_values_json = ? WHERE id = ?").run(JSON.stringify(mergedCustom), req.params.id);
    }

    await recalculateCycle(entry.cycleId);
    res.json({ success: true });
  }));

  app.delete("/api/payroll-entries/:id", asyncHandler(async (req: any, res: any) => {
    const entry = await db.prepare("SELECT cycleId FROM payroll_entries WHERE id = ?").get(req.params.id) as any;
    await db.prepare("DELETE FROM payroll_entries WHERE id = ?").run(req.params.id);
    if (entry) await recalculateCycle(entry.cycleId);
    res.json({ success: true });
  }));

  app.post("/api/payroll-cycles/:id/add-employee", asyncHandler(async (req: any, res: any) => {
    const { employeeId } = req.body;
    const cycleId = req.params.id;
    const existingEntry = await db.prepare("SELECT id FROM payroll_entries WHERE cycleId = ? AND employeeId = ?").get(cycleId, employeeId);
    if (existingEntry) return res.status(400).json({ error: "Employee already in this payroll cycle" });

    const emp = await db.prepare("SELECT * FROM employees WHERE id = ?").get(employeeId) as any;
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const cycle = await db.prepare("SELECT type FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    const cycleType = cycle?.type || 'all';

    let basicPay = Number(emp.basicSalary || 0);
    if (cycleType !== 'monthly' && emp.salaryType === 'monthly') {
      basicPay = basicPay / 2;
    }

    try {
      await db.prepare("INSERT INTO payroll_entries (id, cycleId, employeeId, employeeName, basicPay, grossPay, netPay) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        `entry-${Date.now()}-${emp.id}`, cycleId, emp.id, `${emp.lastName}, ${emp.firstName}`, basicPay, basicPay, basicPay
      );
      await recalculateCycle(cycleId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Add Employee to Cycle Error:", error);
      res.status(500).json({ error: error.message });
    }
  }));

  app.post("/api/payroll-cycles/:id/process", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    await recalculateCycle(cycleId);
    await db.prepare("UPDATE payroll_cycles SET status = 'completed' WHERE id = ?").run(cycleId);
    await db.prepare("UPDATE payroll_entries SET status = 'processed' WHERE cycleId = ?").run(cycleId);
    
    const cycle = await db.prepare("SELECT name FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    await logAudit(req, 'PROCESS_PAYROLL_CYCLE', `Processed payroll cycle "${cycle?.name || cycleId}" (ID: ${cycleId})`);
    res.json({ success: true });
  }));

  app.post("/api/payroll-cycles/:id/revert", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    await db.prepare("UPDATE payroll_cycles SET status = 'draft' WHERE id = ?").run(cycleId);
    await db.prepare("UPDATE payroll_entries SET status = 'pending' WHERE cycleId = ?").run(cycleId);
    
    const cycle = await db.prepare("SELECT name FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    await logAudit(req, 'REVERT_PAYROLL_CYCLE', `Reverted payroll cycle "${cycle?.name || cycleId}" back to draft status.`);
    res.json({ success: true });
  }));

  app.post("/api/payroll-cycles/:id/disburse", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    await db.prepare("UPDATE payroll_cycles SET status = 'disbursed' WHERE id = ?").run(cycleId);
    
    const cycle = await db.prepare("SELECT name FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    await logAudit(req, 'DISBURSE_PAYROLL_CYCLE', `Funds disbursed for payroll cycle "${cycle?.name || cycleId}" (ID: ${cycleId})`);

    // Gather entries and send SMS notifications
    try {
      const entries = await db.prepare("SELECT * FROM payroll_entries WHERE cycleId = ?").all(cycleId) as any;
      for (const entry of entries) {
        await triggerSMS(
          entry.employeeId, 
          `SLSU Payroll Alert: Your salary/allowance for "${cycle?.name || 'Current Period'}" has been disbursed. Gross Pay: ₱${Number(entry.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}, Deductions: ₱${Number(entry.totalDeductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}, Net payout: ₱${Number(entry.netPay).toLocaleString('en-US', { minimumFractionDigits: 2 })}. Thank you.`
        );
      }
    } catch (err) {
      console.error("Failed to trigger disbursement SMS:", err);
    }

    res.json({ success: true });
  }));

  app.delete("/api/payroll-cycles/:id", asyncHandler(async (req: any, res: any) => {
    try {
      await db.transaction(async () => {
        await db.prepare("DELETE FROM payroll_entries WHERE cycleId = ?").run(req.params.id);
        await db.prepare("DELETE FROM payroll_cycles WHERE id = ?").run(req.params.id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      throw error;
    }
  }));

  // History
  app.get("/api/history", asyncHandler(async (req: any, res: any) => {
    const employees = await db.prepare("SELECT id, 'employee' as type, CONCAT(firstName, ' ', lastName) as title, createdAt as date FROM employees").all() as any;
    const cycles = await db.prepare("SELECT id, 'payroll' as type, name as title, createdAt as date, totalNet as amount FROM payroll_cycles").all() as any;
    const deductions = await db.prepare("SELECT id, 'deduction' as type, description as title, createdAt as date, amount FROM deductions").all() as any;
    const allEvents = [...employees, ...cycles, ...deductions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(allEvents);
  }));
  // DTR (Daily Time Record)
  app.post("/api/dtr/manual", asyncHandler(async (req: any, res: any) => {
    const { employeeId, date, timeIn, timeOut, notes } = req.body;
    if (!employeeId || !date || !timeIn) {
      return res.status(400).json({ error: "Employee, Date, and Time In are required" });
    }

    const id = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const fullTimeIn = `${date}T${timeIn}:00`;
    const fullTimeOut = timeOut ? `${date}T${timeOut}:00` : null;

    try {
      await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
        id, employeeId, date, fullTimeIn, fullTimeOut, notes || ''
      );
      await autoRecalculatePayrollForEmployee(employeeId);
      res.json({ id, success: true });
    } catch (error: any) {
      console.error("Manual DTR Log Error:", error);
      res.status(500).json({ error: error.message });
    }
  }));

  app.post("/api/dtr/simulate", asyncHandler(async (req: any, res: any) => {
    const { employeeId, year, month } = req.body;
    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "employeeId, year, and month are required" });
    }

    const employee = await db.prepare("SELECT * FROM employees WHERE id = ?").get(employeeId) as any;
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const category = employee.category || "Regular Employee";
    const yearMonthStr = `${year}-${String(month).padStart(2, "0")}`;

    await db.prepare("DELETE FROM dtr_logs WHERE employeeId = ? AND date LIKE ?").run(employeeId, `${yearMonthStr}%`);

    const schedules = await db.prepare("SELECT * FROM schedules WHERE employeeId = ?").all(employeeId) as any[];

    const parseTo24Hour = (timeStr: string) => {
      if (!timeStr) return { hour: 0, minute: 0 };
      let [h, m] = timeStr.split(":").map(Number);
      if (h > 0 && h <= 6) h += 12;
      return { hour: h, minute: m || 0 };
    };

    const get24HourTimeStr = (tStr: string) => {
      if (!tStr) return "";
      let [h, m] = tStr.split(":").map(Number);
      if (h > 0 && h <= 6) h += 12;
      const mm = m || 0;
      return `${h < 10 ? "0" + h : h}:${mm < 10 ? "0" + mm : mm}`;
    };

    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
    let count = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(Number(year), Number(month) - 1, day);
      const dayOfWeek = dateObj.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const daysOfWeekStr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = daysOfWeekStr[dayOfWeek];

      const daySchedules = schedules.filter((sch: any) => {
        const dateVal = dateStr;
        if (sch.effectiveFrom && dateVal < sch.effectiveFrom.split("T")[0]) return false;
        if (sch.effectiveTo && dateVal > sch.effectiveTo.split("T")[0]) return false;

        if (sch.specificDate) {
          const sDate = sch.specificDate.split("T")[0];
          return sDate === dateStr;
        }
        return sch.dayOfWeek === dayName;
      });

      if (category === "Job Order") {
        const inHour = 8;
        const inMin = Math.floor(Math.random() * 10);
        const outHour = 11;
        const outMin = Math.floor(Math.random() * 5);

        const pmInHour = 13;
        const pmInMin = Math.floor(Math.random() * 10);
        const pmOutHour = 17;
        const pmOutMin = Math.floor(Math.random() * 10);

        const amInStr = `${String(inHour).padStart(2, "0")}:${String(inMin).padStart(2, "0")}`;
        const amOutStr = `${String(outHour).padStart(2, "0")}:${String(outMin).padStart(2, "0")}`;
        const pmInStr = `${String(pmInHour).padStart(2, "0")}:${String(pmInMin).padStart(2, "0")}`;
        const pmOutStr = `${String(pmOutHour).padStart(2, "0")}:${String(pmOutMin).padStart(2, "0")}`;

        const amId = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
          amId, employeeId, dateStr, `${dateStr}T${amInStr}:00`, `${dateStr}T${amOutStr}:00`, "AM shift"
        );

        const pmId = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
          pmId, employeeId, dateStr, `${dateStr}T${pmInStr}:00`, `${dateStr}T${pmOutStr}:00`, "PM shift"
        );
        count += 2;
      } else if (category === "Visiting Instructor") {
        if (daySchedules.length === 0) continue;

        for (const sch of daySchedules) {
          if (sch.startTime && sch.endTime) {
            let [sh, sm] = sch.startTime.split(":").map(Number);
            let [eh, em] = sch.endTime.split(":").map(Number);

            const arrivalOffset = Math.floor(Math.random() * 6) - 3;
            let minutesIn = sm + arrivalOffset;
            let hourIn = sh;
            if (minutesIn < 0) { minutesIn = 60 + minutesIn; hourIn -= 1; }
            if (minutesIn >= 60) { minutesIn = minutesIn - 60; hourIn += 1; }

            const departureOffset = Math.floor(Math.random() * 5);
            let minutesOut = em + departureOffset;
            let hourOut = eh;
            if (minutesOut >= 60) { minutesOut = minutesOut - 60; hourOut += 1; }

            const inStr = `${String(hourIn).padStart(2, "0")}:${String(minutesIn).padStart(2, "0")}`;
            const outStr = `${String(hourOut).padStart(2, "0")}:${String(minutesOut).padStart(2, "0")}`;

            const visId = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
              visId, employeeId, dateStr, `${dateStr}T${inStr}:00`, `${dateStr}T${outStr}:00`, `Simulated: ${sch.subject || "Class"}`
            );
            count++;
          }
        }
      } else {
        const schedAm = daySchedules.find(s => get24HourTimeStr(s.startTime) < "12:00");
        const schedPm = daySchedules.find(s => get24HourTimeStr(s.startTime) >= "12:00");

        let amStartStr = "08:00";
        let amEndStr = "11:00";
        let pmStartStr = "13:00";
        let pmEndStr = "17:00";

        if (schedAm) {
          amStartStr = schedAm.startTime;
          amEndStr = schedAm.endTime;
        } else if (daySchedules.length > 0) {
          amStartStr = "00:00";
          amEndStr = "00:00";
        }

        if (schedPm) {
          pmStartStr = schedPm.startTime;
          pmEndStr = schedPm.endTime;
        } else if (daySchedules.length > 0) {
          pmStartStr = "00:00";
          pmEndStr = "00:00";
        }

        let amInStr = "";
        let amOutStr = "";
        if (amStartStr !== "00:00" && amEndStr !== "00:00") {
          const { hour: ash, minute: asm } = parseTo24Hour(amStartStr);
          const amInOffset = Math.floor(Math.random() * 15) - 10;
          let amInMin = asm + amInOffset;
          let amInHour = ash;
          if (amInMin < 0) { amInMin = 60 + amInMin; amInHour -= 1; }
          amInStr = `${String(amInHour).padStart(2, "0")}:${String(amInMin).padStart(2, "0")}`;

          const { hour: aeh, minute: aem } = parseTo24Hour(amEndStr);
          const amOutOffset = Math.floor(Math.random() * 6);
          let amOutMin = aem + amOutOffset;
          let amOutHour = aeh;
          amOutStr = `${String(amOutHour).padStart(2, "0")}:${String(amOutMin).padStart(2, "0")}`;
        }

        let pmInStr = "";
        let pmOutStr = "";
        if (pmStartStr !== "00:00" && pmEndStr !== "00:00") {
          const { hour: psh, minute: psm } = parseTo24Hour(pmStartStr);
          const pmInOffset = Math.floor(Math.random() * 12) - 5;
          let pmInMin = psm + pmInOffset;
          let pmInHour = psh;
          if (pmInMin < 0) { pmInMin = 60 + pmInMin; pmInHour -= 1; }
          pmInStr = `${String(pmInHour).padStart(2, "0")}:${String(pmInMin).padStart(2, "0")}`;

          const { hour: peh, minute: pem } = parseTo24Hour(pmEndStr);
          const isUndertime = Math.random() < 0.08;
          const pmOutOffset = isUndertime ? -30 : Math.floor(Math.random() * 12);
          let pmOutMin = pem + pmOutOffset;
          let pmOutHour = peh;
          if (pmOutMin < 0) { pmOutMin = 60 + pmOutMin; pmOutHour -= 1; }
          pmOutStr = `${String(pmOutHour).padStart(2, "0")}:${String(pmOutMin).padStart(2, "0")}`;
        }

        if (amInStr && amOutStr) {
          const amId = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
            amId, employeeId, dateStr, `${dateStr}T${amInStr}:00`, `${dateStr}T${amOutStr}:00`, "Automated AM punch"
          );
          count++;
        }

        if (pmInStr && pmOutStr) {
          const pmId = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, timeOut, notes) VALUES (?, ?, ?, ?, ?, ?)").run(
            pmId, employeeId, dateStr, `${dateStr}T${pmInStr}:00`, `${dateStr}T${pmOutStr}:00`, "Automated PM punch"
          );
          count++;
        }
      }
    }

    await autoRecalculatePayrollForEmployee(employeeId);

    res.json({ success: true, count });
  }));

  app.delete("/api/dtr/:id", asyncHandler(async (req: any, res: any) => {
    const log = await db.prepare("SELECT employeeId FROM dtr_logs WHERE id = ?").get(req.params.id) as any;
    if (log) {
      await db.prepare("DELETE FROM dtr_logs WHERE id = ?").run(req.params.id);
      await autoRecalculatePayrollForEmployee(log.employeeId);
    }
    res.json({ success: true });
  }));

  app.delete("/api/dtr/clear/:employeeId/:yearMonth", asyncHandler(async (req: any, res: any) => {
    const { employeeId, yearMonth } = req.params;
    await db.prepare("DELETE FROM dtr_logs WHERE employeeId = ? AND date LIKE ?").run(employeeId, `${yearMonth}%`);
    await autoRecalculatePayrollForEmployee(employeeId);
    res.json({ success: true });
  }));
  // Users
  app.get("/api/users", asyncHandler(async (req: any, res: any) => {
    const users = await db.prepare("SELECT id, email, displayName, role, createdAt FROM users ORDER BY displayName ASC").all();
    res.json(users);
  }));

  app.post("/api/users", asyncHandler(async (req: any, res: any) => {
    const { email, password, displayName, role } = req.body;
    const id = `user-${Date.now()}`;
    try {
      await db.prepare("INSERT INTO users (id, email, password, displayName, role) VALUES (?, ?, ?, ?, ?)").run(id, email, password, displayName, role);
      res.json({ id, email, displayName, role });
    } catch (error: any) {
      if (error.message && error.message.includes('UNIQUE constraint failed')) res.status(400).json({ error: "Email already exists" });
      else throw error;
    }
  }));

  app.put("/api/users/:id", asyncHandler(async (req: any, res: any) => {
    const { email, password, displayName, role } = req.body;
    let query = "UPDATE users SET email = ?, displayName = ?, role = ?";
    let params: any[] = [email, displayName, role];
    if (password?.trim()) {
      query += ", password = ?";
      params.push(password);
    }
    query += " WHERE id = ?";
    params.push(req.params.id);
    await db.prepare(query).run(...params);
    res.json({ success: true });
  }));

  app.delete("/api/users/:id", asyncHandler(async (req: any, res: any) => {
    await db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  }));

  app.get("/api/profile", asyncHandler(async (req: any, res: any) => {
    const email = req.query.email as string;
    const user = await db.prepare("SELECT id, email, displayName, role, profileImage FROM users WHERE email = ?").get(email) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === 'employee') {
      const emp = await db.prepare("SELECT * FROM employees WHERE email = ?").get(email) as any;
      return res.json({ ...user, ...emp, profileImage: emp?.profileImage || user?.profileImage || '' });
    }
    res.json(user);
  }));

  let cachedSuccessfulUrl: string | null = null;

  app.get("/api/slsu-logo.png", asyncHandler(async (req: any, res: any) => {
    const tryFetch = async (targetUrl: string) => {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "SLSU-InformationSystem/1.0 (contact: caturanchristian@gmail.com; school portal development)"
        }
      });
      if (!response.ok) {
        throw new Error(`Returned status ${response.status}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType && !contentType.includes("image")) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      return response;
    };

    // 1. Try Cached Successful URL
    if (cachedSuccessfulUrl) {
      try {
        const response = await tryFetch(cachedSuccessfulUrl);
        const buffer = await response.arrayBuffer();
        res.setHeader("Content-Type", response.headers.get("content-type") || "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(buffer));
      } catch (err: any) {
        console.warn(`Cached logo URL failed: ${cachedSuccessfulUrl}. Retrying query logic. Error: ${err.message}`);
        cachedSuccessfulUrl = null;
      }
    }

    // 2. Try Wikipedia PageImage API
    try {
      const wikiApiUrl = "https://en.wikipedia.org/w/api.php?action=query&titles=Southern_Leyte_State_University&prop=pageimages&format=json&pithumbsize=300";
      const wikiRes = await fetch(wikiApiUrl, {
        headers: { "User-Agent": "SLSU-InformationSystem/1.0 (contact: caturanchristian@gmail.com; school portal development)" }
      });
      if (wikiRes.ok) {
        const data = await wikiRes.json() as any;
        const pages = data?.query?.pages;
        if (pages) {
          const pageId = Object.keys(pages)[0];
          const sourceUrl = pages[pageId]?.thumbnail?.source;
          if (sourceUrl) {
            console.log("Found Wikipedia SLSU seal URL through API:", sourceUrl);
            const imgRes = await tryFetch(sourceUrl);
            const buffer = await imgRes.arrayBuffer();
            cachedSuccessfulUrl = sourceUrl;
            res.setHeader("Content-Type", imgRes.headers.get("content-type") || "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(Buffer.from(buffer));
          }
        }
      }
    } catch (apiErr: any) {
      console.warn("Wikipedia PageImage API lookup failed:", apiErr.message);
    }

    // 3. Try standard Wikipedia and external list with Special:FilePath
    const urls = [
      "https://en.wikipedia.org/wiki/Special:FilePath/Southern_Leyte_State_University_seal.png?width=300",
      "https://en.wikipedia.org/wiki/Special:FilePath/Southern_Leyte_State_University_logo.png?width=300",
      "https://upload.wikimedia.org/wikipedia/en/c/cb/Southern_Leyte_State_University_seal.png",
      "https://upload.wikimedia.org/wikipedia/commons/e/e3/Southern_Leyte_State_University_seal.png",
      "https://www.southernleytestateu.edu.ph/images/SLSU_Seal.png",
      "https://southernleytestateu.edu.ph/images/SLSU_Seal.png"
    ];

    for (const url of urls) {
      try {
        const response = await tryFetch(url);
        const buffer = await response.arrayBuffer();
        cachedSuccessfulUrl = url;
        console.log(`Successfully fetched and cached SLSU logo from: ${url}`);
        res.setHeader("Content-Type", response.headers.get("content-type") || "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(Buffer.from(buffer));
      } catch (err: any) {
        console.warn(`Failed to fetch SLSU logo candidate: ${url} - Error: ${err.message}`);
      }
    }

    // 4. Ultimate Golden SVG Fallback (Guaranteed to succeed, offline compatible, matches SLSU branding perfectly)
    console.warn("All external SLSU logo URL sources failed. Reverting to elegant built-in SLSU vector crest.");
    const collegeSealSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
        <!-- Outer Circular Shield with Deep Blue and Gold Border -->
        <circle cx="100" cy="100" r="95" fill="#1e3a8a" stroke="#d97706" stroke-width="6" />
        <circle cx="100" cy="100" r="82" fill="none" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4,4" />
        
        <!-- Golden Side Laurels representing scholastic achievement -->
        <path d="M 50,140 Q 30,100 50,60" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        <path d="M 150,140 Q 170,100 150,60" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
        
        <!-- Academic open book at center background -->
        <path d="M 70,110 Q 100,100 100,120 Q 100,100 130,110 L 130,135 Q 100,125 100,145 Q 100,125 70,135 Z" fill="#ffffff" stroke="#1e3a8a" stroke-width="2" />
        <line x1="100" y1="120" x2="100" y2="145" stroke="#1e3a8a" stroke-width="2" />
        
        <!-- Torch handle -->
        <path d="M 96,95 L 104,95 L 102,110 L 98,110 Z" fill="#d97706" stroke="#fbbf24" stroke-width="0.5" />
        
        <!-- Double flame representing knowledge and service -->
        <path d="M 100,74 Q 88,88 100,95 Q 112,88 100,74" fill="#ef4444" />
        <path d="M 100,81 Q 94,88 100,95 Q 106,88 100,81" fill="#fbbf24" />
        
        <!-- 3 Gold Stars symbolizing core missions -->
        <polygon points="100,48 102,53 107,53 103,56 105,61 100,58 95,61 97,56 93,53 98,53" fill="#fbbf24" />
        <polygon points="75,56 77,61 82,61 78,64 80,69 75,66 70,69 72,64 68,61 73,61" fill="#fbbf24" />
        <polygon points="125,56 127,61 132,61 128,64 130,69 125,66 120,69 122,64 118,61 123,61" fill="#fbbf24" />
        
        <!-- Circular and straight typography labels -->
        <text x="100" y="32" font-family="'Inter', system-ui, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle" letter-spacing="1">SLSU</text>
        <text x="100" y="163" font-family="'Inter', system-ui, sans-serif" font-weight="700" font-size="8" fill="#fbbf24" text-anchor="middle">SOUTHERN LEYTE</text>
        <text x="100" y="172" font-family="'Inter', system-ui, sans-serif" font-weight="700" font-size="8" fill="#fbbf24" text-anchor="middle">STATE UNIVERSITY</text>
        <text x="100" y="183" font-family="'Inter', system-ui, sans-serif" font-weight="500" font-size="6" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">EST. 2004</text>
      </svg>
    `;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(collegeSealSvg.trim());
  }));

  app.put("/api/profile", asyncHandler(async (req: any, res: any) => {
    const { email, displayName, password, firstName, lastName, phoneNumber, profileImage } = req.body;
    try {
      await db.transaction(async () => {
        const user = await db.prepare("SELECT id, role FROM users WHERE email = ?").get(email) as any;
        if (!user) throw new Error("User not found");
        
        let userQuery = "UPDATE users SET displayName = ?";
        let userParams: any[] = [displayName];
        if (profileImage !== undefined) {
          userQuery += ", profileImage = ?";
          userParams.push(profileImage);
        }
        if (password?.trim()) {
          userQuery += ", password = ?";
          userParams.push(password);
        }
        userQuery += " WHERE id = ?";
        userParams.push(user.id);
        await db.prepare(userQuery).run(...userParams);
        
        if (user.role === 'employee') {
          let empQuery = "UPDATE employees SET firstName = ?, lastName = ?, phoneNumber = ?";
          let empParams: any[] = [firstName, lastName, phoneNumber || '09171234567'];
          if (profileImage !== undefined) {
            empQuery += ", profileImage = ?";
            empParams.push(profileImage);
          }
          if (password?.trim()) {
            empQuery += ", password = ?";
            empParams.push(password);
          }
          empQuery += " WHERE id = ?";
          empParams.push(user.id);
          await db.prepare(empQuery).run(...empParams);
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === "User not found") return res.status(404).json({ error: error.message });
      throw error;
    }
  }));

  app.get("/api/my-payroll", asyncHandler(async (req: any, res: any) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const employee = await db.prepare("SELECT id FROM employees WHERE LOWER(email) = ?").get(email.toLowerCase()) as any;
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    const entries = await db.prepare(`
         SELECT pe.*, pc.name as cycleName, pc.startDate, pc.endDate 
         FROM payroll_entries pe
         JOIN payroll_cycles pc ON pe.cycleId = pc.id
         WHERE pe.employeeId = ? AND pc.status = 'disbursed'
         ORDER BY pc.startDate ASC
       `).all(employee.id) as any;
    res.json(entries.map((e: any) => ({ ...e, deductions: e.deductions_json ? JSON.parse(e.deductions_json) : {} })));
  }));

  app.get("/api/my-sms-logs", asyncHandler(async (req: any, res: any) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const employee = await db.prepare("SELECT id FROM employees WHERE LOWER(email) = ?").get(email.toLowerCase()) as any;
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    const logs = await db.prepare("SELECT * FROM sms_logs WHERE employeeId = ? ORDER BY createdAt ASC").all(employee.id);
    res.json(logs);
  }));

  // DTR (Daily Time Record)
  app.get("/api/dtr", asyncHandler(async (req: any, res: any) => {
    const logs = await db.prepare(`
      SELECT d.*, e.firstName, e.lastName, e.employeeId as displayId
      FROM dtr_logs d
      JOIN employees e ON d.employeeId = e.id
      ORDER BY d.date ASC, d.timeIn ASC
    `).all();
    res.json(logs);
  }));

  app.get("/api/dtr/employee/:id", asyncHandler(async (req: any, res: any) => {
    const logs = await db.prepare("SELECT * FROM dtr_logs WHERE employeeId = ? ORDER BY date ASC, timeIn ASC").all(req.params.id);
    res.json(logs);
  }));

  app.get("/api/dtr/status/:employeeId", asyncHandler(async (req: any, res: any) => {
    const log = await db.prepare("SELECT * FROM dtr_logs WHERE employeeId = ? AND date = ? AND timeOut IS NULL").get(req.params.employeeId, getManilaDate());
    res.json(log || null);
  }));

  app.post("/api/dtr/clock-in", asyncHandler(async (req: any, res: any) => {
    const { employeeId, notes } = req.body;
    const today = getManilaDate();
    const now = getManilaTime();
    
    // Check if already clocked in
    const existing = await db.prepare("SELECT id FROM dtr_logs WHERE employeeId = ? AND date = ? AND timeOut IS NULL").get(employeeId, today);
    if (existing) return res.status(400).json({ error: "Already clocked in" });

    const id = `dtr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await db.prepare("INSERT INTO dtr_logs (id, employeeId, date, timeIn, notes) VALUES (?, ?, ?, ?, ?)").run(id, employeeId, today, now, notes || '');
    await autoRecalculatePayrollForEmployee(employeeId);
    
    // Send simulated SMS
    try {
      await triggerSMS(employeeId, `SLSU DTR Alert: Clocked IN on ${today} at ${format12Hour(now)}.`);
    } catch (e) {
      console.error(e);
    }

    res.json({ id, status: 'clocked-in' });
  }));

  app.post("/api/dtr/clock-out", asyncHandler(async (req: any, res: any) => {
    const { employeeId } = req.body;
    const now = getManilaTime();
    const today = getManilaDate();

    const log = await db.prepare("SELECT id FROM dtr_logs WHERE employeeId = ? AND date = ? AND timeOut IS NULL").get(employeeId, today) as any;
    if (!log) return res.status(404).json({ error: "No active clock-in found for today" });

    await db.prepare("UPDATE dtr_logs SET timeOut = ? WHERE id = ?").run(now, log.id);
    await autoRecalculatePayrollForEmployee(employeeId);
    await logAudit(req, 'DTR_CLOCK_OUT', `Employee ID: ${employeeId} clocked out successfully.`);

    // Send simulated SMS
    try {
      await triggerSMS(employeeId, `SLSU DTR Alert: Clocked OUT on ${today} at ${format12Hour(now)}.`);
    } catch (e) {
      console.error(e);
    }

    res.json({ success: true, status: 'clocked-out' });
  }));

  // Accountant & Batch management
  app.post("/api/payroll-cycles/:id/approve", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    const cycle = await db.prepare("SELECT name FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    if (!cycle) return res.status(404).json({ error: "Payroll cycle not found" });

    await db.prepare("UPDATE payroll_cycles SET status = 'approved' WHERE id = ?").run(cycleId);
    await logAudit(req, 'APPROVE_PAYROLL_CYCLE', `Approved payroll cycle "${cycle.name}" (ID: ${cycleId})`);
    res.json({ success: true });
  }));

  app.post("/api/payroll-cycles/:id/reject", asyncHandler(async (req: any, res: any) => {
    const cycleId = req.params.id;
    const cycle = await db.prepare("SELECT name FROM payroll_cycles WHERE id = ?").get(cycleId) as any;
    if (!cycle) return res.status(404).json({ error: "Payroll cycle not found" });

    await db.prepare("UPDATE payroll_cycles SET status = 'rejected' WHERE id = ?").run(cycleId);
    await logAudit(req, 'REJECT_PAYROLL_CYCLE', `Rejected payroll cycle "${cycle.name}" (ID: ${cycleId})`);
    res.json({ success: true });
  }));

  app.post("/api/payroll-entries/:id/validate", asyncHandler(async (req: any, res: any) => {
    const entryId = req.params.id;
    const { isValidated } = req.body;
    const entry = await db.prepare("SELECT employeeName, cycleId FROM payroll_entries WHERE id = ?").get(entryId) as any;
    if (!entry) return res.status(404).json({ error: "Payroll entry not found" });

    await db.prepare("UPDATE payroll_entries SET isValidated = ? WHERE id = ?").run(isValidated ? 1 : 0, entryId);
    
    const label = isValidated ? 'VALIDATED' : 'UNVALIDATED';
    await logAudit(req, 'VALIDATE_PAYROLL_ENTRY', `${isValidated ? 'Validated' : 'Removed validation from'} computation for employee "${entry.employeeName}" (ID: ${entryId})`);
    res.json({ success: true, isValidated: !!isValidated });
  }));

  app.get("/api/reports/financial", asyncHandler(async (req: any, res: any) => {
    // Totals across all disbursed or approved payroll cycles
    const summary = await db.prepare(`
      SELECT 
        SUM(totalGross) as totalGross, 
        SUM(totalDeductions) as totalDeductions, 
        SUM(totalNet) as totalNet,
        COUNT(*) as totalBatches
      FROM payroll_cycles
      WHERE status IN ('approved', 'disbursed', 'completed')
    `).get() as any;

    // Monthly breakdown
    const cycles = await db.prepare(`
      SELECT id, name, startDate, endDate, totalGross, totalDeductions, totalNet, status, type
      FROM payroll_cycles
      ORDER BY startDate ASC
    `).all() as any;

    // Parse all payroll entries deductions to generate a cumulative sum of tax, PhilHealth, Pag-IBIG, SSS, loans, etc.
    const entries = await db.prepare(`
      SELECT pe.deductions_json, pe.basicPay, pe.overtime, pe.bonuses, pe.grossPay, pe.totalDeductions, pe.netPay
      FROM payroll_entries pe
      JOIN payroll_cycles pc ON pe.cycleId = pc.id
      WHERE pc.status IN ('approved', 'disbursed', 'completed')
    `).all() as any;

    const deductionsSummary: Record<string, number> = {};
    let computedGross = 0;
    let computedOvertime = 0;
    let computedBonuses = 0;
    let computedNet = 0;

    for (const e of entries) {
      computedGross += Number(e.grossPay || 0);
      computedOvertime += Number(e.overtime || 0);
      computedBonuses += Number(e.bonuses || 0);
      computedNet += Number(e.netPay || 0);

      if (e.deductions_json) {
        try {
          const deductions = JSON.parse(e.deductions_json);
          for (const [key, value] of Object.entries(deductions)) {
            deductionsSummary[key] = Number(((deductionsSummary[key] || 0) + Number(value)).toFixed(2));
          }
        } catch (err) {
          // ignore parsing error
        }
      }
    }

    // Category analysis
    const categoryStats = await db.prepare(`
      SELECT e.category, SUM(pe.grossPay) as gross, SUM(pe.totalDeductions) as ded, SUM(pe.netPay) as net, COUNT(pe.id) as count
      FROM payroll_entries pe
      JOIN employees e ON pe.employeeId = e.id
      JOIN payroll_cycles pc ON pe.cycleId = pc.id
      WHERE pc.status IN ('approved', 'disbursed', 'completed')
      GROUP BY e.category
    `).all() as any;

    res.json({
      summary: {
        totalGross: summary.totalGross || 0,
        totalDeductions: summary.totalDeductions || 0,
        totalNet: summary.totalNet || 0,
        totalBatches: summary.totalBatches || 0,
        computedOvertime,
        computedBonuses,
        computedGross,
        computedNet
      },
      deductionsBreakdown: deductionsSummary,
      categoryDistribution: categoryStats,
      cyclesTrend: cycles
    });
  }));

  app.get("/api/audit-logs", asyncHandler(async (req: any, res: any) => {
    const logs = await db.prepare("SELECT * FROM audit_logs ORDER BY createdAt ASC LIMIT 200").all();
    res.json(logs);
  }));

  // === HOLIDAYS MANAGEMENT ===
  app.get("/api/holidays", asyncHandler(async (req: any, res: any) => {
    const list = await db.prepare("SELECT * FROM holidays ORDER BY date ASC").all();
    res.json(list || []);
  }));

  app.post("/api/holidays", asyncHandler(async (req: any, res: any) => {
    const { name, date, type } = req.body;
    if (!name || !date || !type) {
      return res.status(400).json({ error: "Name, date, and type are required" });
    }
    const id = `hol-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await db.prepare("INSERT INTO holidays (id, name, date, type) VALUES (?, ?, ?, ?)").run(id, name, date, type);
    await logAudit(req, "CREATE_HOLIDAY", `Created holiday "${name}" for date ${date} (${type})`);
    res.json({ success: true, id });
  }));

  app.put("/api/holidays/:id", asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { name, date, type } = req.body;
    if (!name || !date || !type) {
      return res.status(400).json({ error: "Name, date, and type are required" });
    }
    await db.prepare("UPDATE holidays SET name = ?, date = ?, type = ? WHERE id = ?").run(name, date, type, id);
    await logAudit(req, "UPDATE_HOLIDAY", `Updated holiday "${name}" for date ${date} (${type})`);
    res.json({ success: true });
  }));

  app.delete("/api/holidays/:id", asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const existing = await db.prepare("SELECT * FROM holidays WHERE id = ?").get(id) as any;
    if (existing) {
      await db.prepare("DELETE FROM holidays WHERE id = ?").run(id);
      await logAudit(req, "DELETE_HOLIDAY", `Deleted holiday "${existing.name}" for date ${existing.date}`);
    }
    res.json({ success: true });
  }));

  await initDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Centralized Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    let status = err.status || 500;
    if (typeof status !== "number" || status < 100 || status > 599) {
      status = 500;
    }
    let message = err.message || "An unexpected error occurred";
    
    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
      console.error("Constraint failure details:", {
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params
      });
    }
    
    res.status(status).json({ error: message });
  });

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
