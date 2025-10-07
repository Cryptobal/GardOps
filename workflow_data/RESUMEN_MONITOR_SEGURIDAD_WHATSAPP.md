# 🚨 Monitor de Seguridad WhatsApp - GardOps

## 📋 Resumen Ejecutivo

Este proyecto implementa un sistema de monitoreo inteligente de seguridad para WhatsApp Business utilizando n8n, que combina 3 funcionalidades principales en un solo workflow automatizado.

---

## 🎯 Objetivo del Proyecto

Crear un sistema automatizado que:

1. **Responda automáticamente** a mensajes de WhatsApp (chatbot conversacional)
2. **Detecte incidentes de seguridad** en tiempo real en grupos de WhatsApp que comienzan con #
3. **Genere reportes diarios** automáticos enviados por email y WhatsApp a las 07:00 AM

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    WEBHOOK WASENDER                          │
│           /guardops-whatsapp-v2 (POST)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ Extraer Datos      │
            │ Wasender           │
            └─────┬──────────────┘
                  │
        ┌─────────┼─────────────────┐
        │         │                 │
        ▼         ▼                 ▼
   FLUJO 1    FLUJO 2          FLUJO 3
  Chatbot    Monitor         Resumen Diario
             Seguridad       (Cron 07:00)
```

---

## 🔄 FLUJO 1: Chatbot Conversacional

### **Propósito:**
Responder automáticamente a todos los mensajes recibidos (individuales y grupales)

### **Componentes:**
1. **Webhook Wasender** → Recibe mensajes de WhatsApp Business
2. **Extraer Datos Wasender** → Procesa y normaliza los datos
3. **AI Agent WhatsApp** → Genera respuestas contextuales
4. **OpenAI GPT-4o-mini** → Motor de IA
5. **Redis Chat Memory** → Memoria conversacional de 15 días
6. **Switch** → Diferencia entre mensajes individuales y grupos
7. **Respuesta / Respuesta a grupo** → Envía mensaje vía Wasender API

### **Características:**
- ✅ Memoria conversacional de 15 días por chat/grupo
- ✅ Respuestas profesionales y contextuales
- ✅ Clasifica emergencias (OK, PROBLEMA, URGENTE)
- ✅ Menciona por nombre a usuarios en grupos

---

## 🚨 FLUJO 2: Monitor de Seguridad en Tiempo Real

### **Propósito:**
Detectar incidentes de seguridad en grupos de WhatsApp y alertar al equipo de operaciones

### **Componentes:**
1. **Filtrar para Security Monitor** → Filtra solo grupos (@g.us) excepto # Operaciones General
2. **AI Detector Incidentes** → Analiza si el mensaje es un incidente real
3. **OpenAI Security** → GPT-4o-mini especializado (temp: 0.3)
4. **Parsear Análisis** → Extrae JSON de la respuesta IA
5. **Es Incidente?** → Switch que evalúa si requiere notificación
6. **Alertar Operaciones** → Envía alerta al grupo # Operaciones General
7. **Guardar Incidente** → Almacena en Redis (TTL: 24 horas)

### **Criterios de Detección (IA):**

**🚨 INCIDENTES URGENTES:**
- Emergencias: **incendios**, explosiones, derrames químicos
- Seguridad: robos, asaltos, intrusos, violencia, amenazas
- Operacionales críticos: fallas eléctricas graves, colapsos estructurales
- Alertas: alarmas activadas, accesos no autorizados, sensores
- Médicas: accidentes graves, heridos, emergencias médicas

**✅ NO SON INCIDENTES:**
- Saludos y conversaciones normales
- Consultas administrativas
- Bromas o mensajes informales
- Check-ins de guardia
- Reportes de "todo bien"

### **Filtro Anti-Loop:**
```javascript
const GRUPO_OPERACIONES_ID = '120363402174857513@g.us';
// Excluye este grupo para evitar que el bot analice sus propias alertas
```

### **Formato de Alerta:**
```
🚨 *ALERTA DE SEGURIDAD*

*Grupo:* [ID del grupo]
*Reportado por:* [Nombre del remitente]
*Severidad:* URGENTE/IMPORTANTE

*Descripción:*
[Resumen generado por IA]

*Mensaje original:*
_[Mensaje completo]_

