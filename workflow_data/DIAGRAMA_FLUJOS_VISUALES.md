# 📊 Diagramas Visuales - Monitor de Seguridad WhatsApp

## 🎯 Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WASENDER WHATSAPP BUSINESS                        │
│         (Recibe TODOS los mensajes de grupos e individuales)        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │    WEBHOOK WASENDER        │
                │  /guardops-whatsapp-v2     │
                │      (POST - Activo)       │
                └────────────┬───────────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │  EXTRAER DATOS WASENDER    │
                │  • Filtro: fromMe = false  │
                │  • Filtro: event = upsert  │
                │  • Normalizar teléfonos    │
                │  • Parsear timestamps      │
                └────┬──────┬──────┬─────────┘
                     │      │      │
        ┌────────────┘      │      └──────────────────┐
        │                   │                         │
        ▼                   ▼                         ▼
   [FLUJO 1]           [FLUJO 2]              [ACTUALIZAR]
   Chatbot           Monitor Security        Timestamps
   Investigador                              Actividad
        │                   │
        │                   │
        ▼                   ▼
   [FLUJO 3]           [FLUJO 4]
   Resumen            Resumen
   Final              Diario (07:00)


                [FLUJO 5 - Independiente]
                Monitoreo Proactivo (cada hora)
```

---

## 🤖 FLUJO 1: Chatbot con Modo Investigador

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTRADA: Mensaje de WhatsApp                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   AI Agent WhatsApp     │
              │   (GPT-4o-mini)         │
              │   + Redis Memory 15d    │
              └────────┬────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  ¿Mensaje contiene      │
          │  palabra clave?         │
          │  (incendio, robo,       │
          │   alarma, intruso...)   │
          └────┬──────────┬─────────┘
               │          │
          NO   │          │   SÍ
               │          │
               ▼          ▼
        ┌──────────┐  ┌──────────────────────────┐
        │ Respuesta│  │  MODO INVESTIGADOR       │
        │ vacía "" │  │  • Hacer pregunta según  │
        │ (no      │  │    tipo de incidente     │
        │ enviar)  │  │  • Esperar respuesta     │
        └──────────┘  │  • Siguiente pregunta    │
                      │  • Hasta info completa   │
                      └────────┬─────────────────┘
                               │
                               ▼
                      ┌────────────────────┐
                      │ Cuando completa:   │
                      │ "Estoy alertando   │
                      │  a operaciones"    │
                      └────────┬───────────┘
                               │
                               ▼
                         [FLUJO 3]
                      Resumen Final
```

**Ejemplo de Conversación:**

```
👤 Usuario: "hay un incendio"

🤖 Bot: "Entendido, Carlos. Detecto un posible incidente de seguridad. 
       Necesito información específica para coordinar la respuesta adecuada.
       ¿En qué sector exacto se detectó? ¿Qué magnitud tiene?"

👤 Usuario: "sector norte, es pequeño pero hay humo"

🤖 Bot: "Perfecto, ya tengo la información. Estoy alertando a operaciones 
       ahora mismo. Mantén la calma y sigue los protocolos de seguridad."

[Automáticamente se genera FLUJO 3: Resumen Final]
```

---

## 🚨 FLUJO 2: Monitor de Seguridad en Tiempo Real

```
┌─────────────────────────────────────────────────────────────────┐
│              ENTRADA: Datos extraídos del mensaje                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Filtrar para Security   │
              │ • Excluir Operaciones   │
              │   (120363424106281199)  │
              │ • Procesar todo demás   │
              └────────┬────────────────┘
                       │
                       ▼
              ┌─────────────────────────┐
              │  AI Detector Incidentes │
              │  (GPT-4o-mini, temp 0.3)│
              │  Output: JSON           │
              └────────┬────────────────┘
                       │
                       ▼
              ┌─────────────────────────┐
              │   Parsear Análisis      │
              │   Extract JSON + Data   │
              └─┬────┬────┬────────────┘
                │    │    │
                │    │    └──────────────┐
                │    │                   │
                ▼    ▼                   ▼
         [Guardar]  [Verificar]    [Filtrar Solo
          Redis     Investigación    Incidentes]
                    Activa
                       │
                       ▼
              ┌─────────────────────────┐
              │ ¿Ya hay investigación   │
              │ activa?                 │
              └────┬──────────┬─────────┘
                   │          │
              SÍ   │          │   NO
                   │          │
                   ▼          ▼
            ┌──────────┐  ┌──────────────────────┐
            │ Bloquear │  │  Enviar Alerta       │
            │ (evitar  │  │  Inicial a           │
            │ duplica) │  │  Operaciones         │
            └──────────┘  │  +                   │
                          │  Marcar              │
                          │  Investigación       │
                          │  Activa en Redis     │
                          └──────────────────────┘
```

