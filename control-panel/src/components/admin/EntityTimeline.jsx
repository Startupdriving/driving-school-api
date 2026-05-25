import {
  useState
} from "react";

import {
  fetchEntityEventStream
} from "../../api/eventStreamApi";

export default function EntityTimeline() {

  const [identityId, setIdentityId] =
    useState("");

  const [events, setEvents] =
    useState([]);

  const [expanded, setExpanded] =
    useState(null);

  async function search() {

    try {

      const result =
        await fetchEntityEventStream(
          identityId
        );

      setEvents(result);

    } catch (err) {

      console.error(err);

    }

  }

  return (

    <div className="bg-white shadow rounded p-4">

      <h2 className="text-xl font-bold mb-4">
        Entity Timeline
      </h2>

      <div className="flex gap-2 mb-4">

        <input
          className="
            border
            p-2
            rounded
            w-full
          "
          placeholder="
            Enter identity_id
          "
          value={identityId}
          onChange={(e) =>
            setIdentityId(
              e.target.value
            )
          }
        />

        <button
          className="
            bg-blue-600
            text-white
            px-4
            rounded
          "
          onClick={search}
        >
          Search
        </button>

      </div>

      <table className="w-full">

        <thead>

          <tr className="border-b">

            <th className="text-left p-2">
              Seq
            </th>

            <th className="text-left p-2">
              Event
            </th>

            <th className="text-left p-2">
              Created
            </th>

          </tr>

        </thead>

        <tbody>

          {events.map(event => (

            <>

              <tr
                key={event.id}
                className="
                  border-b
                  cursor-pointer
                "

                onClick={() =>
                  setExpanded(
                    expanded === event.id
                      ? null
                      : event.id
                  )
                }
              >

                <td className="p-2">
                  {event.sequence_number}
                </td>

                <td className="p-2">
                  {event.event_type}
                </td>

                <td className="p-2">
                  {event.created_at}
                </td>

              </tr>

              {expanded === event.id && (

                <tr>

                  <td
                    colSpan="3"
                    className="
                      bg-gray-100
                      p-4
                    "
                  >

                    <pre className="
                      text-xs
                      overflow-auto
                    ">

                      {JSON.stringify(
                        event.payload,
                        null,
                        2
                      )}

                    </pre>

                  </td>

                </tr>

              )}

            </>

          ))}

        </tbody>

      </table>

    </div>

  );

}
