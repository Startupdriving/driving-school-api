export default function ReplaySummaryCard({
  replay
}) {

  if (!replay) {

    return (

      <div className="bg-zinc-900 p-4 rounded">

        No replay data

      </div>

    );

  }

  return (

    <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">

      <div className="flex items-center justify-between mb-4">

        <h2 className="text-xl font-semibold text-white">

          Replay Summary

        </h2>

        <div
          className={`
            px-3 py-1 rounded text-sm font-medium

            ${
              replay.replay_status ===
              "completed"

                ? "bg-green-900 text-green-300"

                : "bg-red-900 text-red-300"
            }
          `}
        >

          {replay.replay_status}

        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

        <MetricCard
          title="Replay Type"
          value={replay.replay_type}
        />

        <MetricCard
          title="Total Events"
          value={replay.total_events}
        />

        <MetricCard
          title="Successful"
          value={replay.successful_events}
        />

        <MetricCard
          title="Failed"
          value={replay.failed_events}
        />

        <MetricCard
          title="Duration"
          value={`${replay.duration_ms} ms`}
        />

        <MetricCard
          title="Throughput"
          value={`${replay.replay_throughput_eps} eps`}
        />

      </div>

    </div>

  );

}

function MetricCard({
  title,
  value
}) {

  return (

    <div className="bg-zinc-800 rounded p-4">

      <div className="text-sm text-zinc-400 mb-1">

        {title}

      </div>

      <div className="text-lg font-semibold text-white">

        {value}

      </div>

    </div>

  );

}
