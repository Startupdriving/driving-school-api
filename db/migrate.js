import fs from "fs";
import path from "path";
import pool from "../db.js";

export async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔄 Checking migrations...");

    // Ensure schema_version table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get applied versions
    const { rows } = await client.query(
      "SELECT version FROM schema_version"
    );

    const appliedVersions = rows.map(r => r.version);

    const migrationsPath = path.resolve("migrations");
    const files = fs.readdirSync(migrationsPath);

    const migrationFiles = files
      .filter(file => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      const version = parseInt(file.split("_")[0]);

      if (!appliedVersions.includes(version)) {
        console.log(`🚀 Applying migration ${file}`);

        const sql = fs.readFileSync(
          path.join(migrationsPath, file),
          "utf-8"
        );

        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");

        console.log(`✅ Migration ${file} applied`);
      }
    }

    console.log("🎉 Migrations complete");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}
