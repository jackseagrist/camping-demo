'use client';
import { useEffect, useState } from 'react';
import { isIOS, isSafari, isStandalone } from '../utils/pwa';

export default function AddToHomeScreenSheet({ urlHint, onClose }: { urlHint: string; onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isStandalone() && isIOS() && isSafari()) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-neutral-200 bg-white p-4 shadow-2xl">
      <div className="mx-auto max-w-md space-y-3">
        <div className="text-sm text-neutral-500">Make it one tap from your Home Screen</div>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          <li>Tap the <strong>Share</strong> icon in Safari's toolbar.</li>
          <li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li>
        </ol>
        <div className="text-xs text-neutral-500">
          This icon will open: <code>{urlHint}</code>
        </div>
        <button
          className="w-full rounded-xl bg-black text-white py-2"
          onClick={() => { setShow(false); onClose(); }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
