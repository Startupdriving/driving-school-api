import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/authApi";

export default function AuthLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    const data = await adminLogin(username, password);

    if (data.status === "ok") {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.admin));
      navigate("/");
    } else {
      setError("Invalid credentials");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Admin Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <br /><br />

        <button type="submit">Login</button>

        {error && <p>{error}</p>}
      </form>
    </div>
  );
}
