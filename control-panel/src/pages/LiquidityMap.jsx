import { useEffect, useState } from "react"
import { getLiquidityPressure } from "../api/adminApi"

export default function LiquidityMap() {

  const [zones, setZones] = useState([])

  useEffect(() => {

    const load = () => {
      getLiquidityPressure().then(res => setZones(res.data))
    }

    load()

    const interval = setInterval(load, 5000)

    return () => clearInterval(interval)

  }, [])

  if (!zones.length) return <div>Loading zone liquidity...</div>

  return (

    <div className="bg-white shadow rounded p-4">

      <h2 className="text-lg font-semibold mb-4">
        Zone Liquidity
      </h2>

      <table className="w-full">

        <thead>
          <tr className="text-left border-b">
            <th>Zone</th>
            <th>Demand</th>
            <th>Supply</th>
            <th>Pressure</th>
          </tr>
        </thead>

       <tbody>

  {zones.map((zone) => {

    const pressure = zone.recent_requests_5m - zone.online_instructors

    return (

      <tr key={zone.zone_id} className="border-b">

        <td>{zone.zone_id}</td>

        <td>{zone.recent_requests_5m}</td>

        <td>{zone.online_instructors}</td>

        <td
          className={
            pressure > 0
              ? "text-red-600 font-semibold"
              : pressure < 0
              ? "text-green-600 font-semibold"
              : "text-gray-500"
          }
        >
          {pressure}
        </td>

      </tr>

    )

  })}

</tbody>

      </table>

    </div>

  )
}
