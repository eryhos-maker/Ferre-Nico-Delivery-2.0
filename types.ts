export enum View {
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  DELIVERY = 'DELIVERY',
  ADMIN = 'ADMIN'
}

export enum Estado {
  PENDIENTE = 'Pendiente',
  TRANSITO = 'En Tránsito',
  ENTREGADO = 'Entregado',
  NO_ENCONTRADO = 'No Encontrado',
  CANCELADO = 'Cancelado'
}

export interface Tarifas {
  origen_lat: number;
  origen_lng: number;
  banderazo: number;
  precio_km: number;
  precio_min: number;
  minimo: number;
  redondeo: number;
  max_km: number;
  urgente: number;
  zona_dificil: number;
  gratis_monto: number;
  gratis_km: number;
  desc_monto: number;
  desc_pct: number;
}

export interface Vehiculo {
  id: string;
  unidad: string;
  placas: string;
  factor: number;
}

export interface Comunidad {
  cp: string;
  comunidad: string;
  km_tabla: number;
  min_tabla: number;
  precio_tabla: number;
  lat: number | null;
  lng: number | null;
  nota: string;
}

export interface Config {
  tarifas: Tarifas;
  vehiculos: Vehiculo[];
  comunidades: Comunidad[];
  autorizadores: string[];
}

export interface Linea {
  concepto: string;
  monto: number;
}

export interface Cotizacion {
  km: number;
  minutos: number;
  lineas: Linea[];
  minimoAplicado: boolean;
  factor: number;
  envio_calculado: number;
  descuento: number;
  motivo_descuento: string;
  extras: number;
  lineas_extra: Linea[];
  total: number;
  requiere_autorizacion: boolean;
  motivo_autorizacion: string;
}

export interface Embarque {
  folio: string;
  fecha: string;
  vehiculo_id: string;
  unidad: string;
  placas: string;
  chofer: string;
}

export interface Evidencia {
  folio: string;
  fecha: string;
  resultado: string;
  motivo: string;
  recibio: string;
  foto_url: string;
  lat: string | number;
  lng: string | number;
}

export interface Pedido {
  folio: string;
  fecha_creacion: string;
  no_ticket: string;
  no_vendedor: string;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  comunidad: string;
  lat: number | string;
  lng: number | string;
  km: number;
  minutos: number;
  ruta_manual: string;
  monto_de_compra: number;
  unidades: number;
  unidad_requerida: string;
  factor_unidad: number;
  urgente: string;
  zona_dificil: string;
  envio_calculado: number;
  descuento: number;
  extras: number;
  costo_de_envio: number;
  ajuste_motivo: string;
  autorizo: string;
  precio_tabla: number | string;
  estado: string;
  intentos: number;
  updated_at: string;
  embarque?: Embarque | null;
  evidencias?: Evidencia[];
}

export interface Bitacora {
  fecha: string;
  folio: string;
  accion: string;
  detalle: string;
  autorizo: string;
}

export interface Auth {
  nombre: string;
  pin: string;
}
