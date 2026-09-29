import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api';
import { downloadCsv, downloadPdf, fmtDate, localDay, money, printNode, statusStyle } from '../services/utils';
import { Bitacora, Config, Estado, Pedido } from '../types';
import Ticket from './Ticket';

const TOKEN_KEY = 'fnd_admin_token';
const safeGet = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string | null) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch { /* sin almacenamiento */ } };

const today = () => localDay();
const monthStart = () => { const d = new Date(); return localDay(new Date(d.getFullYear(), d.getMonth(), 1)); };

const AdminView: React.FC<{ config: Config }> = ({ config }) => {
  const [token, setToken] = useState<string | null>(safeGet(TOKEN_KEY));
  const [who, setWho] = useState(safeGet(TOKEN_KEY + '_who') || '');
  const [nombre, setNombre] = useState(config.autorizadores[0] || '');
  const [pin, setPin] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [bitacora, setBitacora] = useState<Bitacora[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [filtroEstado, setFiltroEstado] = useState('');
  const [tab, setTab] = useState<'pedidos' | 'bitacora' | 'tarifas'>('pedidos');
  const [detail, setDetail] = useState<Pedido | null>(null);
  const [editing, setEditing] = useState<Pedido | null>(null);

  const logout = () => { setToken(null); safeSet(TOKEN_KEY, null); safeSet(TOKEN_KEY + '_who', null); };

  const load = async (tk = token) => {
    if (!tk) return;
    setLoading(true);
    try {
      const d = await api.adminData(tk);
      setPedidos(d.pedidos);
      setBitacora(d.bitacora);
    } catch (e: any) {
      if (/Sesión/.test(e.message)) logout();
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (token) load(); }, [token]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const r = await api.login({ nombre, pin });
      safeSet(TOKEN_KEY, r.token); safeSet(TOKEN_KEY + '_who', r.nombre);
      setWho(r.nombre); setToken(r.token); setPin('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const inRange = useMemo(() => pedidos.filter(p => {
    const d = localDay(p.fecha_creacion);
    return d >= from && d <= to && (!filtroEstado || p.estado === filtroEstado);
  }), [pedidos, from, to, filtroEstado]);

  const activos = inRange.filter(p => p.estado !== Estado.CANCELADO);
  const kpi = {
    pedidos: activos.length,
    envio: activos.reduce((s, p) => s + p.costo_de_envio, 0),
    calculado: activos.reduce((s, p) => s + p.envio_calculado, 0),
    ajustes: activos.filter(p => p.autorizo && p.costo_de_envio !== p.envio_calculado).length,
    entregados: activos.filter(p => p.estado === Estado.ENTREGADO).length,
    km: activos.reduce((s, p) => s + p.km, 0)
  };
  const conTabla = activos.filter(p => p.precio_tabla !== '' && p.precio_tabla !== undefined && !isNaN(Number(p.precio_tabla)));
  const difTabla = conTabla.reduce((s, p) => s + (p.costo_de_envio - Number(p.precio_tabla)), 0);

  const chartEstados = [
    { name: 'Pendiente', value: inRange.filter(p => p.estado === Estado.PENDIENTE).length, color: '#ca8a04' },
    { name: 'En tránsito', value: inRange.filter(p => p.estado === Estado.TRANSITO).length, color: '#1e40af' },
    { name: 'Entregado', value: inRange.filter(p => p.estado === Estado.ENTREGADO).length, color: '#16a34a' },
    { name: 'No encontrado', value: inRange.filter(p => p.estado === Estado.NO_ENCONTRADO).length, color: '#dc2626' },
    { name: 'Cancelado', value: inRange.filter(p => p.estado === Estado.CANCELADO).length, color: '#9ca3af' }
  ];

  const porDia = useMemo(() => {
    const m: Record<string, number> = {};
    activos.forEach(p => { const d = localDay(p.fecha_creacion).slice(5, 10); m[d] = (m[d] || 0) + p.costo_de_envio; });
    return Object.keys(m).sort().map(d => ({ dia: d.split('-').reverse().join('/'), envio: m[d] }));
  }, [activos]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !token) return;
    try {
      await api.updateOrder(token, editing.folio, {
        no_ticket: editing.no_ticket, monto_de_compra: editing.monto_de_compra, estado: editing.estado,
        costo_de_envio: editing.costo_de_envio, telefono: editing.telefono, direccion: editing.direccion
      });
      setEditing(null);
      load();
    } catch (err: any) { alert(err.message); }
  };

  const remove = async (p: Pedido) => {
    if (!token || !window.confirm(`¿Eliminar ${p.folio} permanentemente? Queda registrado en la bitácora.`)) return;
    try { await api.deleteOrder(token, p.folio); load(); } catch (e: any) { alert(e.message); }
  };

  const exportPedidos = () => downloadCsv(inRange.map(p => ({
    folio: p.folio, fecha: fmtDate(p.fecha_creacion), ticket: p.no_ticket, vendedor: p.no_vendedor, cliente: p.nombre_cliente,
    telefono: p.telefono, comunidad: p.comunidad, direccion: p.direccion, km: p.km, minutos: p.minutos, compra: p.monto_de_compra,
    unidades: p.unidades, urgente: p.urgente, zona_dificil: p.zona_dificil, envio_calculado: p.envio_calculado, descuento: p.descuento,
    envio_cobrado: p.costo_de_envio, precio_tabla: p.precio_tabla, autorizo: p.autorizo, motivo_ajuste: p.ajuste_motivo,
    estado: p.estado, intentos: p.intentos, unidad: p.embarque?.unidad || '', chofer: p.embarque?.chofer || ''
  })), `pedidos_${from}_a_${to}.csv`);

  if (!token) {
    return (
      <div className="flex justify-center animate-fadeIn">
        <form onSubmit={login} className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border-t-4 border-blue-800 space-y-4">
          <div className="text-center">
            <div className="inline-flex p-4 bg-blue-800 text-white rounded-2xl mb-3"><i className="fas fa-lock text-2xl"></i></div>
            <h2 className="text-2xl font-black text-gray-800">Administración</h2>
            <p className="text-gray-500 text-sm">Entra con tu PIN de autorizador</p>
          </div>
          <select value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold bg-gray-50">
            {config.autorizadores.map(a => <option key={a}>{a}</option>)}
          </select>
          <input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN"
            className="w-full p-4 border-2 border-gray-100 rounded-2xl font-black text-center tracking-[0.5em] bg-gray-50" />
          <button disabled={loggingIn} className="w-full bg-blue-800 text-white font-black py-4 rounded-2xl flex justify-center gap-2 items-center">
            {loggingIn && <i className="fas fa-circle-notch fa-spin"></i>} Entrar
          </button>
        </form>
      </div>
    );
  }

  const Kpi = ({ l, v, sub, icon }: { l: string; v: string; sub?: string; icon: string }) => (
    <div className="bg-white rounded-2xl p-4 shadow border border-gray-100">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><i className={`fas ${icon} mr-1`}></i>{l}</p>
      <p className="text-2xl font-black text-gray-800">{v}</p>
      {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
    </div>
  );

  return (
    <div className="animate-fadeIn space-y-5">
      <div className="flex flex-wrap items-end gap-3 bg-white p-4 rounded-2xl shadow">
        <div><label className="block text-[10px] font-black text-gray-400 uppercase">Desde</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="p-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-[10px] font-black text-gray-400 uppercase">Hasta</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="p-2 border rounded-lg text-sm" /></div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase">Estado</label>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="p-2 border rounded-lg text-sm">
            <option value="">Todos</option>{Object.values(Estado).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => load()} className="p-2 px-3 rounded-lg bg-gray-100 text-gray-600"><i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i></button>
        <button onClick={exportPedidos} className="p-2 px-3 rounded-lg bg-green-600 text-white text-sm font-bold"><i className="fas fa-file-csv mr-1"></i>Exportar</button>
        <div className="ml-auto text-right text-xs text-gray-500">{who}<button onClick={logout} className="ml-2 text-red-600 font-bold">Salir</button></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi l="Pedidos" v={String(kpi.pedidos)} sub={`${kpi.entregados} entregados`} icon="fa-box" />
        <Kpi l="Envío cobrado" v={money(kpi.envio)} sub={`Promedio ${money(kpi.pedidos ? kpi.envio / kpi.pedidos : 0)}`} icon="fa-dollar-sign" />
        <Kpi l="Ajustes autorizados" v={String(kpi.ajustes)} sub={`Diferencia ${money(kpi.envio - kpi.calculado)}`} icon="fa-user-shield" />
        <Kpi l="Vs. tabla anterior" v={money(difTabla)} sub={`${conTabla.length} pedidos con comunidad · ${Math.round(kpi.km)} km`} icon="fa-table" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow h-64">
          <p className="text-xs font-black text-gray-500 uppercase mb-2">Pedidos por estado</p>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={chartEstados}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip />
              <Bar dataKey="value" name="Pedidos" radius={[6, 6, 0, 0]}>{chartEstados.map(c => <Cell key={c.name} fill={c.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow h-64">
          <p className="text-xs font-black text-gray-500 uppercase mb-2">Envío cobrado por día</p>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={porDia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => money(v)} />
              <Bar dataKey="envio" name="Envío" fill="#1e40af" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-2">
        {(['pedidos', 'bitacora', 'tarifas'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-black capitalize ${tab === k ? 'bg-blue-800 text-white' : 'bg-white text-gray-500'}`}>
            {k === 'bitacora' ? 'Bitácora' : k}
          </button>
        ))}
      </div>

      {tab === 'pedidos' && (
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr><th className="p-3 text-left">Folio</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-right">Km</th><th className="p-3 text-right">Envío</th><th className="p-3">Estado</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {inRange.map(p => (
                <tr key={p.folio} className="border-t border-gray-100">
                  <td className="p-3"><p className="font-black">{p.folio}</p><p className="text-[11px] text-gray-400">{fmtDate(p.fecha_creacion)}</p></td>
                  <td className="p-3"><p className="font-bold">{p.nombre_cliente}</p><p className="text-[11px] text-gray-400">{p.comunidad || p.direccion}</p></td>
                  <td className="p-3 text-right">{p.km}</td>
                  <td className="p-3 text-right font-bold">{money(p.costo_de_envio)}{p.autorizo && <i className="fas fa-user-shield text-yellow-500 ml-1" title={`Autorizó ${p.autorizo}`}></i>}</td>
                  <td className="p-3 text-center"><span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${statusStyle(p.estado)}`}>{p.estado}</span></td>
                  <td className="p-3 whitespace-nowrap text-right">
                    <button onClick={() => setDetail(p)} className="p-2 text-blue-800" title="Ver"><i className="fas fa-eye"></i></button>
                    <button onClick={() => setEditing({ ...p })} className="p-2 text-gray-500" title="Editar"><i className="fas fa-pen"></i></button>
                    <button onClick={() => remove(p)} className="p-2 text-red-500" title="Eliminar"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              ))}
              {!inRange.length && <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin pedidos en el rango.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bitacora' && (
        <div className="bg-white rounded-2xl shadow divide-y">
          {bitacora.map((b, i) => (
            <div key={i} className="p-3 text-sm">
              <p><span className="font-black">{b.accion}</span> · {b.folio} <span className="text-gray-400 text-xs">· {fmtDate(b.fecha)}{b.autorizo ? ` · ${b.autorizo}` : ''}</span></p>
              <p className="text-gray-600 text-xs">{b.detalle}</p>
            </div>
          ))}
          {!bitacora.length && <p className="p-8 text-center text-gray-400">Sin movimientos.</p>}
        </div>
      )}

      {tab === 'tarifas' && (
        <div className="bg-white rounded-2xl shadow p-5 space-y-2 text-sm">
          <p className="text-xs text-gray-500 mb-2"><i className="fas fa-info-circle mr-1"></i>Para cambiar una tarifa edita la pestaña "Tarifas" de la hoja. Aplica en el siguiente cálculo.</p>
          {[
            ['Banderazo', money(config.tarifas.banderazo)], ['Por km', money(config.tarifas.precio_km)], ['Por minuto', money(config.tarifas.precio_min)],
            ['Cobro mínimo', money(config.tarifas.minimo)], ['Urgente / mismo día', '+' + money(config.tarifas.urgente)], ['Zona difícil', '+' + money(config.tarifas.zona_dificil)],
            ['Envío gratis', `compra ≥ ${money(config.tarifas.gratis_monto)} y ≤ ${config.tarifas.gratis_km} km`],
            ['Descuento', `${config.tarifas.desc_pct}% en compra ≥ ${money(config.tarifas.desc_monto)}`],
            ['Autorización', `rutas de más de ${config.tarifas.max_km} km`], ['Vehículos activos', String(config.vehiculos.length)]
          ].map(([k, v]) => <div key={k} className="flex justify-between border-b border-gray-50 py-1"><span className="text-gray-500">{k}</span><span className="font-bold">{v}</span></div>)}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center"><h3 className="text-lg font-black">{detail.folio}</h3><button onClick={() => setDetail(null)} className="ml-auto text-gray-400"><i className="fas fa-times"></i></button></div>
            <div className="text-sm space-y-1">
              <p><b>Cobro:</b> calculado {money(detail.envio_calculado)} · cobrado {money(detail.costo_de_envio)}{detail.precio_tabla !== '' ? ` · tabla ${money(Number(detail.precio_tabla))}` : ''}</p>
              {detail.autorizo && <p><b>Autorizó:</b> {detail.autorizo} — {detail.ajuste_motivo}</p>}
              <p><b>Ruta:</b> {detail.km} km · {detail.minutos} min {detail.ruta_manual === 'SI' && '(capturada a mano)'}</p>
              {detail.embarque && <p><b>Embarque:</b> {detail.embarque.unidad} {detail.embarque.placas} · {detail.embarque.chofer}</p>}
            </div>
            {(detail.evidencias || []).map((ev, i) => (
              <div key={i} className="text-sm bg-gray-50 p-3 rounded-xl">
                <p className="font-bold">{ev.resultado} · {fmtDate(ev.fecha)}</p>
                {ev.motivo && <p className="text-gray-600">{ev.motivo}</p>}
                {ev.recibio && <p className="text-gray-600">Recibió: {ev.recibio}</p>}
                <div className="flex gap-3 mt-1 text-xs font-bold">
                  {ev.foto_url && <a href={ev.foto_url} target="_blank" rel="noreferrer" className="text-blue-700"><i className="fas fa-image mr-1"></i>Foto</a>}
                  {ev.lat && ev.lng && <a href={`https://www.google.com/maps?q=${ev.lat},${ev.lng}`} target="_blank" rel="noreferrer" className="text-red-600"><i className="fas fa-map-pin mr-1"></i>Ubicación</a>}
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => printNode('admin-ticket')} className="bg-gray-800 text-white font-bold py-3 rounded-xl"><i className="fas fa-print mr-2"></i>Imprimir</button>
              <button onClick={() => downloadPdf('admin-ticket', `Embarque_${detail.folio}.pdf`)} className="bg-red-600 text-white font-bold py-3 rounded-xl"><i className="fas fa-file-pdf mr-2"></i>PDF</button>
            </div>
            <div className="flex justify-center bg-gray-100 p-3 rounded-xl overflow-x-auto"><Ticket id="admin-ticket" order={detail} /></div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50">
          <form onSubmit={saveEdit} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-3">
            <h3 className="text-lg font-black">Editar {editing.folio}</h3>
            {([['no_ticket', 'Ticket', 'text'], ['telefono', 'Teléfono', 'text'], ['direccion', 'Dirección', 'text'], ['monto_de_compra', 'Monto compra', 'number'], ['costo_de_envio', 'Envío cobrado', 'number']] as const).map(([k, l, type]) => (
              <div key={k}><label className="block text-xs font-bold text-gray-500 uppercase">{l}</label>
                <input type={type} value={String((editing as any)[k] ?? '')} onChange={e => setEditing({ ...editing, [k]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value } as Pedido)} className="w-full p-3 border-2 border-gray-100 rounded-xl" />
              </div>
            ))}
            <div><label className="block text-xs font-bold text-gray-500 uppercase">Estado</label>
              <select value={editing.estado} onChange={e => setEditing({ ...editing, estado: e.target.value })} className="w-full p-3 border-2 border-gray-100 rounded-xl">
                {Object.values(Estado).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-[11px] text-gray-400">Cada cambio queda en la bitácora con tu nombre.</p>
            <div className="flex gap-2"><button type="button" onClick={() => setEditing(null)} className="flex-1 border py-3 rounded-xl font-bold">Cancelar</button><button className="flex-1 bg-blue-800 text-white py-3 rounded-xl font-black">Guardar</button></div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminView;
