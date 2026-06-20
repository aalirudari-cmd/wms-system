import { useState, useEffect, useCallback } from 'react';
import { api } from './client.js';

// Tiny GET hook: returns { data, loading, error, reload }.
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .get(url)
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload, setData };
}
