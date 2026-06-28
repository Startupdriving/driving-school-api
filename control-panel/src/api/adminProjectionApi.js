import axios from "axios";

const API =
  "http://localhost:5173";

export async function fetchProjectionHealth() {

  const res = await axios.get(
    `${API}/admin/projection-health`
  );

  return res.data;

}


export async function replayProjection(
  projectionName
) {

  const res = await axios.post(
    `${API}/admin/replay-projection/${projectionName}`
  );

  return res.data;

}


export async function verifyAllProjections() {

  const res = await axios.get(
    `${API}/admin/verify-all-projections`
  );

  return res.data;

}

export async function resetCheckpoint(
  projectionName
) {

  const res = await axios.post(
    `${API}/admin/reset-checkpoint/${projectionName}`
  );

  return res.data;

}


export async function verifyProjection(
  projectionName
) {

  const res =
    await axios.get(
      `${API}/admin/verify-projection/${projectionName}`
    );

  return res.data;

}


