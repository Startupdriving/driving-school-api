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

export const getEventStream = async (id) => {
  const res = await fetch(`http://localhost:5173/read/event-stream?identity_id=${id}`)

  if (!res.ok) {
    const text = await res.text()
    console.error("EVENT STREAM ERROR:", text)
    throw new Error("Event stream failed")
  }

  return res.json()
}

export async function getInstructorLocations() {
  const res = await fetch("http://localhost:5173/read/instructor-locations");
  return res.json();
}

export const getLiquidityPressure = () =>
  fetch("http://localhost:5173/read/admin/liquidity-pressure").then(r => r.json());

export const getActiveLessonsMap = () =>
  fetch("http://localhost:5173/read/admin/active-lessons-map").then(r => r.json());

export const getDispatchObservability = (lessonId) => {

  if (!lessonId) return Promise.resolve([]); // safety

  return fetch(
    `http://localhost:5173/read/dispatch-observability?lesson_request_id=${lessonId}`
  ).then(r => r.json());

};

export const getLiquidityRisk = () =>
  fetch("http://localhost:5173/read/admin/liquidity-risk").then(r => r.json());

export const getInstructorDrift = () =>
  fetch("http://localhost:5173/read/admin/instructor-drift").then(r => r.json());

export const getDispatchReplay = (lessonId) =>
  fetch(`http://localhost:5173/read/dispatch-observability?lesson_request_id=${lessonId}`)
    .then(r => r.json());

export async function getZones() {
  const res = await fetch("http://localhost:5173/read/zones");
  return res.json();
}


const BASE_URL = "http://localhost:5173" // your backend port

export const requestLesson = async (data) => {
  const idempotencyKey = crypto.randomUUID()

  const res = await fetch(`${BASE_URL}/write/lesson-request/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey, // ⭐ REQUIRED
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error("API ERROR:", text)
    throw new Error("Request failed")
  }

  return res.json()
}


export const getInstructorOffers = async (instructorId) => {
  const res = await fetch(
    `http://localhost:5173/read/instructor/offers?instructor_id=${instructorId}`
  )

  if (!res.ok) {
    const text = await res.text()
    console.error("OFFERS ERROR:", text)
    throw new Error("Failed to fetch offers")
  }

  return res.json()
}


export async function acceptOffer(data) {
  const res = await fetch("http://localhost:5173/write/offer/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error("accept_offer_failed");
  }

  return await res.json();
}


// ==============================
// USERS MANAGEMENT API
// ==============================

export const getUsersSummary = () =>
  fetch("http://localhost:5173/admin/users/summary")
    .then(r => r.json());

export const getAdmins = () =>
  fetch("http://localhost:5173/admin/admins")
    .then(r => r.json());

export const getStudents = () =>
  fetch("http://localhost:5173/admin/students")
    .then(r => r.json());

export const getInstructors = () =>
  fetch("http://localhost:5173/admin/instructors")
    .then(r => r.json());

export async function createInstructor(payload) {
  const res = await fetch(
    "http://localhost:5173/admin/instructors/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return await res.json();
}


export async function updateInstructorStatus(id, status) {
  const res = await fetch(
    `http://localhost:5173/admin/instructors/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    }
  );

  return await res.json();
}


export const getInstructorDetail = (id) =>
  fetch(`http://localhost:5173/admin/instructors/${id}`)
    .then(r => r.json());

export async function updateInstructor(id, payload) {
  const res = await fetch(
    `http://localhost:5173/admin/instructors/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return await res.json();
}


export const getPendingInstructors = () =>
  fetch("http://localhost:5173/admin/approvals/instructors")
    .then(r => r.json());
