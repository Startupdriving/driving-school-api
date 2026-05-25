export default function GovernanceHealthBanner({

  alerts,
  reports

}) {

  let posture =
    "healthy";

  let message =
    "All governance systems operational";

  // =====================================================
  // CRITICAL ALERTS
  // =====================================================

  const criticalAlerts =
    alerts.filter(
      a => a.severity === "critical"
    );

  const warningAlerts =
    alerts.filter(
      a => a.severity === "warning"
    );

  const corruptedReports =
    reports.filter(
      r =>
        r.validation_status ===
        "corrupted"
    );

  const laggingReports =
    reports.filter(
      r =>
        r.validation_status ===
        "lagging"
    );

  // =====================================================
  // CLASSIFICATION
  // =====================================================

  if (
    criticalAlerts.length > 0 ||
    corruptedReports.length > 0
  ) {

    posture = "critical";

    message =
      "Critical governance anomalies detected";

  }

  else if (
    warningAlerts.length > 0 ||
    laggingReports.length > 0
  ) {

    posture = "degraded";

    message =
      "Governance degradation detected";

  }

  // =====================================================
  // STYLE MAP
  // =====================================================

  const styleMap = {

    healthy:
      "bg-green-950 border-green-800 text-green-300",

    degraded:
      "bg-yellow-950 border-yellow-800 text-yellow-300",

    critical:
      "bg-red-950 border-red-800 text-red-300"

  };

  return (

    <div
      className={`
        border rounded-lg p-5
        ${styleMap[posture]}
      `}
    >

      <div className="flex items-center justify-between">

        <div>

          <div className="text-sm uppercase tracking-wide mb-1 opacity-80">

            Governance Status

          </div>

          <div className="text-2xl font-bold">

            {posture.toUpperCase()}

          </div>

        </div>

        <div className="text-right">

          <div className="text-sm opacity-80">

            {message}

          </div>

          <div className="text-xs mt-1 opacity-60">

            Active Alerts: {alerts.length}

          </div>

        </div>

      </div>

    </div>

  );

}
