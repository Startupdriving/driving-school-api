import { useEffect, useState } from "react"
import { getEventStream } from "../../api/adminApi"

export default function RequestStatus({ activeLesson, loading }) {

  const getStatusText = (status) => {
    switch (status) {
      case "searching":
        return "Finding instructor...";
      case "confirmed":
        return "Instructor assigned";
      case "started":
        return "Lesson in progress";
      case "completed":
        return "Lesson finished";
      case "cancelled":
        return "No instructor found";
      default:
        return "No active lesson";
    }
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!activeLesson) {
    return <p>No active lesson</p>;
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 10 }}>
      <h2>Status: {getStatusText(activeLesson.status)}</h2>

      <p><strong>Instructor:</strong> {activeLesson.instructor_id || "-"}</p>
      <p><strong>Lesson ID:</strong> {activeLesson.lesson_id || "-"}</p>

      <p><strong>Requested:</strong> {activeLesson.requested_at}</p>
      <p><strong>Confirmed:</strong> {activeLesson.confirmed_at || "-"}</p>
      <p><strong>Started:</strong> {activeLesson.started_at || "-"}</p>
      <p><strong>Completed:</strong> {activeLesson.completed_at || "-"}</p>
      <p><strong>Cancelled:</strong> {activeLesson.cancelled_at || "-"}</p>
    </div>
  );
}
