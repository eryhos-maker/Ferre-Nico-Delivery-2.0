import React, { useState } from 'react';
import { TicketStatus } from '../types';

const DriverView: React.FC = () => {
  const [ticketId, setTicketId] = useState('');
  const [showObservation, setShowObservation] = useState(false);
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);

  const handleStatusUpdate = (status: TicketStatus) => {
    if (!ticketId) {
      alert("Por favor ingrese el número de pedido.");
      return;
    }

    if (status === TicketStatus.NOT_FOUND && !showObservation) {
      setShowObservation(true);
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      alert(`Pedido ${ticketId} actualizado a: ${status.toUpperCase()}\n${status === TicketStatus.NOT_FOUND ? 'Reporte enviado con éxito.' : ''}`);
      setIsSubmitting(false);
      setTicketId('');
      setObservation('');
      setShowObservation(false);
      setHasPhoto(false);
    }, 1200);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setHasPhoto(true);
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-lg mx-auto overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-orange-100 text-orange-600 rounded-full mb-4">
            <i className="fas fa-truck-moving text-3xl"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-800">Panel de Chofer</h2>
          <p className="text-gray-500">Gestión de envíos y entregas</p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest text-center">Número de Pedido</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Ej: 101"
              className="w-full p-4 text-3xl font-black border-2 border-gray-100 rounded-2xl focus:border-orange-500 focus:ring-0 transition-all text-center tracking-tighter bg-gray-50 text-gray-900"
            />
          </div>

          {!showObservation ? (
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => handleStatusUpdate(TicketStatus.DELIVERED)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-5 rounded-2xl transition-all shadow-lg shadow-green-100 active:scale-95 disabled:opacity-50"
              >
                <i className="fas fa-check-circle text-2xl"></i>
                ✅ ENTREGADO
              </button>
              <button 
                onClick={() => handleStatusUpdate(TicketStatus.NOT_FOUND)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white text-xl font-bold py-5 rounded-2xl transition-all shadow-lg shadow-red-100 active:scale-95 disabled:opacity-50"
              >
                <i className="fas fa-times-circle text-2xl"></i>
                ❌ NO ENCONTRADO
              </button>
            </div>
          ) : (
            <div className="space-y-4 bg-gray-50 p-5 rounded-3xl border-2 border-dashed border-gray-200 animate-slideUp">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700 flex items-center gap-2 uppercase text-xs tracking-wider">
                  <i className="fas fa-camera text-red-500"></i>
                  Evidencia Fotográfica
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hasPhoto ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                  {hasPhoto ? 'CARGADA' : 'REQUERIDA'}
                </span>
              </div>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handlePhotoChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${hasPhoto ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white group-hover:border-orange-400'}`}>
                  <i className={`fas ${hasPhoto ? 'fa-check-circle text-green-500' : 'fa-camera text-gray-400'} text-3xl mb-2`}></i>
                  <span className="text-xs font-bold text-gray-500">{hasPhoto ? 'Foto lista' : 'Tomar Foto del Domicilio'}</span>
                </div>
              </div>

              <textarea 
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Motivo por el cual no se entregó..."
                className="w-full p-4 border border-gray-200 rounded-2xl h-24 focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white shadow-inner text-gray-900"
              />

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowObservation(false)}
                  className="flex-1 bg-white border border-gray-200 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-100 transition-all text-sm"
                >
                  Regresar
                </button>
                <button 
                  onClick={() => handleStatusUpdate(TicketStatus.NOT_FOUND)}
                  className="flex-1 bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 text-sm"
                >
                  ENVIAR REPORTE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverView;