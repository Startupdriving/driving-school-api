export default function EventStreamIntegrityCard({
  integrity
}) {

  const stream =
    integrity?.lesson_lifecycle_stream;

  const healthy =
    stream?.integrity_status
      === "healthy";

  return (

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-semibold text-white">

            Event Stream Integrity

          </h2>

          <p className="text-zinc-400 mt-1 text-sm">

            Lifecycle stream governance

          </p>

        </div>

        <div
          className={`
            px-3 py-1 rounded text-sm font-medium

            ${
              healthy
                ? "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            }
          `}
        >

          {
            stream?.integrity_status
          }

        </div>

      </div>

      <div className="mt-6">

        <div className="text-zinc-300 text-sm">

          Violations

        </div>

        <div className="text-white text-2xl mt-1">

          {
            stream?.violations?.length || 0
          }

        </div>

      </div>

      {
        !healthy && (

          <div className="mt-6">

            <pre className="text-xs text-red-200 overflow-auto">

              {
                JSON.stringify(

                  stream?.violations,

                  null,
                  2

                )
              }

            </pre>

          </div>

        )
      }

    </div>

  );

}