**Ejemplo de Alerta Inicial:**

```
🚨 *ALERTA DE SEGURIDAD*

👤 *Reportado por:* Carlos
🚨 *Tipo:* URGENTE
📍 *Canal:* Grupo ID: 120363421107247762

*Mensaje:* "incendio"

🔍 _Iniciando investigación..._
📊 _En breve se enviará un resumen detallado_

---
_GardOps Security Monitor - 00:39_
```

---

## 📝 FLUJO 3: Resumen Final de Investigación

```
┌─────────────────────────────────────────────────────────────────┐
│         TRIGGER: Chatbot dice "Estoy alertando..."              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │ Detectar Resumen Final  │
              │ (buscar frase clave)    │
              └────────┬────────────────┘
                       │
                       ▼
              ┌─────────────────────────┐
              │ Switch Resumen Final    │
              │ (si detectada)          │
              └─┬──────────────────┬────┘
                │                  │
                ▼                  ▼
    ┌──────────────────┐  ┌────────────────────┐
    │ Obtener          │  │ Obtener Incidente  │
    │ Conversación     │  │ de Redis           │
    │ Completa         │  │ (último incidente) │
    └─────────┬────────┘  └────────┬───────────┘
              │                    │
              └────────┬───────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │ Procesar Incidente para     │
          │ Reporte (agregar timestamp  │
          │ final, estado: COMPLETADA)  │
          └────────┬────────────────────┘
                   │
                   ▼
          ┌─────────────────────────────┐
          │ AI Generar Resumen Final    │
          │ (GPT-4o, temp 0.3)          │
          │ 1500 tokens max             │
          └────────┬────────────────────┘
                   │
                   ▼
          ┌─────────────────────────────┐
          │ Enviar Reporte Final        │
          │ al Grupo Operaciones        │
          └─────────────────────────────┘
```

**Ejemplo de Reporte Final:**

```
🚨 *REPORTE FINAL DE INCIDENTE*

*INFORMACIÓN GENERAL:*
• Reportado por: Carlos
• Canal: Grupo ID: 120363421107247762
• Severidad: URGENTE
• Hora de inicio: 00:35
• Hora de finalización: 00:42

*DESCRIPCIÓN DEL INCIDENTE:*
Incendio reportado en instalación.

*INVESTIGACIÓN REALIZADA:*
Bot preguntó:
- ¿En qué sector exacto se detectó? ¿Qué magnitud?
  → Respuesta: "sector norte, pequeño pero hay humo"

*INFORMACIÓN RECOPILADA:*
• Ubicación: Sector norte
• Magnitud: Pequeño (controlable)
• Estado: Humo presente

*ESTADO ACTUAL:*
Incidente activo, requiere verificación in situ

*RECOMENDACIONES:*
1. Enviar equipo al sector norte inmediatamente
2. Activar protocolo anti-incendios
3. Verificar sistemas de ventilación

*PRÓXIMOS PASOS:*
1. Confirmación visual del personal en terreno
2. Actualizar estado en próxima comunicación
3. Documentar acciones tomadas

---
_Reporte generado automáticamente por GardOps Security Monitor_
_Investigación completada: 00:42_
```

---

## 📊 FLUJO 4: Resumen Diario 07:00

