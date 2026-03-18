import { useState } from "react"
import { getEventStream, getDispatchObservability } from "../api/adminApi"
import { safeArray } from "../api/normalizers";

export default function LessonInspector() {

  const [lessonId, setLessonId] = useState("")
  const [events, setEvents] = useState([])
  const [dispatch, setDispatch] = useState([])
  const safeEvents = safeArray(events);
  const safeDispatch = safeArray(dispatch);

  const inspect = async () => {

    if (!lessonId) return

    const eventsRes = await getEventStream(lessonId)
    const dispatchRes = await getDispatchObservability(lessonId)

    setEvents(eventsRes)
    setDispatch(dispatchRes)
  }


   const sortedEvents = safeEvents.sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
   );


   const hasDispatchStarted = sortedEvents.some(
    e => e.event_type === "lesson_request_dispatch_started"
   );

   const offerCount = sortedEvents.filter(
    e => e.event_type === "lesson_offer_sent"
   ).length;

   const isExpired = sortedEvents.some(
    e => e.event_type === "lesson_request_expired"
   );
  

  return (

    <div className="space-y-6">

      <div className="bg-white shadow rounded p-4">

        <h2 className="text-lg font-semibold mb-3">
          Lesson Inspector
        </h2>

        <div className="flex gap-2">

          <input
            className="border p-2 flex-1"
            placeholder="Enter lesson_request_id"
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={inspect}
          >
            Inspect
          </button>

        </div>

      </div>

      <div className="bg-white shadow rounded p-4">

        <h3 className="font-semibold mb-3">
          Event Timeline
        </h3>

        <ul className="space-y-2">

          {sortedEvents.map((event, i) => (

            <li key={i} className="border-b pb-2">

              <div className="font-medium">
                {event.event_type}
              </div>

              <div className="text-xs text-gray-500">
                {event.created_at}
              </div>

            </li>

          ))}

        </ul>

      </div>

      <div className="bg-white shadow rounded p-4">

        <h3 className="font-semibold mb-3">
          Dispatch Decisions
        </h3>
        
        <div className="mb-3 text-sm">
         <div>Dispatch Started: {hasDispatchStarted ? "✅" : "❌"}</div>
         <div>Offers Sent: {offerCount}</div>
         <div>Expired: {isExpired ? "⚠️ Yes" : "No"}</div>
         </div>

        <table className="w-full">

          <thead>
            <tr className="border-b">
              <th>Instructor</th>
              <th>Economic Score</th>
              <th>Wave</th>
              <th>Instructor Zone</th>
            </tr>
          </thead>

          <tbody>

            {safeDispatch.map((d, i) => (

              <tr key={i} className="border-b">

                <td>{d.instructor_id}</td>

                <td>{d.economic_score}</td>

                <td>{d.wave}</td>

                <td>{d.instructor_zone}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  )
}
