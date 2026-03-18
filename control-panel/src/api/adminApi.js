import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:5173/read"
})

export const getSystemHealth = () => {
  return api.get("/admin/system-health")
}

export const getDispatchMetrics = () => {
  return api.get("/admin/dispatch-metrics")
}


export const getRecentActivity = () => {
  return api.get("/admin/recent-activity")
}


export const simulateDispatch = (payload) => {
  return api.post("/admin/simulate-dispatch", payload)
}

export const rebuildProjections = () => {
  return api.post("/admin/rebuild-projections")
}

export async function getEventStream() {
  const res = await fetch("http://localhost:5173/read/event-stream");
  return res.json();
}

export async function getInstructorLocations() {
  const res = await fetch("http://localhost:5173/read/instructor-locations");
  return res.json();
}

export const getLiquidityPressure = () =>
  fetch("http://localhost:5173/read/admin/liquidity-pressure").then(r => r.json());

export const getActiveLessonsMap = () =>
  fetch("http://localhost:5173/read/admin/active-lessons-map").then(r => r.json());

export const getDispatchObservability = () =>
  fetch("http://localhost:5173/read/dispatch-observability").then(r => r.json());

export const getLiquidityRisk = () =>
  fetch("http://localhost:5173/read/admin/liquidity-risk").then(r => r.json());

export const getInstructorDrift = () =>
  fetch("http://localhost:5173/read/admin/instructor-drift").then(r => r.json());

export const getDispatchReplay = (lessonId) =>
  fetch(`http://localhost:5173/read/dispatch-observability?lesson_request_id=${lessonId}`)
    .then(r => r.json());