```
┌─────────────────────────────────────────────────────────────────┐
│              TRIGGER: Cron todos los días 07:00 AM              │
└──────────────┬──────────────────────┬───────────────────────────┘
               │                      │
               ▼                      ▼
    ┌──────────────────┐   ┌──────────────────────┐
    │ Obtener          │   │ Obtener Datos        │
    │ Incidentes 24h   │   │ Actividad            │
    │ (Redis KEYS)     │   │ (Redis KEYS)         │
    └────────┬─────────┘   └────────┬─────────────┘
             │                      │
             └───────┬──────────────┘
                     │
                     ▼
        ┌─────────────────────────────┐
        │  Obtener Valores Redis      │
        │  (procesar todas las keys)  │
        └────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │  Procesar Resumen Mejorado  │
        │  • Agrupar incidentes       │
        │  • Calcular estadísticas    │
        │  • Detectar inactividad     │
        │    - Sin actividad >8h      │
        │    - Baja actividad >4h     │
        └────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │  AI Generar Resumen         │
        │  (GPT-4o, temp 0.5)         │
        │  2000 tokens max            │
        └────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
  ┌──────────────┐  ┌─────────────┐
  │ Enviar       │  │ Enviar      │
  │ WhatsApp     │  │ Email       │
  │ (Operaciones)│  │ (gard.cl)   │
  └──────────────┘  └─────────────┘
```

**Ejemplo de Resumen Diario:**

```
📊 *RESUMEN DE SEGURIDAD DIARIO*
Fecha: 02/10/2025

*RESUMEN EJECUTIVO:*
Durante las últimas 24 horas se registraron 3 incidentes de seguridad,
todos clasificados como importantes. El sector norte presentó mayor 
actividad. Se detectaron 2 grupos sin actividad nocturna.

*ESTADÍSTICAS:*
• Total de incidentes: 3
• Grupos afectados: 2
• Urgentes: 1
• Importantes: 2

*INCIDENTES DESTACADOS:*

1. 00:35 - Grupo 1203634211... - URGENTE
   Incendio en sector norte (controlado)
   
2. 14:20 - Grupo 1203634XXX... - IMPORTANTE
   Alarma activada en sector sur (falsa alarma)
   
3. 18:45 - Grupo 1203634YYY... - IMPORTANTE
   Acceso no autorizado detectado (investigando)

*MONITOREO DE ACTIVIDAD:*
• Grupos sin actividad (>8h): 2
• Grupos con baja actividad (>4h): 1

*GRUPOS SIN ACTIVIDAD NOCTURNA:*
• 120363XXX@g.us: 12h sin actividad
• 120363YYY@g.us: 9h sin actividad

*OBSERVACIONES:*
- Mayor concentración de incidentes en horario nocturno (22:00-06:00)
- Sector norte requiere atención especial
- 2 grupos no reportaron durante turno de noche

*RECOMENDACIONES:*
1. Revisar protocolos de reporte nocturno
2. Inspección preventiva sector norte
3. Verificar estado de grupos sin actividad

---
_Reporte automático GardOps Security Monitor_
```

---

## 🔄 FLUJO 5: Monitoreo Proactivo Horario

```
┌─────────────────────────────────────────────────────────────────┐
│    TRIGGER: Cron cada hora (00:00, 01:00, 02:00... 23:00)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  Obtener Grupos         │
              │  (Wasender API)         │
              │  GET /api/groups        │
              └────────┬────────────────┘
                       │
                       ▼
              ┌─────────────────────────┐
              │ Filtrar Grupos #Reporte │
              │ (solo con "#Reporte"    │
              │  en el nombre)          │
              └────────┬────────────────┘
                       │
                       ▼
         ┌─────────────────────────────────┐
         │  Para cada grupo:               │
         │  Verificar Actividad            │
         │  (Redis: last_activity)         │
         └────────┬───────────┬────────────┘
                  │           │
         <1h      │           │    >1h
         actividad│           │    sin actividad
                  │           │
                  ▼           ▼
          ┌──────────┐  ┌─────────────────────┐
          │ Skip     │  │ Determinar Tipo     │
          │ (no      │  │ Mensaje             │
          │ enviar)  │  │ • Día (06-22): ☀️   │
          └──────────┘  │ • Noche (22-06): 🌙│
                        └────────┬────────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │ Enviar Mensaje      │
                        │ Proactivo           │
                        └────────┬────────────┘
                                 │
                                 ▼
                        ┌─────────────────────┐
                        │ Marcar Conversación │
                        │ Activa (Redis)      │
                        └─────────────────────┘
```

