import { useState } from "react"
import { simulateDispatch } from "../api/adminApi"

export default function SimulationPanel() {

  const [zoneId, setZoneId] = useState("")
  const [startTime, setStartTime] = useState("")
  const [result, setResult] = useState(null)

  const runSimulation = async () => {

    try {

      const res = await simulateDispatch({
        zone_id: zoneId,
        requested_start_time: startTime
      })

      setResult(res.data)

    } catch (err) {

      console.error("Simulation error:", err)

    }

  }

  return (

    <div className="space-y-6">

      <div className="bg-white shadow rounded p-4">

        <h2 className="text-lg font-semibold mb-4">
          Dispatch Simulation
        </h2>

        <div className="space-y-3">

          <input
            className="border p-2 w-full"
            placeholder="Zone ID"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
          />

          <input
            className="border p-2 w-full"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <button
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={runSimulation}
          >
            Run Simulation
          </button>

        </div>

      </div>

      {result && (

        <div className="bg-white shadow rounded p-4">

          <h3 className="font-semibold mb-2">
            Simulation Result
          </h3>

          <pre className="text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>

        </div>

      )}

    </div>

  )
}
