import { getEventStream } from "../api/adminApi";
import { safeArray } from "../api/normalizers";
import { usePolling } from "../hooks/usePolling";

export default function ActivityFeed() {

  const { data, loading } = usePolling(getEventStream, 2000);

  const events = safeArray(data);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="bg-white shadow rounded p-4">

      <h2 className="text-lg font-semibold mb-4">
        📡 Live Event Feed
      </h2>

      {events.length === 0 ? (
        <div className="text-gray-500">
          No events yet
        </div>
      ) : (
        <ul className="space-y-2">

          {events.map((event, index) => (
            <li key={index} className="border-b pb-2">

              <div className="font-medium">
                {event.event_type}
              </div>

              <div className="text-sm text-gray-500">
                {event.identity_id}
              </div>

              <div className="text-xs text-gray-400">
                {event.created_at}
              </div>

            </li>
          ))}

        </ul>
      )}

    </div>
  );
}
