import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { sendNextWaveOffers } from "./dispatchWorker.js";

export async function simulateDispatchRequests(count, zoneId) {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const createdRequests = [];

    for (let i = 0; i < count; i++) {

      const requestId = uuidv4();

      await client.query(`
        INSERT INTO identity (id, identity_type)
        VALUES ($1,'lesson_request')
      `,[requestId]);

      await client.query(`
        INSERT INTO event (
          id,
          identity_id,
          event_type,
          payload
        )
        VALUES ($1,$2,'lesson_requested',$3)
      `,[
        uuidv4(),
        requestId,
        JSON.stringify({
          student_id: uuidv4(),
          zone_id: zoneId
        })
      ]);

      await sendNextWaveOffers(client, requestId, 1);

      createdRequests.push(requestId);
    }

    await client.query("COMMIT");

    return createdRequests;

  } catch (err) {

    await client.query("ROLLBACK");
    throw err;

  } finally {

    client.release();

  }

}
