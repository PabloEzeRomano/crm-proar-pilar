import { VisitStatus, VisitType } from '@/types';

const STATUS_LABELS: Record<VisitType, Record<VisitStatus, string>> = {
  visit: {
    pending: 'Pendiente',
    completed: 'Completada',
    canceled: 'Cancelada',
  },
  call: {
    pending: 'Pendiente',
    completed: 'Completada',
    canceled: 'Cancelada',
  },
  quote: {
    pending: 'Enviada',
    completed: 'Aceptada',
    canceled: 'Rechazada',
  },
  sale: {
    pending: 'Pendiente',
    completed: 'Pagada',
    canceled: 'Demorada',
  },
};

const TYPE_LABELS: Record<VisitType, string> = {
  visit: 'Visita',
  call: 'Llamada',
  quote: 'Cotización',
  sale: 'Venta',
};

export function getStatusLabel(type: VisitType, status?: VisitStatus): string {
  return status ? STATUS_LABELS[type][status] : TYPE_LABELS[type];
}
