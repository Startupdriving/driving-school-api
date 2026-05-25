export default function ActiveAlertsTable({
  alerts
}) {

  return (

    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-xl font-semibold text-white">

          Active Drift Alerts

        </h2>

        <div className="text-sm text-zinc-400">

          {alerts.length} active

        </div>

      </div>

      {
        alerts.length === 0
          ? (
            <div className="text-zinc-400">

              No active alerts

            </div>
          )
          : (
            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="text-left text-zinc-400 border-b border-zinc-800">

                    <th className="pb-3">

                      Projection

                    </th>

                    <th className="pb-3">

                      Status

                    </th>

                    <th className="pb-3">

                      Severity

                    </th>

                    <th className="pb-3">

                      Message

                    </th>

                    <th className="pb-3">

                      Detected

                    </th>

                  </tr>

                </thead>

                <tbody>

                  {alerts.map((alert, idx) => (

                    <tr
                      key={idx}
                      className="border-b border-zinc-800"
                    >

                      <td className="py-4 text-white">

                        {alert.projection_name}

                      </td>

                      <td className="py-4">

                        <StatusBadge
                          status={
                            alert.drift_status
                          }
                        />

                      </td>

                      <td className="py-4">

                        <SeverityBadge
                          severity={
                            alert.severity
                          }
                        />

                      </td>

                      <td className="py-4 text-zinc-300">

                        {alert.alert_message}

                      </td>

                      <td className="py-4 text-zinc-400">

                        {
                          new Date(
                            alert.detected_at
                          ).toLocaleString()
                        }

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )
      }

    </div>

  );

}

function StatusBadge({
  status
}) {

  const styles = {

    lagging:
      "bg-yellow-900 text-yellow-300",

    overprocessed:
      "bg-blue-900 text-blue-300",

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
