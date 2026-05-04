import { useState } from "react";
import { acceptOffer } from "../../api/adminApi";

export default function RequestStatus({
  activeLesson,
  loading,
  pendingOffers = [],
  upcomingLessons = [],
  onRefresh
}) {
  const profile = JSON.parse(
    localStorage.getItem("student_profile") || "{}"
  );

  const [openLessonId, setOpenLessonId] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function getStatusText(status) {
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
        return "Cancelled";
      default:
        return "No active lesson";
    }
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  }

  async function handleAccept(offerId) {
    try {
      await acceptOffer({ offer_id: offerId });

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("ACCEPT ERROR:", err);
      alert("Failed to accept offer");
    }
  }

  async function handleRescheduleDecision(action) {
  try {
    const item = activeLesson?.incoming_reschedule;

    if (!item) return;

    const profile = JSON.parse(
      localStorage.getItem("student_profile") || "{}"
    );

    const res = await fetch(
      "http://localhost:5173/write/reschedule/respond",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lesson_id: item.lesson_id,
          actor: "student",
          actor_id: profile.id,
          action
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed");
      return;
    }

    if (onRefresh) onRefresh();

  } catch (err) {
    console.error(err);
  }
}



  async function handleReschedule(lessonId) {
    try {
      if (!date || !time) {
        alert("Select date and time");
        return;
      }

      setSubmitting(true);

      const start = new Date(`${date}T${time}:00`);
      const end = new Date(
        start.getTime() + duration * 60000
      );

      const res = await fetch(
        "http://localhost:5173/write/reschedule/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            lesson_id: lessonId,
            actor: "student",
            actor_id: profile.id,
            proposed_start_time: start.toISOString(),
            proposed_end_time: end.toISOString(),
            reason
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Reschedule failed");
        return;
      }

      alert("Reschedule request sent");

      setOpenLessonId(null);
      setDate("");
      setTime("");
      setDuration(60);
      setReason("");

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("RESCHEDULE ERROR:", err);
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6">

    {activeLesson?.incoming_reschedule && (
  <div className="bg-orange-50 rounded shadow p-5 border border-orange-200">

    <h2 className="text-lg font-bold mb-4 text-orange-700">
      Reschedule Request
    </h2>

    <p>
      Requested by:
      {" "}
      {activeLesson.incoming_reschedule.requested_by}
    </p>

    <p>
      New Start:
      {" "}
      {new Date(
        activeLesson.incoming_reschedule.proposed_start_time
      ).toLocaleString()}
    </p>

    <p>
      New End:
      {" "}
      {new Date(
        activeLesson.incoming_reschedule.proposed_end_time
      ).toLocaleString()}
    </p>

    <p>
      Reason:
      {" "}
      {activeLesson.incoming_reschedule.reason}
    </p>

    <div className="flex gap-3 mt-4">

      <button
        onClick={() =>
          handleRescheduleDecision("accept")
        }
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Accept
      </button>

      <button
        onClick={() =>
          handleRescheduleDecision("reject")
        }
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Reject
      </button>

    </div>

  </div>
)}

{activeLesson?.outgoing_reschedule && (
  <div className="bg-blue-50 rounded shadow p-5 border border-blue-200">

    <h2 className="text-lg font-bold mb-4 text-blue-700">
      Reschedule Sent
    </h2>

    <p>
      Waiting for instructor response...
    </p>

    <p>
      New Start:
      {" "}
      {new Date(
        activeLesson.outgoing_reschedule.proposed_start_time
      ).toLocaleString()}
    </p>

    <p>
      New End:
      {" "}
      {new Date(
        activeLesson.outgoing_reschedule.proposed_end_time
      ).toLocaleString()}
    </p>

    <p>
      Reason:
      {" "}
      {activeLesson.outgoing_reschedule.reason}
    </p>

  </div>
)}


      {/* CURRENT STATUS */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-bold mb-4">
          Current Status
        </h2>

        {activeLesson ? (
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong>{" "}
              {getStatusText(activeLesson.status)}
            </p>

            <p>
              <strong>Instructor:</strong>{" "}
              {activeLesson.instructor_name || activeLesson.instructor_id || "-"}
            </p>

            <p>
              <strong>Lesson ID:</strong>{" "}
              {activeLesson.lesson_id || "-"}
            </p>

            <p>
              <strong>Requested:</strong>{" "}
              {formatDateTime(activeLesson.requested_at)}
            </p>

            <p>
              <strong>Confirmed:</strong>{" "}
              {formatDateTime(activeLesson.confirmed_at)}
            </p>

             <p>
               <strong>Start:</strong>{" "}
               {activeLesson.start_time
               ? new Date(activeLesson.start_time).toLocaleString()
               : "-"}
             </p>

             <p>
               <strong>End:</strong>{" "}
               {activeLesson.end_time
               ? new Date(activeLesson.end_time).toLocaleTimeString()
               : "-"}
              </p>

            {activeLesson?.status === "confirmed" &&
 activeLesson?.lesson_id && (
  <button
    onClick={() =>
      setOpenLessonId(activeLesson.lesson_id)
    }
    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl"
  >
    Reschedule
  </button>
)}

{openLessonId === activeLesson?.lesson_id && (
  <div className="mt-4 border rounded-2xl p-4 bg-gray-50 space-y-3">

    <input
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      className="w-full border rounded-xl p-2"
    />

    <input
      type="time"
      value={time}
      onChange={(e) => setTime(e.target.value)}
      className="w-full border rounded-xl p-2"
    />

    <input
      type="number"
      value={duration}
      onChange={(e) =>
        setDuration(Number(e.target.value))
      }
      className="w-full border rounded-xl p-2"
      placeholder="Minutes"
    />

    <input
      type="text"
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      className="w-full border rounded-xl p-2"
      placeholder="Reason"
    />

    <div className="flex gap-2">
      <button
        onClick={() =>
          handleReschedule(activeLesson.lesson_id)
        }
        className="px-4 py-2 bg-green-600 text-white rounded-xl"
      >
        Send Request
      </button>

      <button
        onClick={() => setOpenLessonId(null)}
        className="px-4 py-2 bg-gray-300 rounded-xl"
      >
        Close
      </button>
    </div>

  </div>
)}

          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No active lesson
          </p>
        )}
      </div>

      {/* OFFERS */}
      {pendingOffers.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-lg font-bold mb-4">
            Instructor Offers
          </h2>

          <div className="space-y-4">
            {pendingOffers.map((offer) => (
              <div
                key={offer.offer_id}
                className="border rounded-2xl p-4"
              >
                <p>
                  <strong>Instructor:</strong>{" "}
                  {offer.instructor_id}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {offer.status === "countered"
                    ? "Counter Offer"
                    : offer.status}
                </p>

                <p>
                  <strong>Time:</strong>{" "}
                  {formatDateTime(
                    offer.proposed_start_time
                  )}
                </p>

                <p>
                  <strong>Price:</strong> Rs{" "}
                  {offer.proposed_price}
                </p>

                <button
                  onClick={() =>
                    handleAccept(offer.offer_id)
                  }
                  className="mt-3 px-4 py-2 bg-black text-white rounded-xl"
                >
                  {offer.status === "countered"
                    ? "Accept Counter Offer"
                    : "Accept Offer"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING LESSONS */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-lg font-bold mb-4">
          My Lessons
        </h2>

        {upcomingLessons.length > 0 ? (
          <div className="space-y-4">
            {upcomingLessons.map((lesson) => (
              <div
                key={lesson.lesson_id}
                className="border rounded-2xl p-4"
              >
                <p>
                  <strong>Date:</strong>{" "}
                  {formatDateTime(lesson.start_time)}
                </p>

                <p>
                  <strong>Ends:</strong>{" "}
                  {new Date(
                    lesson.end_time
                  ).toLocaleTimeString()}
                </p>

                <p>
                  <strong>Instructor:</strong>{" "}
                  {lesson.instructor_id}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  Upcoming
                </p>

                <button
                  onClick={() =>
                    setOpenLessonId(lesson.lesson_id)
                  }
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Reschedule
                </button>

                {openLessonId === lesson.lesson_id && (
                  <div className="mt-4 border rounded-2xl p-4 bg-gray-50 space-y-3">

                    <input
                      type="date"
                      value={date}
                      onChange={(e) =>
                        setDate(e.target.value)
                      }
                      className="w-full border rounded-xl p-2"
                    />

                    <input
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTime(e.target.value)
                      }
                      className="w-full border rounded-xl p-2"
                    />

                    <input
                      type="number"
                      value={duration}
                      onChange={(e) =>
                        setDuration(
                          Number(e.target.value)
                        )
                      }
                      className="w-full border rounded-xl p-2"
                      placeholder="Duration minutes"
                    />

                    <input
                      type="text"
                      value={reason}
                      onChange={(e) =>
                        setReason(e.target.value)
                      }
                      className="w-full border rounded-xl p-2"
                      placeholder="Reason"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        disabled={submitting}
                        onClick={() =>
                          handleReschedule(
                            lesson.lesson_id
                          )
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded-xl disabled:opacity-50"
                      >
                        {submitting
                          ? "Sending..."
                          : "Send Request"}
                      </button>

                      <button
                        onClick={() =>
                          setOpenLessonId(null)
                        }
                        className="px-4 py-2 bg-gray-300 rounded-xl"
                      >
                        Close
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No upcoming lessons yet.
          </p>
        )}
      </div>

    </div>
  );
}
