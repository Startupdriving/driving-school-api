import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    mobile_number: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(key, value) {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        "http://localhost:5173/write/student/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(form)
        }
      );

      const data = await res.json();

      if (data.status === "ok") {
        localStorage.setItem(
          "student_token",
          data.token
        );

        localStorage.setItem(
          "student_profile",
          JSON.stringify(data.student)
        );

        navigate("/student");
      } else {
        setMessage(
          data.error || "Login failed"
        );
      }

    } catch (err) {
      setMessage("Server error");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow rounded p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold mb-6">
          Student Login
        </h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <input
            className="w-full border p-3 rounded"
            placeholder="Mobile Number"
            value={form.mobile_number}
            onChange={e =>
              updateField(
                "mobile_number",
                e.target.value
              )
            }
          />

          <input
            type="password"
            className="w-full border p-3 rounded"
            placeholder="Password"
            value={form.password}
            onChange={e =>
              updateField(
                "password",
                e.target.value
              )
            }
          />

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded"
          >
            {loading
              ? "Signing in..."
              : "Login"}
          </button>

        </form>

        {message && (
          <p className="mt-4 text-sm text-red-600">
            {message}
          </p>
        )}

        <p className="mt-6 text-sm text-gray-600">
          New student?{" "}
          <a
            href="/student-signup"
            className="text-blue-600 underline"
          >
            Create account
          </a>
        </p>

      </div>
    </div>
  );
}
