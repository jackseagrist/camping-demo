'use client';
import { useState } from 'react';
import { isIOS, canShareFiles } from '../utils/platform';
import { geojsonToGPX, geojsonToKML } from '../lib/exporters';

async function fetchTripFC(tripId: string) {
  const res = await fetch(`/api/trips/${tripId}/geojson`);
  if (!res.ok) throw new Error('Failed to load trip GeoJSON');
  return res.json();
}

async function shareOrDownload(filename: string, type: string, text: string) {
  const blob = new Blob([text], { type });
  const file = new File([blob], filename, { type });

  // Prefer iOS share sheet with file (works on iOS 16.4+ Safari)
  if (isIOS() && canShareFiles()) {
    try {
      // @ts-ignore
      await navigator.share({ files: [file], title: filename, text: '' });
      return;
    } catch (err) {
      console.error('Share failed, falling back to download', err);
      // Fall through to download method
    }
  }

  // Fallback: trigger a download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; 
  a.download = filename; 
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportGPXButton({ tripId, tripName }: { tripId: string; tripName?: string; }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    try {
      setBusy(true);
      const fc = await fetchTripFC(tripId);
      const gpx = geojsonToGPX(fc, { creator: 'BaseLodge', name: tripName || `Trip ${tripId}` });
      await shareOrDownload(`trip-${tripId}.gpx`, 'application/gpx+xml', gpx);
    } catch (err) {
      console.error('GPX export failed', err);
      alert('Failed to export GPX. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button disabled={busy} onClick={onClick}
      className="rounded-xl bg-emerald-600 text-white px-3 py-2 disabled:opacity-60">
      {busy ? 'Preparing…' : 'Export GPX (Apple Maps)'}
    </button>
  );
}

export function ExportKMLButton({ tripId, tripName }: { tripId: string; tripName?: string; }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    try {
      setBusy(true);
      const fc = await fetchTripFC(tripId);
      const kml = geojsonToKML(fc, { name: tripName || `Trip ${tripId}` });
      await shareOrDownload(`trip-${tripId}.kml`, 'application/vnd.google-earth.kml+xml', kml);
    } catch (err) {
      console.error('KML export failed', err);
      alert('Failed to export KML. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button disabled={busy} onClick={onClick}
      className="rounded-xl border px-3 py-2 disabled:opacity-60">
      {busy ? 'Preparing…' : 'Export KML'}
    </button>
  );
}
