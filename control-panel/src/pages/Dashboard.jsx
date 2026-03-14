import { useEffect, useState } from "react"
import { getSystemHealth } from "../api/adminApi"
import StatCard from "../components/StatCard"

export default function Dashboard() {

  const [data, setData] = useState(null)

  useEffect(() => {

  const load = () => getSystemHealth().then(res => setData(res.data))

  load()
  const interval = setInterval(load, 5000)

  return () => clearInterval(interval)

}, [])

  if (!data) return <div>Loading system health...</div>

  return (

    <div className="grid grid-cols-4 gap-4">

      <StatCard
        title="Active Lesson Requests"
        value={data.active_lesson_requests}
      />

      <StatCard
        title="Active Lessons"
        value={data.active_lessons}
      />

      <StatCard
        title="Online Instructors"
        value={data.online_instructors}
      />

      <StatCard
        title="Pending Offers"
        value={data.pending_offers}
      />

    </div>

  )
}
