const clients = new Map();

// ✅ register
export function registerClient(instructor_id, ws) {
  clients.set(instructor_id, ws);
}

// ✅ remove
export function removeClient(ws) {
  for (const [id, client] of clients.entries()) {
    if (client === ws) {
      clients.delete(id);
      console.log("WS DISCONNECT:", id);
      break;
    }
  }
}

// ✅ emit
export function emitToInstructor(instructor_id, payload) {

  const ws = clients.get(instructor_id);

  if (!ws) {
    console.log("❌ WS NOT FOUND:", instructor_id);
    return;
  }

  if (ws.readyState !== 1) {
    console.log("❌ WS NOT OPEN:", instructor_id);
    return;
  }

  try {
    ws.send(JSON.stringify(payload));
    console.log("📡 WS SENT →", instructor_id, payload);
  } catch (err) {
    console.error("❌ WS SEND ERROR:", err.message);
  }
}
