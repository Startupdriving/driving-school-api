import { useEffect, useState, useRef } from "react";

export default function InstructorOffers() {



  const [dashboard, setDashboard] = useState(null);

  const instructorId = "c3850192-57b4-4b1d-916f-726af500360c"

  const wsRef = useRef(null);




   const handleAccept = async (offer) => {
  try {
    const res = await fetch("http://localhost:5173/write/instructor/accept-offer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        instructor_id: instructorId,
        lesson_request_id: offer.lesson_request_id
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Accept failed");
      return;
    }

    // ✅ ONLY THIS
    fetchDashboard();

  } catch (err) {
    console.error(err);
  }
};
    







const startLesson = async () => {

  console.log("DASHBOARD ACTIVE:", dashboard.active_lesson);

  if (!dashboard?.active_lesson?.lesson_id) {
    alert("Lesson not created yet");
    return;
  }

  await fetch("http://localhost:5173/write/lesson/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instructor_id: instructorId,
      lesson_id: dashboard.active_lesson.lesson_id
    })
  });

  fetchDashboard();
};






const completeLesson = async () => {

  if (!dashboard?.active_lesson?.lesson_id) return;

  await fetch("http://localhost:5173/write/lesson/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instructor_id: instructorId,
      lesson_id: dashboard.active_lesson.lesson_id
    })
  });

  fetchDashboard();
};
  


const cancelLesson = async () => {

  if (!dashboard?.active_lesson?.lesson_id) return;

  await fetch("http://localhost:5173/write/lesson/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instructor_id: instructorId,
      lesson_id: dashboard.active_lesson.lesson_id
    })
  });

  fetchDashboard();
};



const fetchDashboard = async () => {
  try {
    const res = await fetch(
      `http://localhost:5173/read/instructor-dashboard/${instructorId}`
    );

    const data = await res.json();
    setDashboard(data);

    console.log("DASHBOARD:", data);

  } catch (err) {
    console.error(err);
  }
};



useEffect(() => {

  if (wsRef.current) return; // 🛑 prevent duplicate

  const ws = new WebSocket(
  `ws://localhost:5173?instructor_id=${instructorId}`
);

  wsRef.current = ws;

  ws.onopen = () => {
    console.log("WS CONNECTED");

  };

  ws.onmessage = (event) => {
 
console.log("🔥 RAW WS MESSAGE:", event.data); 

   const data = JSON.parse(event.data);

    console.log("WS EVENT:", data);

    if (data.type === "new_offer" || data.type === "dashboard_update") {
 

   console.log("🔄 FETCH DASHBOARD CALLED");

      fetchDashboard();
    }
  };

  ws.onclose = () => {
    console.log("WS CLOSED");
    wsRef.current = null; // 🔥 IMPORTANT
  };

  return () => {
    // ❌ DO NOT CLOSE in dev (prevents race)
  };

}, []);

  


  if (!dashboard) return <p>Loading...</p>;

return (
  <div>

    <h2>Instructor Dashboard</h2>

    <p>Status: {dashboard.status}</p>

    {/* ACTIVE */}
    {dashboard.status === "active" && (
      <div>
        <h3>Active Lesson</h3>

        <p>Lesson ID: {dashboard.active_lesson.lesson_id}</p>

        <button onClick={startLesson}>Start</button>
        <button onClick={completeLesson}>Complete</button>
        <button onClick={cancelLesson}>Cancel</button>
      </div>
    )}

    {/* OFFERS */}
    {dashboard.status === "has_offer" && (
      <div>
        <h3>Offers</h3>

        {dashboard.offers.map(o => (
          <div key={o.lesson_request_id}>
            <p>{o.lesson_request_id}</p>
            <button onClick={() => handleAccept(o)}>Accept</button>
          </div>
        ))}
      </div>
    )}

    {/* IDLE */}
    {dashboard.status === "idle" && (
      <p>Waiting for requests...</p>
    )}

  </div>
);
}
