import { useState } from "react";
import { requestLesson } from "../../api/adminApi";

export default function RequestLesson({ studentId, onRequest }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [time, setTime] = useState("18:00");
  const [duration, setDuration] = useState(60);

  const handleRequest = async () => {
    try {
      setLoading(true);
      setError("");

      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + duration * 60000);

      const res = await requestLesson({
        student_id: studentId,
        pickup_lat: 31.45,
        pickup_lng: 74.26,
        requested_start_time: start.toISOString(),
        requested_end_time: end.toISOString(),
      });

      console.log("NEW LESSON CREATED:", res.lesson_request_id);

      onRequest();

    } catch (err) {
      console.error("REQUEST ERROR:", err);
      setError("Failed to request lesson");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Book Driving Lesson</h3>

      <div style={{ marginBottom: 10 }}>
        <label>Date</label><br />
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Start Time</label><br />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Duration</label><br />
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        >
          <option value={60}>60 Minutes</option>
          <option value={90}>90 Minutes</option>
        </select>
      </div>

      <button onClick={handleRequest} disabled={loading}>
        {loading ? "Requesting..." : "Request Lesson"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 10 }}>
          {error}
        </p>
      )}
    </div>
  );
}
