import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { compressPhoto, getPosition, money } from '../services/utils';
import { Config, Estado, Pedido } from '../types';
import AuthModal from './AuthModal';

type Mode = 'idle' | 'ok' | 'fail';

/** Confirmación de entrega con foto obligatoria, hora y ubicación; reintento o cancelación. */
const DeliveryView: React.FC<{ config: Config }> = ({ config }) => {
  const [transit, setTransit] = useState<Pedido[]>([]);
  const [notFound, setNotFound] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [folio, setFolio] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [photo, setPhoto] = useState('');
  const [recibio, setRecibio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelFolio, setCancelFolio] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const all = await api.orders();
      setTransit(all.filter(o => o.estado === Estado.TRANSITO));
      setNotFound(all.filter(o => o.estado === Estado.NO_ENCONTRADO));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const order = transit.find(o => o.folio === folio);
  const reset = () => { setFolio(''); setMode('idle'); setPhoto(''); setRecibio(''); setMotivo(''); load(); };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setPhoto(await compressPhoto(f)); } catch (err: any) { alert(err.message); }
  };

  const send = async () => {
    if (!order) return;
    if (!photo) return alert('La foto es obligatoria.');
    if (mode === 'fail' && !motivo.trim()) return alert('Escribe el motivo.');
    setBusy(true);
    try {
      const pos = await getPosition();
      if (mode === 'ok') {
        await api.deliver({ folio: order.folio, foto: photo, recibio, lat: pos?.lat, lng: pos?.lng });
        alert(`✅ ${order.folio} marcado como ENTREGADO.`);
      } else {
        await api.fail({ folio: order.folio, foto: photo, motivo, lat: pos?.lat, lng: pos?.lng });
        alert(`⚠️ ${order.folio} reportado como NO ENCONTRADO.`);
      }
      reset();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (f: string) => {
    try { await api.reschedule(f); load(); } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="animate-fadeIn space-y-5 max-w-lg mx-auto">
      <div className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-red-600 space-y-4">
        <header className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl"><i className="fas fa-box-open text-2xl"></i></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Confirmar entrega</h2>
            <p className="text-sm text-gray-500">Pedidos en tránsito ({transit.length})</p>
          </div>
          <button onClick={load} className="ml-auto text-gray-400 hover:text-red-600" title="Actualizar"><i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i></button>
        </header>

        <select value={folio} onChange={e => { setFolio(e.target.value); setMode('idle'); setPhoto(''); }} disabled={busy}
          className="w-full p-4 text-sm font-bold border-2 border-gray-100 rounded-2xl bg-gray-50">
          <option value="">— Seleccionar pedido —</option>
          {transit.map(o => <option key={o.folio} value={o.folio}>{o.folio} · {o.no_ticket} · {o.nombre_cliente}</option>)}
        </select>

        {order && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm space-y-2">
            <p className="font-medium text-gray-800">{order.direccion}{order.comunidad ? ` — ${order.comunidad}` : ''}</p>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <a href={`tel:${order.telefono}`} className="bg-blue-100 text-blue-700 px-2 py-1 rounded"><i className="fas fa-phone mr-1"></i>{order.telefono}</a>
              <span className="bg-gray-200 px-2 py-1 rounded">{order.unidades} pzs</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Cobrar {money(order.monto_de_compra + order.costo_de_envio)}</span>
              {order.lat && order.lng && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`} target="_blank" rel="noreferrer" className="bg-red-100 text-red-700 px-2 py-1 rounded"><i className="fas fa-location-arrow mr-1"></i>Ruta</a>
              )}
            </div>
          </div>
        )}

        {order && mode === 'idle' && (
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => setMode('ok')} className="w-full bg-green-500 hover:bg-green-600 text-white p-5 rounded-2xl border-b-4 border-green-700 flex items-center justify-between">
              <span className="text-xl font-black">ENTREGADO</span><i className="fas fa-check-circle text-3xl"></i>
            </button>
            <button onClick={() => setMode('fail')} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-100 p-5 rounded-2xl flex items-center justify-between">
              <span className="text-lg font-bold">NO ENTREGADO</span><i className="fas fa-times-circle text-2xl"></i>
            </button>
          </div>
        )}

        {order && mode !== 'idle' && (
          <div className={`space-y-4 p-4 rounded-2xl border animate-slideUp ${mode === 'ok' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <h3 className={`font-black ${mode === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
              {mode === 'ok' ? 'Evidencia de entrega' : 'Reporte de no entrega'}
            </h3>
            <label className="relative block cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
              {photo ? (
                <img src={photo} alt="Evidencia" className="w-full max-h-64 object-cover rounded-xl border-2 border-green-400" />
              ) : (
                <div className="w-full py-8 flex flex-col items-center border-2 border-dashed rounded-2xl bg-white border-gray-300">
                  <i className="fas fa-camera text-2xl text-gray-400 mb-2"></i>
                  <span className="text-sm font-bold text-gray-500">{mode === 'ok' ? 'Foto de la mercancía entregada' : 'Foto del domicilio'}</span>
                </div>
              )}
            </label>
            {mode === 'ok' ? (
              <input value={recibio} onChange={e => setRecibio(e.target.value)} placeholder="¿Quién recibió? (opcional)" className="w-full p-3 border border-green-200 rounded-xl bg-white text-sm" />
            ) : (
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Motivo (ej. domicilio incorrecto, cliente ausente)"
                className="w-full p-3 border border-red-200 rounded-xl bg-white text-sm resize-none" />
            )}
            <p className="text-[11px] text-gray-500"><i className="fas fa-location-dot mr-1"></i>Se guardan la hora y la ubicación del teléfono.</p>
            <div className="flex gap-2">
              <button onClick={() => { setMode('idle'); setPhoto(''); }} disabled={busy} className="flex-1 bg-white border border-gray-200 font-bold py-3 rounded-xl text-gray-600">Regresar</button>
              <button onClick={send} disabled={busy} className={`flex-1 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 ${mode === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
                {busy ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>} Enviar
              </button>
            </div>
          </div>
        )}
      </div>

      {notFound.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-yellow-500 space-y-3">
          <h3 className="font-black text-gray-800"><i className="fas fa-redo text-yellow-500 mr-2"></i>No encontrados ({notFound.length})</h3>
          {notFound.map(o => (
            <div key={o.folio} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{o.folio} · {o.nombre_cliente}</p>
                <p className="text-xs text-gray-500">Intentos: {o.intentos + 1}</p>
              </div>
              <button onClick={() => reschedule(o.folio)} className="px-3 py-2 rounded-lg bg-blue-800 text-white text-xs font-bold">Reprogramar</button>
              <button onClick={() => setCancelFolio(o.folio)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold">Cancelar</button>
            </div>
          ))}
        </div>
      )}

      {cancelFolio && (
        <AuthModal
          title={`Cancelar ${cancelFolio}`}
          subtitle="El pedido quedará como Cancelado"
          autorizadores={config.autorizadores}
          askReason
          reasonLabel="Motivo de cancelación"
          onConfirm={async (auth, reason) => { await api.cancel(cancelFolio, reason, auth); setCancelFolio(''); load(); }}
          onClose={() => setCancelFolio('')}
        />
      )}
    </div>
  );
};

export default DeliveryView;