**Ejemplo de Mensajes Proactivos:**

```
☀️ DÍA (07:00 - 21:59):
"Hola equipo, ¿cómo va todo? ¿Alguna novedad que reportar?"

🌙 NOCHE (22:00 - 06:59):
"Control nocturno: ¿Rondas completadas? ¿Todo en orden?"
```

---

## 🔐 Sistema de Prevención de Loops

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK RECIBE MENSAJE                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │  FILTRO 1:              │
              │  ¿fromMe === true?      │
              │  (mensaje del bot)      │
              └────────┬───────┬────────┘
                       │       │
                  SÍ   │       │   NO
                       │       │
                       ▼       ▼
                ┌──────────┐  │
                │ DETENER  │  │
                │ (loop    │  │
                │ evitado) │  │
                └──────────┘  │
                              ▼
                   ┌─────────────────────────┐
                   │  FILTRO 2:              │
                   │  ¿Es grupo Operaciones? │
                   │  (120363424106281199)   │
                   └────────┬───────┬────────┘
                            │       │
                       SÍ   │       │   NO
                            │       │
                            ▼       ▼
                     ┌──────────┐  │
                     │ DETENER  │  │
                     │ (evitar  │  │
                     │ analizar │  │
                     │ alertas) │  │
                     └──────────┘  │
                                   ▼
                        ┌─────────────────────────┐
                        │  FILTRO 3:              │
                        │  ¿Investigación activa? │
                        │  (Redis flag)           │
                        └────────┬───────┬────────┘
                                 │       │
                            SÍ   │       │   NO
                                 │       │
                                 ▼       ▼
                          ┌──────────┐  │
                          │ BLOQUEAR │  │
                          │ nueva    │  │
                          │ alerta   │  │
                          └──────────┘  │
                                        ▼
                                 ┌──────────────┐
                                 │  PROCESAR    │
                                 │  NORMALMENTE │
                                 └──────────────┘
```

---

## 🗄️ Estructura de Datos en Redis

```
Redis Database
│
├── n8n:memory:{remoteJid}:*
│   ├── Contenido: Historial conversacional
│   ├── TTL: 15 días
│   └── Ejemplo: n8n:memory:120363421107247762@g.us:messages
│
├── guardops:incidente:{message_id}
│   ├── Contenido: JSON del incidente completo
│   ├── TTL: 24 horas
│   ├── Estructura: {
│   │     grupo_id, mensaje, timestamp, message_id,
│   │     nombre_remitente, analisis: {
│   │       es_incidente, severidad, resumen, requiere_notificacion
│   │     }
│   │   }
│   └── Ejemplo: guardops:incidente:3BBE1CC431003744C0BA
│
├── guardops:last_activity:{remoteJid}
│   ├── Contenido: Última actividad del canal
│   ├── TTL: Permanente
│   ├── Estructura: {timestamp, message, sender}
│   └── Uso: Monitoreo proactivo + detección inactividad
│
├── guardops:investigacion_activa:{remoteJid}
│   ├── Contenido: "true" o no existe
│   ├── TTL: Sin especificar (manual)
│   ├── Uso: Evitar alertas duplicadas durante investigación
│   └── Se borra: Cuando investigación termina
│
└── guardops:conversation_active:{groupId}
    ├── Contenido: {active: true, timestamp, message}
    ├── TTL: Sin especificar
    └── Uso: Marcar cuando monitoreo proactivo inicia conversación
```

---

## 🎯 Casos de Uso Completos

### **CASO 1: Incidente de Incendio Completo**

```
PASO 1: Reporte inicial
👤 [00:35] Usuario en Grupo #Reporte A: "hay un incendio"

PASO 2: Sistema detecta
🤖 AI Detector: {es_incidente: true, severidad: "URGENTE"}
📱 Alerta inicial → Grupo Operaciones
💾 Redis: guardops:investigacion_activa:GroupA = true

