import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { downloadPdf, money, printNode } from '../services/utils';
import { Config, Estado, Pedido } from '../types';
import Ticket from './Ticket';

const input = 'w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 outline-none font-bold bg-gray-50 text-gray-900';
const label = 'block text-xs font-bold text-gray-600 uppercase mb-1';

/** Asigna unidad y chofer a un pedido pendiente e imprime el ticket de salida. */
const ShipmentView: React.FC<{ config: Config }> = ({ config }) => {
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [folio, setFolio] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [unidad, setUnidad] = useState('');
  const [placas, setPlacas] = useState('');
  const [chofer, setChofer] = useState('');
  const [saving, setSaving] = useState(false);
  const [printed, setPrinted] = useState<Pedido | null>(null);

  const load = async () => {
    setLoading(true);
    try { setOrders(await api.orders(Estado.PENDIENTE)); } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const order = orders.find(o => o.folio === folio);
  const hayVehiculos = config.vehiculos.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return alert('Selecciona un pedido.');
    if (hayVehiculos && !vehiculoId) return alert('Elige la unidad.');
    if (!hayVehiculos && !unidad.trim()) return alert('Escribe la unidad.');
    if (!chofer.trim()) return alert('Escribe el nombre del chofer.');
    setSaving(true);
    try {
      const emb = await api.ship({ folio: order.folio, vehiculo_id: vehiculoId, chofer, unidad, placas });
      setPrinted({ ...order, embarque: emb, estado: Estado.TRANSITO });
      setFolio(''); setVehiculoId(''); setUnidad(''); setPlacas(''); setChofer('');
      load();
    } catch (err: any) {
      alert('Error al guardar el embarque: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (printed) {
    return (
      <div className="animate-fadeIn space-y-4 max-w-md mx-auto">
        <div className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-green-600 text-center">
          <i className="fas fa-check-circle text-4xl text-green-600 mb-2"></i>
          <h2 className="text-xl font-black text-gray-800">Embarque generado · {printed.folio}</h2>
          <p className="text-sm text-gray-500">El pedido pasó a "En Tránsito".</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={() => printNode('ship-ticket')} className="bg-gray-800 text-white font-bold py-3 rounded-xl"><i className="fas fa-print mr-2"></i>Imprimir</button>
            <button onClick={() => downloadPdf('ship-ticket', `Embarque_${printed.folio}.pdf`)} className="bg-red-600 text-white font-bold py-3 rounded-xl"><i className="fas fa-file-pdf mr-2"></i>PDF</button>
          </div>
          <button onClick={() => setPrinted(null)} className="w-full mt-3 border border-gray-200 font-bold py-3 rounded-xl text-gray-600">Nuevo embarque</button>
        </div>
        <div className="flex justify-center bg-gray-200 p-4 rounded-2xl overflow-x-auto"><Ticket id="ship-ticket" order={printed} /></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <form onSubmit={submit} className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-blue-800 max-w-2xl mx-auto space-y-4">
        <header className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-xl"><i className="fas fa-shipping-fast text-2xl"></i></div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Generar embarque</h2>
            <p className="text-sm text-gray-500">Asignación de unidad y chofer</p>
          </div>
          <button type="button" onClick={load} className="ml-auto text-gray-400 hover:text-blue-800" title="Actualizar"><i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i></button>
        </header>

        <div>
          <label className={label}>Pedido pendiente ({orders.length})</label>
          <select value={folio} onChange={e => setFolio(e.target.value)} className={input}>
            <option value="">— Seleccionar —</option>
            {orders.map(o => (
              <option key={o.folio} value={o.folio}>
                {o.folio} · {o.nombre_cliente} · {o.comunidad || o.direccion.slice(0, 20)}{o.urgente === 'SI' ? ' · URGENTE' : ''}{o.intentos > 0 ? ` · intento ${o.intentos + 1}` : ''}
              </option>
            ))}
          </select>
        </div>

        {order && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm space-y-1">
            <p className="font-black text-gray-800">{order.nombre_cliente} · <span className="font-bold text-gray-500">{order.telefono}</span></p>
            <p className="text-gray-600">{order.direccion}{order.comunidad ? ` — ${order.comunidad}` : ''}</p>
            <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{order.km} km · {order.minutos} min</span>
              <span className="bg-gray-200 px-2 py-1 rounded">{order.unidades} pzs</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Envío {money(order.costo_de_envio)}</span>
              {order.unidad_requerida && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Requiere: {order.unidad_requerida}</span>}
              {order.lat && order.lng && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`} target="_blank" rel="noreferrer" className="bg-red-100 text-red-700 px-2 py-1 rounded">
                  <i className="fas fa-location-arrow mr-1"></i>Abrir ruta
                </a>
              )}
            </div>
          </div>
        )}

        {hayVehiculos ? (
          <div>
            <label className={label}>Unidad</label>
            <select value={vehiculoId} onChange={e => setVehiculoId(e.target.value)} className={input}>
              <option value="">— Seleccionar —</option>
              {config.vehiculos.map(v => <option key={v.id} value={v.id}>{v.unidad}{v.placas ? ` (${v.placas})` : ''}</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Unidad</label><input value={unidad} onChange={e => setUnidad(e.target.value.toUpperCase())} placeholder="NP300" className={input} /></div>
            <div><label className={label}>Placas</label><input value={placas} onChange={e => setPlacas(e.target.value.toUpperCase())} className={input} /></div>
            <p className="col-span-2 text-xs text-gray-400">Tip: carga tus unidades en la pestaña "Vehiculos" de la hoja para elegirlas de una lista.</p>
          </div>
        )}
        <div><label className={label}>Chofer</label><input value={chofer} onChange={e => setChofer(e.target.value)} className={input} /></div>

        <button type="submit" disabled={saving || !order} className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-black py-4 rounded-xl border-b-4 border-blue-950 flex justify-center items-center gap-2">
          {saving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-truck"></i>} Enviar a ruta
        </button>
      </form>
    </div>
  );
};

export default ShipmentView;
