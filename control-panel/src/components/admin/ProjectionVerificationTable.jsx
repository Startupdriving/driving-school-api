import {
  useEffect,
  useState
} from "react";

import {
  verifyAllProjections
} from "../../api/adminProjectionApi";

export default function ProjectionVerificationTable() {

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    load();

  }, []);

  async function load() {

    try {

      const result =
        await verifyAllProjections();

      setData(result);

    }

    catch (err) {

      console.error(err);

    }

    finally {

      setLoading(false);

    }

  }

  if (loading) {

    return <div>Loading verification...</div>;

  }

  return (

    <div className="bg-white rounded shadow p-4">

      <h2 className="text-xl font-bold mb-4">

        Projection Verification

      </h2>

      <table className="w-full border-collapse">

        <thead>

          <tr className="border-b">

            <th className="text-left p-2">
              Projection
            </th>

            <th className="text-left p-2">
              Expected
            </th>

            <th className="text-left p-2">
              Actual
            </th>

            <th className="text-left p-2">
              Healthy
            </th>

          </tr>

        </thead>

        <tbody>

          {data.projections.map((p) => (

            <tr
              key={p.projection_name}
              className="border-b"
            >

              <td className="p-2">
                {p.projection_name}
              </td>

              <td className="p-2">
                {p.expected_rows}
              </td>

              <td className="p-2">
                {p.actual_rows}
              </td>

              <td className="p-2">

                {p.healthy
                  ? "✅ PASS"
                  : "❌ FAIL"}

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}
