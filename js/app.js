/* ============================================================
   EsSalud MiConsulta — Maqueta académica (Arquitectura TO-BE)
   Lógica de la aplicación: RBAC, vistas por rol, wizard de citas,
   programación asistencial, dashboard y auditoría.
   ============================================================ */

var currentUser = null;
var currentView = null;
var wizard = {}; // estado del asistente "Nueva Cita"

/* ---------- helpers DOM ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ============================================================
   LOGIN (RBAC — Principio P2)
   ============================================================ */
var ROL_NOMBRE = { asegurado: "Asegurado", jefe: "Jefe de Servicio", gerencia: "Gerencia / GCTIC" };

function renderLogin() {
  var html = "";
  DB.usuarios.forEach(function (u) {
    html +=
      '<button class="user-card" onclick="login(\'' + u.id + '\')">' +
      '<span class="avatar">' + u.avatar + "</span>" +
      '<div class="u-name">' + esc(u.nombre) + "</div>" +
      '<span class="u-role">' + ROL_NOMBRE[u.rol] + "</span>" +
      '<div class="u-desc">' + esc(u.desc) + "</div>" +
      "</button>";
  });
  $("login-users").innerHTML = html;
}

function login(userId) {
  currentUser = DB.usuarios.find(function (u) { return u.id === userId; });
  auditar(currentUser.nombre, ROL_NOMBRE[currentUser.rol], "INICIAR_SESION", "Cognito/JWT", "Autenticación simulada — token de rol emitido");
  $("login-screen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("topbar-greeting").textContent = "Hola, " + currentUser.nombre;

  var centro = getEst(currentUser.centroId);
  $("center-name").textContent = centro ? centro.nombre : "—";
  $("center-vigencia").innerHTML = currentUser.vigencia
    ? "<b>Vigencia Hasta:</b> " + currentUser.vigencia
    : (currentUser.servicio ? "Servicio: <b>" + currentUser.servicio + "</b>" : "Perfil institucional");

  renderNav();
  var inicial = { asegurado: "inicio", jefe: "panel-jefe", gerencia: "dashboard" }[currentUser.rol];
  irA(inicial);
  actualizarCampana();
}

function logout() {
  currentUser = null;
  $("app").classList.add("hidden");
  $("notif-panel").classList.add("hidden");
  $("login-screen").classList.remove("hidden");
  renderLogin();
}

/* ============================================================
   NAVEGACIÓN LATERAL POR ROL
   ============================================================ */
var MENUS = {
  asegurado: [
    { v: "inicio", ico: "🏠", txt: "Inicio", bn: "Inicio" },
    { v: "nueva-cita", ico: "➕", txt: "Nueva Cita", bn: "Nueva Cita" },
    { v: "mis-citas", ico: "📅", txt: "Mis Citas", bn: "Mis Citas" },
    { v: "perfil", ico: "👤", txt: "Mi Perfil", bn: "Perfil" },
    { v: "teleeduca", ico: "🎓", txt: "TeleEduca" },
    { v: "riesgo", ico: "🩸", txt: "Riesgo Diabetes Tipo 2" }
  ],
  jefe: [
    { v: "panel-jefe", ico: "🏠", txt: "Inicio", bn: "Inicio" },
    { v: "programar", ico: "🗓️", txt: "Programar Disponibilidad", bn: "Programar" },
    { v: "mis-programaciones", ico: "📋", txt: "Mis Programaciones", bn: "Agendas" },
    { v: "alertas-jefe", ico: "⏰", txt: "Alertas 72 h", bn: "Alertas" },
    { v: "perfil", ico: "👤", txt: "Mi Perfil" }
  ],
  gerencia: [
    { v: "dashboard", ico: "📊", txt: "Dashboard de Monitoreo", bn: "Dashboard" },
    { v: "auditoria", ico: "🔍", txt: "Auditoría (Audit Trail)", bn: "Auditoría" },
    { v: "alertas-gob", ico: "🚨", txt: "Alertas de Gobernanza", bn: "Alertas" },
    { v: "perfil", ico: "👤", txt: "Mi Perfil", bn: "Perfil" }
  ]
};

function renderNav() {
  var html = "";
  MENUS[currentUser.rol].forEach(function (m) {
    html += '<button class="nav-item" data-view="' + m.v + '" onclick="irA(\'' + m.v + '\')">' +
      '<span class="ico">' + m.ico + "</span>" + m.txt + "</button>";
  });
  $("sidebar-nav").innerHTML = html;

  // barra inferior móvil: primeros 4 módulos + botón Menú
  var bn = "";
  MENUS[currentUser.rol].filter(function (m) { return m.bn; }).slice(0, 4).forEach(function (m) {
    bn += '<button class="bn-item" data-view="' + m.v + '" onclick="irA(\'' + m.v + '\')">' +
      '<span class="ico">' + m.ico + '</span><span class="txt">' + m.bn + "</span></button>";
  });
  bn += '<button class="bn-item" onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">' +
    '<span class="ico">☰</span><span class="txt">Menú</span></button>';
  $("bottomnav").innerHTML = bn;
}

function irA(view) {
  currentView = view;
  document.querySelectorAll(".nav-item[data-view], .bn-item[data-view]").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-view") === view);
  });
  $("sidebar").classList.remove("open");
  var vistas = {
    "inicio": vInicio, "nueva-cita": vNuevaCita, "mis-citas": vMisCitas,
    "atenciones": vAtenciones, "pendientes": vPendientes, "recetas": vRecetas,
    "examenes": vExamenes, "citt": vCitt, "referencias": vReferencias,
    "perfil": vPerfil, "teleeduca": vSimple, "riesgo": vSimple,
    "panel-jefe": vPanelJefe, "programar": vProgramar, "mis-programaciones": vMisProgramaciones,
    "alertas-jefe": vAlertasJefe,
    "dashboard": vDashboard, "auditoria": vAuditoria, "alertas-gob": vAlertasGob
  };
  $("content").innerHTML = "";
  (vistas[view] || vInicio)();
  $("content").scrollTop = 0;
}