---
_Detectado automáticamente por GardOps Security Monitor_
```

### **Almacenamiento Redis:**
- **Key pattern**: `guardops:incidente:{message_id}`
- **TTL**: 86400 segundos (24 horas)
- **Value**: JSON completo del incidente

---

## 📊 FLUJO 3: Resumen Diario Automatizado

### **Propósito:**
Generar y enviar reportes diarios de seguridad cada mañana

### **Componentes:**
1. **Cron Resumen Diario 07:00** → Trigger programado
2. **Obtener Incidentes 24h** → Lee keys de Redis (`guardops:incidente:*`)
3. **Obtener Valores Redis** → Procesa las keys obtenidas
4. **Procesar Resumen** → Agrupa estadísticas por grupo y severidad
5. **AI Generar Resumen** → Crea reporte ejecutivo profesional
6. **OpenAI GPT-4o Resumen** → Motor de IA (temp: 0.5)
7. **Enviar Resumen WhatsApp** → Al grupo # Operaciones General
8. **Enviar Resumen Email** → A operaciones@gard.cl

### **Horario:**
- **Todos los días a las 07:00 AM** (hora del servidor)
- Cron expression: `0 7 * * *`

### **Estructura del Resumen:**
```
📊 *RESUMEN DE SEGURIDAD DIARIO*
Fecha: DD/MM/AAAA

*RESUMEN EJECUTIVO:*
[2-3 líneas sobre la situación general del día]

*ESTADÍSTICAS:*
• Total de incidentes: X
• Grupos afectados: Y
• Urgentes: Z
• Importantes: W

*INCIDENTES DESTACADOS:*
[Lista de los 5 incidentes más relevantes con hora, grupo y descripción]

*OBSERVACIONES:*
[Patrones identificados, tendencias, horarios recurrentes]

*RECOMENDACIONES:*
[Acciones preventivas sugeridas]

---
_Reporte generado automáticamente por GardOps Security Monitor_
```

### **Destinatarios:**
- 📱 **WhatsApp**: `120363402174857513@g.us` (# Operaciones General)
- 📧 **Email**: operaciones@gard.cl

---

## 🔧 Configuración Técnica

### **Workflow ID:**
`1bDGASagTwhJO1oE`

### **Nombre:**
"Agente Whatsapp"

### **URL del Webhook:**
```
POST https://primary-production-8f25.up.railway.app/webhook/guardops-whatsapp-v2
```

### **Credenciales Configuradas:**

| Servicio | ID Credential | Nombre | Uso |
|----------|---------------|--------|-----|
| OpenAI API | `VpICqtUssU3DtZVV` | OpenAi account | GPT-4o-mini, GPT-4o |
| Redis | `P17fD8gmfb6Ennlv` | Redis account | Memoria + Storage |
| Wasender API | `ea83k18jDZTDBBjq` | Bearer Auth account | Envío mensajes |
| Gmail OAuth2 | `Oz56AwnpseCjPFOr` | Gmail account | Email resúmenes |

### **Nodos Totales:** 17

#### **Por Tipo:**
- **Triggers**: 2 (Webhook, Cron)
- **AI Agents**: 2 (Chatbot, Detector)
- **AI Models**: 3 (GPT-4o-mini x2, GPT-4o x1)
- **Functions**: 5 (procesamiento de datos)
- **HTTP Requests**: 4 (envío mensajes WhatsApp)
- **Redis**: 3 (memoria, storage, retrieval)
- **Gmail**: 1 (envío emails)
- **Switch**: 2 (enrutamiento lógico)

---

## 📡 Flujo de Datos

### **Entrada del Webhook (JSON):**
```json
{
  "event": "messages.upsert",
  "sessionId": "...",
  "data": {
    "messages": {
      "key": {
        "remoteJid": "120363402174857513@g.us",
        "fromMe": false,
        "id": "...",
        "participant": "..."
      },
      "messageTimestamp": 1759246598,
      "pushName": "Carlos",
      "message": {
        "conversation": "hay un incendio"
      }
    }
  },
  "timestamp": 1759246598263
}
```

### **Datos Extraídos:**
```javascript
{
  telefono: "+56982307771",
  mensaje: "hay un incendio",
  timestamp: "2025-09-30T21:40:53.000Z",
  message_id: "3B7A1BF4A4E66D72FE38",
  nombre_remitente: "Carlos",
  session_id: "57bdf180fefa780f81704d7d756cee8b1ad13e30c34fa27e1d4a18b90135c1ae",
  remote_jid: "120363402174857513@g.us",
  event: "messages.upsert"
}
```

### **Respuesta del Detector IA (JSON esperado):**
```json
{
  "es_incidente": true,
  "severidad": "URGENTE",
  "resumen": "Incendio reportado en instalación",
  "requiere_notificacion": true
}
```

---

## ⚙️ Configuración de Modelos IA

### **AI Agent WhatsApp (Chatbot):**
- **Modelo**: GPT-4o-mini
- **Max Tokens**: 300
- **Temperature**: 0.7 (más creativo)
- **Memoria**: Redis Chat Memory (15 días)
- **Session Key**: `remoteJid` (único por chat/grupo)

### **AI Detector Incidentes (Seguridad):**
- **Modelo**: GPT-4o-mini
- **Max Tokens**: 200
- **Temperature**: 0.3 (más determinista)
- **Memoria**: No usa (análisis independiente)
- **Output**: JSON estructurado

### **AI Generar Resumen (Reportes):**
- **Modelo**: GPT-4o
- **Max Tokens**: 2000
- **Temperature**: 0.5 (balanceado)
- **Memoria**: No usa
- **Output**: Texto formateado para WhatsApp

---

## 🔐 Seguridad y Validaciones

### **Prevención de Loops Infinitos:**
```javascript
// En nodo "Filtrar para Security Monitor"
const GRUPO_OPERACIONES_ID = '120363402174857513@g.us';

