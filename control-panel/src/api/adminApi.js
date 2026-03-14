import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:5173/read"
})

export const getSystemHealth = () => {
  return api.get("/admin/system-health")
}
