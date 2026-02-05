
import React, { useState } from 'react';
import { View } from './types';
import CollaboratorView from './components/CollaboratorView';
import AdminView from './components/AdminView';
import OrderView from './components/OrderView';
import ShipmentView from './components/ShipmentView';
import DeliveryView from './components/DeliveryView';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.COLLABORATOR);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      
      {/* Header Container: Logo + Navigation */}
      <div className="max-w-4xl mx-auto pt-6 px-4 relative z-50 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo Section - Top Left */}
        <div className="flex-shrink-0 transform scale-75 md:scale-90 origin-center md:origin-left hover:scale-100 transition-transform cursor-pointer">
          <div className="relative flex flex-col items-center justify-center filter drop-shadow-sm">
             {/* Ferre Bubble */}
             <div className="bg-red-600 text-white font-black italic text-2xl px-4 py-1 rounded-tl-xl rounded-tr-xl rounded-br-xl rounded-bl-md shadow-sm transform -rotate-3 z-10 border border-white relative -left-5">
               Ferre
               <div className="absolute bottom-[-5px] left-3 w-3 h-3 bg-red-600 transform rotate-45"></div>
             </div>
             {/* Don Nico Banner */}
             <div className="bg-blue-800 text-white font-black italic text-lg px-6 py-1 rounded-lg shadow-sm transform rotate-0 -mt-2 ml-5 border border-white z-0">
               Don Nico
             </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="bg-white p-1.5 rounded-2xl shadow-xl border border-gray-100 flex gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
          <button 
            onClick={() => setActiveView(View.COLLABORATOR)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all duration-300 ${
              activeView === View.COLLABORATOR 
                ? 'bg-blue-800 text-white shadow-lg transform scale-[1.02]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <i className={`fas fa-calculator mb-1 text-sm ${activeView === View.COLLABORATOR ? 'text-red-400' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Cotizar</span>
          </button>
          
          <button 
            onClick={() => setActiveView(View.ORDER)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all duration-300 ${
              activeView === View.ORDER 
                ? 'bg-blue-800 text-white shadow-lg transform scale-[1.02]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <i className={`fas fa-clipboard-list mb-1 text-sm ${activeView === View.ORDER ? 'text-red-400' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Pedido</span>
          </button>

          <button 
            onClick={() => setActiveView(View.SHIPMENT)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all duration-300 ${
              activeView === View.SHIPMENT 
                ? 'bg-blue-800 text-white shadow-lg transform scale-[1.02]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <i className={`fas fa-shipping-fast mb-1 text-sm ${activeView === View.SHIPMENT ? 'text-red-400' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Embarque</span>
          </button>

          <button 
            onClick={() => setActiveView(View.DELIVERY)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all duration-300 ${
              activeView === View.DELIVERY 
                ? 'bg-blue-800 text-white shadow-lg transform scale-[1.02]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <i className={`fas fa-check-double mb-1 text-sm ${activeView === View.DELIVERY ? 'text-red-400' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Entrega</span>
          </button>
          
          <button 
            onClick={() => setActiveView(View.ADMIN)}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-3 min-w-[70px] rounded-xl transition-all duration-300 ${
              activeView === View.ADMIN 
                ? 'bg-blue-800 text-white shadow-lg transform scale-[1.02]' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-red-600'
            }`}
          >
            <i className={`fas fa-user-shield mb-1 text-sm ${activeView === View.ADMIN ? 'text-red-400' : ''}`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pb-12">
        {activeView === View.COLLABORATOR && <CollaboratorView />}
        {activeView === View.ORDER && <OrderView />}
        {activeView === View.SHIPMENT && <ShipmentView />}
        {activeView === View.DELIVERY && <DeliveryView />}
        {activeView === View.ADMIN && <AdminView />}

        {/* Footer Text Only */}
        <div className="mt-8 mb-8 text-center opacity-60">
          <p className="text-gray-400 text-[10px] font-bold tracking-[0.2em] uppercase">Sistema de Logística 1.0</p>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default App;