if (remoteJid === GRUPO_OPERACIONES_ID) {
  return []; // No procesar mensajes del grupo de alertas
}
```

### **Manejo de Errores:**
```javascript
// En nodo "Parsear Análisis"
try {
  analisis = JSON.parse(jsonMatch[0]);
} catch (error) {
  // Valor por defecto seguro
  analisis = {
    es_incidente: false,
    severidad: 'NORMAL',
    resumen: 'Error al analizar',
    requiere_notificacion: false
  };
}
```

---

## 📊 Datos en Redis

### **Estructura de Keys:**

**Memoria de Chat:**
- Pattern: `n8n:memory:{remoteJid}:*`
- TTL: 15 días
- Contenido: Historial conversacional

**Incidentes:**
- Pattern: `guardops:incidente:{message_id}`
- TTL: 24 horas
- Contenido: JSON completo del incidente

```json
{
  "grupo_id": "120363XXX@g.us",
  "mensaje": "hay un incendio",
  "timestamp": "2025-09-30T21:40:53.000Z",
  "message_id": "3B7A1BF4A4E66D72FE38",
  "nombre_remitente": "Carlos",
  "analisis": {
    "es_incidente": true,
    "severidad": "URGENTE",
    "resumen": "Incendio reportado",
    "requiere_notificacion": true
  }
}
```

---

## 🔌 Integraciones Externas

### **Wasender/Ascender API:**

**Base URL**: `https://wasenderapi.com/api`

**Endpoints usados:**

1. **Enviar Mensaje:**
```bash
POST /send-message
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "120363402174857513@g.us",
  "text": "🚨 ALERTA DE SEGURIDAD..."
}
```

2. **Webhook Entrante:**
- Path: `/webhook/guardops-whatsapp-v2`
- Método: POST
- Auth: x-webhook-signature header

### **OpenAI API:**

**Modelos utilizados:**
- `gpt-4o-mini`: Chatbot + Detector (más económico)
- `gpt-4o`: Resúmenes diarios (más potente)

**Costos aproximados por día:**
- Chatbot: ~100-200 mensajes × 300 tokens = ~60K tokens
- Detector: ~50 grupos × 200 tokens = ~10K tokens  
- Resumen: 1 × 2000 tokens = 2K tokens
- **Total estimado**: ~72K tokens/día = ~$0.02-0.05 USD/día

### **Gmail API:**

**Operación**: `message.send`
**Scopes necesarios**:
- `https://www.googleapis.com/auth/gmail.send`

### **Redis:**

**Operaciones usadas:**
- `SET` con TTL (guardar incidentes)
- `KEYS` pattern (buscar incidentes)
- Redis Chat Memory (automático por LangChain)

---

## 📝 Prompts de IA Optimizados

### **Prompt del Chatbot:**
```
Eres un asistente profesional de la Central de Monitoreo de GardOps.

CONTEXTO DEL USUARIO:
- Nombre del remitente: {{ pushName }}
- Teléfono: {{ telefono }}
- Es grupo: {{ esGrupo }}

INSTRUCCIONES:
1. Responde profesional, amable, conciso (máx 2-3 frases)
2. Clasifica problemas: OK / PROBLEMA / URGENTE
3. Tono profesional pero cercano
4. Español de Chile
5. En grupos: SIEMPRE menciona al usuario por nombre real
6. NUNCA uses variables de template en la respuesta

Tienes acceso al historial de conversación de 15 días.
```

