# 🧠 Lógica de Asignación de Guardias y Gestión de Turnos – GuardSecurity

## 1. Instalaciones y Roles de Servicio

Cada instalación puede tener uno o más roles de servicio, como un turno 4x4x12 de 08:00 a 20:00 con 4 puestos. Esto implica que la instalación requiere 4 guardias diarios.

## 2. Generación de Puestos y PPCs

Al definir roles con N puestos:
- Si hay guardia asignado → Puesto cubierto.
- Si no → PPC (Puesto Por Cubrir).

## 3. Pauta Mensual

Muestra los días laborales o libres por cada puesto (cubierto o PPC). Si el guardia tiene permisos o licencias, se marcan como días no trabajados.

## 4. Pauta Diaria

Se gestiona asistencia diaria:
- Puestos cubiertos → Asistencia ✅ o inasistencia ❌.
  - Si hay reemplazo, el día se considera cubierto.
- PPC → Se cubre o queda descubierto.

Toda esta información impacta la Pauta Mensual.

## 5. Permisos, Licencias y Ausencias

Desde la ficha del guardia se ingresan:
- Permiso con/sin goce
- Vacaciones
- Licencia médica

Esto afecta la Pauta Mensual automáticamente.

## 6. Finiquito

Cuando un guardia termina su contrato:
- Desde el día siguiente → Puesto queda vacante.
- Se genera automáticamente un nuevo PPC, al liberarse el puesto que estaba cubierto por ese guardia.
- Pauta Mensual marca días como F (Finiquito).

## 7. Reglas clave

- Todo puesto sin cobertura es un PPC.
- Asistencia se valida diariamente.
- Todo evento (licencia, permiso, finiquito) afecta planificación y operación.
- El sistema distingue claramente entre planificación (mensual) y ejecución (diaria).