import React from 'react';
import { Pedido } from '../types';
import { money } from '../services/utils';

interface Props {
  id: string;
  order: Pedido;
  titulo?: string;
}

/** Ticket de 80 mm para impresora térmica (embarque de salida). */
const Ticket: React.FC<Props> = ({ id, order, titulo = 'Embarque de Salida' }) => {
  const e = order.embarque;
  const Row = ({ l, v, strong }: { l: string; v: React.ReactNode; strong?: boolean }) => (
    <div className="flex justify-between gap-2">
      <span className="font-bold">{l}</span>
      <span className={`text-right break-words max-w-[48mm] ${strong ? 'font-black' : ''}`}>{v}</span>
    </div>
  );
  return (
    <div id={id} className="w-[74mm] bg-white p-2 font-sans text-black text-[9px] leading-tight">
      <div className="flex flex-col items-center mb-2 border-b-2 border-black pb-2">
        <div className="bg-black text-white font-black italic text-lg px-3 rounded-md -rotate-2">Ferre</div>
        <div className="bg-black text-white font-black italic text-sm px-4 rounded -mt-1 ml-4">Don Nico</div>
        <p className="font-bold mt-1">Jilotepec de Molina Enríquez</p>
        <p className="mt-1 font-black text-[10px] border border-black px-2 uppercase">{titulo}</p>
      </div>
      <div className="space-y-0.5 mb-2">
        <Row l="FECHA:" v={new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })} />
        <Row l="FOLIO:" v={order.folio} strong />
        <Row l="TICKET:" v={order.no_ticket} strong />
        {order.no_vendedor && <Row l="VENDEDOR:" v={order.no_vendedor} />}
      </div>
      <div className="border-t border-dotted border-black py-1 mb-2 space-y-0.5 uppercase">
        <Row l="UNIDAD:" v={e?.unidad || order.unidad_requerida || 'N/A'} />
        <Row l="PLACAS:" v={e?.placas || 'N/A'} />
        <Row l="CHOFER:" v={e?.chofer || 'N/A'} />
      </div>
      <div className="border-t border-b border-black py-2 mb-2">
        <p className="font-black mb-1 uppercase bg-black text-white inline-block px-1">Datos de entrega:</p>
        <p className="uppercase text-[10px] font-black mb-1">{order.nombre_cliente}</p>
        <p className="uppercase mb-1">{order.direccion}{order.comunidad ? ` — ${order.comunidad}` : ''}</p>
        <p className="font-bold">TEL: {order.telefono}</p>
        <p className="mt-1">RUTA: {order.km} km · {order.minutos} min{order.urgente === 'SI' ? ' · URGENTE' : ''}</p>
      </div>
      <div className="space-y-0.5 text-right mb-4 font-bold">
        <Row l="UNIDADES:" v={`${order.unidades} pzs`} />
        <Row l="SUBTOTAL:" v={money(order.monto_de_compra)} />
        <Row l="ENVÍO:" v={money(order.costo_de_envio)} />
        <div className="flex justify-between text-[11px] font-black border-t-2 border-black pt-1 mt-1">
          <span>TOTAL A COBRAR:</span>
          <span>{money(order.monto_de_compra + order.costo_de_envio)}</span>
        </div>
      </div>
      <div className="mt-6 text-center space-y-6">
        <div><div className="h-8 mb-1 border-b border-black w-3/4 mx-auto"></div><p className="text-[8px] font-bold uppercase">Firma de recibido / Sello</p></div>
        <div><div className="h-8 mb-1 border-b border-black w-3/4 mx-auto"></div><p className="text-[8px] font-bold uppercase">Validación Seguridad Física</p></div>
      </div>
      <p className="text-center text-[8px] mt-2 border-t border-black pt-1 font-bold">*** FERRE DON NICO ***</p>
    </div>
  );
};

export default Ticket;