### **Prompt del Detector de Incidentes:**
```
Eres un analista de seguridad de GardOps.

CONTEXTO:
- Grupo: {{ remote_jid }}
- Remitente: {{ nombre_remitente }}
- Hora: {{ timestamp }}

🚨 CRITERIOS DE INCIDENTE:
- EMERGENCIAS: incendios, explosiones, derrames químicos
- SEGURIDAD: robos, asaltos, intrusos, violencia, amenazas
- OPERACIONALES: fallas eléctricas graves, colapsos estructurales
- ALERTAS: alarmas activadas, accesos no autorizados
- MÉDICAS: accidentes graves, heridos

✅ NO SON INCIDENTES:
- Saludos, conversaciones normales
- Consultas administrativas
- Bromas, mensajes informales
- Check-ins normales
- "Todo bien" o "sin novedad"

⚠️ REGLA CRÍTICA:
- Palabras: fuego, incendio, humo, llamas → URGENTE
- Violencia, robos, intrusos → URGENTE
- Alarmas, sensores → IMPORTANTE

RESPONDE ÚNICAMENTE JSON:
{
  "es_incidente": true/false,
  "severidad": "URGENTE"/"IMPORTANTE"/"NORMAL",
  "resumen": "descripción breve",
  "requiere_notificacion": true/false
}

Sé MUY SENSIBLE. Mejor alertar de más que de menos.
```

### **Prompt del Generador de Resumen:**
```
Genera un resumen profesional de seguridad diario para GardOps.

ESTRUCTURA:

📊 *RESUMEN DE SEGURIDAD DIARIO*
Fecha: {{ fecha }}

*RESUMEN EJECUTIVO:*
[2-3 líneas sobre la situación general]

*ESTADÍSTICAS:*
• Total incidentes: {{ total_incidentes }}
• Grupos afectados: {{ grupos_afectados }}
• Urgentes: {{ urgentes }}
• Importantes: {{ importantes }}

*INCIDENTES DESTACADOS:*
[Lista los más relevantes con hora, grupo y descripción]

*OBSERVACIONES:*
[Patrones o tendencias identificadas]

*RECOMENDACIONES:*
[Acciones preventivas sugeridas]

---
_Reporte generado automáticamente por GardOps Security Monitor_

Usa formato WhatsApp: *negrita*, _cursiva_
```

---

## 🧪 Testing y Validación

### **Mensajes de Prueba:**

**Test 1 - NO debe generar alerta:**
```
Input: "Hola equipo, todo tranquilo en el turno"
Expected: 
- Chatbot responde ✅
- NO alerta a operaciones ✅
```

**Test 2 - SÍ debe generar alerta:**
```
Input: "hay un incendio"
Expected:
- Chatbot responde ✅
- Alerta enviada a # Operaciones General ✅
- Incidente guardado en Redis ✅
```

**Test 3 - SÍ debe generar alerta:**
```
Input: "URGENTE: intruso en sector norte"
Expected:
- Severidad: URGENTE
- Alerta inmediata ✅
```

**Test 4 - Resumen diario:**
```
Trigger: Cron a las 07:00 AM
Expected:
- WhatsApp al grupo Operaciones ✅
- Email a operaciones@gard.cl ✅
```

---

## 🐛 Problemas Conocidos y Soluciones

### **Problema 1: "Insufficient quota detected"**
**Causa**: Cuota de OpenAI agotada  
**Solución**: 
- Agregar créditos en https://platform.openai.com/settings/organization/billing
- Verificar uso en https://platform.openai.com/usage

### **Problema 2: Workflow inactivo (404)**
**Causa**: Webhook no registrado porque workflow está desactivado  
**Solución**: Activar workflow desde el editor de n8n

### **Problema 3: Redis no obtiene valores**
**Causa**: El nodo "Obtener Valores Redis" solo lista keys, no obtiene valores  
**Solución**: Implementar loop o Split In Batches para hacer GET de cada key

### **Problema 4: IA no detecta incidentes**
**Causa**: Prompt no incluía todos los tipos de emergencias  
**Solución**: ✅ Ya corregido - prompt mejorado con ejemplos explícitos

---

## 📈 Mejoras Futuras

### **Corto Plazo:**
1. ✅ Implementar GET de valores Redis en el resumen diario (actualmente solo obtiene keys)
2. ⏳ Agregar filtro por nombre de grupo que comience con # (consultar API Wasender)
3. ⏳ Implementar métricas de uso y dashboards
4. ⏳ Agregar categorización automática de incidentes

### **Mediano Plazo:**
1. ⏳ Base de datos PostgreSQL para historial permanente
2. ⏳ Panel de control web para ver incidentes
3. ⏳ Notificaciones por SMS para emergencias críticas
4. ⏳ Integración con sistema de tickets