/* ============================================================
   VISTAS — ASEGURADO
   ============================================================ */
function tarjeta(ico, txt, onclick, badge) {
  return '<button class="list-card" onclick="' + onclick + '">' +
    '<span class="ico">' + ico + "</span>" + txt +
    (badge ? '<span class="badge">' + badge + "</span>" : "") +
    '<span class="chev">›</span></button>';
}

function vInicio() {
  var citasProg = DB.citas.filter(function (c) { return c.aseguradoId === currentUser.id && c.estado === "reservada"; }).length;
  var atenciones = DB.citas.filter(function (c) { return c.aseguradoId === currentUser.id && c.estado === "atendida"; }).length;
  var pend = DB.pendientes.filter(function (p) { return p.aseguradoId === currentUser.id; }).length;

  $("content").innerHTML =
    '<h3 class="section-title">Citas</h3>' +
    tarjeta("📅", "Citas Programadas", "irA('mis-citas')", citasProg) +
    tarjeta("🩺", "Atenciones Realizadas", "irA('atenciones')", atenciones) +
    tarjeta("⏳", "Citas Pendientes de Programación", "irA('pendientes')", pend) +
    '<h3 class="section-title">Ordenes Médicas</h3>' +
    tarjeta("💊", "Recetas", "irA('recetas')") +
    tarjeta("🔬", "Exámenes Auxiliares", "irA('examenes')") +
    tarjeta("📄", "Descansos Médicos - CITT", "irA('citt')") +
    tarjeta("📤", "Referencias", "irA('referencias')") +
    '<div class="arch-note"><b>TO-BE (Fase B):</b> este canal digital es el mecanismo principal y autoritativo de citas. ' +
    "La disponibilidad mostrada proviene del catálogo publicado obligatoriamente por los Jefes de Servicio (Principio P1).</div>";
}

/* ---------- Nueva Cita (proceso TO-BE de asignación) ---------- */
function vNuevaCita() {
  wizard = { paso: 1 };
  renderWizard();
}

function pasoChip(n, txt) {
  var cls = wizard.paso === n ? "active" : (wizard.paso > n ? "done" : "");
  return '<span class="step ' + cls + '"><span class="n">' + (wizard.paso > n ? "✓" : n) + "</span>" + txt + "</span>";
}

