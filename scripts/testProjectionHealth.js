import pool from "../db.js";

import {
  getProjectionHealth
} from "../services/projectionHealthService.js";

const client =
  await pool.connect();

try {

  const rows =
    await getProjectionHealth(
      client
    );

  console.table(rows);

} catch (err) {

  console.error(err);

} finally {

  client.release();

}
