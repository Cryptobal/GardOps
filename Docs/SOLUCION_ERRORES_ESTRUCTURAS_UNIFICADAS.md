# Solución de Errores - Estructuras Unificadas

## Resumen de Errores Encontrados y Solucionados

### Error 1: Rendered more hooks than during the previous render
**Problema**: Los hooks `useRouter` y `useToast` se estaban llamando condicionalmente después de un `if (!allowed)`.

**Solución**: Mover todos los hooks al inicio del componente, antes de cualquier retorno condicional.

**Estado**: ✅ Resuelto

### Error 2: Acceso denegado y 404 Not Found
**Problema**: 
- Permiso incorrecto en `useCan('payroll.estructuras.view')`
- Action incorrecto en `requireAuthz('read:list')`

**Solución**: 
- Cambiar a `useCan('payroll.view')`
- Cambiar a `requireAuthz('view')`
- Verificar que el permiso existe en la base de datos

**Estado**: ✅ Resuelto

### Error 3: Rendered more hooks than during the previous render (recurrente)
**Problema**: Los `useState` hooks se declaraban después del condicional `if (!allowed)`.

**Solución**: Mover todos los `useState` al inicio del componente.

**Estado**: ✅ Resuelto

### Error 4: Rendered more hooks than during the previous render (recurrente)
**Problema**: El `useEffect` se declaraba después del condicional `if (!allowed)`.

**Solución**: Mover el `useEffect` al inicio del componente, después de los `useState`.

**Estado**: ✅ Resuelto

### Error 5: ReferenceError: Cannot access 'cargarDatosIniciales' before initialization
**Problema**: El `useEffect` estaba llamando a `cargarDatosIniciales()` antes de que la función fuera definida.

**Solución**: Reescribir completamente el archivo para asegurar que:
1. Todos los hooks estén declarados al inicio del componente
2. La función `cargarDatosIniciales` esté definida antes del `useEffect` que la llama
3. Los condicionales `if (!allowed)` e `if (loading)` estén después de todas las declaraciones de hooks
4. No haya código duplicado

**Estado**: ✅ Resuelto

## Estructura Final Correcta del Componente

```typescript
export default function EstructurasUnificadasPage() {
  // 1. Todos los hooks al inicio
  const { allowed } = useCan('payroll.view');
  const router = useRouter();
  const { success, error: showError } = useToast();
  
  const [activeTab, setActiveTab] = useState('servicio');
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosUnificados>({...});
  const [datosFiltros, setDatosFiltros] = useState({...});

  // 2. Función definida antes del useEffect
  const cargarDatosIniciales = async () => {
    // ... implementación
  };

  // 3. useEffect después de la función
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // 4. Otras funciones
  const handleFiltroChange = (campo, valor) => {...};
  const limpiarFiltros = () => {...};

  // 5. Condicionales después de todos los hooks
  if (!allowed) {
    return <div>Acceso denegado</div>;
  }

  if (loading) {
    return <div>Cargando...</div>;
  }

  // 6. Render principal
  return <div>...</div>;
}
```

## Lecciones Aprendidas

1. **Reglas de Hooks de React**: Los hooks deben estar siempre en el mismo orden y no pueden estar dentro de condicionales.
2. **Orden de Declaraciones**: Las funciones deben estar definidas antes de ser usadas en `useEffect`.
3. **Permisos**: Verificar que los permisos existan en la base de datos y que las claves coincidan.
4. **Manejo de Errores**: Implementar manejo robusto de errores en las llamadas a API.

## Archivos Modificados

- `src/app/payroll/estructuras-unificadas/page.tsx` - Componente principal
- `src/app/api/payroll/estructuras-unificadas/route.ts` - API principal
- `src/app/api/payroll/estructuras-unificadas/filtros/route.ts` - API de filtros
- `src/app/payroll/page.tsx` - Navegación desde dashboard

## Scripts de Diagnóstico

- `scripts/verificar-permisos-payroll.ts` - Verificar permisos en base de datos

