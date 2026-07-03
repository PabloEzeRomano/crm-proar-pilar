import { VisitStatus, VisitType } from '@/types';

export const VISIT_TYPE_OPTIONS: { value: VisitType; label: string }[] = [
  { value: 'customer_service', label: 'Atención al cliente' },
  { value: 'quote', label: 'Cotizaciones' },
  { value: 'sales_orders', label: 'Ventas y pedidos' },
  { value: 'new_projects', label: 'Prospectos' },
  { value: 'payments', label: 'Pagos y cobranzas' },
  { value: 'technical_service', label: 'Servicio técnico' },
  { value: 'other', label: 'Otros' },
];

export const VISIT_TYPE_OPTIONS_WITH_ICONS: {
  value: VisitType;
  label: string;
  icon: string;
}[] = [
  { value: 'customer_service', label: 'Atención al cliente', icon: 'headset' },
  { value: 'quote', label: 'Cotizaciones', icon: 'file-document-outline' },
  { value: 'sales_orders', label: 'Ventas y pedidos', icon: 'cart-outline' },
  { value: 'new_projects', label: 'Prospectos', icon: 'lightbulb-outline' },
  { value: 'payments', label: 'Pagos y cobranzas', icon: 'credit-card-outline' },
  { value: 'technical_service', label: 'Servicio técnico', icon: 'wrench-outline' },
  { value: 'other', label: 'Otros', icon: 'dots-horizontal-circle-outline' },
];

export const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Completada' },
  { value: 'canceled', label: 'Cancelada' },
];

export type ProductFilterType = 'all' | 'formulated' | 'commodity';

export const PRODUCT_FILTER_OPTIONS: {
  value: ProductFilterType;
  label: string;
}[] = [
  { value: 'all', label: 'Todos' },
  { value: 'formulated', label: 'Formulados' },
  { value: 'commodity', label: 'Commodities' },
];
