import { useEffect, useState } from "react"
import { getDispatchMetrics } from "../api/adminApi"
import StatCard from "../components/StatCard"

export default function DispatchMonitor() {

  const [data, setData] = useState(null)

  useEffect(() => {

    const load = () => {
      getDispatchMetrics().then(res => setData(res.data))
    }

    load()

    const interval = setInterval(load, 5000)

    return () => clearInterval(interval)

  }, [])

  if (!data) return <div>Loading dispatch metrics...</div>

  return (

    <div className="grid grid-cols-3 gap-4">

      <StatCard
        title="Offers Sent"
        value={data.offers_sent}
      />

      <StatCard
        title="Offers Accepted"
        value={data.offers_accepted}
      />

      <StatCard
        title="Instructors Participating"
        value={data.instructors_participating}
      />

    </div>

  )
}
