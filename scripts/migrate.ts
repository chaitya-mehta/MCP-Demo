import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "5432", 10);
const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "Admin@123";
const TARGET_DB = process.env.DB_NAME || "enterprise_mcp";

/**
 * Ensures the target database exists when running on local PostgreSQL.
 */
async function ensureDatabaseExists() {
  if (databaseUrl) {
    // In cloud environments (Railway, Render, Neon), database is already provisioned
    return;
  }

  console.log(`[Migration] Checking if database '${TARGET_DB}' exists on ${DB_HOST}:${DB_PORT}...`);

  const maintenanceClient = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: "postgres"
  });

  await maintenanceClient.connect();

  try {
    const res = await maintenanceClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TARGET_DB]
    );

    if (res.rowCount === 0) {
      console.log(`[Migration] Database '${TARGET_DB}' does not exist. Creating...`);
      await maintenanceClient.query(`CREATE DATABASE "${TARGET_DB}"`);
      console.log(`[Migration] Database '${TARGET_DB}' created successfully.`);
    } else {
      console.log(`[Migration] Database '${TARGET_DB}' already exists.`);
    }
  } finally {
    await maintenanceClient.end();
  }
}

/**
 * Runs pending migrations against the target database.
 */
export async function runMigrations() {
  await ensureDatabaseExists();

  const isProduction = process.env.NODE_ENV === "production";
  const client = new Client(
    databaseUrl
      ? {
          connectionString: databaseUrl,
          ssl: databaseUrl.includes("sslmode=disable")
            ? false
            : isProduction || databaseUrl.includes("sslmode=require") || databaseUrl.includes("render.com")
            ? { rejectUnauthorized: false }
            : false
        }
      : {
          host: DB_HOST,
          port: DB_PORT,
          user: DB_USER,
          password: DB_PASSWORD,
          database: TARGET_DB
        }
  );

  let connected = false;
  let attempts = 0;
  const maxAttempts = 10;
  while (!connected && attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Migration] Attempting to connect to database (attempt ${attempts}/${maxAttempts})...`);
      await client.connect();
      connected = true;
    } catch (err) {
      if (attempts >= maxAttempts) throw err;
      console.log(`[Migration] Database not ready yet (${(err as Error).message}). Retrying in 4s...`);
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
  }
  console.log(`[Migration] Connected to database ${databaseUrl ? "(via DATABASE_URL)" : `'${TARGET_DB}'`}.`);

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        description TEXT,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Read migration files
    const migrationsDir = path.resolve(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`[Migration] Found ${files.length} migration file(s) in ${migrationsDir}:`);
    for (const f of files) {
      console.log(`  - ${f}`);
    }

    // 3. Apply pending migrations
    for (const file of files) {
      const version = file;
      const checkRes = await client.query(
        `SELECT version, applied_at FROM schema_migrations WHERE version = $1`,
        [version]
      );

      if (checkRes.rowCount && checkRes.rowCount > 0) {
        console.log(`[Migration] Skipping ${file} (already applied at ${checkRes.rows[0].applied_at.toISOString()})`);
        continue;
      }

      console.log(`\n[Migration] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (version, description) VALUES ($1, $2)`,
          [version, `Executed from file ${file}`]
        );
        await client.query("COMMIT");
        console.log(`[Migration] Successfully applied: ${file}`);
      } catch (migrationErr) {
        await client.query("ROLLBACK");
        console.error(`[Migration Error] Failed applying ${file}:`, migrationErr);
        throw migrationErr;
      }
    }

    console.log("\n=======================================================");
    console.log("   All database migrations applied successfully!       ");
    console.log("=======================================================");
  } finally {
    await client.end();
  }
}

// Auto-run if invoked directly
if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations().catch((err) => {
    console.error("[Fatal Migration Error]:", err);
    process.exit(1);
  });
}
