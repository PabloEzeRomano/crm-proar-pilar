import { VisitStatus, VisitType } from '@/types'

const STATUS_LABELS: Record<VisitType, Record<VisitStatus, string>> = {
  visit: {
    pending:   'Pendiente',
    completed: 'Completada',
    canceled:  'Cancelada',
  },
  call: {
    pending:   'Pendiente',
    completed: 'Completada',
    canceled:  'Cancelada',
  },
  quote: {
    pending:   'Enviada',
    completed: 'Aceptada',
    canceled:  'Rechazada',
  },
  sale: {
    pending:   'Pendiente',
    completed: 'Pagada',
    canceled:  'Demorada',
  },
}

export function getStatusLabel(
  status: VisitStatus,
  type: VisitType = 'visit',
): string {
  return STATUS_LABELS[type]?.[status] ?? STATUS_LABELS.visit[status]
}
