import pool from "../db.js";
import crypto from "crypto";
import { insertEvent }
from "./eventStore.js";


function generateUUID() {
  return crypto.randomUUID();
}

function isValidUUID(id) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

//
// CREATE CAR
//
export async function createCar(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const carId = generateUUID();

    await client.query(
      `INSERT INTO identity (id, identity_type)
       VALUES ($1, 'car')`,
      [carId]
    );

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    carId,

  event_type:
    "car_created",

  payload: {

    performed_by:
      "system",

    source:
      "api",

    action:
      "car_created"

  }

});

    await client.query("COMMIT");

    res.status(201).json({
      message: "Car created",
      car_id: carId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

//
// ACTIVATE CAR
//
export async function activateCar(req, res) {
  const { car_id } = req.body;

  if (!car_id) {
    return res.status(400).json({ error: "car_id is required" });
  }

  if (!isValidUUID(car_id)) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const activeCheck = await client.query(
      `SELECT 1 FROM current_active_cars WHERE id = $1`,
      [car_id]
    );

    if (activeCheck.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Car already active" });
    }

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    car_id,

  event_type:
    "car_activated",

  payload: {

    performed_by:
      "system",

    source:
      "api",

    action:
      "car_activated"

  }

});

    await client.query("COMMIT");

    res.json({ message: "Car activated" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

//
// SET CAR AVAILABILITY  ✅ (THIS WAS MISSING)
//
export async function setCarAvailability(req, res) {
  const { car_id, day_of_week, start_time, end_time } = req.body;

  if (!car_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: "All fields required" });
  }

  if (!isValidUUID(car_id)) {
    return res.status(400).json({ error: "Invalid UUID" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT 1 FROM identity
       WHERE id = $1 AND identity_type = 'car'`,
      [car_id]
    );

    if (check.rowCount === 0) {
      throw new Error("Car not found");
    }

    await insertEvent(client, {

  id:
    generateUUID(),

  identity_id:
    car_id,

  event_type:
    "car_availability_set",

  payload: {

    day_of_week,

    start_time,

    end_time

  }

});

    await client.query("COMMIT");

    res.json({ message: "Car availability added" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}

