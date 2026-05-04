import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RequestLesson from "./RequestLesson";
import RequestStatus from "./RequestStatus";

export default function StudentApp() {
  const navigate = useNavigate();

  const profile = JSON.parse(
    localStorage.getItem("student_profile") || "{}"
  );

  const studentId = profile.id;

  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchActiveLesson() {
    try {
      if (!studentId) return;

      setLoading(true);

      const res = await fetch(
        `http://localhost:5173/read/student-dashboard?student_id=${studentId}`
      );

      const data = await res.json();

      setActiveLesson({
  ...(data.active_lesson || {}),
  pending_offers: data.pending_offers || [],
  upcoming_lessons: data.upcoming_lessons || [],
  incoming_reschedule:
    data.incoming_reschedule || null,
  outgoing_reschedule:
    data.outgoing_reschedule || null
});

    } catch (err) {
      console.error("FETCH ERROR:", err);

    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("student_token");
    localStorage.removeItem("student_profile");

    navigate("/student-login");
  }

  useEffect(() => {
    if (!studentId) return;

    fetchActiveLesson();

    const ws = new WebSocket(
      `ws://localhost:5173?student_id=${studentId}`
    );

    ws.onopen = () => {
      console.log("WS connected:", studentId);
    };

    ws.onmessage = (event) => {
  console.log("🔥 STUDENT RAW WS:", event.data);

  const data = JSON.parse(event.data);

  console.log("STUDENT WS EVENT:", data);

  if (
    [
      "student_update",
      "lesson_confirmed",
      "lesson_started",
      "lesson_completed",
      "lesson_cancelled",
      "offer_countered",
      "offer_sent",
      "lesson_rescheduled"
    ].includes(data.type)
  ) {
    console.log("🔄 STUDENT REFRESH");

    setTimeout(() => {
     fetchActiveLesson(); },  700);
  }
};

    ws.onerror = (err) => {
      console.error("WS ERROR:", err);
    };

    ws.onclose = () => {
      console.log("WS disconnected");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [studentId]);

  return (
    <div className="p-6">

      <div className="bg-white shadow rounded p-4 mb-6 flex justify-between items-center">

        <div>
          <h1 className="text-xl font-bold">
            Student Dashboard
          </h1>

          <p className="text-sm text-gray-600">
            Welcome, {profile.full_name || "Student"}
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Logout
        </button>

      </div>

      <RequestLesson
        studentId={studentId}
        onRequest={fetchActiveLesson}
      />

      <RequestStatus
        activeLesson={activeLesson}
        pendingOffers={activeLesson?.pending_offers || []}
        upcomingLessons={activeLesson?.upcoming_lessons || []}
        loading={loading}
        onRefresh={fetchActiveLesson}
       />

    </div>
  );
}
