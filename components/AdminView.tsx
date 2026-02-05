import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Pedido, TicketStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminView: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [tickets, setTickets] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Pedido | null>(null);

  // Print States
  const [printOrder, setPrintOrder] = useState<Pedido | null>(null);
  const [printShipmentData, setPrintShipmentData] = useState<{unidad: string, placas: string, chofer: string} | null>(null);

  // States for Report Generation
  const [reportType, setReportType] = useState<'orders' | 'shipments' | 'evidence'>('orders');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchTickets();
      // Set default report dates (current month)
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const currentDay = date.toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(currentDay);
    }
  }, [isLoggedIn]);

  const fetchTickets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('pedido')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setTickets(data as Pedido[]);
    setIsLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'FerreNico25') {
      setIsLoggedIn(true);
    } else {
      alert("Clave de administrador incorrecta");
    }
  };

  const updateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    
    const { error } = await supabase
      .from('pedido')
      .update({ 
        estado: editingTicket.estado,
        no_tiket: editingTicket.no_tiket,
        monto_de_compra: editingTicket.monto_de_compra
      })
      .eq('folio', editingTicket.folio);

    if (!error) {
      alert("Datos actualizados correctamente.");
      setEditingTicket(null);
      fetchTickets();
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  const deleteTicket = async (folio: string) => {
    if (window.confirm("¿Está seguro de que desea ELIMINAR este pedido permanentemente? Esta acción no se puede deshacer.")) {
      try {
        // 1. Eliminar evidencias relacionadas primero (para evitar error de FK)
        const { error: evidenceError } = await supabase
          .from('evidencias_entrega')
          .delete()
          .eq('folio', folio);
          
        if (evidenceError) console.warn("Nota: No se pudieron borrar evidencias (o no existían):", evidenceError.message);

        // 2. Eliminar embarque relacionado
        const { error: shipmentError } = await supabase
          .from('embarque')
          .delete()
          .eq('folio', folio);

        if (shipmentError) console.warn("Nota: No se pudo borrar embarque (o no existía):", shipmentError.message);

        // 3. Eliminar el pedido principal
        const { error } = await supabase
          .from('pedido')
          .delete()
          .eq('folio', folio);

        if (error) throw error;

        alert("Pedido eliminado correctamente.");
        fetchTickets();
      } catch (error: any) {
        console.error("Error al eliminar:", error);
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  // --- Print Logic ---
  const openPrintModal = async (ticket: Pedido) => {
    // Fetch shipment details if they exist
    const { data } = await supabase
      .from('embarque')
      .select('unidad, placas, chofer')
      .eq('folio', ticket.folio)
      .maybeSingle();

    setPrintShipmentData(data || { unidad: 'N/A', placas: 'N/A', chofer: 'N/A' });
    setPrintOrder(ticket);
  };

  const handleWebPrint = () => {
    const content = document.getElementById('admin-ticket-content');
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
    printWindow.document.write(content.innerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadPDF = () => {
    if (!printOrder) return;
    const element = document.getElementById('admin-ticket-content');
    if (!element) return;

    // @ts-ignore
    const html2pdf = window.html2pdf;
    if (!html2pdf) {
      alert("Librería PDF no cargada.");
      return;
    }
    
    const opt = {
      margin: 0,
      filename: `Embarque_${printOrder.no_tiket}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };
  // -------------------

  const generateReport = async () => {
    if (!startDate || !endDate) {
      alert("Por favor seleccione ambas fechas para el reporte.");
      return;
    }

    setIsGeneratingReport(true);
    try {
      let data: any[] = [];
      let headers: string[] = [];
      
      if (reportType === 'orders') {
        const { data: res, error } = await supabase
          .from('pedido')
          .select(`created_at, no_tiket, nombre_cliente, telefono, unidades, estado, monto_de_compra`)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`);
          
        if (error) throw error;
        data = res || [];
        headers = ["Fecha", "Ticket", "Cliente", "Telefono", "Unidades", "Estado", "Monto"];
      } 
      else {
          alert("Función de reporte completa en desarrollo.");
          setIsGeneratingReport(false);
          return;
      }

      const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + data.map(row => Object.values(row).join(",")).join("\n");
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `reporte_${reportType}_${startDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error: any) {
      console.error("Error generating report:", error);
      alert("Error: " + error.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TicketStatus.DELIVERED: return 'bg-green-100 text-green-700 border-green-200';
      case TicketStatus.IN_TRANSIT: return 'bg-blue-100 text-blue-700 border-blue-200';
      case TicketStatus.PENDING: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case TicketStatus.NOT_FOUND: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const chartData = [
    { name: 'Entregados', value: tickets.filter(t => t.estado === TicketStatus.DELIVERED).length },
    { name: 'En Tránsito', value: tickets.filter(t => t.estado === TicketStatus.IN_TRANSIT).length },
    { name: 'Pendientes', value: tickets.filter(t => t.estado === TicketStatus.PENDING).length },
    { name: 'Incidencias', value: tickets.filter(t => t.estado === TicketStatus.NOT_FOUND).length },
  ];

  const COLORS = ['#16a34a', '#1e40af', '#ca8a04', '#dc2626'];

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] animate-fadeIn">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl border-t-4 border-blue-800">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-blue-800 text-white rounded-2xl mb-4">
              <i className="fas fa-lock text-2xl"></i>
            </div>
            <h2 className="text-2xl font-black text-gray-800">Acceso Restringido</h2>
            <p className="text-gray-500">Ingrese su clave de administrador</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-800 focus:ring-0 text-center text-2xl tracking-widest outline-none transition-all bg-gray-50 text-gray-900"
              autoFocus
            />
            <button 
              type="submit"
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg transform active:scale-95 border-b-4 border-blue-950"
            >
              Entrar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {isLoading && <p className="text-center text-gray-500">Cargando datos de Supabase...</p>}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {chartData.map((item, i) => (
          <div key={item.name} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4`} style={{ borderLeftColor: COLORS[i] }}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.name}</p>
            <p className="text-2xl font-black">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Report Generator Section */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 mb-4">
          <i className="fas fa-file-excel text-green-600"></i>
          Generar Reporte Excel
        </h3>
        
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:w-auto flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Reporte</label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full p-2 border-2 border-gray-100 rounded-lg focus:border-blue-800 outline-none text-sm font-medium bg-gray-50 text-gray-900"
            >
              <option value="orders">Pedidos (General)</option>
              <option value="shipments">Embarques</option>
              <option value="evidence">Evidencias</option>
            </select>
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Inicio</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border-2 border-gray-100 rounded-lg focus:border-blue-800 outline-none text-sm font-medium bg-gray-50 text-gray-900"
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Fin</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border-2 border-gray-100 rounded-lg focus:border-blue-800 outline-none text-sm font-medium bg-gray-50 text-gray-900"
            />
          </div>
          <button 
            onClick={generateReport}
            disabled={isGeneratingReport}
            className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGeneratingReport ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
            Descargar
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
            <i className="fas fa-list-check text-blue-800"></i>
            Bitácora de Pedidos
          </h3>
          <button 
            onClick={fetchTickets}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
          >
            <i className="fas fa-sync mr-2"></i>Actualizar
          </button>
        </div>
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-4">Folio / Ticket</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <tr key={ticket.folio} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-900">{ticket.no_tiket}</div>
                    <div className="font-mono text-[10px] text-gray-400">{ticket.folio.substring(0,8)}...</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-medium text-xs">
                    {ticket.nombre_cliente.split('|')[0].substring(0,30)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">${ticket.monto_de_compra}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(ticket.estado)}`}>
                      {ticket.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => openPrintModal(ticket)}
                      className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-200 transition-all shadow-sm border border-gray-200"
                      title="Imprimir Ticket"
                    >
                      <i className="fas fa-print"></i>
                    </button>
                    <button 
                      onClick={() => setEditingTicket({ ...ticket })}
                      className="text-blue-800 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-100 transition-all shadow-sm border border-blue-100"
                      title="Editar Pedido"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      onClick={() => deleteTicket(ticket.folio)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all shadow-sm border border-red-100"
                      title="Eliminar Pedido"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary Section */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
          <i className="fas fa-chart-pie text-red-600"></i>
          Resumen Logístico
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
            <div className="bg-blue-800 text-white p-6 flex justify-between items-center">
              <div>
                <h4 className="text-xl font-black">Editar Pedido</h4>
                <p className="text-blue-200 text-xs">Modificando: {editingTicket.no_tiket}</p>
              </div>
              <button onClick={() => setEditingTicket(null)} className="text-blue-300 hover:text-white transition-colors">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={updateTicket} className="p-6 space-y-4">
              
              {/* Ticket No Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Ticket</label>
                <input 
                  type="text" 
                  value={editingTicket.no_tiket}
                  onChange={e => setEditingTicket({ ...editingTicket, no_tiket: e.target.value })}
                  className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                />
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto de Compra</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={editingTicket.monto_de_compra}
                    onChange={e => setEditingTicket({ ...editingTicket, monto_de_compra: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 outline-none transition-all font-bold bg-gray-50 text-gray-900"
                  />
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado del Pedido</label>
                <div className="relative">
                  <select 
                    value={editingTicket.estado}
                    onChange={e => setEditingTicket({ ...editingTicket, estado: e.target.value })}
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-blue-800 outline-none transition-all appearance-none bg-gray-50 font-medium text-gray-900"
                  >
                    <option value={TicketStatus.PENDING}>Pendiente</option>
                    <option value={TicketStatus.IN_TRANSIT}>En Tránsito</option>
                    <option value={TicketStatus.DELIVERED}>Entregado</option>
                    <option value={TicketStatus.NOT_FOUND}>No Encontrado</option>
                  </select>
                  <i className="fas fa-chevron-down absolute right-4 top-4 text-gray-400 pointer-events-none"></i>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 px-4 bg-blue-800 text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg shadow-blue-200 transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printOrder && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-100 p-4 border-b flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <i className="fas fa-print"></i> Vista Previa Ticket
                    </h3>
                    <button onClick={() => setPrintOrder(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <i className="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div className="p-4 bg-gray-50 flex justify-center overflow-auto grow">
                   {/* Ticket Render Container - Matching ShipmentView exactly */}
                   <div id="admin-ticket-content" className="w-[80mm] bg-white shadow-lg p-2 text-black font-sans text-xs origin-top transform scale-100">
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
                        <p className="mt-1 font-black text-[10px] border border-black inline-block px-2 py-0.5 uppercase">Reimpresión Embarque</p>
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
                          <span className="text-right max-w-[50mm] break-words">{printShipmentData?.unidad || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">PLACAS:</span>
                          <span className="text-right">{printShipmentData?.placas || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">CHOFER:</span>
                          <span className="text-right max-w-[50mm] break-words">{printShipmentData?.chofer || "N/A"}</span>
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
                        <div className="mb-6">
                           <div className="h-8 mb-1 border-b border-black w-3/4 mx-auto"></div>
                           <p className="text-[8px] font-bold uppercase">Firma de Recibido / Sello</p>
                        </div>
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

                <div className="p-4 bg-white border-t grid grid-cols-2 gap-3 shrink-0">
                    <button onClick={handleWebPrint} className="bg-blue-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-900 transition-colors shadow-lg">
                        <i className="fas fa-print"></i> Imprimir
                    </button>
                    <button onClick={handleDownloadPDF} className="border-2 border-red-500 text-red-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                        <i className="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;