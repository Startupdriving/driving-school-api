import { useState } from "react"
import { requestLesson } from "../../api/adminApi"

export default function RequestLesson({ studentId, onRequest }) {
  const [loading, setLoading] = useState(false)

  const handleRequest = async () => {
    try {
      setLoading(true)

      const res = await requestLesson({
        student_id: studentId,
        pickup_lat: 31.45,
        pickup_lng: 74.26,
        requested_start_time: new Date().toISOString(),
        requested_end_time: new Date(Date.now() + 3600000).toISOString(),
      })

      console.log("✅ NEW LESSON CREATED:", res.lesson_request_id)

      // 🔥 IMPORTANT: refresh projection
      onRequest()

    } catch (err) {
      console.error("REQUEST ERROR:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleRequest} disabled={loading}>
      {loading ? "Requesting..." : "Request Lesson"}
    </button>
  )
}
