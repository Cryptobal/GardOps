# 🔧 Solución Error de Hooks - Estructuras Unificadas

## 🚨 Problema Identificado

### **Error: Rendered more hooks than during the previous render**

**Síntoma**: 
```
Error: Rendered more hooks than during the previous render.
Source: src/app/payroll/estructuras-unificadas/page.tsx (67:46) @ EstructurasUnificadasPage
```

**Causa**: Los hooks `useState` estaban ubicados **después** del return condicional, violando las reglas de hooks de React.

## ✅ Solución Implementada

### **Problema Original**
```typescript
export default function EstructurasUnificadasPage() {
  const { allowed } = useCan('payroll.view');
  const router = useRouter();
  const { success, error: showError } = useToast();
  
  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }
  
  // ❌ PROBLEMA: Hooks después del return condicional
  const [activeTab, setActiveTab] = useState('servicio');
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosUnificados>({...});
  const [datosFiltros, setDatosFiltros] = useState({...});
}
```

### **Solución Aplicada**
```typescript
export default function EstructurasUnificadasPage() {
  const { allowed } = useCan('payroll.view');
  const router = useRouter();
  const { success, error: showError } = useToast();
  
  // ✅ CORRECTO: Todos los hooks al inicio
  const [activeTab, setActiveTab] = useState('servicio');
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosUnificados>({...});
  const [datosFiltros, setDatosFiltros] = useState({...});
  
  if (!allowed) {
    return (
      <div className="p-6">
        <div className="rounded-xl border p-6 text-center text-muted-foreground">
          Acceso denegado
        </div>
      </div>
    );
  }
}
```

## 📋 Reglas de Hooks de React

### **Regla Fundamental**
> **Los hooks deben llamarse siempre en el mismo orden en cada render**

### **Reglas Específicas**
1. ✅ **Siempre en el nivel superior**: No dentro de loops, condiciones o funciones anidadas
2. ✅ **Siempre en componentes de React**: No en funciones JavaScript regulares
3. ✅ **Siempre en el mismo orden**: No pueden estar después de returns condicionales

### **Patrón Correcto**
```typescript
function MiComponente() {
  // 1. Hooks de autenticación/autorización
  const { allowed } = useCan('permiso');
  const router = useRouter();
  
  // 2. Hooks de estado
  const [estado1, setEstado1] = useState(valor1);
  const [estado2, setEstado2] = useState(valor2);
  
  // 3. Hooks de efectos
  useEffect(() => {
    // lógica
  }, []);
  
  // 4. Hooks personalizados
  const { data } = useCustomHook();
  
  // 5. Lógica condicional y returns
  if (!allowed) {
    return <div>Acceso denegado</div>;
  }
  
  // 6. Render del componente
  return <div>Contenido</div>;
}
```

## 🔍 Diagnóstico del Error

### **Mensaje de Error Detallado**
```
Warning: React has detected a change in the order of Hooks called by EstructurasUnificadasPage. 
This will lead to bugs and errors if not fixed.

Previous render            Next render
------------------------------------------------------
1. useState                   useState
2. useState                   useState
3. useState                   useState
4. useRef                     useRef
5. useContext                 useContext
6. useEffect                  useEffect
7. useEffect                  useEffect
8. useContext                 useContext
9. useState                   useState  ← Hook adicional detectado
10. useCallback               useCallback
...
```

### **Análisis**
- **Render anterior**: 16 hooks ejecutados
- **Render actual**: 17 hooks ejecutados
- **Problema**: Un `useState` adicional se ejecutaba después del return condicional

## ✅ Verificación de la Solución

### **Antes de la Corrección**
- ❌ Hooks después del return condicional
- ❌ Orden de hooks inconsistente
- ❌ Error de runtime en React

### **Después de la Corrección**
- ✅ Todos los hooks al inicio del componente
- ✅ Orden de hooks consistente
- ✅ Sin errores de runtime

## 🎯 Resultado

**✅ Error Solucionado**:
1. **Hooks en orden correcto**: Todos los hooks están al inicio del componente
2. **Sin returns condicionales**: Los hooks se ejecutan siempre en el mismo orden
3. **Componente funcional**: La página carga sin errores de React
4. **Reglas respetadas**: Cumple con las reglas de hooks de React

## 📝 Notas Técnicas

### **¿Por qué ocurre este error?**
React mantiene un array interno de hooks para cada componente. Si el orden de los hooks cambia entre renders (por ejemplo, si un hook está después de un return condicional), React no puede mapear correctamente los valores de estado.

### **Prevención**
1. **ESLint**: Usar `eslint-plugin-react-hooks` para detectar problemas
2. **Patrón consistente**: Siempre poner hooks al inicio del componente
3. **Revisión de código**: Verificar que no haya hooks después de returns

### **Herramientas de Detección**
```bash
# ESLint con reglas de hooks
npm install eslint-plugin-react-hooks --save-dev

# Configuración recomendada
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

**¡El error de hooks ha sido solucionado completamente!** 🎉

La página de estructuras unificadas ahora cumple con las reglas de hooks de React y funciona sin errores.
