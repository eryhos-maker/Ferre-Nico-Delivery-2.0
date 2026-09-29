import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { money } from '../services/utils';
import { Auth, Config, Cotizacion, Pedido } from '../types';
import MapPicker from './MapPicker';
import AuthModal from './AuthModal';

interface Props {
  config: Config;
  onCreated?: () => void;
}

const EMPTY = {
  no_ticket: '',
  no_vendedor: '',
  nombre_cliente: '',
  telefono: '',
  direccion: '',
  monto_compra: '',
  unidades: '',
  vehiculo_id: '',
  urgente: false,
  zona_dificil: false
};

const input = 'w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 outline-none font-bold bg-gray-50 text-gray-900';
const label = 'block text-xs font-bold text-gray-600 uppercase mb-1';

/** Cotizar + registrar pedido en un solo paso: el costo de envío lo calcula el sistema. */
const OrderView: React.FC<Props> = ({ config, onCreated }) => {
  const t = config.tarifas;
  const origin = { lat: t.origen_lat, lng: t.origen_lng };

  const [form, setForm] = useState(EMPTY);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [comunidad, setComunidad] = useState('');
  const [manual, setManual] = useState(false);
  const [manualKm, setManualKm] = useState('');
  const [manualMin, setManualMin] = useState('');

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  const [quote, setQuote] = useState<Cotizacion | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const [ajusteOn, setAjusteOn] = useState(false);
  const [ajusteMonto, setAjusteMonto] = useState('');
  const [ajusteMotivo, setAjusteMotivo] = useState('');

  const [showAuth, setShowAuth] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Pedido | null>(null);

  const selectedCom = useMemo(() => config.comunidades.find(c => c.comunidad === comunidad), [comunidad, config.comunidades]);
  const set = (k: keyof typeof EMPTY, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleText = (k: keyof typeof EMPTY, v: string) => {
    if (k === 'nombre_cliente' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ.\s]*$/.test(v)) return;
    if ((k === 'telefono' || k === 'unidades') && !/^\d*$/.test(v)) return;
    if (k === 'no_vendedor' && (!/^\d*$/.test(v) || v.length > 4)) return;
    set(k, v);
  };

  // --- Ubicación del destino ---
  const pickCommunity = async (name: string) => {
    setComunidad(name);
    if (!name) return;
    const c = config.comunidades.find(x => x.comunidad === name);
    if (c?.lat && c?.lng) {
      setFocus({ lat: c.lat, lng: c.lng, zoom: 15 });
      setPoint({ lat: c.lat, lng: c.lng });
      return;
    }
    setLocating(true);
    try {
      const p = await api.locateCommunity(name);
      if (p) {
        setFocus({ ...p, zoom: 15 });
        setPoint(p);
        if (c) { c.lat = p.lat; c.lng = p.lng; }
      } else {
        setQuoteError(`No encontré "${name}" en el mapa. Marca el punto tocando el mapa.`);
      }
    } catch (e: any) {
      setQuoteError(e.message);
    } finally {
      setLocating(false);
    }
  };

  const doSearch = async () => {
    if (search.trim().length < 3) return;
    setSearching(true);
    try {
      setResults(await api.geocode(search.trim()));
    } catch (e: any) {
      setQuoteError(e.message);
    } finally {
      setSearching(false);
    }
  };

  // --- Cotización automática ---
  const reqId = useRef(0);
  useEffect(() => {
    const ready = manual ? parseFloat(manualKm) > 0 : Boolean(point);
    if (!ready) { setQuote(null); return; }
    const id = ++reqId.current;
    const h = setTimeout(async () => {
      setQuoting(true);
      setQuoteError('');
      try {
        const q = await api.quote({
          lat: point?.lat, lng: point?.lng, manual,
          km: parseFloat(manualKm) || 0, minutos: parseFloat(manualMin) || 0,
          monto_compra: parseFloat(form.monto_compra) || 0,
          vehiculo_id: form.vehiculo_id, urgente: form.urgente, zona_dificil: form.zona_dificil
        });
        if (id === reqId.current) setQuote(q);
      } catch (e: any) {
        if (id === reqId.current) { setQuote(null); setQuoteError(e.message); }
      } finally {
        if (id === reqId.current) setQuoting(false);
      }
    }, 600);
    return () => clearTimeout(h);
  }, [point?.lat, point?.lng, manual, manualKm, manualMin, form.monto_compra, form.vehiculo_id, form.urgente, form.zona_dificil]);

  // --- Guardar ---
  const needsAuth = Boolean(quote?.requiere_autorizacion) || (ajusteOn && ajusteMonto !== '');

  const save = async (auth?: Auth) => {
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        ...form,
        monto_compra: parseFloat(form.monto_compra) || 0,
        unidades: parseInt(form.unidades) || 0,
        comunidad,
        lat: point?.lat, lng: point?.lng,
        manual, km: parseFloat(manualKm) || 0, minutos: parseFloat(manualMin) || 0,
        ajuste_monto: ajusteOn && ajusteMonto !== '' ? parseFloat(ajusteMonto) : '',
        ajuste_motivo: ajusteMotivo
      }, auth);
      setShowAuth(false);
      setSuccess(order);
      setForm(EMPTY); setPoint(null); setComunidad(''); setQuote(null); setSearch(''); setResults([]);
      setManual(false); setManualKm(''); setManualMin(''); setAjusteOn(false); setAjusteMonto(''); setAjusteMotivo('');
      onCreated?.();
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.no_ticket || !form.nombre_cliente || !form.telefono || !form.direccion) {
      return alert('Completa ticket, cliente, teléfono y dirección.');
    }
    if (!quote) return alert('Primero marca el destino para calcular el envío.');
    if (ajusteOn && ajusteMonto !== '' && !ajusteMotivo.trim()) return alert('Escribe el motivo del ajuste.');
    if (needsAuth) return setShowAuth(true);
    try { await save(); } catch (err: any) { alert('Error al guardar: ' + err.message); }
  };

  const finalCost = ajusteOn && ajusteMonto !== '' ? parseFloat(ajusteMonto) || 0 : quote?.total ?? 0;

  return (
    <div className="animate-fadeIn space-y-5">
      <form onSubmit={submit} className="space-y-5">
        {/* 1. Destino */}
        <section className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-red-600 space-y-4">
          <header className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl"><i className="fas fa-map-marked-alt text-xl"></i></div>
            <div>
              <h2 className="text-xl font-black text-gray-800">1. ¿A dónde va?</h2>
              <p className="text-xs text-gray-500">Elige la comunidad, busca la dirección o toca el mapa. Puedes arrastrar el pin.</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={label}>Comunidad {locating && <i className="fas fa-spinner fa-spin ml-1"></i>}</label>
              <select value={comunidad} onChange={e => pickCommunity(e.target.value)} className={input}>
                <option value="">— Seleccionar —</option>
                {config.comunidades.map(c => (
                  <option key={c.cp + c.comunidad} value={c.comunidad}>{c.comunidad} ({c.cp})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Buscar dirección</label>
              <div className="flex gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Calle, colonia o lugar"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }} className={input} />
                <button type="button" onClick={doSearch} className="px-4 rounded-xl bg-gray-800 text-white">
                  <i className={`fas ${searching ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
                </button>
              </div>
            </div>
          </div>

          {results.length > 0 && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl divide-y max-h-40 overflow-y-auto">
              {results.map((r, i) => (
                <button type="button" key={i} onClick={() => { setPoint({ lat: r.lat, lng: r.lng }); setFocus({ lat: r.lat, lng: r.lng, zoom: 16 }); setResults([]); }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-blue-50">
                  <i className="fas fa-map-pin text-red-500 mr-2"></i>{r.label}
                </button>
              ))}
            </div>
          )}

          {!manual && <MapPicker origin={origin} value={point} onChange={setPoint} focus={focus} />}

          <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} className="w-4 h-4" />
            Capturar km a mano <span className="text-xs font-normal text-gray-400">(sin señal o el mapa no llega; requiere autorización)</span>
          </label>
          {manual && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Km de ruta</label><input type="number" step="0.1" value={manualKm} onChange={e => setManualKm(e.target.value)} className={input} /></div>
              <div><label className={label}>Minutos</label><input type="number" value={manualMin} onChange={e => setManualMin(e.target.value)} className={input} /></div>
            </div>
          )}
        </section>

        {/* 2. Datos */}
        <section className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-blue-800 space-y-4">
          <header className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl"><i className="fas fa-clipboard-list text-xl"></i></div>
            <h2 className="text-xl font-black text-gray-800">2. Datos del pedido</h2>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={label}>No. Ticket *</label><input value={form.no_ticket} onChange={e => handleText('no_ticket', e.target.value)} placeholder="A-12345" className={input} /></div>
            <div><label className={label}>No. Vendedor</label><input value={form.no_vendedor} onChange={e => handleText('no_vendedor', e.target.value)} placeholder="0001" className={input} /></div>
            <div><label className={label}>Teléfono *</label><input value={form.telefono} onChange={e => handleText('telefono', e.target.value)} inputMode="tel" className={input} /></div>
          </div>
          <div><label className={label}>Nombre del cliente *</label><input value={form.nombre_cliente} onChange={e => handleText('nombre_cliente', e.target.value)} className={input} /></div>
          <div><label className={label}>Dirección y referencias *</label><input value={form.direccion} onChange={e => handleText('direccion', e.target.value)} placeholder="Calle, número, referencias" className={input} /></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className={label}>Monto compra</label><input type="number" value={form.monto_compra} onChange={e => handleText('monto_compra', e.target.value)} placeholder="0.00" className={input} /></div>
            <div><label className={label}>Unidades (pzs)</label><input value={form.unidades} onChange={e => handleText('unidades', e.target.value)} className={input} /></div>
            <div className="col-span-2 md:col-span-1">
              <label className={label}>Unidad requerida</label>
              <select value={form.vehiculo_id} onChange={e => set('vehiculo_id', e.target.value)} className={input}>
                <option value="">Estándar</option>
                {config.vehiculos.map(v => <option key={v.id} value={v.id}>{v.unidad}{v.factor !== 1 ? ` (×${v.factor})` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer font-bold text-sm ${form.urgente ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-100 text-gray-600'}`}>
              <input type="checkbox" checked={form.urgente} onChange={e => set('urgente', e.target.checked)} /> <i className="fas fa-bolt"></i> Urgente / mismo día (+{money(t.urgente)})
            </label>
            <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer font-bold text-sm ${form.zona_dificil ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-100 text-gray-600'}`}>
              <input type="checkbox" checked={form.zona_dificil} onChange={e => set('zona_dificil', e.target.checked)} /> <i className="fas fa-mountain"></i> Zona difícil (+{money(t.zona_dificil)})
            </label>
          </div>
        </section>

        {/* 3. Cobro */}
        <section className="bg-white p-5 rounded-2xl shadow-xl border-t-4 border-green-600 space-y-4">
          <header className="flex items-center gap-3">
            <div className="p-3 bg-green-50 text-green-700 rounded-xl"><i className="fas fa-receipt text-xl"></i></div>
            <h2 className="text-xl font-black text-gray-800">3. Costo de envío</h2>
            {quoting && <i className="fas fa-circle-notch fa-spin text-gray-400 ml-auto"></i>}
          </header>

          {quoteError && <p className="text-sm text-red-600 font-bold bg-red-50 p-3 rounded-xl">{quoteError}</p>}
          {!quote && !quoteError && <p className="text-sm text-gray-400 text-center py-6">Marca el destino para ver el costo.</p>}

          {quote && (
            <div className="space-y-3">
              <div className="flex gap-2 text-xs font-black">
                <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full"><i className="fas fa-road mr-1"></i>{quote.km} km</span>
                <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full"><i className="fas fa-clock mr-1"></i>{quote.minutos} min</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
                {quote.lineas.map(l => <div key={l.concepto} className="flex justify-between"><span className="text-gray-600">{l.concepto}</span><span className="font-bold">{money(l.monto)}</span></div>)}
                {quote.minimoAplicado && <div className="flex justify-between text-gray-500 italic"><span>Se aplica el cobro mínimo</span><span>{money(t.minimo)}</span></div>}
                {quote.factor !== 1 && <div className="flex justify-between text-gray-600"><span>Unidad requerida</span><span className="font-bold">×{quote.factor}</span></div>}
                {quote.descuento > 0 && <div className="flex justify-between text-green-700"><span>Descuento: {quote.motivo_descuento}</span><span className="font-bold">−{money(quote.descuento)}</span></div>}
                {quote.lineas_extra.map(l => <div key={l.concepto} className="flex justify-between text-orange-700"><span>{l.concepto}</span><span className="font-bold">+{money(l.monto)}</span></div>)}
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2 text-lg">
                  <span className="font-black">Envío</span><span className="font-black text-blue-900">{money(quote.total)}</span>
                </div>
              </div>

              {selectedCom && (
                <p className={`text-xs p-2 rounded-lg ${Math.abs(selectedCom.precio_tabla - quote.total) > 20 ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50 text-gray-500'}`}>
                  <i className="fas fa-table mr-1"></i> Referencia tabla anterior para {selectedCom.comunidad}: <b>{money(selectedCom.precio_tabla)}</b> ({selectedCom.km_tabla} km)
                  {selectedCom.nota && <> — {selectedCom.nota}</>}
                </p>
              )}
              {quote.requiere_autorizacion && (
                <p className="text-xs p-2 rounded-lg bg-yellow-50 text-yellow-800 font-bold"><i className="fas fa-user-shield mr-1"></i>Requiere autorización: {quote.motivo_autorizacion}</p>
              )}

              <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
                <input type="checkbox" checked={ajusteOn} onChange={e => setAjusteOn(e.target.checked)} /> Ajustar monto (requiere autorización)
              </label>
              {ajusteOn && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-yellow-50 p-3 rounded-xl">
                  <div><label className={label}>Nuevo monto</label><input type="number" value={ajusteMonto} onChange={e => setAjusteMonto(e.target.value)} className={input} /></div>
                  <div className="md:col-span-2"><label className={label}>Motivo</label><input value={ajusteMotivo} onChange={e => setAjusteMotivo(e.target.value)} placeholder="Ej. cliente frecuente, ruta compartida" className={input} /></div>
                </div>
              )}

              <div className="flex items-center justify-between bg-blue-900 text-white rounded-2xl p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-blue-200 font-black">Total a cobrar (compra + envío)</p>
                  <p className="text-xs text-blue-200">Envío {money(finalCost)}</p>
                </div>
                <p className="text-3xl font-black">{money((parseFloat(form.monto_compra) || 0) + finalCost)}</p>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || !quote}
            className="w-full bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg text-lg border-b-4 border-blue-950 flex justify-center items-center gap-2">
            {submitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className={`fas ${needsAuth ? 'fa-user-shield' : 'fa-save'}`}></i>}
            {needsAuth ? 'Autorizar y registrar' : 'Registrar pedido'}
          </button>
        </section>
      </form>

      {showAuth && (
        <AuthModal
          title="Autorizar pedido"
          subtitle={ajusteOn && ajusteMonto !== '' ? `Cambiar envío de ${money(quote?.total || 0)} a ${money(finalCost)}` : quote?.motivo_autorizacion}
          autorizadores={config.autorizadores}
          onConfirm={auth => save(auth)}
          onClose={() => setShowAuth(false)}
        />
      )}

      {success && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-green-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><i className="fas fa-check text-4xl text-green-600"></i></div>
            <h3 className="text-2xl font-black text-gray-800 mb-4">¡Pedido registrado!</h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 font-bold">Folio</span><span className="font-black">{success.folio}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-bold">Ticket</span><span className="font-black">{success.no_ticket}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-bold">Envío</span><span className="font-black">{money(success.costo_de_envio)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 font-bold">Total a cobrar</span><span className="font-black text-blue-900">{money(success.monto_de_compra + success.costo_de_envio)}</span></div>
            </div>
            <button onClick={() => setSuccess(null)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl">Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderView;
