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
