import { v4 as uuidv4 } from "uuid";
import { withIdempotency } from "./idempotencyService.js";

export async function confirmPayment(req, res) {
  try {
    const response = await withIdempotency(req, async (client) => {

      const { payment_id } = req.body;

      if (!payment_id) {
        throw new Error("payment_id required");
      }

      // 🔒 Lock payment identity
      const lock = await client.query(
        `
        SELECT id
        FROM identity
        WHERE id = $1
        AND identity_type = 'payment'
        FOR UPDATE
        `,
        [payment_id]
      );

      if (lock.rowCount === 0) {
        throw new Error("Payment not found");
      }

      // 🚫 Prevent double confirmation
      const alreadyConfirmed = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'payment_confirmed'
        LIMIT 1
        `,
        [payment_id]
      );

      if (alreadyConfirmed.rowCount > 0) {
        throw new Error("Payment already confirmed");
      }

      // Get payment amount
      const paymentInfo = await client.query(
        `
        SELECT payload->>'amount' AS amount
        FROM event
        WHERE identity_id = $1
        AND event_type = 'payment_created'
        `,
        [payment_id]
      );

      if (paymentInfo.rowCount === 0) {
        throw new Error("Invalid payment state");
      }

      const amount = parseFloat(paymentInfo.rows[0].amount);

      // 1️⃣ Insert payment_confirmed
      await client.query(
        `
        INSERT INTO event (id, identity_id, event_type, payload)
        VALUES ($1, $2, 'payment_confirmed', $3)
        `,
        [
          uuidv4(),
          payment_id,
          JSON.stringify({
            confirmed_at: new Date()
          })
        ]
      );

      // 2️⃣ Calculate commission (20%)
      const commission = amount * 0.2;
      const instructorShare = amount - commission;

      await client.query(
        `
        INSERT INTO event (id, identity_id, event_type, payload)
        VALUES ($1, $2, 'commission_calculated', $3)
        `,
        [
          uuidv4(),
          payment_id,
          JSON.stringify({
            commission,
            instructor_share: instructorShare
          })
        ]
      );

      return {
        message: "Payment confirmed",
        commission,
        instructor_share: instructorShare
      };
    });

    res.json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
