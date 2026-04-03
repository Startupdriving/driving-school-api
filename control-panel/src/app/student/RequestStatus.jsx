import { useEffect, useState } from "react"
import { getEventStream } from "../../api/adminApi"

export default function RequestStatus({ lessonId }) {
  const [events, setEvents] = useState([])

  useEffect(() => {

  console.log("TRACKING LESSON ID:", lessonId);

  if (!lessonId) return;

  const interval = setInterval(async () => {
    try {
      const res = await fetch(
        `http://localhost:5173/read/event-stream?identity_id=${lessonId}`
      );

      const data = await res.json();

      console.log("EVENT TYPES:", data.map(e => e.event_type));

      setEvents(data || []);

    } catch (err) {
      console.error("EVENT ERROR:", err);
    }
  }, 2000);

  return () => clearInterval(interval);

}, [lessonId]);

const interpret = (events) => {
    if (events.some(e => e.event_type === "lesson_completed")) return "COMPLETED"
    if (events.some(e => e.event_type === "lesson_started")) return "ACTIVE"
    if (events.some(e => e.event_type === "lesson_confirmed")) return "CONFIRMED"
    return "SEARCHING"
  }

  const status = interpret(events)

  return (
    <div>
      <h2>Status: {status}</h2>

      {status === "SEARCHING" && <p>Finding instructor...</p>}
      {status === "CONFIRMED" && <p>Instructor confirmed</p>}
      {status === "ACTIVE" && <p>Lesson in progress</p>}
      {status === "COMPLETED" && <p>Lesson completed</p>}

      <hr />

      <h3>Raw Events:</h3>

      {events.map((e, i) => (
        <div key={i}>{e.event_type}</div>
      ))}
    </div>
  )
}
