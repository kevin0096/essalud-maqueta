# EsSalud MiConsulta — Maqueta Académica (Prototipo TO-BE)

Prototipo funcional local del trabajo **"Diseño de una Arquitectura Empresarial para la optimización del proceso de gestión de citas médicas... mediante el uso de TOGAF en EsSalud"**.

> Maqueta académica. No está afiliada a EsSalud. Todos los datos son ficticios y se guardan solo en el navegador (localStorage).

## Cómo ejecutarla

**En línea (PC o celular):** https://kevin0096.github.io/essalud-maqueta/

**Como app en el celular (PWA):**
1. Abre el link anterior en Chrome (Android) o Safari (iPhone).
2. Android: menú ⋮ → **"Agregar a pantalla principal"** / **"Instalar app"**. iPhone: botón Compartir → **"Agregar a inicio"**.
3. Queda instalada con su ícono y funciona incluso sin internet (service worker).

**En local (sin internet):** doble clic en `index.html` (o en `ABRIR_MAQUETA.bat`).

**Con servidor local (si tienes Python):**

```
cd essalud-maqueta
python -m http.server 8080
```

y abre http://localhost:8080

No requiere instalación de nada: es HTML + CSS + JavaScript puro.

## Qué demuestra (mapeo con el documento TOGAF)

La maqueta implementa el **estado TO-BE** con 4 roles (RBAC — Principio P2). Puedes ingresar con **DNI y contraseña** o con los accesos rápidos de demostración:

| Rol | Usuario demo | DNI / Contraseña | Qué demuestra |
|---|---|---|---|
| **Asegurado** | KEVIN RIOS | 45678123 / 123456 | Pantalla de inicio tipo MiConsulta real (Citas, Órdenes Médicas), **Nueva Cita** en 4 pasos con disponibilidad en tiempo real, reprogramar/cancelar, notificaciones (RN-02, RN-04) |
| **Jefe de Servicio** | DRA. MARÍA TORRES | 10234567 / 123456 | **Programación asistencial obligatoria**: publica agenda con validación de 72 h (RN-01), alertas de incumplimiento — al publicar, los cupos aparecen al instante para el asegurado |
| **Gerencia / GCTIC** | ING. CARLOS VEGA | 07894561 / 123456 | **Dashboard de Monitoreo Digital** (Iniciativa I3): tasa de publicación por establecimiento vs. meta 70%, citas digital vs. presencial, **Audit Trail** (P3, RN-03) y Alertas de Gobernanza |
| **Administrador** | LIC. SANDRA QUISPE | 09182736 / admin123 | **Gestión de usuarios** (alta, activar/desactivar — todo auditado), **Matriz de Roles y Permisos RBAC** (el SBB de la Fase E 4.6.3), auditoría de accesos fallidos/bloqueados |

Hay usuarios adicionales en la base demo (Lucía Fernández 41253678, Dr. Pedro Rojas 16097534 — Traumatología, y José Castillo 32165498 con **cuenta desactivada** para demostrar el bloqueo de acceso). Los usuarios que crea el administrador pueden iniciar sesión de inmediato.

### Padrón de Asegurados (320 pacientes de ejemplo)

Admin y Gerencia tienen el módulo **"Padrón de Asegurados"**: una base de **320 pacientes ficticios** que simula el sistema RAUUS, con DNI, nombre, sexo, edad, centro de adscripción, distrito, tipo (titular/derechohabiente), estado de afiliación (activa/suspendida/en trámite), número de atenciones y canal preferente. Incluye **buscador por DNI o apellidos, filtros por centro y estado, paginación** y ficha individual por paciente (clic en la fila).

Los pacientes se generan con una **semilla fija** (generador determinístico), así que todos los integrantes del grupo verán exactamente el mismo padrón en cualquier navegador — útil para ensayar la presentación citando casos concretos.

### Flujo de demostración sugerido (para exponer)

1. Intentar entrar con el DNI 32165498 (cuenta desactivada): el sistema **bloquea el acceso** y lo registra en auditoría.
2. Entrar como **Administrador** → "Gestión de Usuarios" (crear un usuario nuevo, reactivar a José Castillo) → "Matriz RBAC" (mostrar que ni el admin puede tocar agendas médicas).
3. Entrar como **Jefe de Servicio** → "Programar Disponibilidad" → intentar una fecha a menos de 72 h (el sistema la **rechaza** y lo audita: RN-01) → publicar una fecha válida.
4. Cerrar sesión, entrar como **Asegurado** → "Nueva Cita" → Cardiología → verás la agenda recién publicada → reservar un horario → confirmación con código QR y notificación.
5. Cerrar sesión, entrar como **Gerencia** → "Auditoría" → se ven todas las acciones anteriores registradas (quién, cuándo, qué) → "Dashboard" y "Alertas de Gobernanza".

### Correspondencia con los artefactos TOGAF

- **P1 — Canal digital autoritativo:** la única forma de reservar es a través del catálogo publicado.
- **P2 — RBAC:** cada rol ve solo sus módulos (AWS Cognito, simulado con la selección de usuario).
- **P3 — Trazabilidad total:** toda acción escribe en el Audit Trail (DynamoDB, simulado con localStorage).
- **RN-01:** validación de 72 h en la publicación de agenda.
- **RN-02:** el asegurado reserva, reprograma y cancela de forma autónoma.
- **RN-03/RN-04:** auditoría de cada acción + notificaciones automáticas.
- **Iniciativa I3:** dashboard gerencial de tasa de digitalización por establecimiento.

## Estructura

```
essalud-maqueta/
├── index.html             # estructura de la app (login, layout, modal, notificaciones)
├── css/styles.css         # estilos (estética de MiConsulta; paleta validada para daltonismo)
├── js/data.js             # "base de datos" de demo (semilla + localStorage) — simula RDS/DynamoDB
├── js/app.js              # lógica: RBAC, vistas por rol, wizard de citas, dashboard SVG, auditoría
├── manifest.webmanifest   # PWA: instalable en el celular con ícono propio
├── sw.js                  # PWA: service worker (funciona offline)
├── icons/                 # íconos de la app (192/512/maskable/apple)
└── README.md
```

Las fechas de la semilla se generan **relativas al día actual**, así que la demo siempre muestra citas vigentes sin importar cuándo la abras. El botón "Restablecer datos de demo" (en el login) vuelve al estado inicial.
