import { handleEvent } from "./eventHandler.js";

export async function insertEvent(client, {
  id,
  identity_id,
  event_type,
  payload,
  instructor_id = null,
  lesson_range = null
}) {

  await client.query(`
    INSERT INTO event (
      id,
      identity_id,
      event_type,
      payload,
      instructor_id,
      lesson_range
    )
    VALUES ($1,$2,$3,$4,$5,$6)
  `, [
    id,
    identity_id,
    event_type,
    payload,
    instructor_id,
    lesson_range
  ]);

  console.log("📡 EVENT INSERTED:", event_type);

  // 🧠 CENTRAL HANDLER TRIGGER
  await handleEvent(client, {
    id,
    identity_id,
    event_type,
    payload
  });
}
