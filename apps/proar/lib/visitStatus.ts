import { VisitStatus, VisitType } from '@/types';

const DEFAULT_STATUS_LABELS: Record<VisitStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  canceled: 'Cancelada',
};

const STATUS_LABELS: Partial<
  Record<VisitType, Partial<Record<VisitStatus, string>>>
> = {
  quote: {
    pending: 'Pendiente',
    completed: 'Cerrada',
    canceled: 'Cancelada',
  },
  sales_orders: {
    pending: 'Pendiente',
    completed: 'Cerrada',
    canceled: 'Cancelada',
  },
};

const TYPE_LABELS: Record<VisitType, string> = {
  customer_service: 'Atención al cliente',
  quote: 'Cotizaciones',
  sales_orders: 'Ventas y pedidos',
  new_projects: 'Prospectos',
  payments: 'Pagos y cobranzas',
  technical_service: 'Servicio técnico',
  other: 'Otros',
};

export function getStatusLabel(type: VisitType, status?: VisitStatus): string {
  if (!status) return TYPE_LABELS[type];
  return STATUS_LABELS[type]?.[status] ?? DEFAULT_STATUS_LABELS[status];
}
