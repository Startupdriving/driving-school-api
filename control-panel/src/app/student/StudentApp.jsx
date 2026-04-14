import { useEffect, useState } from "react";
import RequestLesson from "./RequestLesson";
import RequestStatus from "./RequestStatus";

const studentId = "0bfa16c8-a68d-4929-9747-13c518a15e0d"; // temp

export default function StudentApp() {

  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔁 FETCH FUNCTION
  const fetchActiveLesson = async () => {
    try {
      setLoading(true);

      const res = await fetch(`http://localhost:5173/read/student/active-lesson?student_id=${studentId}`)

      const data = await res.json();

      console.log("📡 STUDENT API RESPONSE:", data);

      setActiveLesson(data);

    } catch (err) {
      console.error("FETCH ERROR:", err);
    } finally {
      setLoading(false);
    }
  };


  // 🔁 POLLING
useEffect(() => {
  if (!studentId) return;

  let ws;

  const connect = () => {
    const ws = new WebSocket(
  `ws://localhost:5173?student_id=${studentId}`
);

    ws.onopen = () => {
      console.log("🟢 WS connected:", studentId);
    };

    ws.onmessage = (event) => {

   console.log("🔥 STUDENT WS MESSAGE:", event.data);

      const data = JSON.parse(event.data);

      if (data.type === "student_update") {
        console.log("🔄 REALTIME UPDATE");
        fetchActiveLesson();
      }
    };

    ws.onerror = (err) => {
      console.error("WS ERROR:", err);
    };

    ws.onclose = () => {
      console.log("🔴 WS disconnected");
    };
  };

  connect();

  return () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };

}, [studentId]);

  return (
  <div>

    <h1>Student App</h1>

    {/* 🔹 STEP A: REQUEST BUTTON */}
    <RequestLesson
      studentId={studentId}
      onRequest={fetchActiveLesson}
    />

    {/* 🔹 STEP B: STATUS DISPLAY */}
    <RequestStatus
      activeLesson={activeLesson}
      loading={loading}
    />

  </div>
);
}
