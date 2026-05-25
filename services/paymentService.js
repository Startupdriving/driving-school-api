import { v4 as uuidv4 } from "uuid";
import { withIdempotency } from "./idempotencyService.js";
import { insertEvent }
from "./eventStore.js";

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
      await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    payment_id,

  event_type:
    "payment_confirmed",

  payload: {

    confirmed_at:
      new Date()

  }

});

      // 2️⃣ Calculate commission (20%)
      const commission = amount * 0.2;
      const instructorShare = amount - commission;

      await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    payment_id,

  event_type:
    "commission_calculated",

  payload: {

    commission,

    instructor_share:
      instructorShare

  }

});

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

export async function completePayout(req, res) {
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

      // Ensure payment_confirmed exists
      const confirmed = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'payment_confirmed'
        LIMIT 1
        `,
        [payment_id]
      );

      if (confirmed.rowCount === 0) {
        throw new Error("Payment not confirmed yet");
      }

      // Prevent double payout
      const alreadyPaid = await client.query(
        `
        SELECT 1
        FROM event
        WHERE identity_id = $1
        AND event_type = 'payout_completed'
        LIMIT 1
        `,
        [payment_id]
      );

      if (alreadyPaid.rowCount > 0) {
        throw new Error("Payout already completed");
      }

      await insertEvent(client, {

  id: uuidv4(),

  identity_id:
    payment_id,

  event_type:
    "payout_completed",

  payload: {

    paid_at:
      new Date()

  }

});

      return { message: "Payout completed" };
    });

    res.json(response);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
