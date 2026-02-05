
import { Zone, Ticket, TicketStatus } from './types';

export const ZONES: Zone[] = [
  { id: '1', name: '0 - 3 km ($40)', price: 40, estimatedTime: 'Mismo día' },
  { id: '2', name: '4 - 6 km ($60 - $70)', price: 65, estimatedTime: '24 horas' },
  { id: '3', name: '7 - 10 km ($75 - $85)', price: 80, estimatedTime: '24 horas' },
  { id: '4', name: '11 - 15 km ($90 - $150)', price: 120, estimatedTime: '24-48 horas' },
  { id: '5', name: '16 - 25 km ($165 - $180)', price: 172, estimatedTime: '48 horas' },
  { id: '6', name: '26 - 35 km ($190 - $220)', price: 205, estimatedTime: '48-72 horas' },
  { id: '7', name: '36 - 45 km ($230 - $250)', price: 240, estimatedTime: '72 horas' },
  { id: '8', name: '46 - 60 km ($260 - $285)', price: 272, estimatedTime: '72+ horas' },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: '8821',
    vendor: 'Nico',
    price: 2500,
    status: TicketStatus.PENDING,
    zone: '0 - 3 km',
    vehicle: 'Nissan NP300 (ABC-123)',
    updatedAt: new Date().toLocaleString(),
  },
  {
    id: '8822',
    vendor: 'Belem',
    price: 3200,
    status: TicketStatus.DELIVERED,
    zone: '11 - 15 km',
    vehicle: 'Ford F-150 (XYZ-987)',
    updatedAt: new Date().toLocaleString(),
  },
  {
    id: '8823',
    vendor: 'Marcos',
    price: 1800,
    status: TicketStatus.IN_TRANSIT,
    zone: '4 - 6 km',
    vehicle: 'Chevrolet S10 (LMN-456)',
    updatedAt: new Date().toLocaleString(),
  },
];
