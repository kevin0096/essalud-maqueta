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

La maqueta implementa el **estado TO-BE** con 3 roles (RBAC — Principio P2). En la pantalla inicial eliges el usuario de demostración:

| Rol | Usuario demo | Qué demuestra |
|---|---|---|
| **Asegurado** | KEVIN RIOS | Pantalla de inicio tipo MiConsulta real (Citas, Órdenes Médicas), **Nueva Cita** en 4 pasos con disponibilidad en tiempo real, reprogramar/cancelar, notificaciones (RN-02, RN-04) |
| **Jefe de Servicio** | DRA. MARÍA TORRES | **Programación asistencial obligatoria**: publica agenda con validación de 72 h (RN-01), alertas de incumplimiento — al publicar, los cupos aparecen al instante para el asegurado |
| **Gerencia / GCTIC** | ING. CARLOS VEGA | **Dashboard de Monitoreo Digital** (Iniciativa I3): tasa de publicación por establecimiento vs. meta 70%, citas digital vs. presencial, **Audit Trail** (P3, RN-03) y Alertas de Gobernanza |

### Flujo de demostración sugerido (para exponer)

1. Entrar como **Jefe de Servicio** → "Programar Disponibilidad" → intentar una fecha a menos de 72 h (el sistema la **rechaza** y lo audita: RN-01) → publicar una fecha válida.
2. Cerrar sesión, entrar como **Asegurado** → "Nueva Cita" → Cardiología → verás la agenda recién publicada → reservar un horario → confirmación con código QR y notificación.
3. Cerrar sesión, entrar como **Gerencia** → "Auditoría" → se ven las dos acciones anteriores registradas (quién, cuándo, qué) → "Dashboard" y "Alertas de Gobernanza".

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
