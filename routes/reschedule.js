import express from "express";
import { handleEvent } from "../services/eventHandler.js";
import { requestReschedule, respondReschedule } from "../services/rescheduleService.js";


const router = express.Router();

/* =====================================================
   POST /reschedule/request
===================================================== */

router.post("/request", async (req, res) => {

  try {

    const result = await requestReschedule({
      lesson_id: req.body.lesson_id,
      actor: req.body.actor,
      actor_id: req.body.actor_id,
      proposed_start_time: req.body.proposed_start_time,
      proposed_end_time: req.body.proposed_end_time,
      reason: req.body.reason || null
    });

    return res.json(result);

  } catch (err) {

    console.error("REQUEST ERROR:", err);

    return res.status(400).json({
      error: err.message
    });

  }

});

/* =====================================================
   POST /reschedule/respond
===================================================== */

router.post("/respond", async (req, res) => {

  const {
  lesson_id,
  actor,
  actor_id,
  action
} = req.body;

  try {

    const result = await respondReschedule({
  lesson_id,
  actor,
  action
});

    return res.json(result);

  } catch (err) {

    console.error("RESPOND ERROR:", err);

    return res.status(400).json({
      error: err.message
    });

  }

});

    /* -----------------------------------------------
       ACCEPT
    ----------------------------------------------- */

    /* -----------------------------------------------
       REJECT
    ----------------------------------------------- */


export default router;
