import { useEffect, useState } from "react";

import ReplaySummaryCard
from "./ReplaySummaryCard";

import ActiveAlertsTable
from "./ActiveAlertsTable";

import ValidationReportTable
from "./ValidationReportTable";

import SeveritySummaryCard
from "./SeveritySummaryCard";

import GovernanceHealthBanner
from "./GovernanceHealthBanner";

import ReplayLockTable
from "./ReplayLockTable";

import IntegrityStatusCard
from "./IntegrityStatusCard";

import EventStreamIntegrityCard
from "./EventStreamIntegrityCard";

import GovernanceIncidentTable
from "./GovernanceIncidentTable";

import GovernanceMetricsCards
from "./GovernanceMetricsCards";


export default function GovernanceDashboard() {

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [locks, setLocks] =
    useState([]);

  const [integrity, setIntegrity] =
    useState(null);

  const [incidents, setIncidents] =
    useState([]);

  const [metrics, setMetrics] =
  useState(null);

useEffect(() => {

  let mounted = true;

  async function loadGovernance() {

    try {

      const res = await fetch(
        "http://localhost:5173/admin/projection-governance"
      );

      const json =
        await res.json();

      if (mounted) {

        setData(json);

        const lockRes =
  await fetch(
    "http://localhost:5173/admin/replay-locks"
  );

const lockJson =
  await lockRes.json();

setLocks(lockJson);


const integrityRes =
  await fetch(
    "http://localhost:5173/admin/projection-integrity"
  );

const integrityJson =
  await integrityRes.json();

setIntegrity(
  integrityJson
);


const incidentRes =
  await fetch(
    "http://localhost:5173/admin/governance-incidents"
  );

const incidentJson =
  await incidentRes.json();

setIncidents(
  incidentJson
);


const metricsRes =
  await fetch(
    "http://localhost:5173/admin/governance-metrics"
  );

const metricsJson =
  await metricsRes.json();

setMetrics(
  metricsJson
);


      }

    }

    catch (err) {

      console.error(err);

    }

    finally {

      if (mounted) {

        setLoading(false);

      }

    }

  }

  // initial load
  loadGovernance();

  // polling
  const interval =
    setInterval(
      loadGovernance,
      5000
    );

  return () => {

    mounted = false;

    clearInterval(interval);

  };

}, []);  

  if (loading) {

    return (
      <div>
        Loading governance...
      </div>
    );

  }

  if (!data) {

    return (
      <div>
        Governance unavailable
      </div>
    );

  }

  return (

    <div className="space-y-6">


      <GovernanceHealthBanner

  alerts={data.active_alerts}

  reports={data.validation_reports}

/>


<GovernanceMetricsCards
  metrics={metrics}
/>

<IntegrityStatusCard
  integrity={integrity}
/>


<EventStreamIntegrityCard
  integrity={integrity}
/>


<GovernanceIncidentTable
  incidents={incidents}
/>

      <ReplaySummaryCard
        replay={data.latest_replay}
      />

      <SeveritySummaryCard
        severity={
          data.severity_summary
        }
      />

      <ActiveAlertsTable
        alerts={data.active_alerts}
      />

      <ValidationReportTable
        reports={
          data.validation_reports
        }
      />


    <ReplayLockTable
      locks={locks}
    />

    </div>

  );

}
