import {
  useEffect,
  useState
} from "react";

import {
  fetchDeadEvents,
  retryDeadEvent
} from "../../api/deadEventApi";

export default function DeadEventTable() {

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
        await fetchDeadEvents();

      setEvents(result);

    } catch (err) {

      console.error(err);

    }

  }



async function retry(id) {

  try {

    await retryDeadEvent(id);

    await load();

  } catch (err) {

    console.error(err);

  }

}




return (

  <div className="bg-white shadow rounded p-4">

    <h2 className="text-xl font-bold mb-4">
      Dead Events
    </h2>

    <table className="w-full">

      <thead>

        <tr className="border-b">

          <th className="text-left p-2">
            Event Type
          </th>

          <th className="text-left p-2">
            Error
          </th>

          <th className="text-left p-2">
            Retries
          </th>

          <th className="text-left p-2">
            Failed At
          </th>

          <th className="text-left p-2">
            Actions
          </th>

        </tr>

      </thead>

      <tbody>

        {events.map(event => (

          <tr
             key={event.id}
             className="border-b cursor-pointer"

             onClick={() =>
             setExpanded(
             expanded === event.id
             ? null
             : event.id
              )
              }
           >

            <td className="p-2">
              {event.event_type}
            </td>

            <td className="p-2 text-red-600">
              {event.error_message}
            </td>

            <td className="p-2">
              {event.retry_count}
            </td>

            <td className="p-2">
              {event.failed_at}
            </td>

            <td className="p-2">

              <button
                className="
                  bg-blue-600
                  text-white
                  px-3
                  py-1
                  rounded
                "
                onClick={() =>
                  retry(event.id)
                }
              >
                Retry
              </button>

            </td>

          </tr>

        ))}

      </tbody>

    </table>

  </div>

);

}
