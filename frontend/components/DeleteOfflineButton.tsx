'use client';
import { clearOffline } from '../lib/offline';

export default function DeleteOfflineButton({ tripId }: { tripId: string }) {
  const onDelete = async () => {
    await clearOffline(tripId);
    alert('Offline data removed.');
  };
  return (
    <button onClick={onDelete} className="rounded-xl bg-neutral-200 px-3 py-1 text-sm">
      Delete Offline Data
    </button>
  );
}
