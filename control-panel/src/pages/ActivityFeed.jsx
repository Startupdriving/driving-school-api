import { useEffect, useState } from "react"
import { getRecentActivity } from "../api/adminApi"

export default function ActivityFeed() {

  const [events, setEvents] = useState([])

  useEffect(() => {

    const load = () => {
      getRecentActivity().then(res => {
        console.log("Recent activity:", res.data)
        setEvents(res.data)
      })
    }

    load()

    const interval = setInterval(load, 5000)

    return () => clearInterval(interval)

  }, [])

  return (

    <div className="bg-white shadow rounded p-4">

      <h2 className="text-lg font-semibold mb-4">
        Recent Activity
      </h2>

      {events.length === 0 ? (

        <div className="text-gray-500">
          No recent activity yet
        </div>

      ) : (

        <ul className="space-y-2">

          {events.map((event, index) => (

            <li key={index} className="border-b pb-2">

              <div className="font-medium">
                {event.event_type}
              </div>

              <div className="text-sm text-gray-500">
                {event.identity_id}
              </div>

              <div className="text-xs text-gray-400">
                {event.created_at}
              </div>

            </li>

          ))}

        </ul>

      )}

    </div>

  )
}
