import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getInstructorDetail,
  updateInstructor
} from "../api/adminApi";

export default function InstructorDetail() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const res = await getInstructorDetail(id);
    setData(res);
    setForm(res);
  }

  function updateField(key, value) {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  }

  async function saveChanges() {
    setMsg("");

    const result = await updateInstructor(id, {
      full_name: form.full_name,
      mobile_number: form.mobile_number,
      zone: form.zone,
      car_model: form.car_model,
      transmission_type: form.transmission_type,
      notes: form.notes
    });

    if (result.status === "updated") {
      setMsg("Profile updated successfully.");
      setEditing(false);
      load();
    } else {
      setMsg(result.error || "Update failed");
    }
  }

  if (!data || !form) {
    return <p>Loading...</p>;
  }

  return (
    <div className="bg-white rounded shadow p-6 max-w-4xl">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Instructor Profile
        </h1>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded"
          >
            Edit Profile
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={saveChanges}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Save
            </button>

            <button
              onClick={() => {
                setEditing(false);
                setForm(data);
                setMsg("");
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className="mb-4 text-sm">
          {msg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">

        {/* Name */}
        <div>
          <b>Name:</b><br />
          {editing ? (
            <input
              className="border p-2 rounded w-full mt-1"
              value={form.full_name || ""}
              onChange={e =>
                updateField("full_name", e.target.value)
              }
            />
          ) : (
            data.full_name
          )}
        </div>

        {/* Mobile */}
        <div>
          <b>Mobile:</b><br />
          {editing ? (
            <input
              className="border p-2 rounded w-full mt-1"
              value={form.mobile_number || ""}
              onChange={e =>
                updateField("mobile_number", e.target.value)
              }
            />
          ) : (
            data.mobile_number
          )}
        </div>

        {/* Gender */}
        <div>
          <b>Gender:</b><br />
          {data.gender || "-"}
        </div>

        {/* DOB */}
        <div>
          <b>Date of Birth:</b><br />
          {data.date_of_birth || "-"}
        </div>

        {/* Zone */}
        <div>
          <b>Zone:</b><br />
          {editing ? (
            <input
              className="border p-2 rounded w-full mt-1"
              value={form.zone || ""}
              onChange={e =>
                updateField("zone", e.target.value)
              }
            />
          ) : (
            data.zone
          )}
        </div>

        {/* Status */}
        <div>
          <b>Status:</b><br />
          {data.status}
        </div>

        {/* Verified */}
        <div>
          <b>Verified:</b><br />
          {data.is_verified ? "Yes" : "No"}
        </div>

        {/* Docs */}
        <div>
          <b>Docs Verified:</b><br />
          {data.documents_verified ? "Yes" : "No"}
        </div>

        {/* Car */}
        <div>
          <b>Car Model:</b><br />
          {editing ? (
            <input
              className="border p-2 rounded w-full mt-1"
              value={form.car_model || ""}
              onChange={e =>
                updateField("car_model", e.target.value)
              }
            />
          ) : (
            data.car_model
          )}
        </div>

        {/* Transmission */}
        <div>
          <b>Transmission:</b><br />
          {editing ? (
            <select
              className="border p-2 rounded w-full mt-1"
              value={form.transmission_type || ""}
              onChange={e =>
                updateField(
                  "transmission_type",
                  e.target.value
                )
              }
            >
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </select>
          ) : (
            data.transmission_type
          )}
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <b>Notes:</b><br />

          {editing ? (
            <textarea
              className="border p-2 rounded w-full mt-1"
              rows="4"
              value={form.notes || ""}
              onChange={e =>
                updateField("notes", e.target.value)
              }
            />
          ) : (
            data.notes || "-"
          )}
        </div>

      </div>
    </div>
  );
}
