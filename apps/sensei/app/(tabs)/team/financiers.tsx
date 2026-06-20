import CatalogScreen from '@/components/CatalogScreen';
import { useFinanciersStore } from '@/stores/financiersStore';

export default function FinanciersScreen() {
  return (
    <CatalogScreen
      useStore={useFinanciersStore}
      addPlaceholder="Nueva financiera…"
      emptyText="No hay financieras"
      deleteTitle="Eliminar financiera"
    />
  );
}
