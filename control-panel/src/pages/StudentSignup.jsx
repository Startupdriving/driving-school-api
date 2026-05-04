import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentSignup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    age: "",
    city: "",
    preferred_language: "Punjabi",
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
        "http://localhost:5173/write/student/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(form)
        }
      );

      const data = await res.json();

      if (data.status === "signup_success") {
  setMessage("Signup successful...");

  const loginRes = await fetch(
    "http://localhost:5173/write/student/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mobile_number: form.mobile_number,
        password: form.password
      })
    }
  );

  const loginData = await loginRes.json();

  if (loginData.status === "ok") {
    localStorage.setItem(
      "student_token",
      loginData.token
    );

    localStorage.setItem(
      "student_profile",
      JSON.stringify(loginData.student)
    );

    navigate("/student");
  } else {
    navigate("/student-login");
  }

} else {
  setMessage(data.error || "Signup failed");
}

    } catch (err) {
      setMessage("Server error");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow rounded p-8 w-full max-w-lg">

        <h1 className="text-2xl font-bold mb-6">
          Student Signup
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            className="w-full border p-3 rounded"
            placeholder="Full Name"
            value={form.full_name}
            onChange={e =>
              updateField("full_name", e.target.value)
            }
          />

          <input
            className="w-full border p-3 rounded"
            placeholder="Mobile Number"
            value={form.mobile_number}
            onChange={e =>
              updateField("mobile_number", e.target.value)
            }
          />

          <input
            className="w-full border p-3 rounded"
            placeholder="Age"
            value={form.age}
            onChange={e =>
              updateField("age", e.target.value)
            }
          />

          <input
            className="w-full border p-3 rounded"
            placeholder="City"
            value={form.city}
            onChange={e =>
              updateField("city", e.target.value)
            }
          />

          <select
            className="w-full border p-3 rounded"
            value={form.preferred_language}
            onChange={e =>
              updateField("preferred_language", e.target.value)
            }
          >
            <option>Punjabi</option>
            <option>English</option>
            <option>Urdu</option>
          </select>

          <input
            type="password"
            className="w-full border p-3 rounded"
            placeholder="Password"
            value={form.password}
            onChange={e =>
              updateField("password", e.target.value)
            }
          />

          <button
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3 rounded"
          >
            {loading ? "Submitting..." : "Create Account"}
          </button>

        </form>

        {message && (
          <p className="mt-4 text-sm">
            {message}
          </p>
        )}

      </div>
    </div>
  );
}
