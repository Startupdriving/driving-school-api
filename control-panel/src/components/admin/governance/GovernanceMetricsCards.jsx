function MetricCard({

  title,

  value,

  color

}) {

  return (

    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">

      <div className="text-zinc-400 text-sm">

        {title}

      </div>

      <div
        className={`
          text-3xl font-bold mt-2
          ${color}
        `}
      >

        {value}

      </div>

    </div>

  );

}

export default function GovernanceMetricsCards({
  metrics
}) {

  if (!metrics) {

    return null;

  }

  return (

    <div className="grid grid-cols-5 gap-4">

      <MetricCard

        title="Open Incidents"

        value={
          metrics.open_incidents
        }

        color="text-red-400"

      />

      <MetricCard

        title="Critical Incidents"

        value={
          metrics.critical_incidents
        }

        color="text-orange-400"

      />

      <MetricCard

        title="Healed Incidents"

        value={
          metrics.healed_incidents
        }

        color="text-green-400"

      />

      <MetricCard

        title="Resolved Incidents"

        value={
          metrics.resolved_incidents
        }

        color="text-blue-400"

      />

      <MetricCard

        title="Active Remediations"

        value={
          metrics.active_remediations
        }

        color="text-yellow-400"

      />

    </div>

  );

}
