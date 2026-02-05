import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { TicketStatus, Pedido } from '../types';

const DeliveryView: React.FC = () => {
  const [folio, setFolio] = useState('');
  const [showFailureForm, setShowFailureForm] = useState(false);
  const [observation, setObservation] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoBase64, setPhotoBase64] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New state for dropdown
  const [inTransitOrders, setInTransitOrders] = useState<Pedido[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Fetch orders on mount
  useEffect(() => {
    fetchInTransitOrders();
  }, []);

  const fetchInTransitOrders = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('pedido')
        .select('*')
        .eq('estado', TicketStatus.IN_TRANSIT);
      
      if (error) throw error;
      if (data) setInTransitOrders(data);
    } catch (error) {
      console.error("Error fetching in-transit orders:", error);
    } finally {
      setLoadingList(false);
    }
  };

  const resetForm = () => {
    setFolio('');
    setShowFailureForm(false);
    setObservation('');
    setHasPhoto(false);
    setPhotoBase64('');
    // Refresh list to remove the processed order
    fetchInTransitOrders();
  };

  const handleDelivered = async () => {
    if (!folio.trim()) {
      alert("Por favor seleccione un pedido.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('pedido')
        .update({ estado: TicketStatus.DELIVERED })
        .eq('folio', folio.trim());

      if (error) throw error;

      alert(`✅ Pedido marcado como ENTREGADO exitosamente.`);
      resetForm();
    } catch (error: any) {
      console.error('Error updating delivery:', error);
      alert('Error al actualizar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotDeliveredInit = () => {
    if (!folio.trim()) {
      alert("Por favor seleccione un pedido.");
      return;
    }
    setShowFailureForm(true);
  };

  const handleSubmitFailure = async () => {
    if (!observation.trim()) {
      alert("Por favor ingrese una observación.");
      return;
    }
    if (!hasPhoto || !photoBase64) {
      alert("Es necesario adjuntar evidencia fotográfica.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Update Pedido Status
      const { error: updateError } = await supabase
        .from('pedido')
        .update({ estado: TicketStatus.NOT_FOUND }) 
        .eq('folio', folio.trim());

      if (updateError) throw updateError;

      // 2. Insert Evidence
      const { error: insertError } = await supabase
        .from('evidencias_entrega')
        .insert([{
           folio: folio, 
           evidencia_fotografica: photoBase64
        }]);

      if (insertError) throw insertError;

      alert(`⚠️ Incidencia reportada.\nEstado: NO ENTREGADO / NO ENCONTRADO`);
      resetForm();

    } catch (error: any) {
      console.error('Error reporting failure:', error);
      alert('Error al reportar incidencia: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setHasPhoto(true);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPhotoBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedOrderInfo = inTransitOrders.find(o => o.folio === folio);

  return (
    <div className="animate-fadeIn">
      <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-red-600 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
          <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
            <i className="fas fa-box-open text-3xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Confirmar Entrega</h2>
            <p className="text-sm text-gray-500">Pedidos En Tránsito</p>
          </div>
        </div>

        {/* Folio Selection Section */}
        <div className="mb-6">
          <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1">
            Seleccionar Pedido {loadingList && <i className="fas fa-spinner fa-spin ml-2"></i>}
          </label>
          <div className="relative">
            <i className="fas fa-truck-loading absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl"></i>
            <select
              value={folio}
              onChange={(e) => setFolio(e.target.value)}
              disabled={showFailureForm || isSubmitting}
              className="w-full pl-14 pr-4 py-5 text-sm font-bold border-2 border-gray-100 rounded-2xl focus:border-red-600 focus:ring-0 outline-none transition-all bg-gray-50 text-gray-900 appearance-none truncate"
            >
              <option value="">-- Seleccionar de la lista --</option>
              {inTransitOrders.map((order) => (
                <option key={order.folio} value={order.folio}>
                  {order.no_tiket} - {order.nombre_cliente.split('|')[0].trim()}
                </option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <i className="fas fa-chevron-down text-gray-400"></i>
            </div>
          </div>
          
          {/* Display Details if selected */}
          {selectedOrderInfo && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fadeIn">
              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Dirección de Entrega:</p>
              <p className="text-sm font-medium text-gray-800">
                {selectedOrderInfo.nombre_cliente.includes('|') 
                  ? selectedOrderInfo.nombre_cliente.split('|')[1] 
                  : 'Dirección no especificada en cliente'}
              </p>
              <div className="flex gap-4 mt-3">
                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                   <i className="fas fa-phone mr-1"></i> {selectedOrderInfo.telefono}
                 </span>
                 <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded font-bold">
                   <i className="fas fa-box mr-1"></i> {selectedOrderInfo.unidades} pzs
                 </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!showFailureForm ? (
          <div className="grid grid-cols-1 gap-4 animate-fadeIn">
            <button 
              onClick={handleDelivered}
              disabled={isSubmitting || !folio}
              className="group relative overflow-hidden w-full bg-green-500 hover:bg-green-600 text-white p-6 rounded-2xl transition-all shadow-lg shadow-green-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed border-b-4 border-green-700"
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xl font-black tracking-tight">ENTREGADO</span>
                <i className="fas fa-check-circle text-3xl group-hover:scale-110 transition-transform"></i>
              </div>
              <div className="absolute inset-0 bg-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
            </button>

            <button 
              onClick={handleNotDeliveredInit}
              disabled={isSubmitting || !folio}
              className="group w-full bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-100 p-6 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">NO ENTREGADO</span>
                <i className="fas fa-times-circle text-2xl"></i>
              </div>
            </button>
          </div>
        ) : (
          /* Failure Form */
          <div className="space-y-5 animate-slideUp bg-red-50 p-6 rounded-3xl border border-red-100">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <i className="fas fa-exclamation-triangle"></i>
              <h3 className="font-bold">Reporte de Incidencia</h3>
            </div>

            {/* Photo Evidence */}
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl transition-all ${hasPhoto ? 'border-green-500 bg-green-50' : 'border-red-200 bg-white group-hover:bg-red-50'}`}>
                <div className={`p-3 rounded-full mb-3 ${hasPhoto ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>
                  <i className={`fas ${hasPhoto ? 'fa-check text-xl' : 'fa-camera text-xl'}`}></i>
                </div>
                <span className={`text-sm font-bold ${hasPhoto ? 'text-green-700' : 'text-gray-500'}`}>
                  {hasPhoto ? 'Evidencia Adjuntada' : 'Tomar Foto de Domicilio'}
                </span>
              </div>
            </div>

            {/* Observation Text */}
            <div>
              <label className="block text-xs font-bold text-red-700 mb-2 uppercase">Motivo de no entrega</label>
              <textarea 
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Describa la razón (ej. Domicilio incorrecto, Cliente ausente)..."
                className="w-full p-4 border border-red-200 rounded-xl h-32 focus:ring-2 focus:ring-red-500 outline-none resize-none bg-white text-sm text-gray-900"
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowFailureForm(false)}
                disabled={isSubmitting}
                className="flex-1 bg-white text-gray-600 font-bold py-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSubmitFailure}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                Enviar Reporte
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryView;