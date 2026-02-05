import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { TicketStatus, Pedido } from '../types';

const OrderView: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Pedido | null>(null);

  const [formData, setFormData] = useState({
    ticketNo: '',
    vendorNo: '',
    clientName: '',
    deliveryAddress: '',
    phone: '',
    purchaseAmount: '',
    units: '',
    shippingCost: ''
  });

  const handleChange = (field: string, value: string) => {
    if (field === 'clientName') {
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }
    
    if (field === 'phone' || field === 'units') {
      if (!/^\d*$/.test(value)) return;
    }

    if (field === 'vendorNo') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 4) return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ticketNo || !formData.clientName || !formData.phone || !formData.deliveryAddress) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    setIsSubmitting(true);
    setSuccessOrder(null);

    try {
      const fullClientName = `${formData.clientName} | ${formData.deliveryAddress}`;

      // Insert and strictly select the returned data to ensure DB persistence
      const { data, error } = await supabase
        .from('pedido')
        .insert([
          {
            no_tiket: formData.ticketNo,
            nombre_cliente: fullClientName,
            telefono: formData.phone,
            monto_de_compra: parseFloat(formData.purchaseAmount) || 0,
            unidades: parseInt(formData.units) || 0,
            costo_de_envio: parseFloat(formData.shippingCost) || 0,
            estado: TicketStatus.PENDING
          }
        ])
        .select(); // .select() is crucial to verify it was actually created

      if (error) throw error;

      // Ensure data exists before showing success
      if (data && data.length > 0) {
        setSuccessOrder(data[0]);
        
        // Reset form only on success
        setFormData({
          ticketNo: '',
          vendorNo: '',
          clientName: '',
          deliveryAddress: '',
          phone: '',
          purchaseAmount: '',
          units: '',
          shippingCost: ''
        });
      } else {
        throw new Error("La base de datos no retornó confirmación.");
      }

    } catch (error: any) {
      console.error('Error creating order:', error);
      alert('Error al guardar el pedido: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn relative">
      <div className={`bg-white p-6 rounded-2xl shadow-xl border-t-4 border-blue-800 max-w-2xl mx-auto transition-all ${successOrder ? 'blur-sm pointer-events-none opacity-50' : ''}`}>
        <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <div className="p-3 bg-blue-50 text-blue-800 rounded-xl">
            <i className="fas fa-clipboard-list text-2xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">Nuevo Pedido</h2>
            <p className="text-sm text-gray-500">Registro en Base de Datos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Folio Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Folio (Sistema)</label>
            <span className="text-sm font-mono font-bold text-gray-400 tracking-wider">Se asignará al guardar</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Ticket No */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">No. Ticket</label>
              <div className="relative">
                <i className="fas fa-receipt absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="text" 
                  value={formData.ticketNo}
                  onChange={(e) => handleChange('ticketNo', e.target.value)}
                  placeholder="A-12345"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>

            {/* Vendor No */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">No. Vendedor</label>
              <div className="relative">
                <i className="fas fa-user-tag absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="text" 
                  value={formData.vendorNo}
                  onChange={(e) => handleChange('vendorNo', e.target.value)}
                  placeholder="0001"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">Teléfono</label>
              <div className="relative">
                <i className="fas fa-phone absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="55 1234 5678"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Client Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600 uppercase">Nombre del Cliente</label>
            <div className="relative">
              <i className="fas fa-user absolute left-4 top-4 text-gray-400"></i>
              <input 
                type="text" 
                value={formData.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
                placeholder="Nombre Completo"
                className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-600 uppercase">Dirección de Entrega</label>
            <div className="relative">
              <i className="fas fa-map-marker-alt absolute left-4 top-4 text-gray-400"></i>
              <input 
                type="text" 
                value={formData.deliveryAddress}
                onChange={(e) => handleChange('deliveryAddress', e.target.value)}
                placeholder="Calle, Número, Colonia, Referencias"
                className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             {/* Purchase Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">Monto Compra</label>
              <div className="relative">
                <i className="fas fa-dollar-sign absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="number" 
                  value={formData.purchaseAmount}
                  onChange={(e) => handleChange('purchaseAmount', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>

            {/* Units */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">Unidades</label>
              <div className="relative">
                <i className="fas fa-boxes absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="text" 
                  value={formData.units}
                  onChange={(e) => handleChange('units', e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>

            {/* Shipping Cost */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-600 uppercase">Costo Envío</label>
              <div className="relative">
                <i className="fas fa-shipping-fast absolute left-4 top-4 text-gray-400"></i>
                <input 
                  type="number" 
                  value={formData.shippingCost}
                  onChange={(e) => handleChange('shippingCost', e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 text-lg border-b-4 border-blue-950 flex justify-center items-center gap-2"
          >
             {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
             Registrar Pedido
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-t-8 border-green-500 transform transition-all scale-100">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check text-4xl text-green-600"></i>
            </div>
            
            <h3 className="text-2xl font-black text-gray-800 mb-2">¡Pedido Exitoso!</h3>
            <p className="text-gray-500 mb-6">El pedido se ha guardado correctamente en la base de datos.</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 border border-gray-100">
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500 font-bold">Ticket:</span>
                 <span className="font-black text-gray-800">{successOrder.no_tiket}</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500 font-bold">Folio Sistema:</span>
                 <span className="font-mono text-xs text-gray-600">{successOrder.folio.substring(0,8)}...</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-gray-500 font-bold">Estado:</span>
                 <span className="text-green-600 font-bold bg-green-50 px-2 rounded-full border border-green-100">{successOrder.estado}</span>
               </div>
            </div>

            <button 
              onClick={() => setSuccessOrder(null)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 transition-all active:scale-95"
            >
              Aceptar y Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderView;