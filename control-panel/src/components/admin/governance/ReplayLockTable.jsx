export default function ReplayLockTable({
  locks
}) {

  return (

    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-xl font-semibold text-white">

          Replay Locks

        </h2>

        <div className="text-sm text-zinc-400">

          {locks.length} locks

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full text-sm">

          <thead>

            <tr className="text-left text-zinc-400 border-b border-zinc-800">

              <th className="pb-3">

                Lock Name

              </th>

              <th className="pb-3">

                Status

              </th>

              <th className="pb-3">

                Acquired

              </th>

              <th className="pb-3">

                Released

              </th>

            </tr>

          </thead>

          <tbody>

            {locks.map((lock, idx) => (

              <tr
                key={idx}
                className="border-b border-zinc-800"
              >

                <td className="py-4 text-white">

                  {lock.lock_name}

                </td>

                <td className="py-4">

                  <StatusBadge
                    status={lock.lock_status}
                  />

                </td>

                <td className="py-4 text-zinc-300">

                  {
                    new Date(
                      lock.acquired_at
                    ).toLocaleString()
                  }

                </td>

                <td className="py-4 text-zinc-400">

                  {
                    lock.released_at
                      ? new Date(
                          lock.released_at
                        ).toLocaleString()
                      : "ACTIVE"
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

function StatusBadge({
  status
}) {

  const styles = {

    active:
      "bg-green-900 text-green-300",

    released:
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
