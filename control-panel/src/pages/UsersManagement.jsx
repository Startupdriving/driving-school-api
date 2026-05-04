import { useEffect, useState } from "react";
import {
  getUsersSummary,
  getAdmins,
  getStudents,
  getInstructors,
  updateInstructorStatus
} from "../api/adminApi";



export default function UsersManagement() {
  const [summary, setSummary] = useState({});
  const [tab, setTab] = useState("students");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadTab();
  }, [tab]);

  async function loadSummary() {
    try {
      const data = await getUsersSummary();
      setSummary(data);
    } catch (err) {
      console.error("SUMMARY LOAD ERROR:", err);
    }
  }

  async function loadTab() {
    try {
      setLoading(true);

      if (tab === "students") {
        setRows(await getStudents());
      }

      if (tab === "instructors") {
        setRows(await getInstructors());
      }

      if (tab === "admins") {
        setRows(await getAdmins());
      }

    } catch (err) {
      console.error("TAB LOAD ERROR:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function changeInstructor(id, status) {
    try {
      await updateInstructorStatus(id, status);
      await loadTab();
      await loadSummary();
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);
    }
  }

  const btn =
    "px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition";

  const active =
    "px-4 py-2 rounded bg-gray-900 text-white";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Users Management
      </h1>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Students</div>
          <div className="text-2xl font-bold">
            {summary.students || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Instructors</div>
          <div className="text-2xl font-bold">
            {summary.instructors || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Admins</div>
          <div className="text-2xl font-bold">
            {summary.admins || 0}
          </div>
        </div>

      </div>

      {/* TABS */}
      <div className="flex gap-3 mb-6">

        <button
          className={tab === "students" ? active : btn}
          onClick={() => setTab("students")}
        >
          Students
        </button>

        <button
          className={tab === "instructors" ? active : btn}
          onClick={() => setTab("instructors")}
        >
          Instructors
        </button>

        <button
          className={tab === "admins" ? active : btn}
          onClick={() => setTab("admins")}
        >
          Admins
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow p-4 overflow-auto">

        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">

                {tab === "students" && (
                  <>
                    <th className="py-2">Name</th>
                    <th>Mobile</th>
                    <th>City</th>
                    <th>Status</th>
                  </>
                )}

                {tab === "instructors" && (
                  <>
                    <th className="py-2">Name</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </>
                )}

                {tab === "admins" && (
                  <>
                    <th className="py-2">Username</th>
                    <th>Role</th>
                    <th>Status</th>
                  </>
                )}

              </tr>
            </thead>

            <tbody>

              {rows.map((row, i) => (
                <tr key={i} className="border-b">

                  {/* STUDENTS */}
                  {tab === "students" && (
                    <>
                      <td className="py-2">{row.full_name}</td>
                      <td>{row.mobile_number}</td>
                      <td>{row.city}</td>
                      <td>{row.status}</td>
                    </>
                  )}

                  {/* INSTRUCTORS */}
                  {tab === "instructors" && (
                    <>
                      <td className="py-2">
                       <a
                        href={`/instructors/${row.id}`}
                        className="text-blue-600 underline"
                        >
                      {row.full_name}
                     </a>
                   </td>
                      <td>{row.mobile_number}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.is_verified ? "Yes" : "No"}
                      </td>

                      <td className="space-x-2">

                        <button
                          onClick={() =>
                            changeInstructor(row.id, "active")
                          }
                          className="px-2 py-1 bg-green-600 text-white rounded"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            changeInstructor(row.id, "suspended")
                          }
                          className="px-2 py-1 bg-red-600 text-white rounded"
                        >
                          Suspend
                        </button>

                      </td>
                    </>
                  )}

                  {/* ADMINS */}
                  {tab === "admins" && (
                    <>
                      <td className="py-2">{row.username}</td>
                      <td>{row.role}</td>
                      <td>
                        {row.is_active
                          ? "Active"
                          : "Disabled"}
                      </td>
                    </>
                  )}

                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan="10"
                    className="py-6 text-center text-gray-500"
                  >
                    No records found.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        )}

      </div>
    </div>
  );
}