### **Largo Plazo:**
1. ⏳ Machine Learning para mejorar detección
2. ⏳ Análisis de sentimiento y urgencia
3. ⏳ Predicción de incidentes basada en patrones
4. ⏳ Dashboard en tiempo real

---

## 🎓 Conceptos Clave de n8n

### **AI Agent vs OpenAI Node:**
- **AI Agent**: Orquestador de LangChain que puede usar herramientas, memoria, chains
- **OpenAI Node**: Simple llamada a la API (sin capacidades avanzadas)
- **Usado aquí**: AI Agent para aprovechar memoria y contexto

### **Conexiones Especiales:**
- **main**: Flujo de datos normal (output → input)
- **ai_languageModel**: Conecta modelo IA a un AI Agent
- **ai_memory**: Conecta memoria a un AI Agent

### **Ejecución Paralela:**
Un nodo puede tener múltiples salidas que ejecutan en paralelo:
```
Extraer Datos Wasender
    ├─→ AI Agent WhatsApp (FLUJO 1)
    └─→ Filtrar Security Monitor (FLUJO 2)
```

### **Switch Node:**
Enrutamiento condicional basado en evaluaciones lógicas
```javascript
if (es_incidente && requiere_notificacion) {
  // Ruta "ALERTA"
} else {
  // No hacer nada
}
```

---

## 📦 Exportación del Workflow

Para exportar este workflow:

```bash
# Desde n8n UI:
Editor → Menú (⋮) → Download → JSON

# O desde API:
curl -X GET \
  'https://primary-production-8f25.up.railway.app/api/v1/workflows/1bDGASagTwhJO1oE' \
  -H 'X-N8N-API-KEY: {tu-api-key}'
```

---

## 🚀 Instalación en Otro Proyecto

### **Pasos:**

1. **Importar workflow**:
   ```
   n8n UI → Workflows → Import from File → Seleccionar JSON
   ```

2. **Configurar credenciales**:
   - OpenAI API Key
   - Redis connection
   - Wasender Bearer Token
   - Gmail OAuth2

3. **Ajustar variables**:
   - ID del grupo Operaciones
   - Email destinatario
   - Horario del cron

4. **Activar workflow**

5. **Configurar webhook en Wasender**:
   ```
   Settings → Webhooks → Add URL
   ```

---

## 📚 Recursos y Referencias

### **Documentación:**
- n8n AI Agent: https://docs.n8n.io/integrations/langchain/
- Wasender API: https://wasenderapi.com/docs
- OpenAI API: https://platform.openai.com/docs

### **Endpoints importantes:**
- n8n Instance: https://primary-production-8f25.up.railway.app
- Workflow Editor: https://primary-production-8f25.up.railway.app/workflow/1bDGASagTwhJO1oE
- Webhook URL: https://primary-production-8f25.up.railway.app/webhook/guardops-whatsapp-v2

---

## 💡 Lecciones Aprendidas

1. **Un solo webhook puede alimentar múltiples flujos** usando conexiones paralelas
2. **Los prompts específicos y detallados** mejoran significativamente la precisión de detección
3. **Temperature baja (0.3)** es crítica para respuestas consistentes en análisis
4. **Filtros anti-loop son esenciales** cuando los bots envían mensajes a grupos que monitorean
5. **TTL en Redis** mantiene el sistema ligero y enfocado en datos recientes
6. **Separar modelos IA por tarea** (mini para respuestas, 4o para análisis complejos) optimiza costos

---

## ✅ Estado Actual del Proyecto

- ✅ Workflow creado y configurado
- ✅ 3 flujos completamente conectados
- ✅ Todas las credenciales configuradas
- ✅ Prompts optimizados para detección sensible
- ⏳ **Pendiente**: Activar workflow
- ⏳ **Pendiente**: Resolver cuota OpenAI
- ⏳ **Pendiente**: Mejorar obtención de valores Redis en resumen diario

---

## 🎯 Próximos Pasos

1. **Activar el workflow** desde el editor de n8n
2. **Agregar créditos** a la cuenta de OpenAI
3. **Probar** con mensajes reales de incidentes
4. **Monitorear ejecuciones** en la sección Executions
5. **Ajustar prompts** si es necesario basado en falsos positivos/negativos

---

**Fecha de creación**: 30 de Septiembre, 2025  
**Autor**: Carlos Irigoyen (carlos.irigoyen@gard.cl)  
**Proyecto**: GardOps Security Monitoring System  
**Versión**: 1.0  
**n8n Version**: 1.113.3  
**MCP Version**: 2.14.1

---

_Este documento es parte del sistema de monitoreo de seguridad de GardOps y está diseñado para ser revisado mediante MCP N8n para proyectos educativos._


