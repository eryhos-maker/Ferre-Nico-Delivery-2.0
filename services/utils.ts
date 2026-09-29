export const money = (v: number) => {
  const n = Number(v) || 0;
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Fecha local (hora de México) en formato AAAA-MM-DD, para filtrar por día. */
export const localDay = (v: string | Date = new Date()) => {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v).slice(0, 10);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fmtDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Reduce la foto (máx. 1024 px, JPEG) para subirla rápido desde datos móviles. */
export function compressPhoto(file: File, max = 1024, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de foto no válido'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Ubicación del teléfono al momento de registrar la entrega (si el usuario la permite). */
export function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

export const statusStyle = (estado: string) => {
  switch (estado) {
    case 'Entregado': return 'bg-green-100 text-green-700 border-green-200';
    case 'En Tránsito': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'No Encontrado': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

/** Imprime un nodo en ticket de 80 mm. */
export function printNode(id: string) {
  const content = document.getElementById(id);
  if (!content) return;
  const w = window.open('', '', 'height=800,width=600');
  if (!w) {
    alert('Permite las ventanas emergentes para imprimir.');
    return;
  }
  // Copia los estilos de la app (Tailwind compilado) a la ventana de impresión.
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(n => n.outerHTML).join('');
  w.document.write('<html><head><title>Ticket</title>' + styles);
  w.document.write('<style>@page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 2mm; width: 76mm; }</style>');
  w.document.write('</head><body class="bg-white">' + content.innerHTML + '</body></html>');
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 600);
}

export function downloadPdf(id: string, filename: string) {
  const el = document.getElementById(id);
  // @ts-ignore cargado desde index.html
  const html2pdf = window.html2pdf;
  if (!el || !html2pdf) return alert('No se pudo generar el PDF. Recarga la página.');
  html2pdf().set({
    margin: [2, 2, 2, 2],
    filename,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: [80, 220], orientation: 'portrait' }
  }).from(el).save();
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return alert('No hay datos en ese rango.');
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '﻿' + [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
