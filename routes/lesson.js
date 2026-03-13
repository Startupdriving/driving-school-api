import express from "express";
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";
import {
  scheduleLesson,
  cancelLesson,
  completeLesson,
  rescheduleLesson
} from "../services/lessonService.js";


const router = express.Router();

router.post("/schedule", scheduleLesson);
router.post("/cancel", cancelLesson);
router.post("/complete", completeLesson);
router.post("/reschedule", rescheduleLesson);

router.post("/start", async (req,res)=>{

 const { lesson_id, instructor_id } = req.body

 const client = await pool.connect()

 try{

   await client.query(`
     INSERT INTO event (
       id,
       identity_id,
       event_type,
       instructor_id
     )
     VALUES ($1,$2,'lesson_started',$3)
   `,[
     uuidv4(),
     lesson_id,
     instructor_id
   ])

   res.json({status:"lesson_started"})

 } finally{
   client.release()
 }

})

router.post("/complete", async (req, res) => {

  const { lesson_request_id, instructor_id } = req.body;

  if (!lesson_request_id || !instructor_id) {
    return res.status(400).json({
      error: "lesson_request_id and instructor_id required"
    });
  }

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Must have started
    const { rows } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_started'
      LIMIT 1
    `,[lesson_request_id]);

    if (rows.length === 0) {
      throw new Error("lesson_not_started");
    }

    // Prevent duplicate completion
    const { rows: completed } = await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      AND event_type = 'lesson_completed'
      LIMIT 1
    `,[lesson_request_id]);

    if (completed.length > 0) {
      throw new Error("lesson_already_completed");
    }

    await client.query(`
      INSERT INTO event (
        id,
        identity_id,
        event_type,
        instructor_id
      )
      VALUES ($1,$2,'lesson_completed',$3)
    `,[
      uuidv4(),
      lesson_request_id,
      instructor_id
    ]);

    await client.query("COMMIT");

    res.json({
      status: "lesson_completed"
    });

  } catch (err) {

    await client.query("ROLLBACK");

    res.status(400).json({
      error: err.message
    });

  } finally {

    client.release();

  }

});

export default router;

