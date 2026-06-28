import {
  useEffect,
  useState
} from "react";


import {
  fetchProjectionHealth,
  replayProjection,
  resetCheckpoint,
  verifyProjection
}
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
              Checkpoint
            </th>

            <th className="text-left p-2">
              Global
            </th>

            <th className="text-left p-2">
              Lag
            </th>

            <th className="text-left p-2">
               Events
            </th>

            <th className="text-left p-2">
              Status
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
                {p.event_count}
              </td>


              <td
               className={`p-2 font-semibold ${
               p.healthy
               ? "text-green-600"
               : "text-red-600"
               }`}
               >

              {p.healthy
              ? "Healthy"
              : "Lagging"}

             </td>


              <td className="p-2 space-x-2">

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

           <button
            className="
            bg-red-600
            text-white
            px-3
            py-1
            rounded
            "
             onClick={() =>
              reset(
               p.projection_name
             )
           }
         >
           Reset
         </button>

<button
  className="
    bg-green-600
    text-white
    px-3
    py-1
    rounded
  "
  onClick={() =>
    verify(
      p.projection_name
    )
  }
>
  Verify
</button>

       </td>



            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}


async function reset(
  projectionName
) {

  const confirmed =
    window.confirm(
      `Reset checkpoint for ${projectionName}?`
    );

  if (!confirmed) {
    return;
  }

  try {

    await resetCheckpoint(
      projectionName
    );

    await load();

  } catch (err) {

    console.error(err);

  }

}


async function verify(
  projectionName
) {

  try {

    const result =
      await verifyProjection(
        projectionName
      );

    alert(

      result.healthy

      ? `✅ PASS

Expected: ${result.expected_rows}
Actual: ${result.actual_rows}`

      : `❌ FAIL

Expected: ${result.expected_rows}
Actual: ${result.actual_rows}`

    );

  }

  catch (err) {

    console.error(err);

    alert(
      "Verification failed"
    );

  }

}