PASO 3: Bot investiga
🤖 [00:35] Bot: "¿En qué sector exacto? ¿Qué magnitud?"
👤 [00:36] Usuario: "sector norte, pequeño pero con humo"

PASO 4: Bot obtiene detalles
🤖 [00:37] Bot: "¿Hay heridos? ¿Sistemas activados?"
👤 [00:37] Usuario: "no hay heridos, alarma activada"

PASO 5: Bot finaliza
🤖 [00:38] Bot: "Perfecto, ya tengo la información. 
               Estoy alertando a operaciones ahora mismo."

PASO 6: Sistema genera reporte final
🤖 AI Resumen Final: Genera reporte profesional completo
📱 Envío → Grupo Operaciones
💾 Redis: eliminar investigacion_activa:GroupA

RESULTADO:
✅ 2 mensajes al grupo Operaciones:
   - Alerta inicial (00:35)
   - Reporte final detallado (00:38)
✅ Incidente documentado en Redis
✅ Usuario atendido profesionalmente
```

### **CASO 2: Mensaje Normal (No Incidente)**

```
PASO 1: Mensaje rutinario
👤 [14:20] Usuario en Grupo #Reporte B: "todo tranquilo, sin novedad"

PASO 2: Sistema procesa
🤖 AI Agent: Evalúa contexto, no hay conversación activa previa
🤖 Decisión: No es incidente, respuesta vacía ""

PASO 3: Filtros actúan
🔒 Filtrar Respuestas Vacías: Bloquea envío
❌ No se envía respuesta
❌ No se genera alerta

PASO 4: Monitoreo pasivo
💾 Redis: Actualizar guardops:last_activity:GroupB
📊 Timestamp registrado para resumen diario

RESULTADO:
✅ Sistema silencioso (no spam)
✅ Actividad registrada
✅ Sin alertas innecesarias
```

### **CASO 3: Monitoreo Proactivo Nocturno**

```
PASO 1: Cron se ejecuta
⏰ [02:00] Cron Monitoreo Proactivo se dispara

PASO 2: Obtener grupos
📡 GET https://wasenderapi.com/api/groups
📋 Respuesta: 15 grupos totales

PASO 3: Filtrar
🔍 Filtrar solo grupos con "#Reporte" en nombre
✅ Resultado: 5 grupos #Reporte

PASO 4: Verificar actividad de cada uno
📊 Grupo A: última actividad 01:30 (30 min) → Skip
📊 Grupo B: última actividad 00:15 (1h 45min) → ENVIAR
📊 Grupo C: última actividad 23:50 (2h 10min) → ENVIAR
📊 Grupo D: última actividad 01:55 (5 min) → Skip
📊 Grupo E: última actividad 20:00 (6h) → ENVIAR

PASO 5: Enviar mensajes proactivos
🤖 [02:00] → Grupo B: "Control nocturno: ¿Rondas completadas?"
🤖 [02:00] → Grupo C: "Control nocturno: ¿Rondas completadas?"
🤖 [02:00] → Grupo E: "Control nocturno: ¿Rondas completadas?"

PASO 6: Marcar conversaciones activas
💾 Redis: conversation_active:GrupoB = {active: true, timestamp: 02:00}
💾 Redis: conversation_active:GrupoC = {active: true, timestamp: 02:00}
💾 Redis: conversation_active:GrupoE = {active: true, timestamp: 02:00}

