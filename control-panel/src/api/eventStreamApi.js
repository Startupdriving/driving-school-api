import axios from "axios";

const API =
  "http://localhost:5173";

export async function fetchEventStream() {

  const res = await axios.get(
    `${API}/admin/event-stream`
  );

  return res.data;

}



export async function fetchEntityEventStream(
  identityId
) {

  const res = await axios.get(
    `${API}/admin/event-stream/${identityId}`
  );

  return res.data;

}
