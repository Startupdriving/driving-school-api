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

export const getLiquidityPressure = () => {
  return api.get("/admin/liquidity-pressure")
}

export const getRecentActivity = () => {
  return api.get("/admin/recent-activity")
}

export const getEventStream = (id) => {
  return api.get(`/event-stream?identity_id=${id}`)
}

export const getDispatchObservability = (id) => {
  return api.get(`/dispatch-observability?lesson_request_id=${id}`)
}

export const simulateDispatch = (payload) => {
  return api.post("/admin/simulate-dispatch", payload)
}

export const rebuildProjections = () => {
  return api.post("/admin/rebuild-projections")
}