function renderWizard() {
  var html = "<h2>Nueva Cita</h2>" +
    '<p class="sub">Reserva autónoma por canal digital (RN-02) — disponibilidad en tiempo real desde /api/programacionDisponible</p>' +
    '<div class="steps">' + pasoChip(1, "Especialidad") + pasoChip(2, "Médico y fecha") + pasoChip(3, "Horario") + pasoChip(4, "Confirmación") + "</div>";

  if (wizard.paso === 1) {
    html += '<div class="option-grid">';
    DB.especialidades.forEach(function (e) {
      var progs = DB.programaciones.filter(function (p) { return p.espId === e.id && p.estado === "publicada" && cuposDisponibles(p) > 0 && p.fecha >= iso(hoy()); });
      var cupos = progs.reduce(function (s, p) { return s + cuposDisponibles(p); }, 0);
      html += '<button class="option-card" ' + (cupos ? 'onclick="selEsp(\'' + e.id + '\')"' : "disabled") + ">" +
        '<span class="ico">' + e.ico + "</span>" + e.nombre +
        '<span class="meta">' + (cupos ? cupos + " cupos disponibles" : "Sin disponibilidad") + "</span></button>";
    });
    html += "</div>";
  }

  if (wizard.paso === 2) {
    var progs = DB.programaciones.filter(function (p) {
      return p.espId === wizard.espId && p.estado === "publicada" && cuposDisponibles(p) > 0 && p.fecha >= iso(hoy());
    }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    html += '<div class="option-grid">';
    progs.forEach(function (p) {
      var m = getMed(p.medicoId), est = getEst(p.estId);
      html += '<button class="option-card" onclick="selProg(\'' + p.id + '\')">' +
        '<span class="ico">🧑‍⚕️</span>' + esc(m.nombre) +
        '<span class="meta">' + est.nombre + "</span>" +
        '<span class="meta">' + fmtFecha(p.fecha) + " · " + p.horaInicio + "–" + p.horaFin + "</span>" +
        '<span class="meta"><b>' + cuposDisponibles(p) + " cupos libres</b></span></button>";
    });
    html += "</div>" + btnAtras(1);
  }

  if (wizard.paso === 3) {
    var p = getProg(wizard.progId);
    var m = getMed(p.medicoId), est = getEst(p.estId);
    html += '<div class="panel"><h3>' + esc(m.nombre) + " — " + getEsp(p.espId).nombre + "</h3>" +
      '<p class="sub">' + est.nombre + " · " + fmtFecha(p.fecha) + "</p>" +
      '<div class="slot-grid">';
    slotsDe(p).forEach(function (h) {
      html += '<button class="slot" onclick="selHora(\'' + h + '\')">' + h + "</button>";
    });
    html += "</div></div>" + btnAtras(2);
  }

  if (wizard.paso === 4) {
    var p2 = getProg(wizard.progId);
    var m2 = getMed(p2.medicoId), est2 = getEst(p2.estId);
    html += '<div class="panel"><h3>Confirma tu cita</h3>' +
      fila("Asegurado", currentUser.nombreCompleto) +
      fila("DNI", currentUser.dni) +
      fila("Especialidad", getEsp(p2.espId).nombre) +
      fila("Médico", m2.nombre) +
      fila("Establecimiento", est2.nombre) +
      fila("Fecha", fmtFecha(p2.fecha)) +
      fila("Hora", wizard.hora) +
      '<p class="panel-note">Al confirmar: se valida tu acreditación en RAUUS, se descuenta el cupo del catálogo digital, ' +
      "se registra en el Audit Trail y recibirás una notificación de confirmación (RN-03 / RN-04).</p>" +
      '<div class="form-actions"><button class="btn secondary" onclick="wizard.paso=3;renderWizard()">← Volver</button>' +
      '<button class="btn" onclick="confirmarCita()">Confirmar Cita ✓</button></div></div>';
  }

  if (wizard.paso === 5) {
    var c = wizard.citaCreada;
    html += '<div class="panel" style="text-align:center">' +
      '<div style="font-size:46px">✅</div><h3>¡Cita reservada con éxito!</h3>' +
      '<p class="sub">Se envió la confirmación a tus canales registrados. Recibirás un recordatorio 24 h antes.</p>' +
      '<div style="max-width:420px;margin:0 auto;text-align:left">' +
      fila("Código de cita", c.id) +
      fila("Especialidad", c.espNombre) +
      fila("Fecha y hora", fmtFecha(c.fecha) + " · " + c.hora) +
      fila("Establecimiento", c.estNombre) +
      "</div>" + qrHTML(c.id) +
      '<div class="form-actions" style="justify-content:center">' +
      '<button class="btn secondary" onclick="irA(\'mis-citas\')">Ver mis citas</button>' +
      '<button class="btn" onclick="irA(\'inicio\')">Ir al inicio</button></div></div>';
  }

  $("content").innerHTML = html;
}

function btnAtras(paso) {
  return '<div class="form-actions"><button class="btn secondary" onclick="wizard.paso=' + paso + ';renderWizard()">← Volver</button></div>';
}
function fila(k, v) { return '<div class="summary-row"><span class="k">' + k + '</span><span class="v">' + esc(v) + "</span></div>"; }

function selEsp(id) { wizard.espId = id; wizard.paso = 2; renderWizard(); }
function selProg(id) { wizard.progId = id; wizard.paso = 3; renderWizard(); }
function selHora(h) { wizard.hora = h; wizard.paso = 4; renderWizard(); }

function confirmarCita() {
  var p = getProg(wizard.progId);
  var m = getMed(p.medicoId), est = getEst(p.estId), espN = getEsp(p.espId).nombre;
  var id = nextId("C");
  DB.citas.push({ id: id, progId: p.id, aseguradoId: currentUser.id, estado: "reservada", hora: wizard.hora, canal: "digital", fechaReserva: ahoraStr() });
  guardarDB();
  auditar(currentUser.nombre, "Asegurado", "RESERVAR_CITA", "CitaMedica", espN + " · " + fmtFechaCorta(p.fecha) + " " + wizard.hora + " · " + est.nombre + " · canal digital");
  notificar(currentUser.id, "✅", "Tu cita de " + espN + " fue confirmada para el " + fmtFecha(p.fecha) + " a las " + wizard.hora + " (" + est.nombre + ").");
  wizard.citaCreada = { id: id, espNombre: espN, fecha: p.fecha, hora: wizard.hora, estNombre: est.nombre };
  wizard.paso = 5;
  actualizarCampana();
  renderWizard();
}

/* código QR simulado (determinístico según el id) */
function qrHTML(seed) {
  var html = '<div class="qr-box"><div class="qr">';
  var s = 0;
  for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  for (var c = 0; c < 441; c++) {
    s = (s * 1103515245 + 12345) >>> 0;
    html += '<i class="' + ((s >> 16) % 2 ? "on" : "") + '"></i>';
  }
  return html + '</div><span class="qr-label">Presenta este código en el módulo de admisión</span></div>';
}

/* ---------- Mis citas ---------- */
function vMisCitas() {
  var citas = DB.citas.filter(function (c) { return c.aseguradoId === currentUser.id && c.estado === "reservada"; });
  var html = "<h2>Citas Programadas</h2><p class='sub'>Puedes reprogramar o cancelar de forma autónoma (RN-02)</p>";
  if (!citas.length) {
    html += vacio("📅", "No tienes citas programadas.", "nueva-cita", "Reservar una cita");
  }
  citas.forEach(function (c) {
    var p = getProg(c.progId);
    var m = getMed(p.medicoId), est = getEst(p.estId);
    html += '<div class="panel"><h3>' + getEsp(p.espId).nombre + ' <span class="chip good">✓ Confirmada</span></h3>' +
      fila("Código", c.id) + fila("Médico", m.nombre) + fila("Establecimiento", est.nombre) +
      fila("Fecha", fmtFecha(p.fecha)) + fila("Hora", c.hora) + fila("Canal de reserva", c.canal === "digital" ? "Digital (app/web)" : "Presencial") +
      '<div class="form-actions">' +
      '<button class="btn secondary sm" onclick="reprogramar(\'' + c.id + '\')">↻ Reprogramar</button>' +
      '<button class="btn danger sm" onclick="cancelarCita(\'' + c.id + '\')">✕ Cancelar cita</button>' +
      "</div></div>";
  });
  $("content").innerHTML = html;
}

function cancelarCita(id) {
  abrirModal(
    "<h3>Cancelar cita</h3><p>¿Seguro que deseas cancelar esta cita? El cupo se liberará en el catálogo digital " +
    "y el sistema notificará a los asegurados en lista de espera (Iniciativa I5).</p>" +
    '<div class="form-actions"><button class="btn secondary" onclick="cerrarModal()">No, mantener</button>' +
    '<button class="btn danger" onclick="cancelarCitaOk(\'' + id + '\')">Sí, cancelar</button></div>'
  );
}

function cancelarCitaOk(id) {
  var c = DB.citas.find(function (x) { return x.id === id; });
  c.estado = "cancelada";
  guardarDB();
  var p = getProg(c.progId);
  auditar(currentUser.nombre, "Asegurado", "CANCELAR_CITA", "CitaMedica", getEsp(p.espId).nombre + " · " + fmtFechaCorta(p.fecha) + " " + c.hora + " · cupo liberado");
  notificar(currentUser.id, "ℹ️", "Tu cita de " + getEsp(p.espId).nombre + " del " + fmtFechaCorta(p.fecha) + " fue cancelada. El cupo fue liberado para otros asegurados.");
  cerrarModal();
  actualizarCampana();
  vMisCitas();
}

function reprogramar(id) {
  var c = DB.citas.find(function (x) { return x.id === id; });
  c.estado = "cancelada";
  guardarDB();
  var p = getProg(c.progId);
  auditar(currentUser.nombre, "Asegurado", "REPROGRAMAR_CITA", "CitaMedica", getEsp(p.espId).nombre + " · cita " + id + " liberada para nueva reserva");
  wizard = { paso: 2, espId: p.espId };
  irA("nueva-cita");
  wizard = { paso: 2, espId: p.espId };
  renderWizard();
}

/* ---------- listas informativas ---------- */
function vAtenciones() {
  var at = DB.citas.filter(function (c) { return c.aseguradoId === currentUser.id && c.estado === "atendida"; });
  var html = "<h2>Atenciones Realizadas</h2><p class='sub'>Historial sincronizado con EsSI</p>";
  if (!at.length) html += vacio("🩺", "Aún no registras atenciones.");
  at.forEach(function (c) {
    html += '<div class="panel"><h3>' + esc(c.espNombre) + ' <span class="chip neutral">Atendida</span></h3>' +
      fila("Médico", c.medNombre) + fila("Establecimiento", c.estNombre) +
      fila("Fecha", fmtFecha(c.fecha) + " · " + c.hora) +
      fila("Canal de reserva", c.canal === "digital" ? "Digital (app/web)" : "Presencial") + "</div>";
  });
  $("content").innerHTML = html;
}

function vPendientes() {
  var pd = DB.pendientes.filter(function (p) { return p.aseguradoId === currentUser.id; });
  var html = "<h2>Citas Pendientes de Programación</h2><p class='sub'>Solicitudes en cola hasta que el servicio publique agenda</p>";
  if (!pd.length) html += vacio("⏳", "No tienes solicitudes pendientes.");
  pd.forEach(function (p) {
    html += '<div class="panel"><h3>' + esc(p.espNombre) + ' <span class="chip warn">⏳ ' + p.estado + "</span></h3>" +
      fila("Origen", p.origen) + fila("Fecha de solicitud", fmtFechaCorta(p.fecha)) +
      '<p class="panel-note">Cuando el Jefe de Servicio publique disponibilidad, el sistema te asignará ' +
      "cupo automáticamente y recibirás una notificación (Iniciativa I5).</p></div>";
  });
  $("content").innerHTML = html;
}

function vRecetas() {
  var html = "<h2>Recetas</h2><p class='sub'>Recetas electrónicas emitidas en tus atenciones</p>";
  DB.recetas.forEach(function (r) {
    html += '<div class="panel"><h3>💊 ' + esc(r.med) + "</h3>" +
      fila("Indicación", r.indicacion) + fila("Médico", r.medico) + fila("Fecha de emisión", fmtFechaCorta(r.fecha)) + "</div>";
  });
  $("content").innerHTML = html;
}

function vExamenes() {
  var html = "<h2>Exámenes Auxiliares</h2><p class='sub'>Resultados de laboratorio e imágenes</p>";
  DB.examenes.forEach(function (x) {
    html += '<div class="panel"><h3>🔬 ' + esc(x.nombre) + ' <span class="chip good">✓ ' + x.estado + "</span></h3>" +
      fila("Tipo", x.tipo) + fila("Fecha", fmtFechaCorta(x.fecha)) + "</div>";
  });
  $("content").innerHTML = html;
}

function vCitt() {
  $("content").innerHTML = "<h2>Descansos Médicos - CITT</h2><p class='sub'>Certificados de Incapacidad Temporal para el Trabajo</p>" +
    vacio("📄", "No registras CITT vigentes.");
}

function vReferencias() {
  var html = "<h2>Referencias</h2><p class='sub'>Derivaciones a otros niveles de atención</p>";
  DB.referencias.forEach(function (f) {
    html += '<div class="panel"><h3>📤 ' + esc(f.destino) + ' <span class="chip good">✓ ' + f.estado + "</span></h3>" +
      fila("Motivo", f.motivo) + fila("Fecha", fmtFechaCorta(f.fecha)) + "</div>";
  });
  $("content").innerHTML = html;
}

function vPerfil() {
  var centro = getEst(currentUser.centroId);
  $("content").innerHTML = "<h2>Mi Perfil</h2><p class='sub'>Datos sincronizados desde RAUUS</p>" +
    '<div class="panel"><div class="profile-head"><span class="avatar">' + currentUser.avatar + "</span>" +
    '<div><div class="p-name">' + esc(currentUser.nombreCompleto) + '</div><div class="p-role">' + ROL_NOMBRE[currentUser.rol] + "</div></div></div>" +
    fila("DNI", currentUser.dni) +
    fila("Centro asignado", centro ? centro.nombre : "—") +
    (currentUser.vigencia ? fila("Vigencia de acreditación", currentUser.vigencia) : "") +
    (currentUser.servicio ? fila("Servicio", currentUser.servicio) : "") +
    fila("Rol del sistema (RBAC)", ROL_NOMBRE[currentUser.rol]) +
    '<p class="panel-note">Principio P2 — Gobernanza por roles: tus permisos en la plataforma están determinados por tu rol, no por discrecionalidad individual.</p></div>';
}

function vSimple() {
  var titulos = { teleeduca: ["TeleEduca", "🎓", "Contenido educativo en salud para asegurados."], riesgo: ["Riesgo Diabetes Tipo 2", "🩸", "Test de evaluación de riesgo (módulo informativo)."] };
  var t = titulos[currentView];
  $("content").innerHTML = "<h2>" + t[0] + "</h2>" + vacio(t[1], t[2] + " Módulo fuera del alcance del prototipo (ver 4.2.4 Alcance de la solución).");
}

function vacio(ico, txt, view, btnTxt) {
  return '<div class="panel"><div class="empty-state"><span class="ico">' + ico + "</span>" + txt +
    (view ? '<div class="form-actions" style="justify-content:center;margin-top:16px"><button class="btn" onclick="irA(\'' + view + '\')">' + btnTxt + "</button></div>" : "") +
    "</div></div>";
}

/* ============================================================
   VISTAS — JEFE DE SERVICIO (Programación Asistencial TO-BE)
   ============================================================ */
function misProgs() {
  return DB.programaciones.filter(function (p) { return p.medicoId === "M1"; })
    .sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
}

function vPanelJefe() {
  var progs = misProgs().filter(function (p) { return p.fecha >= iso(hoy()); });
  var totalCupos = progs.reduce(function (s, p) { return s + p.cuposTotal; }, 0);
  var reservados = progs.reduce(function (s, p) { return s + (p.cuposTotal - cuposDisponibles(p)); }, 0);
  var alertas = diasSinAgenda().length;

  $("content").innerHTML = "<h2>Panel del Jefe de Servicio</h2>" +
    "<p class='sub'>Servicio de " + currentUser.servicio + " — " + getEst(currentUser.centroId).nombre + "</p>" +
    '<div class="kpi-row">' +
    kpi("Agendas publicadas (vigentes)", progs.length, "") +
    kpi("Cupos publicados", totalCupos, "") +
    kpi("Cupos ya reservados", reservados, "") +
    kpi("Alertas de 72 h", alertas, alertas ? "down" : "up", alertas ? "Requiere acción" : "Sin pendientes") +
    "</div>" +
    tarjeta("🗓️", "Programar Disponibilidad", "irA('programar')") +
    tarjeta("📋", "Mis Programaciones", "irA('mis-programaciones')") +
    tarjeta("⏰", "Alertas 72 h", "irA('alertas-jefe')", alertas || "") +
    '<div class="arch-note"><b>TO-BE (Proceso 1):</b> la publicación de disponibilidad es obligatoria, con mínimo 72 h de anticipación (RN-01). ' +
    "Toda acción queda registrada en el Audit Trail (P3) y alimenta automáticamente el catálogo del API Gateway.</div>";
}

function vProgramar() {
  var min = iso(addDias(hoy(), 3));
  var max = iso(addDias(hoy(), 14));
  $("content").innerHTML = "<h2>Programar Disponibilidad</h2>" +
    "<p class='sub'>Registro obligatorio de agenda — Servicio de " + currentUser.servicio + " · " + getEst(currentUser.centroId).nombre + "</p>" +
    '<div class="panel"><h3>Nueva programación asistencial</h3>' +
    '<div class="form-grid">' +
    '<div class="field"><label>Fecha del turno</label><input type="date" id="f-fecha" min="' + min + '" max="' + max + '" value="' + min + '"></div>' +
    '<div class="field"><label>Hora inicio</label><input type="time" id="f-ini" value="08:00"></div>' +
    '<div class="field"><label>Hora fin</label><input type="time" id="f-fin" value="12:00"></div>' +
    '<div class="field"><label>Número de cupos</label><input type="number" id="f-cupos" min="1" max="24" value="8"></div>' +
    "</div>" +
    '<div id="f-msg"></div>' +
    '<div class="form-actions"><button class="btn" onclick="publicarProg()">Publicar en el catálogo digital ➜</button></div>' +
    '<p class="panel-note">Validación RN-01: el sistema rechaza programaciones con menos de 72 horas de anticipación. ' +
    "La publicación queda auditada (usuario, fecha, cupos) y visible al instante para los asegurados.</p></div>";
}

function publicarProg() {
  var fecha = $("f-fecha").value, ini = $("f-ini").value, fin = $("f-fin").value, cupos = parseInt($("f-cupos").value, 10);
  var msg = $("f-msg");

  if (!fecha || !ini || !fin || !cupos || cupos < 1) {
    msg.innerHTML = '<div class="form-error">⚠ Completa todos los campos de la programación.</div>'; return;
  }
  var limite = addDias(hoy(), 3);
  if (new Date(fecha + "T00:00:00") < limite) {
    msg.innerHTML = '<div class="form-error">⚠ <b>Validación RN-01:</b> la agenda debe publicarse con al menos 72 horas de anticipación. ' +
      "Selecciona una fecha desde el " + fmtFechaCorta(iso(limite)) + ". Este intento queda registrado en auditoría.</div>";
    auditar(currentUser.nombre, "Jefe de Servicio", "RECHAZO_VALIDACION_72H", "ProgramacionAsistencial", "Intento de publicar agenda para " + fmtFechaCorta(fecha) + " (fuera de plazo RN-01)");
    return;
  }
  if (fin <= ini) {
    msg.innerHTML = '<div class="form-error">⚠ La hora de fin debe ser mayor a la hora de inicio.</div>'; return;
  }

  DB.programaciones.push({
    id: nextId("P"), medicoId: "M1", estId: currentUser.centroId, espId: "S1",
    fecha: fecha, horaInicio: ini, horaFin: fin, cuposTotal: cupos,
    estado: "publicada", creadoPor: currentUser.nombreCompleto, fechaCreacion: ahoraStr()
  });
  guardarDB();
  auditar(currentUser.nombre, "Jefe de Servicio", "PUBLICAR_PROGRAMACION", "ProgramacionAsistencial",
    currentUser.servicio + " · " + getEst(currentUser.centroId).nombre + " · " + cupos + " cupos · " + fmtFechaCorta(fecha) + " " + ini + "–" + fin);
  notificar("U3", "📈", getEst(currentUser.centroId).nombre + " publicó " + cupos + " cupos de " + currentUser.servicio + " para el " + fmtFechaCorta(fecha) + ".");
  msg.innerHTML = '<div class="form-ok">✓ Agenda publicada en el catálogo digital. Los asegurados ya pueden reservar estos cupos desde la app y la web. ' +
    "Acción registrada en el Audit Trail.</div>";
  actualizarCampana();
}

function vMisProgramaciones() {
  var progs = misProgs();
  var html = "<h2>Mis Programaciones</h2><p class='sub'>Agendas publicadas en el catálogo digital</p>" +
    '<div class="panel"><div class="table-wrap"><table class="tbl"><thead><tr>' +
    "<th>Fecha</th><th>Horario</th><th class='num'>Cupos</th><th class='num'>Reservados</th><th class='num'>Libres</th><th>Estado</th><th>Publicada</th>" +
    "</tr></thead><tbody>";
  progs.forEach(function (p) {
    var libres = cuposDisponibles(p);
    var reservados = p.cuposTotal - libres;
    var pasada = p.fecha < iso(hoy());
    html += "<tr><td>" + fmtFechaCorta(p.fecha) + "</td><td>" + p.horaInicio + "–" + p.horaFin + "</td>" +
      "<td class='num'>" + p.cuposTotal + "</td><td class='num'>" + reservados + "</td><td class='num'>" + libres + "</td>" +
      "<td>" + (pasada ? '<span class="chip neutral">Cerrada</span>' : '<span class="chip good">✓ Publicada</span>') + "</td>" +
      "<td>" + esc(p.fechaCreacion) + "</td></tr>";
  });
  html += "</tbody></table></div></div>";
  $("content").innerHTML = html;
}

function diasSinAgenda() {
  // días hábiles dentro de la ventana de 72 h – 7 días sin agenda publicada del servicio
  var faltantes = [];
  var progs = misProgs();
  for (var d = 3; d <= 7; d++) {
    var f = addDias(hoy(), d);
    if (f.getDay() === 0 || f.getDay() === 6) continue;
    var hay = progs.some(function (p) { return p.fecha === iso(f) && p.estado === "publicada"; });
    if (!hay) faltantes.push(iso(f));
  }
  return faltantes;
}

function vAlertasJefe() {
  var faltantes = diasSinAgenda();
  var html = "<h2>Alertas 72 h</h2><p class='sub'>Módulo de Alertas de Gobernanza — ventana obligatoria de publicación (RN-01)</p>";
  if (!faltantes.length) {
    html += '<div class="alert-item good"><span class="ico">✅</span><div><b>Sin pendientes</b>Tu servicio tiene agenda publicada para todos los días hábiles de la ventana de 72 h.</div></div>';
  } else {
    faltantes.forEach(function (f) {
      html += '<div class="alert-item warn"><span class="ico">⏰</span><div><b>Agenda pendiente — ' + fmtFecha(f) + "</b>" +
        "No has publicado disponibilidad para este día. Si no la registras, se notificará al coordinador de la red asistencial.</div></div>";
    });
    html += '<div class="form-actions"><button class="btn" onclick="irA(\'programar\')">Publicar agenda ahora ➜</button></div>';
  }
  $("content").innerHTML = html;
}

/* ============================================================
   VISTAS — GERENCIA (Dashboard de Monitoreo Digital)
   ============================================================ */
function kpi(label, value, deltaDir, deltaTxt) {
  return '<div class="kpi"><div class="k-label">' + label + '</div><div class="k-value">' + value + "</div>" +
    (deltaTxt ? '<div class="k-delta ' + (deltaDir || "") + '">' + deltaTxt + "</div>" : "") + "</div>";
}

function vDashboard() {
  var d = DB.dashboard;
  var totalDig = d.digital[d.digital.length - 1];
  var totalPres = d.presencial[d.presencial.length - 1];
  var pctDigital = Math.round(totalDig / (totalDig + totalPres) * 100);
  var promAdopcion = Math.round(d.adopcion.reduce(function (s, a) { return s + a.pct; }, 0) / d.adopcion.length);
  var bajo70 = d.adopcion.filter(function (a) { return a.pct < 70; }).length;

  var html = "<h2>Dashboard de Monitoreo Digital</h2>" +
    "<p class='sub'>Tasa de adopción del canal digital — Red Lima (piloto) · datos simulados sobre AWS QuickSight/CloudWatch</p>" +
    '<div class="kpi-row">' +
    kpi("Tasa de publicación digital", promAdopcion + "%", "up", "▲ +23 pts vs. inicio del piloto") +
    kpi("Citas por canal digital", pctDigital + "%", "up", "▲ Meta Fase 2: 70%") +
    kpi("Tiempo de espera promedio", "18 días", "up", "▼ desde 45 días (AS-IS)") +
    kpi("Establecimientos < 70%", bajo70, bajo70 ? "down" : "up", bajo70 ? "⚠ Ver alertas de gobernanza" : "Todos en meta") +
    "</div>";

  /* --- Gráfico 1: barras horizontales — % publicación por establecimiento --- */
  html += '<div class="panel"><h3>Tasa de publicación digital por establecimiento (últimos 7 días)</h3><div class="chart-block">' +
    barrasHorizontales(d.adopcion) + "</div>" +
    '<p class="panel-note">% de la oferta asistencial semanal publicada en el catálogo digital. Meta institucional: 70% (línea punteada).</p></div>';

  /* --- Gráfico 2: barras agrupadas — citas por canal, 6 meses --- */
  html += '<div class="panel"><h3>Citas reservadas por canal (miles, últimos 6 meses)</h3>' +
    '<div class="chart-legend">' +
    '<span class="lg"><span class="sw" style="background:#0899AE"></span>Canal digital</span>' +
    '<span class="lg"><span class="sw" style="background:#C2571A"></span>Canal presencial</span></div>' +
    '<div class="chart-block">' + barrasAgrupadas(d) + "</div>" +
    '<p class="panel-note">La migración del canal presencial al digital refleja el avance de la Fase de Transición 1 (plan de migración, sección 4.7).</p></div>';

  /* --- Tabla accesible con los mismos datos --- */
  html += '<div class="panel"><h3>Detalle por establecimiento</h3><div class="table-wrap"><table class="tbl"><thead><tr>' +
    "<th>Establecimiento</th><th>Red</th><th class='num'>Oferta semanal</th><th class='num'>% publicado</th><th>Cumplimiento</th></tr></thead><tbody>";
  d.adopcion.forEach(function (a) {
    var e = getEst(a.estId);
    var chip = a.pct >= 70 ? '<span class="chip good">✓ En meta</span>'
      : (a.pct >= 55 ? '<span class="chip warn">⚠ En riesgo</span>' : '<span class="chip crit">✕ Crítico</span>');
    html += "<tr><td>" + e.nombre + "</td><td>" + e.red + "</td><td class='num'>" + e.ofertaSemanal +
      "</td><td class='num'>" + a.pct + "%</td><td>" + chip + "</td></tr>";
  });
  html += "</tbody></table></div></div>" +
    '<div class="arch-note"><b>Iniciativa I3:</b> este tablero corresponde al "Core de Alertas Tempranas de Incumplimiento y Dashboards Gerenciales" ' +
    "(Fase E) — mide en tiempo real la tasa de digitalización de cupos por establecimiento piloto de Lima.</div>";

  $("content").innerHTML = html;
  activarTooltips();
}

/* Barras horizontales SVG — un solo tono (magnitud) + meta 70% */
function barrasHorizontales(adopcion) {
  var W = 720, rowH = 38, padL = 190, padR = 56, padT = 8;
  var H = padT + adopcion.length * rowH + 26;
  var maxW = W - padL - padR;
  var metaX = padL + maxW * 0.7;

  var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Tasa de publicación digital por establecimiento">';
  // rejilla recesiva
  [0, 25, 50, 75, 100].forEach(function (t) {
    var x = padL + maxW * t / 100;
    s += '<line x1="' + x + '" y1="' + padT + '" x2="' + x + '" y2="' + (H - 24) + '" stroke="#E4EAED" stroke-width="1"/>';
    s += '<text x="' + x + '" y="' + (H - 8) + '" font-size="11" fill="#8A97A0" text-anchor="middle">' + t + "%</text>";
  });
  // línea de meta
  s += '<line x1="' + metaX + '" y1="' + padT + '" x2="' + metaX + '" y2="' + (H - 24) + '" stroke="#51606A" stroke-width="1.5" stroke-dasharray="4 4"/>';
  s += '<text x="' + (metaX + 4) + '" y="' + (padT + 10) + '" font-size="10.5" fill="#51606A">Meta 70%</text>';

  adopcion.forEach(function (a, i) {
    var e = getEst(a.estId);
    var y = padT + i * rowH + 8;
    var bw = maxW * a.pct / 100;
    s += '<text x="' + (padL - 10) + '" y="' + (y + 14) + '" font-size="12" fill="#22333B" text-anchor="end">' + e.nombre + "</text>";
    s += '<rect x="' + padL + '" y="' + y + '" width="' + bw + '" height="20" rx="4" fill="#0899AE" ' +
      'data-tip="<b>' + e.nombre + "</b><br>" + a.pct + "% de oferta publicada<br>Red: " + e.red + '"/>';
    s += '<text x="' + (padL + bw + 8) + '" y="' + (y + 14) + '" font-size="12" font-weight="600" fill="#22333B">' + a.pct + "%</text>";
  });
  return s + "</svg>";
}

/* Barras agrupadas SVG — 2 series (digital / presencial) */
function barrasAgrupadas(d) {
  var W = 720, H = 250, padL = 44, padB = 30, padT = 14, padR = 10;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  var maxV = 60;
  var n = d.meses.length;
  var grupoW = plotW / n;
  var barW = Math.min(26, grupoW / 3);

  var s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Citas por canal, últimos 6 meses">';
  [0, 20, 40, 60].forEach(function (t) {
    var y = padT + plotH - plotH * t / maxV;
    s += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="#E4EAED" stroke-width="1"/>';
    s += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" font-size="11" fill="#8A97A0" text-anchor="end">' + t + "</text>";
  });

  d.meses.forEach(function (mes, i) {
    var cx = padL + grupoW * i + grupoW / 2;
    var hDig = plotH * d.digital[i] / maxV;
    var hPre = plotH * d.presencial[i] / maxV;
    // 2px de separación entre barras del grupo
    s += '<rect x="' + (cx - barW - 1) + '" y="' + (padT + plotH - hDig) + '" width="' + barW + '" height="' + hDig + '" rx="4" fill="#0899AE" ' +
      'data-tip="<b>' + mes + "</b><br>Digital: " + d.digital[i] + ' mil citas"/>';
    s += '<rect x="' + (cx + 1) + '" y="' + (padT + plotH - hPre) + '" width="' + barW + '" height="' + hPre + '" rx="4" fill="#C2571A" ' +
      'data-tip="<b>' + mes + "</b><br>Presencial: " + d.presencial[i] + ' mil citas"/>';
    s += '<text x="' + cx + '" y="' + (H - 10) + '" font-size="12" fill="#51606A" text-anchor="middle">' + mes + "</text>";
  });
  return s + "</svg>";
}

/* tooltips de gráficos */
function activarTooltips() {
  var tip = $("chart-tooltip");
  document.querySelectorAll("svg.chart rect[data-tip]").forEach(function (r) {
    r.addEventListener("mousemove", function (ev) {
      tip.innerHTML = r.getAttribute("data-tip");
      tip.classList.remove("hidden");
      tip.style.left = Math.min(ev.clientX + 14, window.innerWidth - 260) + "px";
      tip.style.top = (ev.clientY + 14) + "px";
    });
    r.addEventListener("mouseleave", function () { tip.classList.add("hidden"); });
  });
}

/* ---------- Auditoría ---------- */
function vAuditoria() {
  var html = "<h2>Auditoría — Audit Trail</h2>" +
    "<p class='sub'>Registro inmutable de transacciones de negocio (P3) · simulación de Amazon DynamoDB</p>" +
    '<div class="panel"><div class="form-grid" style="margin-bottom:14px">' +
    '<div class="field"><label>Filtrar por acción</label><select id="aud-filtro" onchange="renderAuditoria()">' +
    '<option value="">Todas las acciones</option>' +
    '<option>PUBLICAR_PROGRAMACION</option><option>RESERVAR_CITA</option><option>CANCELAR_CITA</option>' +
    '<option>REPROGRAMAR_CITA</option><option>ALERTA_INCUMPLIMIENTO</option><option>RECHAZO_VALIDACION_72H</option><option>INICIAR_SESION</option>' +
    "</select></div></div>" +
    '<div class="table-wrap"><table class="tbl"><thead><tr>' +
    "<th>Fecha / hora</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Entidad</th><th>Detalle</th>" +
    '</tr></thead><tbody id="aud-body"></tbody></table></div>' +
    '<p class="panel-note">Cada registro guarda usuario, rol, marca de tiempo y detalle de la transacción (RN-03). En la arquitectura TO-BE este repositorio es NoSQL, independiente de la base transaccional.</p></div>';
  $("content").innerHTML = html;
  renderAuditoria();
}

function renderAuditoria() {
  var f = $("aud-filtro").value;
  var rows = DB.auditoria.filter(function (a) { return !f || a.accion === f; });
  var html = "";
  rows.slice(0, 60).forEach(function (a) {
    var chipCls = a.accion.indexOf("ALERTA") === 0 || a.accion.indexOf("RECHAZO") === 0 ? "crit"
      : (a.accion === "RESERVAR_CITA" || a.accion === "PUBLICAR_PROGRAMACION" ? "good" : "info");
    html += "<tr><td>" + esc(a.ts) + "</td><td>" + esc(a.usuario) + "</td><td>" + esc(a.rol) + "</td>" +
      '<td><span class="chip ' + chipCls + '">' + a.accion + "</span></td><td>" + esc(a.entidad) + "</td><td>" + esc(a.detalle) + "</td></tr>";
  });
  $("aud-body").innerHTML = html || '<tr><td colspan="6" class="empty-state">Sin registros para este filtro.</td></tr>';
}

/* ---------- Alertas de gobernanza ---------- */
function vAlertasGob() {
  var d = DB.dashboard;
  var html = "<h2>Alertas de Gobernanza</h2>" +
    "<p class='sub'>Módulo de alertas automáticas ante incumplimiento de publicación (AWS Lambda + SNS/SES — simulado)</p>";
  d.adopcion.forEach(function (a) {
    var e = getEst(a.estId);
    if (a.pct < 55) {
      html += '<div class="alert-item crit"><span class="ico">🚨</span><div><b>' + e.nombre + " — " + a.pct + "% de publicación digital</b>" +
        "Incumplimiento crítico de la directiva de programación asistencial. Se notificó al coordinador de la " + e.red + " y a la Gerencia de Prestaciones de Salud.</div></div>";
    } else if (a.pct < 70) {
      html += '<div class="alert-item warn"><span class="ico">⚠️</span><div><b>' + e.nombre + " — " + a.pct + "% de publicación digital</b>" +
        "Por debajo de la meta institucional (70%). Alerta preventiva enviada al jefe de la red asistencial.</div></div>";
    }
  });
  html += '<div class="alert-item good"><span class="ico">✅</span><div><b>Resto de la red en meta</b>' +
    "Los demás establecimientos del piloto superan el 70% de publicación digital.</div></div>" +
    '<div class="arch-note"><b>Principio P1:</b> la disponibilidad se publica únicamente por el canal digital institucional. ' +
    "Estas alertas hacen visible y auditable el incumplimiento, cerrando la brecha de gobernanza identificada en el AS-IS.</div>";
  $("content").innerHTML = html;
}

/* ============================================================
   NOTIFICACIONES / MODAL / ARRANQUE
   ============================================================ */
function actualizarCampana() {
  var n = DB.notificaciones.filter(function (x) { return x.userId === currentUser.id && !x.leida; }).length;
  $("bell-count").textContent = n;
  $("bell-count").classList.toggle("hidden", n === 0);
}

function toggleNotifs() {
  var panel = $("notif-panel");
  if (!panel.classList.contains("hidden")) { panel.classList.add("hidden"); return; }
  var lista = DB.notificaciones.filter(function (x) { return x.userId === currentUser.id; });
  var html = "";
  lista.slice(0, 12).forEach(function (x) {
    html += '<div class="notif-item ' + (x.leida ? "" : "unread") + '"><span class="ico">' + x.ico + "</span>" +
      "<div>" + esc(x.msg) + '<div class="t">' + esc(x.ts) + "</div></div></div>";
  });
  $("notif-list").innerHTML = html || '<div class="notif-empty">No tienes notificaciones.</div>';
  panel.classList.remove("hidden");
}

function marcarLeidas() {
  DB.notificaciones.forEach(function (x) { if (x.userId === currentUser.id) x.leida = true; });
  guardarDB();
  actualizarCampana();
  toggleNotifs(); toggleNotifs(); // re-render
}

function abrirModal(html) { $("modal-box").innerHTML = html; $("modal-overlay").classList.remove("hidden"); }
function cerrarModal() { $("modal-overlay").classList.add("hidden"); }

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", function () {
  cargarDB();
  renderLogin();
  $("btn-logout").addEventListener("click", logout);
  $("btn-bell").addEventListener("click", toggleNotifs);
  $("btn-notif-read").addEventListener("click", marcarLeidas);
  $("menu-toggle").addEventListener("click", function () { $("sidebar").classList.toggle("open"); });
  $("btn-reset-demo").addEventListener("click", function () { resetDB(); renderLogin(); alert("Datos de demostración restablecidos."); });
  $("modal-overlay").addEventListener("click", function (e) { if (e.target === this) cerrarModal(); });
  document.addEventListener("click", function (e) {
    if (!$("notif-panel").classList.contains("hidden") &&
        !$("notif-panel").contains(e.target) && e.target !== $("btn-bell") && !$("btn-bell").contains(e.target)) {
      $("notif-panel").classList.add("hidden");
    }
  });
});
