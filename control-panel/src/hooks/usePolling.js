import { useEffect, useState } from "react";

export function usePolling(fetchFn, interval = 2000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const result = await fetchFn();
        if (mounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }

    fetchData();
    const id = setInterval(fetchData, interval);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [fetchFn, interval]);

  return { data, loading };
}
