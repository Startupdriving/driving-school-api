import  React,{
  useEffect,
  useState
} from "react";

import {
  fetchEventStream
} from "../../api/eventStreamApi";

export default function EventStreamTable() {

  const [events, setEvents] =
    useState([]);

  const [expanded, setExpanded] =
     useState(null);


  useEffect(() => {

    load();

  }, []);

  async function load() {

    try {

      const result =
        await fetchEventStream();

      setEvents(result);

    } catch (err) {

      console.error(err);

    }

  }

  return (

    <div className="bg-white shadow rounded p-4">

      <h2 className="text-xl font-bold mb-4">
        Event Stream
      </h2>

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
              Identity
            </th>

            <th className="text-left p-2">
              Created
            </th>

          </tr>

        </thead>

        <tbody>

  {events.map(event => (

    <React.Fragment key={event.id}>

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
          {event.identity_id}
        </td>

        <td className="p-2">
          {event.created_at}
        </td>

      </tr>

      {expanded === event.id && (

        <tr>

          <td
            colSpan="4"
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

    </React.Fragment>

  ))}

</tbody>

      </table>

    </div>

  );

}
