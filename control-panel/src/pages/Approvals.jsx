import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getPendingInstructors,
  updateInstructorStatus
} from "../api/adminApi";

export default function Approvals() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const data = await getPendingInstructors();
    setRows(data);
  }

  async function approve(id) {
    await updateInstructorStatus(id, "active");
    load();
  }

  async function reject(id) {
    await updateInstructorStatus(id, "rejected");
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Pending Approvals
      </h1>

      <div className="bg-white rounded shadow p-4 overflow-auto">
        <table className="w-full text-sm">

          <thead>
            <tr className="border-b text-left">
              <th className="py-2">Name</th>
              <th>Mobile</th>
              <th>Zone</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {rows.map(row => (
              <tr key={row.id} className="border-b">

                <td className="py-2">
                  {row.full_name}
                </td>

                <td>{row.mobile_number}</td>

                <td>{row.zone}</td>

                <td>{row.created_at}</td>

                <td className="space-x-2">

                  <button
                    onClick={() => approve(row.id)}
                    className="px-2 py-1 bg-green-600 text-white rounded"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => reject(row.id)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    Reject
                  </button>

                  <Link
                    to={`/instructors/${row.id}`}
                    className="px-2 py-1 bg-blue-600 text-white rounded inline-block"
                  >
                    View
                  </Link>

                </td>

              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  className="py-6 text-center text-gray-500"
                >
                  No pending approvals.
                </td>
              </tr>
            )}

          </tbody>

        </table>
      </div>
    </div>
  );
}
