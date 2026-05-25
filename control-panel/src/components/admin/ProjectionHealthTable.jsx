import {
  useEffect,
  useState
} from "react";

import { fetchProjectionHealth, replayProjection }
from "../../api/adminProjectionApi";


export default function ProjectionHealthTable() {

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    load();

    const interval =
      setInterval(load, 5000);

    return () =>
      clearInterval(interval);

  }, []);

  async function load() {

    try {

      const result =
        await fetchProjectionHealth();

      setData(result);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }

  if (loading) {
    return <div>Loading...</div>;
  }


async function replay(
  projectionName
) {

  try {

    await replayProjection(
      projectionName
    );

    await load();

  } catch (err) {

    console.error(err);

  }

}



  return (

    <div className="bg-white rounded shadow p-4">

      <h2 className="text-xl font-bold mb-4">
        Projection Health
      </h2>

      <table className="w-full border-collapse">

        <thead>

          <tr className="border-b">

            <th className="text-left p-2">
              Projection
            </th>

            <th className="text-left p-2">
              Seq
            </th>

            <th className="text-left p-2">
              Global
            </th>

            <th className="text-left p-2">
              Lag
            </th>

            <th className="text-left p-2">
              Healthy
            </th>

            <th className="text-left p-2">
              Actions
            </th>


          </tr>

        </thead>

        <tbody>

          {data.projections.map(p => (

            <tr
              key={p.projection_name}
              className="border-b"
            >

              <td className="p-2">
                {p.projection_name}
              </td>

              <td className="p-2">
                {p.last_processed_sequence}
              </td>

              <td className="p-2">
                {p.global_sequence}
              </td>

              <td className="p-2">
                {p.lag}
              </td>

              <td className="p-2">

                {p.healthy
                  ? "🟢 Healthy"
                  : "🔴 Lagging"}
              </td>


              <td className="p-2">

  <button
    className="
      bg-blue-600
      text-white
      px-3
      py-1
      rounded
    "

    onClick={() =>
      replay(
        p.projection_name
      )
    }
  >
    Replay
  </button>

</td>



            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}
