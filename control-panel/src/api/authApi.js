export async function adminLogin(username, password) {
  const res = await fetch("http://localhost:5173/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  return await res.json();
}
