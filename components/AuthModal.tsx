import React, { useState } from 'react';
import { Auth } from '../types';

interface Props {
  title: string;
  subtitle?: string;
  autorizadores: string[];
  askReason?: boolean;
  reasonLabel?: string;
  onConfirm: (auth: Auth, reason: string) => Promise<void> | void;
  onClose: () => void;
}

/** Ventana para pedir la clave de Eryho, Itzel o Belén (la valida el script, no la app). */
const AuthModal: React.FC<Props> = ({ title, subtitle, autorizadores, askReason, reasonLabel, onConfirm, onClose }) => {
  const [nombre, setNombre] = useState(autorizadores[0] || '');
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !pin) return setError('Elige quién autoriza y escribe su PIN.');
    if (askReason && !reason.trim()) return setError('Escribe el motivo.');
    setBusy(true);
    setError('');
    try {
      await onConfirm({ nombre, pin }, reason.trim());
    } catch (err: any) {
      setError(err.message || String(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border-t-8 border-yellow-500 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-100 text-yellow-700 rounded-xl"><i className="fas fa-user-shield text-xl"></i></div>
          <div>
            <h3 className="text-lg font-black text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Autoriza</label>
          <select value={nombre} onChange={e => setNombre(e.target.value)} className="w-full p-3 border-2 border-gray-100 rounded-xl font-bold bg-gray-50">
            {autorizadores.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">PIN</label>
          <input type="password" inputMode="numeric" autoFocus value={pin} onChange={e => setPin(e.target.value)}
            className="w-full p-3 border-2 border-gray-100 rounded-xl font-black text-center tracking-[0.5em] bg-gray-50" />
        </div>
        {askReason && (
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">{reasonLabel || 'Motivo'}</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
              className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-sm resize-none" />
          </div>
        )}
        {error && <p className="text-sm text-red-600 font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-600">Cancelar</button>
          <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-black flex items-center justify-center gap-2">
            {busy ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>} Autorizar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AuthModal;
