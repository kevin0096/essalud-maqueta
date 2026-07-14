/* ============================================================
   EsSalud MiConsulta — Maqueta académica
   Capa de datos: semilla de demostración + persistencia local
   (simula RDS/DynamoDB del TO-BE usando localStorage)
   ============================================================ */

var DB_KEY = "essalud_maqueta_v1";

/* ---------- utilidades de fecha ---------- */
function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function addDias(base, n) { var d = new Date(base); d.setDate(d.getDate() + n); return d; }
function iso(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fmtFecha(isoStr) {
  var p = isoStr.split("-");
  var meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  var dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return dias[d.getDay()] + " " + (+p[2]) + " " + meses[+p[1] - 1] + " " + p[0];
}
function fmtFechaCorta(isoStr) {
  var p = isoStr.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}
function ahoraStr() {
  var d = new Date();
  return iso(d) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

/* ---------- semilla de demostración ---------- */
function crearSemilla() {
  var H = hoy();

  var usuarios = [
    {
      id: "U1", dni: "45678123", nombre: "KEVIN RIOS", nombreCompleto: "RIOS CANO, KEVIN GIANFRANCO",
      rol: "asegurado", avatar: "🧑", centroId: "E1",
      vigencia: fmtFechaCorta(iso(addDias(H, 26))),
      desc: "Consulta disponibilidad real y reserva citas por el canal digital (P1)."
    },
    {
      id: "U2", dni: "10234567", nombre: "DRA. MARÍA TORRES", nombreCompleto: "TORRES QUISPE, MARÍA ELENA",
      rol: "jefe", avatar: "🧑‍⚕️", centroId: "E1", servicio: "Cardiología",
      desc: "Jefa de Servicio: publica la programación asistencial obligatoria (RBAC)."
    },
    {
      id: "U3", dni: "07894561", nombre: "ING. CARLOS VEGA", nombreCompleto: "VEGA SALAS, CARLOS ALBERTO",
      rol: "gerencia", avatar: "👨‍💼", centroId: "E0",
      desc: "GCTIC / Gerencia: dashboard de adopción digital, auditoría y alertas."
    }
  ];

  var establecimientos = [
    { id: "E0", nombre: "GERENCIA CENTRAL — SEDE LIMA", red: "Sede Central", ofertaSemanal: 0 },
    { id: "E1", nombre: "POL. PROCERES", red: "Red Almenara", ofertaSemanal: 120 },
    { id: "E2", nombre: "HOSP. E. REBAGLIATI", red: "Red Rebagliati", ofertaSemanal: 300 },
    { id: "E3", nombre: "HOSP. G. ALMENARA", red: "Red Almenara", ofertaSemanal: 280 },
    { id: "E4", nombre: "CAP III EL AGUSTINO", red: "Red Almenara", ofertaSemanal: 90 },
    { id: "E5", nombre: "HOSP. A. SABOGAL", red: "Red Sabogal", ofertaSemanal: 240 },
    { id: "E6", nombre: "POL. CHINCHA", red: "Red Rebagliati", ofertaSemanal: 80 }
  ];

  var especialidades = [
    { id: "S1", nombre: "Cardiología", ico: "❤️" },
    { id: "S2", nombre: "Medicina General", ico: "🩺" },
    { id: "S3", nombre: "Dermatología", ico: "🧴" },
    { id: "S4", nombre: "Traumatología", ico: "🦴" },
    { id: "S5", nombre: "Pediatría", ico: "🧸" },
    { id: "S6", nombre: "Oftalmología", ico: "👁️" }
  ];

  var medicos = [
    { id: "M1", nombre: "Dra. María Torres Quispe", espId: "S1", estId: "E1" },
    { id: "M2", nombre: "Dr. Jorge Salinas Prado", espId: "S1", estId: "E2" },
    { id: "M3", nombre: "Dra. Rosa Gutiérrez León", espId: "S2", estId: "E1" },
    { id: "M4", nombre: "Dr. Luis Campos Vera", espId: "S2", estId: "E4" },
    { id: "M5", nombre: "Dra. Ana Paredes Silva", espId: "S3", estId: "E2" },
    { id: "M6", nombre: "Dr. Pedro Rojas Mendo", espId: "S4", estId: "E3" },
    { id: "M7", nombre: "Dra. Carmen Díaz Bravo", espId: "S5", estId: "E1" },
    { id: "M8", nombre: "Dr. Raúl Herrera Cano", espId: "S6", estId: "E5" },
    { id: "M9", nombre: "Dra. Elena Vargas Ruiz", espId: "S2", estId: "E6" },
    { id: "M10", nombre: "Dr. Óscar Medina Paz", espId: "S4", estId: "E5" }
  ];

  /* Programaciones publicadas (TO-BE: canal digital autoritativo).
     Fechas relativas a "hoy" para que la maqueta siempre muestre datos vigentes. */
  var programaciones = [];
  var pid = 1;
  function prog(medId, diasDesdeHoy, hIni, hFin, cupos) {
    var m = medicos.find(function (x) { return x.id === medId; });
    programaciones.push({
      id: "P" + (pid++), medicoId: medId, estId: m.estId, espId: m.espId,
      fecha: iso(addDias(H, diasDesdeHoy)), horaInicio: hIni, horaFin: hFin,
      cuposTotal: cupos, estado: "publicada",
      creadoPor: m.nombre, fechaCreacion: iso(addDias(H, diasDesdeHoy - 5)) + " 08:30"
    });
  }
  // Cardiología
  prog("M1", 4, "08:00", "12:00", 8); prog("M1", 7, "08:00", "12:00", 8); prog("M1", 11, "14:00", "18:00", 8);
  prog("M2", 5, "09:00", "13:00", 10); prog("M2", 9, "09:00", "13:00", 10);
  // Medicina General
  prog("M3", 3, "08:00", "13:00", 12); prog("M3", 6, "08:00", "13:00", 12); prog("M3", 10, "08:00", "13:00", 12);
  prog("M4", 4, "08:00", "12:00", 8); prog("M9", 5, "08:00", "12:00", 8);
  // Dermatología
  prog("M5", 6, "10:00", "14:00", 8); prog("M5", 12, "10:00", "14:00", 8);
  // Traumatología
  prog("M6", 5, "08:00", "12:00", 10); prog("M10", 8, "14:00", "18:00", 8);
  // Pediatría
  prog("M7", 3, "09:00", "13:00", 10); prog("M7", 8, "09:00", "13:00", 10);
  // Oftalmología
  prog("M8", 7, "08:00", "12:00", 8);

  /* Citas del asegurado demo */
  var citas = [
    {
      id: "C1", progId: "P1", aseguradoId: "U1", estado: "reservada",
      hora: "08:30", canal: "digital", fechaReserva: iso(addDias(H, -2)) + " 19:12"
    },
    {
      id: "C-A1", progId: null, aseguradoId: "U1", estado: "atendida",
      espNombre: "Medicina General", medNombre: "Dra. Rosa Gutiérrez León", estNombre: "POL. PROCERES",
      fecha: iso(addDias(H, -21)), hora: "09:20", canal: "digital", fechaReserva: iso(addDias(H, -25)) + " 08:44"
    },
    {
      id: "C-A2", progId: null, aseguradoId: "U1", estado: "atendida",
      espNombre: "Dermatología", medNombre: "Dra. Ana Paredes Silva", estNombre: "HOSP. E. REBAGLIATI",
      fecha: iso(addDias(H, -60)), hora: "11:00", canal: "presencial", fechaReserva: iso(addDias(H, -66)) + " 06:10"
    }
  ];

  var pendientes = [
    { id: "PP1", aseguradoId: "U1", espNombre: "Oftalmología", origen: "Referencia de Medicina General", fecha: iso(addDias(H, -8)), estado: "En cola de programación" }
  ];

  var recetas = [
    { id: "R1", aseguradoId: "U1", fecha: iso(addDias(H, -21)), med: "Losartán 50 mg — 30 tabletas", indicacion: "1 tableta cada 24 horas", medico: "Dra. Rosa Gutiérrez León" },
    { id: "R2", aseguradoId: "U1", fecha: iso(addDias(H, -60)), med: "Clotrimazol crema 1% — 1 tubo", indicacion: "Aplicar 2 veces al día por 14 días", medico: "Dra. Ana Paredes Silva" }
  ];

  var examenes = [
    { id: "X1", aseguradoId: "U1", fecha: iso(addDias(H, -20)), tipo: "Laboratorio", nombre: "Perfil lipídico completo", estado: "Resultado disponible" },
    { id: "X2", aseguradoId: "U1", fecha: iso(addDias(H, -19)), tipo: "Imágenes", nombre: "Radiografía de tórax (2 incidencias)", estado: "Resultado disponible" }
  ];

  var referencias = [
    { id: "F1", aseguradoId: "U1", fecha: iso(addDias(H, -8)), destino: "Oftalmología — HOSP. A. SABOGAL", motivo: "Evaluación de agudeza visual", estado: "Aprobada" }
  ];

  /* Auditoría (P3 — trazabilidad total). Semilla + eventos en runtime */
  var auditoria = [
    { id: "A1", ts: iso(addDias(H, -2)) + " 08:30", usuario: "Dra. María Torres Quispe", rol: "Jefe de Servicio", accion: "PUBLICAR_PROGRAMACION", entidad: "ProgramacionAsistencial", detalle: "Cardiología · POL. PROCERES · 8 cupos · " + fmtFechaCorta(iso(addDias(H, 4))) },
    { id: "A2", ts: iso(addDias(H, -2)) + " 19:12", usuario: "KEVIN RIOS", rol: "Asegurado", accion: "RESERVAR_CITA", entidad: "CitaMedica", detalle: "Cardiología · " + fmtFechaCorta(iso(addDias(H, 4))) + " 08:30 · canal digital" },
    { id: "A3", ts: iso(addDias(H, -3)) + " 07:55", usuario: "Dra. Rosa Gutiérrez León", rol: "Jefe de Servicio", accion: "PUBLICAR_PROGRAMACION", entidad: "ProgramacionAsistencial", detalle: "Medicina General · POL. PROCERES · 12 cupos · " + fmtFechaCorta(iso(addDias(H, 3))) },
    { id: "A4", ts: iso(addDias(H, -4)) + " 16:40", usuario: "SISTEMA", rol: "Gobernanza", accion: "ALERTA_INCUMPLIMIENTO", entidad: "AuditTrail", detalle: "POL. CHINCHA no registró agenda con 72 h de anticipación (RN-01)" },
    { id: "A5", ts: iso(addDias(H, -5)) + " 10:05", usuario: "Dr. Raúl Herrera Cano", rol: "Jefe de Servicio", accion: "PUBLICAR_PROGRAMACION", entidad: "ProgramacionAsistencial", detalle: "Oftalmología · HOSP. A. SABOGAL · 8 cupos · " + fmtFechaCorta(iso(addDias(H, 7))) },
    { id: "A6", ts: iso(addDias(H, -6)) + " 11:22", usuario: "Ing. Carlos Vega", rol: "Gerencia", accion: "CONSULTAR_DASHBOARD", entidad: "MonitoreoDigital", detalle: "Revisión semanal de tasa de digitalización — Red Lima" }
  ];

  /* Notificaciones (RN-04) */
  var notificaciones = [
    { id: "N1", userId: "U1", ico: "✅", msg: "Tu cita de Cardiología fue confirmada para el " + fmtFecha(iso(addDias(H, 4))) + " a las 08:30 (POL. PROCERES).", ts: iso(addDias(H, -2)) + " 19:12", leida: false },
    { id: "N2", userId: "U1", ico: "🧪", msg: "Tus resultados de Perfil lipídico ya están disponibles en Exámenes Auxiliares.", ts: iso(addDias(H, -19)) + " 15:03", leida: true },
    { id: "N3", userId: "U2", ico: "⏰", msg: "Recuerda publicar tu agenda de la próxima semana con 72 h de anticipación (RN-01).", ts: iso(H) + " 07:00", leida: false },
    { id: "N4", userId: "U3", ico: "🚨", msg: "POL. CHINCHA y CAP III EL AGUSTINO están por debajo del 70% de publicación digital.", ts: iso(H) + " 08:00", leida: false }
  ];

  /* Serie mensual para el dashboard (citas por canal, en miles) */
  var meses = [];
  var nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  var mesActual = H.getMonth();
  var serieDigital = [18, 22, 27, 34, 41, 47];
  var seriePresencial = [52, 49, 45, 39, 33, 28];
  for (var i = 5; i >= 0; i--) {
    meses.push(nombresMeses[(mesActual - i + 12) % 12]);
  }

  /* % de publicación digital por establecimiento (para dashboard y alertas) */
  var adopcion = [
    { estId: "E2", pct: 92 }, { estId: "E3", pct: 88 }, { estId: "E1", pct: 81 },
    { estId: "E5", pct: 76 }, { estId: "E4", pct: 64 }, { estId: "E6", pct: 48 }
  ];

  return {
    usuarios: usuarios, establecimientos: establecimientos, especialidades: especialidades,
    medicos: medicos, programaciones: programaciones, citas: citas, pendientes: pendientes,
    recetas: recetas, examenes: examenes, referencias: referencias,
    auditoria: auditoria, notificaciones: notificaciones,
    dashboard: { meses: meses, digital: serieDigital, presencial: seriePresencial, adopcion: adopcion },
    seq: 100
  };
}

/* ---------- persistencia ---------- */
var DB = null;

function cargarDB() {
  try {
    var raw = localStorage.getItem(DB_KEY);
    if (raw) { DB = JSON.parse(raw); return; }
  } catch (e) { /* localStorage no disponible: usar memoria */ }
  DB = crearSemilla();
  guardarDB();
}

function guardarDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(DB)); } catch (e) { /* modo memoria */ }
}

