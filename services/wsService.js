const clients = new Map(); // key → ws

// 🔵 REGISTER
function registerClient(id, ws) {

console.log("🟢 REGISTER CLIENT:", id);

  clients.set(id, ws);
}

// 🔴 REMOVE
function removeClient(ws) {
  for (const [id, client] of clients.entries()) {
    if (client === ws) {
      clients.delete(id);
    }
  }
}

// 🟢 EMIT TO STUDENT
function emitToStudent(student_id, data) {
  const client = clients.get(student_id);

  if (client) {
    client.send(JSON.stringify(data));
  }
}

// 🟢 EXISTING
function emitToInstructor(instructor_id, data) {


// 🔥 DEBUG LOGS (ADD HERE)
  console.log("📡 EMIT TO:", instructor_id);
  console.log("📡 CLIENT EXISTS:", clients.has(instructor_id));


  const client = clients.get(instructor_id);

  if (client) {
    client.send(JSON.stringify(data));
  }
}

export {
  registerClient,
  removeClient,
  emitToInstructor,
  emitToStudent
};
