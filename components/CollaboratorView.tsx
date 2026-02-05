import React, { useState } from 'react';
import { ZONES } from '../constants';
import { getLogisticsAdvice } from '../services/geminiService';

const CollaboratorView: React.FC = () => {
  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const selectedZone = ZONES.find(z => z.id === selectedZoneId);

  const handleCalculate = () => {
    setShowResult(true);
  };

  const handleAskAi = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    const response = await getLogisticsAdvice(aiPrompt);
    setAiResponse(response);
    setIsAiLoading(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-lg">
            <i className="fas fa-calculator text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Cotizador de Envíos</h2>
            <p className="text-xs text-gray-500">Calcula costos basados en distancia y zona.</p>
          </div>
        </div>

        <div className="space-y-4">
          <a 
            href="https://www.google.com/maps/dir/?api=1&origin=XF29%2B6J5+Jilotepec+de+Molina+Enriquez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-md active:scale-[0.98] uppercase tracking-wide border-b-4 border-red-800"
          >
            <i className="fas fa-map-marker-alt"></i>
            1. Calcular Distancia en Maps
          </a>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">2. Rango de Distancia detectado:</label>
            <select 
              value={selectedZoneId}
              onChange={(e) => {
                setSelectedZoneId(e.target.value);
                setShowResult(false);
              }}
              className="w-full p-4 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition-all font-bold text-lg text-gray-900 bg-gray-50"
            >
              {ZONES.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleCalculate}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 text-lg border-b-4 border-blue-950"
          >
            Obtener Precio Final
          </button>

          {showResult && selectedZone && (
            <div className="mt-4 p-5 bg-blue-50 rounded-2xl border border-blue-100 text-center animate-slideUp shadow-inner">
              <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Costo de Envío Sugerido</div>
              <div className="text-5xl font-black text-blue-900 mb-1">${selectedZone.price}.00</div>
              <div className="text-xs text-gray-500 italic">Jilotepec, Estado de México</div>
              <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center px-2">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Tiempo Estimado</span>
                <span className="text-xs font-black text-blue-900">{selectedZone.estimatedTime}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-600">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <i className="fas fa-robot text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Asistente Logístico IA</h2>
        </div>
        
        <div className="space-y-4">
          <textarea 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej: ¿Cuánto cobrar por un viaje de ida y vuelta a Chapa de Mota?"
            className="w-full p-3 border border-gray-200 rounded-xl h-24 focus:ring-2 focus:ring-red-500 resize-none outline-none bg-gray-50 text-gray-900"
          />
          <button 
            onClick={handleAskAi}
            disabled={isAiLoading}
            className="w-full bg-gray-800 hover:bg-black text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {isAiLoading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-paper-plane mr-2"></i>}
            Consultar con IA
          </button>

          {aiResponse && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {aiResponse}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorView;