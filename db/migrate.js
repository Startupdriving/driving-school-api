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
      .filter(file => file.endsWith(".sql"));

    const seenVersions = new Map();

     for (const file of migrationFiles) {
    const version = parseInt(file.split("_")[0]);

      if (seenVersions.has(version)) {
      throw new Error(
      `Duplicate migration version ${version}: ` +
      `${seenVersions.get(version)} and ${file}`
    );
  }

  seenVersions.set(version, file);
}

migrationFiles.sort((a, b) => {
  const vA = parseInt(a.split("_")[0]);
  const vB = parseInt(b.split("_")[0]);
  return vA - vB;
});

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

       await client.query(
        `
        INSERT INTO schema_version (version)
        VALUES ($1)
        ON CONFLICT (version) DO NOTHING
        `,
         [version]
        );

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

