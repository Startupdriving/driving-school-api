export default function ValidationReportTable({
  reports
}) {


async function replayProjection(
  projectionName
) {

  try {

    const res = await fetch(

      `http://localhost:5173/admin/replay-projection/${projectionName}`,

      {
        method: "POST"
      }

    );

    const json =
      await res.json();

    console.log(
      "REPLAY RESULT:",
      json
    );

    alert(
      `Replay complete for ${projectionName}`
    );

  }

  catch (err) {

    console.error(err);

    alert(
      "Replay failed"
    );

  }

}


  return (

    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-xl font-semibold text-white">

          Replay Validation Reports

        </h2>

        <div className="text-sm text-zinc-400">

          {reports.length} reports

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="text-left text-zinc-400 border-b border-zinc-800">

              <th className="pb-3">

                Projection

              </th>

              <th className="pb-3">

                Validation

              </th>

              <th className="pb-3">

                Severity

              </th>

              <th className="pb-3">

                Expected

              </th>

              <th className="pb-3">

                Actual

              </th>

              <th className="pb-3">

                Lag

              </th>

              <th className="pb-3">

                Rows

              </th>

              <th className="pb-3">

                Validated

              </th>


                <th className="pb-3">

                  Actions

                 </th>

            </tr>

          </thead>

          <tbody>

            {reports.map((report, idx) => (

              <tr
                key={idx}
                className="border-b border-zinc-800"
              >

                <td className="py-4 text-white">

                  {report.projection_name}

                </td>

                <td className="py-4">

                  <ValidationBadge
                    status={
                      report.validation_status
                    }
                  />

                </td>

                <td className="py-4">

                  <SeverityBadge
                    severity={
                      report.severity
                    }
                  />

                </td>

                <td className="py-4 text-zinc-300">

                  {report.expected_sequence}

                </td>

                <td className="py-4 text-zinc-300">

                  {report.actual_sequence}

                </td>

                <td className="py-4 text-zinc-300">

                  {report.lag}

                </td>

                <td className="py-4 text-zinc-300">

                  {report.projection_row_count}

                </td>

                <td className="py-4 text-zinc-400">

                  {
                    new Date(
                      report.validated_at
                    ).toLocaleString()
                  }

                </td>

                  <td className="py-4">

  <button

    onClick={() =>
      replayProjection(
        report.projection_name
      )
    }

    className="
      bg-blue-900
      hover:bg-blue-800
      text-blue-200
      px-3 py-1
      rounded
      text-xs
    "

  >

    Replay

  </button>

</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}

function ValidationBadge({
  status
}) {

  const styles = {

    converged:
      "bg-green-900 text-green-300",

    overprocessed:
      "bg-blue-900 text-blue-300",

    lagging:
      "bg-yellow-900 text-yellow-300",

    corrupted:
      "bg-red-900 text-red-300"

  };

  return (

    <span
      className={`
        px-2 py-1 rounded text-xs font-medium
        ${styles[status] || "bg-zinc-800 text-zinc-200"}
      `}
    >

      {status}

    </span>

  );

}

function SeverityBadge({
  severity
}) {

  const styles = {

    critical:
      "bg-red-900 text-red-300",

    warning:
      "bg-yellow-900 text-yellow-300",

    low:
      "bg-blue-900 text-blue-300",

    info:
      "bg-zinc-700 text-zinc-200"

  };

  return (

    <span
      className={`
        px-2 py-1 rounded text-xs font-medium
        ${styles[severity] || "bg-zinc-800 text-zinc-200"}
      `}
    >

      {severity}

    </span>

  );

}
