type FC = GeoJSON.FeatureCollection;

function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ---------- GPX ----------
export function geojsonToGPX(fc: FC, opts?: { creator?: string; name?: string; }): string {
  const creator = esc(opts?.creator || 'BaseLodge');
  const docName = esc(opts?.name || 'Trip Export');

  let wpts = '';
  let trks = '';

  for (const f of fc.features || []) {
    const g = f.geometry;
    const p = (f.properties || {}) as Record<string, any>;
    const name = esc(p.name || p.title || '');
    const desc = esc(p.notes || p.description || '');

    if (!g) continue;

    if (g.type === 'Point') {
      const [lon, lat, ele] = g.coordinates as number[];
      wpts += `<wpt lat="${lat}" lon="${lon}">${ele!=null?`<ele>${ele}</ele>`:''}${name?`<name>${name}</name>`:''}${desc?`<desc>${desc}</desc>`:''}</wpt>\n`;
    }

    if (g.type === 'LineString') {
      const coords = g.coordinates as number[][];
      trks += `<trk>${name?`<name>${name}</name>`:''}<trkseg>\n` +
        coords.map(c => {
          const [lon, lat, ele] = c;
          return `<trkpt lat="${lat}" lon="${lon}">${ele!=null?`<ele>${ele}</ele>`:''}</trkpt>`;
        }).join('\n') +
        `\n</trkseg></trk>\n`;
    }

    if (g.type === 'MultiLineString') {
      const lines = g.coordinates as number[][][];
      trks += `<trk>${name?`<name>${name}</name>`:''}` +
        lines.map(seg =>
          `<trkseg>\n${seg.map(c=>{
            const [lon, lat, ele] = c; 
            return `<trkpt lat="${lat}" lon="${lon}">${ele!=null?`<ele>${ele}</ele>`:''}</trkpt>`;
          }).join('\n')}\n</trkseg>`
        ).join('') +
        `</trk>\n`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${creator}" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${docName}</name></metadata>
  ${wpts}${trks}
</gpx>`;
}

// ---------- KML ----------
export function geojsonToKML(fc: FC, opts?: { name?: string }): string {
  const docName = esc(opts?.name || 'Trip Export');
  const placemarks: string[] = [];

  for (const f of fc.features || []) {
    const g = f.geometry;
    const p = (f.properties || {}) as Record<string, any>;
    const name = esc(p.name || p.title || '');
    const desc = esc(p.notes || p.description || '');

    if (!g) continue;

    if (g.type === 'Point') {
      const [lon, lat, ele] = g.coordinates as number[];
      placemarks.push(
        `<Placemark>${name?`<name>${name}</name>`:''}${desc?`<description>${desc}</description>`:''}
          <Point><coordinates>${lon},${lat}${ele!=null?`,`+ele:''}</coordinates></Point>
        </Placemark>`
      );
    }

    if (g.type === 'LineString') {
      const coords = g.coordinates as number[][];
      placemarks.push(
        `<Placemark>${name?`<name>${name}</name>`:''}${desc?`<description>${desc}</description>`:''}
          <LineString><coordinates>${coords.map(c=>c.join(',')).join(' ')}</coordinates></LineString>
        </Placemark>`
      );
    }

    if (g.type === 'MultiLineString') {
      const lines = g.coordinates as number[][][];
      placemarks.push(
        `<Placemark>${name?`<name>${name}</name>`:''}${desc?`<description>${desc}</description>`:''}
          <MultiGeometry>
            ${lines.map(seg=>`<LineString><coordinates>${seg.map(c=>c.join(',')).join(' ')}</coordinates></LineString>`).join('')}
          </MultiGeometry>
        </Placemark>`
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${docName}</name>
    ${placemarks.join('\n')}
  </Document>
</kml>`;
}
