import CatalogScreen from '@/components/CatalogScreen';
import { usePaymentMethodsStore } from '@/stores/paymentMethodsStore';

export default function PaymentMethodsScreen() {
  return (
    <CatalogScreen
      useStore={usePaymentMethodsStore}
      addPlaceholder="Nuevo medio de pago…"
      emptyText="No hay medios de pago"
      deleteTitle="Eliminar medio de pago"
    />
  );
}
