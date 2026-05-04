import { useEffect, useState, useRef } from "react";

export default function InstructorOffers({
  instructorId
}) {



  const [dashboard, setDashboard] = useState(null);

  const wsRef = useRef(null);


  const [counterOpenId, setCounterOpenId] = useState(null);
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("18:00");
  const [counterDuration, setCounterDuration] = useState(60);
  const [counterPrice, setCounterPrice] = useState(2000);


  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("18:00");
  const [rescheduleDuration, setRescheduleDuration] = useState(60);
  const [rescheduleReason, setRescheduleReason] = useState("");



   if (!instructorId) {
  return <p>No instructor session found.</p>; 
}



   const handleAccept = async (offer) => {
  try {
    const res = await fetch(
      "http://localhost:5173/write/offer/accept",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          offer_id: offer.offer_id || offer.id
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Accept failed");
      return;
    }

    fetchDashboard();

  } catch (err) {
    console.error(err);
  }
};
    


const handleCounter = async (offer) => {
  try {
    if (!counterDate) {
      alert("Select a date first");
      return;
    }

    const start = new Date(`${counterDate}T${counterTime}:00`);

    if (isNaN(start.getTime())) {
      alert("Invalid start date/time");
      return;
    }

    const end = new Date(
      start.getTime() + counterDuration * 60000
    );

    const res = await fetch(
      "http://localhost:5173/write/offer/counter",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          offer_id: offer.offer_id || offer.id,
          actor: "instructor",
          proposed_start_time: start.toISOString(),
          proposed_end_time: end.toISOString(),
          proposed_price: counterPrice
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Counter failed");
      return;
    }

    setCounterOpenId(null);
    fetchDashboard();

  } catch (err) {
    console.error("COUNTER FRONTEND ERROR:", err);
    alert(err.message || "Counter failed");
  }
};


const handleRescheduleDecision = async (action) => {
  try {
    const item = dashboard?.incoming_reschedule;

    if (!item) return;

    const res = await fetch(
      "http://localhost:5173/write/reschedule/respond",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lesson_id: item.lesson_id,
          actor: "instructor",
          actor_id: instructorId,
          action
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed");
      return;
    }

    fetchDashboard();
console.log("DASHBOARD FULL:", JSON.stringify(data,null,2));
  } catch (err) {
    console.error(err);
  }
};




const handleRescheduleRequest = async () => {
  try {
    const lesson =
      dashboard?.active_lesson;

    if (!lesson?.lesson_id) return;

    const start = new Date(
      `${rescheduleDate}T${rescheduleTime}:00`
    );

    const end = new Date(
      start.getTime() +
      rescheduleDuration * 60000
    );

    const res = await fetch(
      "http://localhost:5173/write/reschedule/request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lesson_id: lesson.lesson_id,
          actor: "instructor",
          actor_id: instructorId,
          proposed_start_time:
            start.toISOString(),
          proposed_end_time:
            end.toISOString(),
          reason: rescheduleReason
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed");
      return;
    }

    setRescheduleOpen(false);
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

  if (!instructorId) return;
  fetchDashboard(); 

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

    if (
      data.type === "new_offer" ||
      data.type === "dashboard_update" ||
      data.type === "lesson_assigned" ||
      data.type === "lesson_started"  ||
      data.type === "lesson_completed" ||
      data.type === "lesson_cancelled" ||
      data.type === "lesson_rescheduled"  
 ) {
     console.log("🔄 DASHBOARD REFRESH");

    setTimeout(() => {
    fetchDashboard(); }, 700);
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
  <div className="p-6 space-y-6">

    {/* HEADER */}
    <div className="bg-white rounded-2xl shadow p-5 border">
      <h2 className="text-2xl font-bold">
        Instructor Dashboard
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Status: {dashboard.status}
      </p>
    <p className="text-xs text-red-600">
  Reschedule:
  {dashboard?.pending_reschedule ? "YES" : "NO"}
</p>
    </div>



    {dashboard?.incoming_reschedule && (
  <div className="bg-orange-50 rounded-2xl shadow border border-orange-200 p-5 space-y-4">

    <h3 className="text-xl font-semibold text-orange-700">
      Reschedule Request
    </h3>

    <p>
      Requested by:
      {" "}
      {dashboard.incoming_reschedule.requested_by}
    </p>

    <p>
      New Start:
      {" "}
      {new Date(
        dashboard.incoming_reschedule.proposed_start_time
      ).toLocaleString()}
    </p>

    <p>
      New End:
      {" "}
      {new Date(
        dashboard.incoming_reschedule.proposed_end_time
      ).toLocaleString()}
    </p>

    <p>
      Reason:
      {" "}
      {dashboard.incoming_reschedule.reason}
    </p>

    <div className="flex gap-3">

      <button
        onClick={() =>
          handleRescheduleDecision("accept")
        }
        className="px-4 py-2 rounded-xl bg-green-600 text-white"
      >
        Accept
      </button>

      <button
        onClick={() =>
          handleRescheduleDecision("reject")
        }
        className="px-4 py-2 rounded-xl bg-red-600 text-white"
      >
        Reject
      </button>

    </div>

  </div>
)}

{dashboard?.outgoing_reschedule && (
  <div className="bg-blue-50 rounded-2xl shadow border border-blue-200 p-5 space-y-4">

    <h3 className="text-xl font-semibold text-blue-700">
      Reschedule Sent
    </h3>

    <p>
      Waiting for student response...
    </p>

    <p>
      New Start:
      {" "}
      {new Date(
        dashboard.outgoing_reschedule.proposed_start_time
      ).toLocaleString()}
    </p>

    <p>
      New End:
      {" "}
      {new Date(
        dashboard.outgoing_reschedule.proposed_end_time
      ).toLocaleString()}
    </p>

    <p>
      Reason:
      {" "}
      {dashboard.outgoing_reschedule.reason}
    </p>

  </div>
)}
      




    {/* ACTIVE LESSON */}
    {dashboard?.active_lesson?.lesson_id ? (
      <div className="bg-white rounded-2xl shadow border p-5 space-y-4">

  <div>
    <h3 className="text-xl font-semibold">
      Active Lesson
    </h3>

    <p className="text-sm text-gray-500 mt-1">
      Lesson ID: {dashboard.active_lesson.lesson_id}
    </p>
  </div>

  {/* ✅ NEW: Lesson Details */}
  <div className="grid md:grid-cols-2 gap-3 text-sm">

    <p>
      <strong>Status:</strong>{" "}
      {dashboard.active_lesson.status}
    </p>

    <p>
      <strong>Student:</strong>{" "}
      {dashboard.active_lesson.student_name || dashboard.active_lesson.student_id}
    </p>

    <p>
      <strong>Requested:</strong>{" "}
      {dashboard.active_lesson.requested_at
        ? new Date(
            dashboard.active_lesson.requested_at
          ).toLocaleString()
        : "-"}
    </p>

    <p>
      <strong>Confirmed:</strong>{" "}
      {dashboard.active_lesson.confirmed_at
        ? new Date(
            dashboard.active_lesson.confirmed_at
          ).toLocaleString()
        : "-"}
    </p>

    <p>
      <strong>Start:</strong>{" "}
      {dashboard.active_lesson.start_time
        ? new Date(
            dashboard.active_lesson.start_time
          ).toLocaleString()
        : "-"}
    </p>

    <p>
      <strong>End:</strong>{" "}
      {dashboard.active_lesson.end_time
        ? new Date(
            dashboard.active_lesson.end_time
          ).toLocaleTimeString()
        : "-"}
    </p>

  </div>

        <div className="flex flex-wrap gap-3">

          <button
            onClick={startLesson}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            Start
          </button>

          <button
            onClick={completeLesson}
            className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            Complete
          </button>

          <button
            onClick={cancelLesson}
            className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700"
          >
            Cancel
          </button>


      <button
    onClick={() =>
      setRescheduleOpen(!rescheduleOpen)
    }
    className="px-4 py-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
  >
    Reschedule
  </button>


{rescheduleOpen && (
  <div className="border rounded-2xl p-4 bg-gray-50 space-y-4">

    <h4 className="font-semibold">
      Request Reschedule
    </h4>

    <div className="grid md:grid-cols-2 gap-3">

      <input
        type="date"
        value={rescheduleDate}
        onChange={(e) =>
          setRescheduleDate(e.target.value)
        }
        className="border rounded-xl px-3 py-2"
      />

      <input
        type="time"
        value={rescheduleTime}
        onChange={(e) =>
          setRescheduleTime(e.target.value)
        }
        className="border rounded-xl px-3 py-2"
      />

      <input
        type="number"
        value={rescheduleDuration}
        onChange={(e) =>
          setRescheduleDuration(
            Number(e.target.value)
          )
        }
        className="border rounded-xl px-3 py-2"
        placeholder="Minutes"
      />

      <input
        type="text"
        value={rescheduleReason}
        onChange={(e) =>
          setRescheduleReason(
            e.target.value
          )
        }
        className="border rounded-xl px-3 py-2"
        placeholder="Reason"
      />

    </div>

    <button
      onClick={handleRescheduleRequest}
      className="px-4 py-2 bg-blue-600 text-white rounded-xl"
    >
      Send Request
    </button>

  </div>
)}


        </div>
      </div>

    ) : dashboard?.offers?.length > 0 ? (

      /* OFFERS */
      <div className="space-y-4">

        <div className="bg-white rounded-2xl shadow border p-5">
          <h3 className="text-xl font-semibold">
            Pending Offers
          </h3>
        </div>

        {dashboard.offers.map((o) => {
          const rowId =
            o.offer_id || o.lesson_request_id;

          return (
            <div
              key={rowId}
              className="bg-white rounded-2xl shadow border p-5 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-3 text-sm">

                <div>
                  <p className="text-gray-500">
                    Offer ID
                  </p>

                  <p className="font-medium break-all">
                    {o.offer_id || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Request ID
                  </p>

                  <p className="font-medium break-all">
                    {o.lesson_request_id}
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  onClick={() => handleAccept(o)}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
                >
                  Accept
                </button>

                <button
                  onClick={() =>
                    setCounterOpenId(rowId)
                  }
                  className="px-4 py-2 rounded-xl bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  Counter
                </button>

              </div>

              {/* COUNTER PANEL */}
              {counterOpenId === rowId && (
                <div className="border rounded-2xl p-4 bg-gray-50 space-y-4">

                  <h4 className="font-semibold">
                    Counter Offer
                  </h4>

                  <div className="grid md:grid-cols-2 gap-3">

                    <input
                      type="date"
                      value={counterDate}
                      onChange={(e) =>
                        setCounterDate(
                          e.target.value
                        )
                      }
                      className="border rounded-xl px-3 py-2"
                    />

                    <input
                      type="time"
                      value={counterTime}
                      onChange={(e) =>
                        setCounterTime(
                          e.target.value
                        )
                      }
                      className="border rounded-xl px-3 py-2"
                    />

                    <input
                      type="number"
                      value={counterDuration}
                      onChange={(e) =>
                        setCounterDuration(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      placeholder="Duration (mins)"
                      className="border rounded-xl px-3 py-2"
                    />

                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) =>
                        setCounterPrice(
                          Number(
                            e.target.value
                          )
                        )
                      }
                      placeholder="Price"
                      className="border rounded-xl px-3 py-2"
                    />

                  </div>

                  <div className="flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        handleCounter(o)
                      }
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Send Counter
                    </button>

                    <button
                      onClick={() =>
                        setCounterOpenId(null)
                      }
                      className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
                    >
                      Close
                    </button>

                  </div>

                </div>
              )}

            </div>
          );
        })}
      </div>

    ) : (

      /* IDLE */
      <div className="bg-white rounded-2xl shadow border p-6 text-center">
        <p className="text-gray-500">
          Waiting for requests...
        </p>
      </div>

    )}

  </div>
);
}
