import { v4 as uuidv4 } from "uuid";
import { resolveZone } from "./zoneResolver.js";

export async function updateInstructorLocation(client, instructorId, lat, lng) {

  // 1️⃣ Insert event
  await client.query(`
    INSERT INTO event (
      id,
      identity_id,
      event_type,
      payload
    )
    VALUES ($1,$2,'instructor_location_updated',$3)
  `,[
    uuidv4(),
    instructorId,
    JSON.stringify({ lat, lng })
  ]);

  // 2️⃣ Resolve zone
  const zoneId = resolveZone(lat, lng);

  if(zoneId){

    await client.query(`
      INSERT INTO instructor_current_zone (
        instructor_id,
        zone_id,
        lat,
        lng,
        updated_at
      )
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (instructor_id)
      DO UPDATE SET
        zone_id = EXCLUDED.zone_id,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        updated_at = NOW()
    `,[
      instructorId,
      zoneId,
      lat,
      lng
    ]);

  }
}
