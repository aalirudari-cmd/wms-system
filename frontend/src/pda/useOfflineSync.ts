import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { listQueued, syncQueue } from './offlineQueue';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  async function refreshCount() {
    setPending((await listQueued()).length);
  }

  async function trySync() {
    const synced = await syncQueue();
    if (synced > 0) {
      queryClient.invalidateQueries();
    }
    await refreshCount();
  }

  useEffect(() => {
    refreshCount();
    const onOnline = () => {
      setOnline(true);
      trySync();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = setInterval(trySync, 20_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pending, online, refreshCount };
}
