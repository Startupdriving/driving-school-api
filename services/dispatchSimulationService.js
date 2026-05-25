import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import { sendNextWaveOffers } from "./dispatchWorker.js";
import { insertEvent }
from "./eventStore.js";



export async function simulateDispatchRequests(count, zoneId) {

console.log("🔥 FUNCTION ENTERED simulateDispatchRequests");

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const createdRequests = [];

    for (let i = 0; i < count; i++) {
 
    console.log("🔁 LOOP START", i);

      const requestId = uuidv4();
       console.log("🧱 Creating request:", requestId);
      await client.query(`
        INSERT INTO identity (id, identity_type)
        VALUES ($1,'lesson_request')
      `,[requestId]);

      await insertEvent(client, {

  id:
    uuidv4(),

  identity_id:
    requestId,

  event_type:
    "lesson_requested",

  payload: {

    student_id:
      uuidv4(),

    zone_id:
      zoneId

  }

});

       console.log("👉 ABOUT TO CALL DISPATCH:", requestId);

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
