export default function SeveritySummaryCard({
  severity
}) {

  const severityMap = {

    critical: {
      label: "Critical",
      color:
        "bg-red-900 text-red-300"
    },

    warning: {
      label: "Warning",
      color:
        "bg-yellow-900 text-yellow-300"
    },

    low: {
      label: "Low",
      color:
        "bg-blue-900 text-blue-300"
    },

    info: {
      label: "Info",
      color:
        "bg-zinc-700 text-zinc-200"
    }

  };

  return (

    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">

      <h2 className="text-xl font-semibold text-white mb-4">

        Severity Overview

      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {Object.entries(severityMap)
          .map(([key, config]) => {

            const row =
              severity.find(
                s => s.severity === key
              );

            const count =
              row
                ? Number(row.count)
                : 0;

            return (

              <div
                key={key}
                className={`
                  rounded-lg p-5
                  ${config.color}
                `}
              >

                <div className="text-sm mb-2">

                  {config.label}

                </div>

                <div className="text-3xl font-bold">

                  {count}

                </div>

              </div>

            );

          })}

      </div>

    </div>

  );

}
