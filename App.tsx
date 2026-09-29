import React, { useEffect, useState } from 'react';
import { Config, View } from './types';
import { api, apiConfigured } from './services/api';
import OrderView from './components/OrderView';
import ShipmentView from './components/ShipmentView';
import DeliveryView from './components/DeliveryView';
import AdminView from './components/AdminView';

const TABS: { view: View; label: string; icon: string }[] = [
  { view: View.ORDER, label: 'Pedido', icon: 'fa-calculator' },
  { view: View.SHIPMENT, label: 'Embarque', icon: 'fa-shipping-fast' },
  { view: View.DELIVERY, label: 'Entrega', icon: 'fa-check-double' },
  { view: View.ADMIN, label: 'Admin', icon: 'fa-user-shield' }
];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.ORDER);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');

  const loadConfig = async () => {
    setError('');
    try {
      setConfig(await api.config());
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };
  useEffect(() => { loadConfig(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-4xl mx-auto pt-6 px-4 relative z-50 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-shrink-0 transform scale-75 md:scale-90 origin-center md:origin-left">
          <div className="relative flex flex-col items-center justify-center drop-shadow-sm">
            <div className="bg-red-600 text-white font-black italic text-2xl px-4 py-1 rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-md shadow-sm -rotate-3 z-10 border border-white relative -left-5">Ferre</div>
            <div className="bg-blue-800 text-white font-black italic text-lg px-6 py-1 rounded-lg shadow-sm -mt-2 ml-5 border border-white z-0">Don Nico</div>
          </div>
        </div>
        <nav className="bg-white p-1.5 rounded-2xl shadow-xl border border-gray-100 flex gap-2 w-full md:w-auto">
          {TABS.map(t => (
            <button key={t.view} onClick={() => setActiveView(t.view)}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all ${activeView === t.view ? 'bg-blue-800 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'}`}>
              <i className={`fas ${t.icon} mb-1 text-sm ${activeView === t.view ? 'text-red-400' : ''}`}></i>
              <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="max-w-4xl mx-auto px-4 pb-12">
        {!config && !error && (
          <div className="text-center py-20 text-gray-400"><i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i><p className="font-bold">Cargando tarifas…</p></div>
        )}
        {error && (
          <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-red-600 text-center max-w-lg mx-auto">
            <i className="fas fa-plug text-3xl text-red-500 mb-3"></i>
            <h2 className="text-lg font-black text-gray-800 mb-1">No hay conexión con la hoja</h2>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            {!apiConfigured && <p className="text-xs text-gray-400 mb-4">Configura las variables en Cloudflare Pages y vuelve a publicar (ver README).</p>}
            <button onClick={loadConfig} className="bg-blue-800 text-white font-bold px-6 py-3 rounded-xl">Reintentar</button>
          </div>
        )}
        {config && (
          <>
            {activeView === View.ORDER && <OrderView config={config} />}
            {activeView === View.SHIPMENT && <ShipmentView config={config} />}
            {activeView === View.DELIVERY && <DeliveryView config={config} />}
            {activeView === View.ADMIN && <AdminView config={config} />}
          </>
        )}
        <p className="mt-8 text-center text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">Sistema de Logística 3.0</p>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.3s ease-out forwards; }
        .leaflet-container { font-family: inherit; }
      `}</style>
    </div>
  );
};

export default App;
