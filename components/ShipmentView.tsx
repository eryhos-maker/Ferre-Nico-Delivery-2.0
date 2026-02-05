import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Pedido, TicketStatus } from '../types';

const ShipmentView: React.FC = () => {
  const [activeOrders, setActiveOrders] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    folio: '',
    unit: '',
    plates: '',
    driver: ''
  });
  
  // Stores the order to be printed
  const [printOrder, setPrintOrder] = useState<Pedido | null>(null);
  // Controls if we show the success/action panel instead of the form
  const [showActions, setShowActions] = useState(false);

  // Fetch pending orders on mount and subscribe to changes
  useEffect(() => {
    fetchPendingOrders();

    const channel = supabase
      .channel('pedido-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido' },
        () => fetchPendingOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pedido')
        .select('*')
        .eq('estado', TicketStatus.PENDING)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setActiveOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'unit' || field === 'plates') {
      if (!/^[a-zA-Z0-9\s-]*$/.test(value)) return;
    }
    if (field === 'driver') {
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.folio || !formData.unit || !formData.plates || !formData.driver) {
      alert("Todos los campos son obligatorios");
      return;
    }
    
    try {
      const orderToPrint = activeOrders.find(o => o.folio === formData.folio);
      if (!orderToPrint) {
        alert("Error: No se encontró la información del pedido para imprimir.");
        return;
      }

      const { error: updateError } = await supabase
        .from('pedido')
        .update({ estado: TicketStatus.IN_TRANSIT })
        .eq('folio', formData.folio);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from('embarque')
        .insert([{
            folio: formData.folio,
            unidad: formData.unit,
            placas: formData.plates,
            chofer: formData.driver
        }]);
      
      if (insertError) throw insertError;

      setPrintOrder({
        ...orderToPrint,
        tempUnit: formData.unit,
        tempDriver: formData.driver
      });
      
      setFormData({ folio: '', unit: '', plates: '', driver: '' });
      setShowActions(true);
      fetchPendingOrders();

    } catch (error: any) {
      console.error("Error saving shipment:", error);
      alert("Error al guardar el embarque: " + error.message);
    }
  };

  const handleDownloadPDF = () => {
    if (!printOrder) return;

    const element = document.getElementById('ticket-content');
    if (!element) {
      alert("No se encontró el ticket para generar PDF");
      return;
    }

    // @ts-ignore
    const html2pdf = window.html2pdf;

    if (!html2pdf) {
      alert("Librería PDF no cargada. Por favor recargue la página.");
      return;
    }
    
    const opt = {
      margin: 0, // Margen cero para aprovechar todo el papel
      filename: `Embarque_${printOrder.no_tiket}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handleWebPrint = () => {
    const content = document.getElementById('print-container');
    if (!content) return;

    const printWindow = window.open('', '', 'height=800,width=600');
    if (!printWindow) {
        alert("Por favor permite las ventanas emergentes para imprimir.");
        return;
    }

    printWindow.document.write('<html><head><title>Imprimir Ticket</title>');
    printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
    printWindow.document.write('<style>@page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 0; }</style>');
    printWindow.document.write('</head><body class="bg-white">');
    // Clone node to avoid moving the original DOM element
    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();

    // Pequeño delay para asegurar que Tailwind cargue los estilos
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleNewShipment = () => {
    setPrintOrder(null);
    setShowActions(false);
  };

  return (
    <div className="animate-fadeIn pb-10">
      
      {/* UI WRAPPER */}
      <div id="shipment-ui">
        {!showActions ? (
          /* --- Main Form UI --- */
          <div className="bg-white p-6 rounded-2xl shadow-xl border-t-4 border-blue-800 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl">
                <i className="fas fa-shipping-fast text-2xl"></i>
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800">Generar Embarque</h2>
                <p className="text-sm text-gray-500">Asignación de unidad y chofer</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Folio Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase">
                  Seleccionar Pedido Pendiente {loading && <i className="fas fa-spinner fa-spin ml-2"></i>}
                </label>
                <div className="relative">
                  <i className="fas fa-list-ol absolute left-4 top-4 text-gray-400"></i>
                  <select 
                    value={formData.folio}
                    onChange={(e) => handleChange('folio', e.target.value)}
                    className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold bg-gray-50 text-gray-900 appearance-none"
                  >
                    <option value="">-- Seleccione un Pedido --</option>
                    {activeOrders.map(order => (
                      <option key={order.folio} value={order.folio}>
                        {order.no_tiket} - {order.nombre_cliente.substring(0, 25)}...
                      </option>
                    ))}
                  </select>
                </div>
                {formData.folio && activeOrders.find(o => o.folio === formData.folio) && (
                  <p className="text-xs text-blue-600 font-bold ml-2 mt-1 break-words">
                    <i className="fas fa-check-circle mr-1"></i> 
                    Cliente: {activeOrders.find(o => o.folio === formData.folio)?.nombre_cliente}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Unit */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase">Unidad (Vehículo)</label>
                  <div className="relative">
                    <i className="fas fa-truck-pickup absolute left-4 top-4 text-gray-400"></i>
                    <input 
                      type="text" 
                      value={formData.unit}
                      onChange={(e) => handleChange('unit', e.target.value)}
                      placeholder="Ejem: Nissan NP300"
                      className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold uppercase bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>

                {/* Plates */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase">Placas</label>
                  <div className="relative">
                    <i className="fas fa-minus-circle absolute left-4 top-4 text-gray-400"></i>
                    <input 
                      type="text" 
                      value={formData.plates}
                      onChange={(e) => handleChange('plates', e.target.value)}
                      placeholder="ABC-123-D"
                      className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-bold uppercase bg-gray-50 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Driver */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase">Nombre del Chofer <span className="text-blue-500 text-[10px]">(Solo Letras)</span></label>
                <div className="relative">
                  <i className="fas fa-user-friends absolute left-4 top-4 text-gray-400"></i>
                  <input 
                    type="text" 
                    value={formData.driver}
                    onChange={(e) => handleChange('driver', e.target.value)}
                    placeholder="Nombre Completo del Operador"
                    className="w-full pl-10 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 focus:ring-0 outline-none transition-all font-medium bg-gray-50 text-gray-900"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-200 transform active:scale-[0.98] flex items-center justify-center gap-2 border-b-4 border-blue-950"
                >
                  <i className="fas fa-check-circle"></i>
                  Generar y Guardar Embarque
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- Action Panel (After Success) --- */
          <div className="animate-fadeIn max-w-md mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border-t-8 border-green-500 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <i className="fas fa-check text-4xl text-green-600"></i>
              </div>
              
              <h3 className="text-2xl font-black text-gray-800 mb-2">¡Embarque Generado!</h3>
              <p className="text-gray-500 mb-6 text-sm">El pedido ha pasado a estado <strong>"En Tránsito"</strong>.</p>
              
              <div className="space-y-3">
                
                {/* Botón Imprimir Web Directa */}
                <button 
                  onClick={handleWebPrint}
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-print"></i>
                  Imprimir Ticket
                </button>

                {/* Botón Descargar PDF */}
                <button 
                  onClick={handleDownloadPDF}
                  className="w-full bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-file-pdf"></i>
                  Guardar PDF
                </button>

                <div className="border-t border-gray-100 my-4 pt-4">
                  <button 
                    onClick={handleNewShipment}
                    className="w-full bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-bold py-3 rounded-xl transition-all"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Nuevo Embarque
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Print Container --- */}
      {/* Hidden container, used as source for html2pdf and print */}
      {printOrder && (
        <div id="print-container" className="hidden">
           {/* Inner content for PDF/Print - Ancho optimizado para 80mm */}
          <div 
            id="ticket-content"
            className="w-[80mm] mx-auto bg-white p-2 font-sans text-black"
          >
            {/* Header con Logo CSS */}
            <div className="flex flex-col items-center justify-center mb-2 border-b-2 border-black pb-2">
              <div className="transform scale-90 origin-center mb-1">
                  <div className="relative flex flex-col items-center justify-center">
                    <div className="bg-black text-white font-black italic text-lg px-3 py-0.5 rounded-md shadow-sm transform -rotate-2 z-10 border border-white">
                      Ferre
                    </div>
                    <div className="bg-black text-white font-black italic text-sm px-4 py-0.5 rounded shadow-sm transform rotate-0 -mt-1 ml-4 border border-white z-0">
                      Don Nico
                    </div>
                  </div>
              </div>
              <p className="text-[9px] font-bold text-center leading-none mt-1">Jilotepec de Molina Enríquez</p>
              <p className="mt-1 font-black text-[10px] border border-black inline-block px-2 py-0.5 uppercase">Embarque de Salida</p>
            </div>

            {/* Datos Generales */}
            <div className="mb-2 space-y-0.5 text-[9px] leading-tight font-bold">
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex justify-between">
                <span>FOLIO:</span>
                <span className="font-black">{printOrder.folio.slice(0,8)}</span>
              </div>
              <div className="flex justify-between">
                <span>TICKET:</span>
                <span className="font-black text-[11px]">{printOrder.no_tiket}</span>
              </div>
            </div>

            {/* Datos Vehículo */}
            <div className="border-t border-dotted border-black py-1 mb-2 space-y-0.5 text-[9px] uppercase leading-tight">
              <div className="flex justify-between">
                <span className="font-bold">UNIDAD:</span>
                <span className="text-right max-w-[50mm] break-words">{printOrder.tempUnit || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">PLACAS:</span>
                <span className="text-right">{formData.plates || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">CHOFER:</span>
                <span className="text-right max-w-[50mm] break-words">{printOrder.tempDriver || "N/A"}</span>
              </div>
            </div>

            {/* Datos de Entrega */}
            <div className="border-t border-b border-black py-2 mb-2">
              <p className="font-black mb-1 text-[9px] uppercase bg-black text-white inline-block px-1">DATOS DE ENTREGA:</p>
              {(() => {
                const parts = printOrder.nombre_cliente.split('|');
                const name = parts[0]?.trim();
                const address = parts[1]?.trim();
                return (
                  <>
                    <p className="uppercase text-[10px] leading-none font-black mb-1">{name}</p>
                    {address && <p className="uppercase text-[9px] leading-tight mb-1">{address}</p>}
                  </>
                );
              })()}
              <p className="mt-1 text-[10px] font-bold"><i className="fas fa-phone mr-1"></i> {printOrder.telefono}</p>
            </div>

            {/* Totales */}
            <div className="space-y-0.5 text-right mb-4 text-[9px] font-bold">
                <div className="flex justify-between">
                <span>UNIDADES:</span>
                <span>{printOrder.unidades} pzs</span>
              </div>
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${printOrder.monto_de_compra.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>ENVIO:</span>
                <span>${printOrder.costo_de_envio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-black border-t-2 border-black pt-1 mt-1">
                <span>TOTAL A COBRAR:</span>
                <span>${(printOrder.monto_de_compra + printOrder.costo_de_envio).toFixed(2)}</span>
              </div>
            </div>

            {/* Firmas */}
            <div className="mt-6 text-center">
              {/* Firma Recibido */}
              <div className="mb-6">
                 <div className="h-8 mb-1 border-b border-black w-3/4 mx-auto"></div>
                 <p className="text-[8px] font-bold uppercase">Firma de Recibido / Sello</p>
              </div>

              {/* Firma Seguridad Física */}
              <div className="mb-4">
                 <div className="h-8 mb-1 border-b border-black w-3/4 mx-auto"></div>
                 <p className="text-[8px] font-bold uppercase">Validación Seguridad Física</p>
              </div>
            </div>

            <div className="text-center text-[8px] mt-2 border-t border-black pt-1">
              <p className="font-bold">*** FERRE DON NICO ***</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentView;