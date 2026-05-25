export default function IntegrityStatusCard({
  integrity
}) {

  const status =
    integrity?.student_active_lesson_projection
      ?.integrity_status;

  const healthy =
    status === "healthy";

  return (

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-xl font-semibold text-white">

            Projection Integrity

          </h2>

          <p className="text-zinc-400 mt-1 text-sm">

            Semantic projection validation

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

          {status}

        </div>

      </div>

      <div className="mt-6">

        <div className="text-zinc-300 text-sm">

          Rule:

        </div>

        <div className="text-white mt-1">

          {
            integrity
              ?.student_active_lesson_projection
              ?.rule
          }

        </div>

      </div>

      {
        !healthy && (

          <div className="mt-6">

            <div className="text-red-300 text-sm mb-2">

              Violations

            </div>

            <pre className="text-xs text-red-200 overflow-auto">

              {
                JSON.stringify(

                  integrity
                    ?.student_active_lesson_projection
                    ?.violations,

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
