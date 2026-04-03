import { useState } from "react"
import { requestLesson } from "../../api/adminApi"

export default function RequestLesson({ onSuccess }) {
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    setLoading(true)

    const res = await requestLesson({
      student_id: "0bfa16c8-a68d-4929-9747-13c518a15e0d",
      pickup_lat: 31.45,
      pickup_lng: 74.26,
      requested_start_time: new Date().toISOString(),
      requested_end_time: new Date(Date.now() + 3600000).toISOString(),
    })

     console.log("✅ NEW LESSON CREATED:", res.lesson_request_id);
     console.log("API RESPONSE:", res);

    onSuccess(res.lesson_request_id)
    setLoading(false)
  }

  return (
    <button onClick={handleRequest} disabled={loading}>
      {loading ? "Requesting..." : "Request Lesson"}
    </button>
  )
}
