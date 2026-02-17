export async function setCarAvailability(req, res) {
  const { car_id, day_of_week, start_time, end_time } = req.body;

  if (!car_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: "All fields required" });
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

    await client.query(
      `
      INSERT INTO event (id, identity_id, event_type, payload)
      VALUES ($1, $2, 'car_availability_set', $3::jsonb)
      `,
      [
        crypto.randomUUID(),
        car_id,
        JSON.stringify({
          day_of_week,
          start_time,
          end_time
        })
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "Car availability added" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
}
