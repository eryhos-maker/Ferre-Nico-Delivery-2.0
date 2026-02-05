
export enum View {
  COLLABORATOR = 'COLLABORATOR',
  ADMIN = 'ADMIN',
  ORDER = 'ORDER',
  SHIPMENT = 'SHIPMENT',
  DELIVERY = 'DELIVERY'
}

// Estados deben coincidir con lo que espera el texto en BD o App
export enum TicketStatus {
  PENDING = 'Pendiente',
  IN_TRANSIT = 'En Tránsito',
  DELIVERED = 'Entregado',
  NOT_FOUND = 'No Encontrado',
  CANCELLED = 'Cancelado'
}

// Matches 'pedido' table in Supabase
export interface Pedido {
  folio: string; // UUID
  no_tiket: string;
  nombre_cliente: string; // Includes address in our logic
  telefono: string;
  monto_de_compra: number;
  unidades: number;
  costo_de_envio: number;
  estado: string;
  created_at?: string;
  updated_at?: string;
  // Optional temp fields for printing
  tempUnit?: string;
  tempDriver?: string;
}

export interface Ticket {
  id: string;
  vendor: string;
  price: number;
  status: TicketStatus;
  zone: string;
  vehicle: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  price: number;
  estimatedTime: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