function resetDB() {
  try { localStorage.removeItem(DB_KEY); } catch (e) {}
  DB = crearSemilla();
  guardarDB();
}

function nextId(prefix) { DB.seq++; guardarDB(); return prefix + DB.seq; }

/* ---------- consultas ---------- */
function getEst(id) { return DB.establecimientos.find(function (e) { return e.id === id; }); }
function getEsp(id) { return DB.especialidades.find(function (e) { return e.id === id; }); }
function getMed(id) { return DB.medicos.find(function (m) { return m.id === id; }); }
function getProg(id) { return DB.programaciones.find(function (p) { return p.id === id; }); }

/* horarios disponibles de una programación (cupos - citas reservadas) */
function slotsDe(prog) {
  var ini = prog.horaInicio.split(":"), fin = prog.horaFin.split(":");
  var minIni = (+ini[0]) * 60 + (+ini[1]);
  var minFin = (+fin[0]) * 60 + (+fin[1]);
  var dur = Math.floor((minFin - minIni) / prog.cuposTotal);
  var tomados = DB.citas
    .filter(function (c) { return c.progId === prog.id && c.estado === "reservada"; })
    .map(function (c) { return c.hora; });
  var libres = [];
  for (var i = 0; i < prog.cuposTotal; i++) {
    var m = minIni + i * dur;
    var h = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
    if (tomados.indexOf(h) === -1) libres.push(h);
  }
  return libres;
}

function cuposDisponibles(prog) { return slotsDe(prog).length; }

/* registrar evento de auditoría (P3) */
function auditar(usuario, rol, accion, entidad, detalle) {
  DB.auditoria.unshift({ id: nextId("A"), ts: ahoraStr(), usuario: usuario, rol: rol, accion: accion, entidad: entidad, detalle: detalle });
  guardarDB();
}

/* enviar notificación (RN-04) */
function notificar(userId, ico, msg) {
  DB.notificaciones.unshift({ id: nextId("N"), userId: userId, ico: ico, msg: msg, ts: ahoraStr(), leida: false });
  guardarDB();
}
