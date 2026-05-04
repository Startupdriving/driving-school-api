import { useState } from "react";
import { createInstructor } from "../api/adminApi";

export default function InstructorOnboarding() {
  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    gender: "male",
    date_of_birth: "",
    car_model: "",
    transmission_type: "manual",
    zone: "",
    notes: ""
  });

  const [msg, setMsg] = useState("");

  function update(key, value) {
    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    const data = await createInstructor(form);

    if (data.status === "created") {
      setMsg("Instructor created successfully.");

      setForm({
        full_name: "",
        mobile_number: "",
        gender: "male",
        date_of_birth: "",
        car_model: "",
        transmission_type: "manual",
        zone: "",
        notes: ""
      });
    } else {
      setMsg(data.error || "Failed");
    }
  }

  return (
    <div className="max-w-2xl bg-white rounded shadow p-6">
      <h1 className="text-2xl font-bold mb-6">
        Instructor Onboarding
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          className="w-full border p-3 rounded"
          placeholder="Full Name"
          value={form.full_name}
          onChange={e => update("full_name", e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Mobile Number"
          value={form.mobile_number}
          onChange={e => update("mobile_number", e.target.value)}
        />

        <select
          className="w-full border p-3 rounded"
          value={form.gender}
          onChange={e => update("gender", e.target.value)}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>

        <input
          type="date"
          className="w-full border p-3 rounded"
          value={form.date_of_birth}
          onChange={e => update("date_of_birth", e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Car Model"
          value={form.car_model}
          onChange={e => update("car_model", e.target.value)}
        />

        <select
          className="w-full border p-3 rounded"
          value={form.transmission_type}
          onChange={e => update("transmission_type", e.target.value)}
        >
          <option value="manual">Manual</option>
          <option value="automatic">Automatic</option>
        </select>

        <input
          className="w-full border p-3 rounded"
          placeholder="Zone"
          value={form.zone}
          onChange={e => update("zone", e.target.value)}
        />

        <textarea
          className="w-full border p-3 rounded"
          placeholder="Notes"
          value={form.notes}
          onChange={e => update("notes", e.target.value)}
        />

        <button className="w-full bg-gray-900 text-white py-3 rounded">
          Create Instructor
        </button>
      </form>

      {msg && (
        <p className="mt-4">{msg}</p>
      )}
    </div>
  );
}
