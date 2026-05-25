import axios from "axios";

const API =
  "http://localhost:5173";

export async function fetchDeadEvents() {

  const res = await axios.get(
    `${API}/admin/dead-events`
  );

  return res.data;

}



export async function retryDeadEvent(
  deadEventId
) {

  const res = await axios.post(
    `${API}/admin/retry-dead-event/${deadEventId}`
  );

  return res.data;

}