RESULTADO:
✅ 3 grupos contactados proactivamente
✅ Sistema verifica estado sin esperar reportes
✅ Conversaciones marcadas para que chatbot responda
```

---

## 🧮 Métricas y KPIs del Sistema

### **Operacionales:**
- **Tiempo de respuesta chatbot**: <5 segundos
- **Tiempo detección incidente**: <10 segundos
- **Tiempo envío alerta**: <15 segundos
- **Precisión detección**: Target >95% (ajustar prompts según datos reales)
- **Falsos positivos**: Target <5%
- **Grupos monitoreados**: Dinámico (todos con #Reporte)

### **Uso de Recursos:**
- **Llamadas OpenAI/día**: ~300-500
- **Tokens OpenAI/día**: ~70,000-100,000
- **Costo OpenAI/día**: ~$0.20-0.30 USD
- **Mensajes WhatsApp/día**: ~200-400
- **Operaciones Redis/día**: ~1,000-2,000
- **Emails/día**: 1 (solo resumen diario)

### **Cobertura:**
- **Canales monitoreados**: 100% (todos los grupos del admin)
- **Horario operación**: 24/7
- **Disponibilidad**: Target 99.9%
- **Latencia webhook→alerta**: <20 segundos

---

## 🛠️ Instalación en Nuevo Proyecto

### **Requisitos Previos:**

1. **n8n instalado** (versión ≥1.113.3)
2. **Cuenta OpenAI** con API key y créditos
3. **Redis** (cloud o local)
4. **Wasender/Ascender** configurado con WhatsApp Business
5. **Gmail** con OAuth2 configurado
6. **Acceso a grupos** de WhatsApp como administrador

### **Pasos de Instalación:**

```bash
# 1. Importar workflow
# Desde n8n UI: Workflows → ⋮ → Import from File
# Seleccionar: Monitor_Seguridad_WhatsApp_COMPLETO.json

# 2. Configurar credenciales
# Settings → Credentials → Add Credential
# - OpenAI API
# - Redis
# - HTTP Bearer Auth (Wasender)
# - Gmail OAuth2

# 3. Actualizar variables
# Editar nodos y reemplazar:
# - GRUPO_OPERACIONES_ID: tu ID real
# - Email destinatario: tu email
# - URLs Wasender API: tu instancia

# 4. Activar workflow
# Editor → Toggle "Active" (arriba derecha)

# 5. Configurar webhook en Wasender
# Wasender Panel → Settings → Webhooks
# URL: https://tu-n8n.com/webhook/guardops-whatsapp-v2
# Method: POST

# 6. Verificar
# Enviar mensaje de prueba
# Revisar: Executions → Ver resultado
```

---

## 📖 Glosario Técnico

**remoteJid**: Identificador único de chat/grupo en WhatsApp  
- Formato grupo: `120363XXXXXXXXX@g.us`
- Formato individual: `56912345678@s.whatsapp.net`

**fromMe**: Booleano que indica si el mensaje fue enviado por el bot (true) o recibido (false)

**AI Agent**: Nodo de LangChain que orquesta modelo IA + memoria + herramientas

**Language Model Connection**: Conexión especial que conecta un modelo IA a un AI Agent

**TTL (Time To Live)**: Tiempo de expiración de una key en Redis (en segundos)

**Cron Expression**: Formato para programar tareas  
- `0 7 * * *` = Todos los días a las 07:00
- `0 * * * *` = Cada hora en punto

**Temperature**: Parámetro de creatividad del modelo IA
- 0.0-0.3: Determinista, preciso
- 0.4-0.7: Balanceado
- 0.8-1.0: Creativo, variado

**Session Key**: Identificador para mantener memoria conversacional separada por chat

---

## 🎓 Para Proyecto de Cursos

**Conceptos para enseñar:**

1. **Arquitectura de flujos paralelos** en un solo workflow
2. **Integración AI Agents** con memoria persistente (Redis)
3. **Detección inteligente** con prompts optimizados
4. **Sistema de estados** para evitar duplicados
5. **Cron scheduling** múltiple (diario + horario)
6. **Prevención de loops infinitos** en chatbots
7. **Manejo de webhooks** con filtros robustos
8. **Generación de reportes** automatizados con IA
9. **Monitoreo proactivo** vs reactivo
10. **Optimización de costos** con temperatura y tokens

**Ejercicios prácticos sugeridos:**

1. Modificar prompt del detector para tu industria
2. Agregar nuevo tipo de incidente personalizado
3. Cambiar horarios de monitoreo proactivo
4. Personalizar estructura de reportes
5. Implementar notificaciones adicionales (SMS, Telegram)

---

_Documento creado: 02/10/2025_  
_Versión del workflow: 2.0_  
_Para: Proyecto de Cursos MCP N8n_  
_Autor: Carlos Irigoyen_


