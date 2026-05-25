export default function GovernanceIncidentTable({
  incidents
}) {

async function resolveIncident(
  incidentId
) {

  try {

    await fetch(

      `http://localhost:5173/admin/governance-incidents/${incidentId}/resolve`,

      {
        method: "POST"
      }

    );

    alert(
      "Incident resolved"
    );

  }

  catch (err) {

    console.error(err);

    alert(
      "Resolution failed"
    );

  }

}


async function replayIncident(
  incident
) {

  try {

    const action =
      incident.recommended_action;

    // =================================================
    // PARSE ACTION
    // =================================================

    if (

      action.startsWith(
        "replay_projection:"
      )

    ) {

      const projectionName =
        action.split(":")[1];


    await fetch(

  `http://localhost:5173/admin/governance-incidents/${incident.id}/remediation-started`,

  {

    method: "POST"

  }

);


     const replayRes =
      await fetch(

        `http://localhost:5173/admin/replay-projection/${projectionName}`,

        {

          method: "POST"

        }

      );
    const replayJson =
  await replayRes.json();
    
    if (replayJson.success) {

  const verifyRes =
    await fetch(

      `http://localhost:5173/admin/verify-incident-healing/${incident.id}`,

      {

        method: "POST"

      }

    );

  const verifyJson =
    await verifyRes.json();

  if (verifyJson.healed) {

    alert(

      "Replay healed corruption and resolved incident"

    );

  }

  else {

    alert(

      "Replay completed but corruption still exists"

    );

  }

}

      alert(
        "Replay completed and incident resolved"
      );

    }

  }

  catch (err) {

    console.error(err);

    alert(
      "Replay failed"
    );

  }

}

  return (

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h2 className="text-xl font-semibold text-white">

            Governance Incidents

          </h2>

          <p className="text-zinc-400 text-sm mt-1">

            Operational governance violations

          </p>

        </div>

        <div className="text-zinc-400 text-sm">

          {incidents.length} incidents

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="border-b border-zinc-800 text-zinc-400 text-left">

              <th className="pb-3">

                Severity

              </th>

              <th className="pb-3">

                Violation

              </th>

              <th className="pb-3">

                Stream

              </th>

              <th className="pb-3">

                Recommended Action

              </th>

              <th className="pb-3">

                Status

              </th>

              <th className="pb-3">

                Detected

              </th>

              <th className="pb-3">

                Actions

              </th>

            </tr>

          </thead>

          <tbody>

            {incidents.map((incident) => (

              <tr
                key={incident.id}
                className="border-b border-zinc-800"
              >

                <td className="py-4">

                  <SeverityBadge
                    severity={incident.severity}
                  />

                </td>

                <td className="py-4 text-white">

                  {incident.violation_type}

                </td>

                <td className="py-4 text-zinc-300">

                  {incident.affected_stream}

                </td>

                <td className="py-4 text-blue-300">

                  {incident.recommended_action}

                </td>

                <td className="py-4">

                  <StatusBadge
                    status={incident.governance_status}
                  />

                </td>

                <td className="py-4 text-zinc-400">

                  {
                    new Date(
                      incident.detected_at
                    ).toLocaleString()
                  }

                </td>


                <td className="py-4">


{

  incident.governance_status === "open"

  && (

    <button

      onClick={async () => {

        await fetch(

          `http://localhost:5173/admin/governance-incidents/${incident.id}/acknowledge`,

          {

            method: "POST"

          }

        );

      }}

      className="
        bg-yellow-900
        hover:bg-yellow-800
        text-yellow-300
        px-3 py-1
        rounded
        text-xs
        mr-2
      "

    >

      Acknowledge

    </button>

  )

}


<button

  onClick={() =>
    replayIncident(
      incident
    )
  }

  className="
    bg-blue-900
    hover:bg-blue-800
    text-blue-300
    px-3 py-1
    rounded
    text-xs
    mr-2
  "

>

  Replay

</button>



  {

    incident.governance_status === "open"

    && (

      <button

        onClick={() =>
          resolveIncident(
            incident.id
          )
        }

        className="
          bg-green-900
          hover:bg-green-800
          text-green-300
          px-3 py-1
          rounded
          text-xs
        "

      >

        Resolve

      </button>

    )

  }

</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}

function SeverityBadge({
  severity
}) {

  const styles = {

    critical:
      "bg-red-900 text-red-300",

    high:
      "bg-orange-900 text-orange-300",

    medium:
      "bg-yellow-900 text-yellow-300",

    low:
      "bg-blue-900 text-blue-300"

  };

  return (

    <span
      className={`
        px-2 py-1 rounded text-xs font-medium
        ${styles[severity]}
      `}
    >

      {severity}

    </span>

  );

}

function StatusBadge({
  status
}) {

  const styles = {

  open:
    "bg-red-900 text-red-300",

  acknowledged:
    "bg-yellow-900 text-yellow-300",

  remediation_in_progress:
    "bg-blue-900 text-blue-300",

  healed:
    "bg-green-900 text-green-300",

  resolved:
    "bg-zinc-800 text-zinc-300"

};

  return (

    <span
      className={`
        px-2 py-1 rounded text-xs font-medium
        ${styles[status]}
      `}
    >

      {status}

    </span>

  );

}
