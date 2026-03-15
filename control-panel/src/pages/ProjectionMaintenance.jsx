import { useState } from "react"
import { rebuildProjections } from "../api/adminApi"

export default function ProjectionMaintenance() {

  const [status, setStatus] = useState("idle")

  const runRebuild = async () => {

    try {

      setStatus("running")

      const res = await rebuildProjections()

      setStatus(res.data.status)

    } catch (err) {

      console.error("rebuild error:", err)

      setStatus("failed")

    }

  }

  return (

    <div className="bg-white shadow rounded p-4 space-y-4">

      <h2 className="text-lg font-semibold">
        Projection Maintenance
      </h2>

      <p className="text-sm text-gray-500">
        Rebuild all projections from the event log.
      </p>

      <button
        className="bg-red-600 text-white px-4 py-2 rounded"
        onClick={runRebuild}
      >
        Rebuild Projections
      </button>

      <div className="text-sm">

        Status: {status}

      </div>

    </div>

  )

}
