/// <reference types="vite/client" />
import { Auth, Bitacora, Config, Cotizacion, Embarque, Pedido } from '../types';

/**
 * Conexión directa a Google Sheets a través del Apps Script publicado como
 * aplicación web (ver apps-script/Code.gs). Mismo esquema que la app de Evaluaciones.
 */
const API_URL = (import.meta.env.VITE_SHEETS_API_URL || '').trim();
const API_KEY = (import.meta.env.VITE_SHEETS_API_KEY || '').trim();

export const apiConfigured = Boolean(API_URL && API_KEY);

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!apiConfigured) {
    throw new Error('Falta configurar VITE_SHEETS_API_URL y VITE_SHEETS_API_KEY (ver README).');
  }
  // text/plain evita la validación previa (CORS) que Apps Script no soporta.
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, key: API_KEY, ...payload })
  });
  if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error('Respuesta inválida de Google Sheets. Revisa que la URL del Apps Script termine en /exec.');
  }
  if (!body.ok) throw new Error((body as { error: string }).error || 'Error desconocido');
  return (body as { data: T }).data;
}

const n = (v: unknown) => {
  const x = parseFloat(String(v));
  return isNaN(x) ? 0 : x;
};

function normalizePedido(p: Pedido): Pedido {
  return {
    ...p,
    folio: String(p.folio),
    no_ticket: String(p.no_ticket ?? ''),
    no_vendedor: String(p.no_vendedor ?? ''),
    telefono: String(p.telefono ?? ''),
    km: n(p.km),
    minutos: n(p.minutos),
    monto_de_compra: n(p.monto_de_compra),
    unidades: n(p.unidades),
    envio_calculado: n(p.envio_calculado),
    descuento: n(p.descuento),
    extras: n(p.extras),
    costo_de_envio: n(p.costo_de_envio),
    factor_unidad: n(p.factor_unidad) || 1,
    intentos: n(p.intentos)
  };
}

export interface QuoteInput {
  lat?: number;
  lng?: number;
  manual?: boolean;
  km?: number;
  minutos?: number;
  monto_compra: number;
  vehiculo_id?: string;
  urgente: boolean;
  zona_dificil: boolean;
}

export const api = {
  config: () => call<Config>('config'),
  geocode: (text: string) => call<{ label: string; lat: number; lng: number }[]>('geocode', { text }),
  locateCommunity: (comunidad: string) =>
    call<{ lat: number; lng: number } | null>('locateCommunity', { comunidad }),
  quote: (input: QuoteInput) => call<Cotizacion>('quote', { input }),
  createOrder: async (data: Record<string, unknown>, auth?: Auth) =>
    normalizePedido(await call<Pedido>('createOrder', { data, auth })),
  orders: async (estado?: string) => (await call<Pedido[]>('orders', { estado })).map(normalizePedido),
  ship: (data: { folio: string; vehiculo_id: string; chofer: string; unidad?: string; placas?: string }) =>
    call<Embarque>('ship', { data }),
  deliver: (data: { folio: string; foto: string; recibio: string; lat?: number; lng?: number }) =>
    call<{ folio: string }>('deliver', { data }),
  fail: (data: { folio: string; foto: string; motivo: string; lat?: number; lng?: number }) =>
    call<{ folio: string }>('fail', { data }),
  reschedule: (folio: string) => call<{ folio: string }>('reschedule', { folio }),
  cancel: (folio: string, motivo: string, auth: Auth) => call<{ folio: string }>('cancel', { folio, motivo, auth }),
  login: (auth: Auth) => call<{ token: string; nombre: string }>('login', { auth }),
  adminData: async (token: string) => {
    const d = await call<{ pedidos: Pedido[]; bitacora: Bitacora[]; config: Config }>('adminData', { token });
    return { ...d, pedidos: d.pedidos.map(normalizePedido) };
  },
  updateOrder: (token: string, folio: string, data: Record<string, unknown>) =>
    call<{ folio: string }>('updateOrder', { token, folio, data }),
  deleteOrder: (token: string, folio: string) => call<{ folio: string }>('deleteOrder', { token, folio })
};
