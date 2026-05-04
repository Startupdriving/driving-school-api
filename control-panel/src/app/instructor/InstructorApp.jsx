import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstructorOffers from "./InstructorOffers";

export default function InstructorApp() {
  const navigate = useNavigate();

  const profile = JSON.parse(
    localStorage.getItem("instructor_profile") || "{}"
  );

  const instructorId = profile.id;

  const [status, setStatus] = useState("offline");
  const [loading, setLoading] = useState(false);

  async function changeStatus(action, nextStatus) {
    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:5173/write/instructor/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID()
          },
          body: JSON.stringify({
            instructor_id: instructorId
          })
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      setStatus(nextStatus);

    } catch (err) {
      alert("Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function goOnline() {
    await changeStatus("go-online", "online");
  }

  async function goOffline() {
    await changeStatus("go-offline", "offline");
  }

  function logout() {
    localStorage.removeItem("instructor_token");
    localStorage.removeItem("instructor_profile");

    navigate("/instructor-login");
  }

  return (
    <div className="p-6">

      <div className="bg-white shadow rounded p-4 mb-6 flex justify-between items-center">

        <div>
          <h1 className="text-xl font-bold">
            Instructor Dashboard
          </h1>

          <p className="text-sm text-gray-600">
            Welcome, {profile.full_name || "Instructor"}
          </p>

          <p className="text-sm mt-1">
            Status:
            <span className="font-semibold ml-2">
              {status}
            </span>
          </p>
        </div>

        <div className="flex gap-2">

          <button
            disabled={loading || status === "online"}
            onClick={goOnline}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Online
          </button>

          <button
            disabled={loading || status === "offline"}
            onClick={goOffline}
            className="px-4 py-2 bg-gray-700 text-white rounded"
          >
            Offline
          </button>

          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Logout
          </button>

        </div>

      </div>

      <InstructorOffers instructorId={instructorId} />

    </div>
  );
}
