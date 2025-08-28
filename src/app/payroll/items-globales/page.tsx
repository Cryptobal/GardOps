import dynamic from 'next/dynamic';

// Cargar el componente cliente dinámicamente para evitar problemas de hidratación
const ItemsGlobalesClient = dynamic(
  () => import('./ItemsGlobalesClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }
);

export default function ItemsGlobalesPage() {
  return <ItemsGlobalesClient />;
}
