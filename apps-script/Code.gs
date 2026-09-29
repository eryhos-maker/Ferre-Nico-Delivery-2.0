/**
 * API Ferre Nico Delivery 3.0 — Ferre Don Nico
 * ---------------------------------------------
 * Conecta la app directamente con esta hoja de Google Sheets (sin SheetDB).
 * Calcula el costo de envío tipo Uber (banderazo + km + minutos) con las
 * rutas de Google Maps (servicio incluido en Apps Script), guarda pedidos, embarques, evidencias (fotos en Drive)
 * y valida las claves de autorización del lado del servidor.
 *
 * Instalación (una sola vez) — ver README.md, sección "Guía de instalación":
 *   1. En la hoja nueva: Extensiones > Apps Script. Borra lo que haya y pega este archivo.
 *   2. Selecciona la función "setup" y presiona Ejecutar (acepta los permisos).
 *      Crea las pestañas, tarifas y comunidades, y genera la clave API_KEY
 *      (aparece en el Registro de ejecución; va en VITE_SHEETS_API_KEY).
 *   3. (Opcional) La clave queda en Configuración del proyecto > Propiedades del script.
 *   4. En la pestaña "Autorizadores" cambia los PIN de cada persona.
 *   5. Implementar > Nueva implementación > Tipo: Aplicación web
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier usuario
 *   6. Copia la URL que termina en /exec y ponla en VITE_SHEETS_API_URL (Cloudflare Pages).
 *
 * Si cambias este código después: Implementar > Administrar implementaciones >
 * Editar (lápiz) > Versión: Nueva versión (así la URL no cambia).
 */

var SHEETS = {
  PEDIDOS: 'Pedidos',
  EMBARQUES: 'Embarques',
  EVIDENCIAS: 'Evidencias',
  TARIFAS: 'Tarifas',
  VEHICULOS: 'Vehiculos',
  COMUNIDADES: 'Comunidades',
  AUTORIZADORES: 'Autorizadores',
  BITACORA: 'Bitacora'
};

var HEADERS = {
  Pedidos: ['folio', 'fecha_creacion', 'no_ticket', 'no_vendedor', 'nombre_cliente', 'telefono',
    'direccion', 'comunidad', 'lat', 'lng', 'km', 'minutos', 'ruta_manual', 'monto_de_compra', 'unidades',
    'unidad_requerida', 'factor_unidad', 'urgente', 'zona_dificil', 'envio_calculado', 'descuento',
    'extras', 'costo_de_envio', 'ajuste_motivo', 'autorizo', 'precio_tabla', 'estado', 'intentos',
    'updated_at'],
  Embarques: ['folio', 'fecha', 'vehiculo_id', 'unidad', 'placas', 'chofer'],
  Evidencias: ['folio', 'fecha', 'resultado', 'motivo', 'recibio', 'foto_url', 'lat', 'lng'],
  Tarifas: ['clave', 'valor', 'descripcion'],
  Vehiculos: ['id', 'unidad', 'placas', 'factor', 'activo'],
  Comunidades: ['cp', 'comunidad', 'km_tabla', 'min_tabla', 'precio_tabla', 'lat', 'lng', 'nota'],
  Autorizadores: ['nombre', 'pin', 'activo'],
  Bitacora: ['fecha', 'folio', 'accion', 'detalle', 'autorizo']
};

var TARIFAS_DEFAULT = [
  ['origen_lat', 19.9506, 'Latitud de la tienda (punto de salida)'],
  ['origen_lng', -99.5309, 'Longitud de la tienda (punto de salida)'],
  ['banderazo', 10, 'Cargo fijo por envío ($)'],
  ['precio_km', 2.6, 'Precio por kilómetro de ruta ($)'],
  ['precio_min', 2.5, 'Precio por minuto de manejo ($)'],
  ['minimo', 35, 'Cobro mínimo de envío ($)'],
  ['redondeo', 5, 'Redondear el total a múltiplos de ($)'],
  ['max_km', 60, 'Distancia máxima sin autorización (km)'],
  ['urgente', 50, 'Cargo extra por entrega urgente / mismo día ($)'],
  ['zona_dificil', 30, 'Cargo extra por zona de difícil acceso ($)'],
  ['gratis_monto', 5000, 'Envío gratis en compras desde ($)'],
  ['gratis_km', 10, '...siempre que la ruta sea de hasta (km)'],
  ['desc_monto', 1500, 'Descuento en el envío en compras desde ($)'],
  ['desc_pct', 50, 'Porcentaje de descuento en el envío (%)']
];

// Tabla actual de la compañía (referencia). lat/lng se llenan solas al usarse.
var COMUNIDADES_DEFAULT = [
  ['54240', 'Centro', 3, 10, 35, '', '', ''],
  ['54253', 'Coscomate del Progreso', 4, 10, 50, '', '', ''],
  ['54253', 'Denjhi', 5, 15, 60, '', '', ''],
  ['54253', 'Dexcani Alto', 7, 18, 65, '', '', ''],
  ['54253', 'Dexcani Bajo', 4, 10, 50, '', '', ''],
  ['54253', 'Ejido de Coscomate', 4, 10, 50, '', '', ''],
  ['54253', 'El Huisache (Tercera Manzana de Dexcani Alto)', 6, 15, 65, '', '', ''],
  ['54253', 'La Manzanilla (Tercera Manzana de Dexcani Bajo)', 5, 15, 60, '', '', ''],
  ['54253', 'La Merced', 2, 8, 35, '', '', ''],
  ['54254', 'Danxho', 12, 25, 80, '', '', ''],
  ['54254', 'Doxhicho', 7, 18, 65, '', '', ''],
  ['54254', 'Ejido de Jilotepec', 8, 20, 75, '', '', ''],
  ['54255', 'Ejido de Octeyuco', 8, 20, 75, '', '', ''],
  ['54255', 'El Barrete', 10, 22, 70, '', '', ''],
  ['54255', 'El Durazno de Cuauhtémoc', 9, 25, 80, '', '', ''],
  ['54255', 'El Magueyal', 4.5, 11, 60, '', '', ''],
  ['54255', 'Las Manzanas', 4, 10, 40, '', '', 'Precio distinto a comunidades con los mismos km'],
  ['54255', 'Magueycitos', 14, 35, 80, '', '', 'Mismos km/tiempo que Xhimojay ($130)'],
  ['54255', 'Octeyuco 2000', 7, 18, 65, '', '', ''],
  ['54255', 'San Lorenzo Octeyuco', 8, 20, 75, '', '', ''],
  ['54255', 'Xhimojay', 14, 35, 130, '', '', 'Mismos km/tiempo que Magueycitos ($80)'],
  ['54256', 'Agua Escondida', 9, 20, 75, '', '', ''],
  ['54256', 'Huertas', 4.5, 12, 55, '', '', ''],
  ['54256', 'Santa Martha de la Cruz', 7.5, 18, 65, '', '', ''],
  ['54256', 'Xhixhata', 5, 15, 60, '', '', ''],
  ['54257', 'El Xhitey', 5.5, 15, 60, '', '', ''],
  ['54257', 'Javier Barrios', 2, 10, 35, '', '', ''],
  ['54257', 'La Cruz de Dendho', 1.5, 8, 35, '', '', ''],
  ['54257', 'Parque Industrial Jilotepec', 3.5, 12, 40, '', '', ''],
  ['54260', 'Bosque de Canalejas Sexta Manzana', 13, 30, 140, '', '', ''],
  ['54260', 'Buena Vista', 12, 25, 130, '', '', 'Canalejas (10 km) cobra $75'],
  ['54260', 'Canalejas', 10, 20, 75, '', '', ''],
  ['54263', 'Aldama', 20, 40, 160, '', '', ''],
  ['54263', 'El Rincón', 18, 35, 150, '', '', ''],
  ['54263', 'La Huracha', 13, 30, 140, '', '', ''],
  ['54263', 'Llano Grande', 15, 30, 140, '', '', ''],
  ['54263', 'Teupan (Piedras Negras)', 20, 40, 170, '', '', ''],
  ['54264', 'El Majuay', 25, 42, 155, '', '', ''],
  ['54264', 'El Saltillo', 23, 40, 155, '', '', ''],
  ['54265', 'Calpulalpan (Primera Manzana Centro)', 20, 35, 170, '', '', ''],
  ['54265', 'La Comunidad', 20, 35, 170, '', '', ''],
  ['54265', 'San Vicente (Calpulalpan Tercera Manzana)', 21, 35, 170, '', '', ''],
  ['54270', 'San Martín Tuchicuitlapilco', 30, 40, 220, '', '', 'Tecolapan (30 km) cobra $170'],
  ['54270', 'San Miguel de La Victoria', 25, 28, 150, '', '', ''],
  ['54270', 'Tecolapan', 30, 40, 170, '', '', ''],
  ['54273', 'El Rosal', 35, 35, 165, '', '', ''],
  ['54273', 'Dedeni Dolores', 33, 30, 160, '', '', ''],
  ['54273', 'La Maqueda (Ejido de San Lorenzo Nenamicoyan)', 31, 30, 160, '', '', ''],
  ['54273', 'Mataxhi', 45, 43, 230, '', '', ''],
  ['54273', 'San Ignacio de Loyola (San Ignacio)', 59, 50, 250, '', '', ''],
  ['54273', 'San Lorenzo Nenamicoyan', 36, 35, 260, '', '', 'El Rosal (35 km) cobra $165'],
  ['54274', 'San Juan Acazuchitlán (San Juanico)', 43, 41, 220, '', '', ''],
  ['54275', 'Emiliano Zapata', 38, 40, 210, '', '', ''],
  ['54275', 'El Durazno de Guerrero', 38, 40, 210, '', '', ''],
  ['54275', 'Santiago Oxthoc', 30, 38, 200, '', '', ''],
  ['54276', 'Ejido de Acazuchitlán', 40, 45, 220, '', '', ''],
  ['54250', 'San Pablo Huantepec', 38, 20, 65, '', '', 'REVISAR: km o precio no cuadran'],
  ['54250', 'Ojo de Agua', 38, 30, 70, '', '', 'REVISAR: km o precio no cuadran'],
  ['54250', 'Potrero Nuevo', 30, 38, 75, '', '', 'REVISAR: km o precio no cuadran']
];

var ESTADOS = {
  PENDIENTE: 'Pendiente',
  TRANSITO: 'En Tránsito',
  ENTREGADO: 'Entregado',
  NO_ENCONTRADO: 'No Encontrado',
  CANCELADO: 'Cancelado'
};

/* ------------------------------------------------------------------ */
/* Instalación                                                        */
/* ------------------------------------------------------------------ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    ensureHeaders_(sh, HEADERS[name]);
  });
  seedIfEmpty_(SHEETS.TARIFAS, TARIFAS_DEFAULT);
  seedIfEmpty_(SHEETS.COMUNIDADES, COMUNIDADES_DEFAULT);
  seedIfEmpty_(SHEETS.AUTORIZADORES, [
    ['Eryho', 'CAMBIAR-1', 'SI'],
    ['Itzel', 'CAMBIAR-2', 'SI'],
    ['Belén', 'CAMBIAR-3', 'SI']
  ]);
  var first = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  // Columnas de texto para que Sheets no convierta teléfonos, folios o PIN en números.
  textColumns_(SHEETS.PEDIDOS, ['folio', 'no_ticket', 'no_vendedor', 'telefono']);
  textColumns_(SHEETS.AUTORIZADORES, ['pin']);
  getEvidenceFolder_();
  // Clave de conexión app ↔ hoja: se genera sola la primera vez.
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_KEY')) props.setProperty('API_KEY', 'FDN-' + Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  var msg = 'Listo: pestañas creadas. Copia esta clave en VITE_SHEETS_API_KEY (Cloudflare): ' + props.getProperty('API_KEY');
  Logger.log(msg);
  return msg;
}

function ensureHeaders_(sh, headers) {
  var lastCol = sh.getLastColumn();
  var current = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  headers.forEach(function (h) {
    if (current.indexOf(h) === -1) {
      current.push(h);
      sh.getRange(1, current.length).setValue(h);
    }
  });
  sh.getRange(1, 1, 1, current.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

function seedIfEmpty_(name, rows) {
  var sh = sheet_(name);
  if (sh.getLastRow() > 1 || !rows.length) return;
  sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function textColumns_(name, cols) {
  var sh = sheet_(name);
  var headers = headers_(sh);
  cols.forEach(function (c) {
    var idx = headers.indexOf(c);
    if (idx > -1) sh.getRange(2, idx + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
}

/* ------------------------------------------------------------------ */
/* Entrada HTTP                                                        */
/* ------------------------------------------------------------------ */

function doGet(e) {
  return handle_((e && e.parameter) || {});
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida' });
  }
  return handle_(body);
}

function handle_(p) {
  try {
    if (!p.key || p.key !== PropertiesService.getScriptProperties().getProperty('API_KEY')) {
      return json_({ ok: false, error: 'Clave de acceso inválida' });
    }
    var routes = {
      ping: function () { return 'ok'; },
      config: function () { return getConfig_(); },
      geocode: function () { return geocode_(p.text); },
      locateCommunity: function () { return locateCommunity_(p.comunidad); },
      quote: function () { return quote_(p.input || {}); },
      createOrder: function () { return withLock_(function () { return createOrder_(p.data || {}, p.auth); }); },
      orders: function () { return listOrders_(p.estado); },
      ship: function () { return withLock_(function () { return ship_(p.data || {}); }); },
      deliver: function () { return withLock_(function () { return deliver_(p.data || {}); }); },
      fail: function () { return withLock_(function () { return fail_(p.data || {}); }); },
      reschedule: function () { return withLock_(function () { return reschedule_(p.folio); }); },
      cancel: function () { return withLock_(function () { return cancel_(p.folio, p.motivo, p.auth); }); },
      login: function () { return login_(p.auth); },
      adminData: function () { requireToken_(p.token); return adminData_(); },
      updateOrder: function () {
        var who = requireToken_(p.token);
        return withLock_(function () { return adminUpdate_(p.folio, p.data || {}, who); });
      },
      deleteOrder: function () {
        var who = requireToken_(p.token);
        return withLock_(function () { return adminDelete_(p.folio, who); });
      }
    };
    var fn = routes[p.action];
    if (!fn) return json_({ ok: false, error: 'Acción no válida: ' + p.action });
    return json_({ ok: true, data: fn() });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ------------------------------------------------------------------ */
/* Utilidades de hoja                                                  */
/* ------------------------------------------------------------------ */

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('No existe la pestaña "' + name + '". Ejecuta setup() en Apps Script.');
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function readSheet_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(String);
  return values.slice(1).filter(function (r) {
    return r.some(function (c) { return c !== '' && c !== null; });
  }).map(function (r, i) {
    var o = { _row: i + 2 };
    headers.forEach(function (h, j) {
      var v = r[j];
      o[h] = v instanceof Date ? v.toISOString() : v;
    });
    return o;
  });
}

function appendRow_(name, obj) {
  var sh = sheet_(name);
  var headers = headers_(sh);
  sh.appendRow(headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

function updateRow_(name, row, changes) {
  var sh = sheet_(name);
  var headers = headers_(sh);
  Object.keys(changes).forEach(function (k) {
    var idx = headers.indexOf(k);
    if (idx > -1) sh.getRange(row, idx + 1).setValue(changes[k]);
  });
}

function findOrder_(folio) {
  if (!folio) throw new Error('Falta el folio');
  var list = readSheet_(SHEETS.PEDIDOS);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].folio) === String(folio)) return list[i];
  }
  throw new Error('No se encontró el pedido ' + folio);
}

function log_(folio, accion, detalle, autorizo) {
  appendRow_(SHEETS.BITACORA, {
    fecha: new Date(), folio: folio || '', accion: accion, detalle: detalle || '', autorizo: autorizo || ''
  });
}

function num_(v, d) {
  var n = parseFloat(v);
  return isNaN(n) ? (d === undefined ? 0 : d) : n;
}

function yes_(v) {
  var s = String(v).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || v === true;
}

/* ------------------------------------------------------------------ */
/* Configuración y tarifa                                              */
/* ------------------------------------------------------------------ */

function getTarifas_() {
  var t = {};
  readSheet_(SHEETS.TARIFAS).forEach(function (r) { t[String(r.clave).trim()] = num_(r.valor); });
  TARIFAS_DEFAULT.forEach(function (d) { if (t[d[0]] === undefined) t[d[0]] = d[1]; });
  return t;
}

function getConfig_() {
  return {
    tarifas: getTarifas_(),
    vehiculos: readSheet_(SHEETS.VEHICULOS).filter(function (v) { return yes_(v.activo); }).map(function (v) {
      return { id: String(v.id), unidad: String(v.unidad), placas: String(v.placas || ''), factor: num_(v.factor, 1) || 1 };
    }),
    comunidades: readSheet_(SHEETS.COMUNIDADES).map(function (c) {
      return {
        cp: String(c.cp), comunidad: String(c.comunidad), km_tabla: num_(c.km_tabla), min_tabla: num_(c.min_tabla),
        precio_tabla: num_(c.precio_tabla), lat: c.lat === '' ? null : num_(c.lat), lng: c.lng === '' ? null : num_(c.lng),
        nota: String(c.nota || '')
      };
    }),
    autorizadores: readSheet_(SHEETS.AUTORIZADORES).filter(function (a) { return yes_(a.activo); })
      .map(function (a) { return String(a.nombre); })
  };
}

/**
 * Fórmula de cobro. Función pura: la misma que se prueba fuera de Apps Script.
 * input: { km, minutos, monto_compra, factor, urgente, zona_dificil }
 */
function computePrice(t, input) {
  var km = num_(input.km), min = num_(input.minutos), compra = num_(input.monto_compra);
  var factor = num_(input.factor, 1) || 1;
  var round = function (v) { var r = t.redondeo || 1; return Math.round(v / r) * r; };

  var viaje = t.banderazo + km * t.precio_km + min * t.precio_min;
  var base = Math.max(t.minimo, viaje) * factor;

  var descuento = 0, motivoDesc = '';
  if (compra >= t.gratis_monto && km <= t.gratis_km) {
    descuento = base; motivoDesc = 'Envío gratis (compra desde $' + t.gratis_monto + ' y hasta ' + t.gratis_km + ' km)';
  } else if (compra >= t.desc_monto) {
    descuento = base * t.desc_pct / 100; motivoDesc = t.desc_pct + '% (compra desde $' + t.desc_monto + ')';
  }

  var extras = 0, lineasExtra = [];
  if (yes_(input.urgente)) { extras += t.urgente; lineasExtra.push({ concepto: 'Urgente / mismo día', monto: t.urgente }); }
  if (yes_(input.zona_dificil)) { extras += t.zona_dificil; lineasExtra.push({ concepto: 'Zona de difícil acceso', monto: t.zona_dificil }); }

  var envioCalculado = round(base);
  var total = Math.max(0, round(base - descuento + extras));

  return {
    km: Math.round(km * 10) / 10,
    minutos: Math.round(min),
    lineas: [
      { concepto: 'Banderazo', monto: t.banderazo },
      { concepto: 'Distancia (' + (Math.round(km * 10) / 10) + ' km × $' + t.precio_km + ')', monto: Math.round(km * t.precio_km * 100) / 100 },
      { concepto: 'Tiempo (' + Math.round(min) + ' min × $' + t.precio_min + ')', monto: Math.round(min * t.precio_min * 100) / 100 }
    ],
    minimoAplicado: viaje < t.minimo,
    factor: factor,
    envio_calculado: envioCalculado,
    descuento: Math.round(descuento * 100) / 100,
    motivo_descuento: motivoDesc,
    extras: extras,
    lineas_extra: lineasExtra,
    total: total,
    requiere_autorizacion: km > t.max_km,
    motivo_autorizacion: km > t.max_km ? 'La ruta pasa de ' + t.max_km + ' km' : ''
  };
}

/* ------------------------------------------------------------------ */
/* Google Maps (servicio Maps incluido en Apps Script: sin llave ni     */
/* tarjeta; se cuenta dentro de la cuota diaria de la cuenta Google)    */
/* ------------------------------------------------------------------ */

function mapsError_(e) {
  var m = String((e && e.message) || e);
  if (/quota|cuota|Service invoked too many times/i.test(m)) {
    return new Error('Se alcanzó el límite diario de consultas de Google Maps. Usa "Capturar km a mano" y avisa a Admin.');
  }
  return new Error('Google Maps no respondió (' + m + ')');
}

function route_(lat, lng) {
  var t = getTarifas_();
  lat = num_(lat); lng = num_(lng);
  if (!lat || !lng) throw new Error('Marca el punto de entrega en el mapa');
  var cacheKey = 'r_' + lat.toFixed(4) + '_' + lng.toFixed(4) + '_' + t.origen_lat + '_' + t.origen_lng;
  var cache = CacheService.getScriptCache();
  var hit = cache.get(cacheKey);
  if (hit) return JSON.parse(hit);

  var dir;
  try {
    dir = Maps.newDirectionFinder()
      .setOrigin(t.origen_lat, t.origen_lng)
      .setDestination(lat, lng)
      .setMode(Maps.DirectionFinder.Mode.DRIVING)
      .setLanguage('es')
      .setRegion('mx')
      .getDirections();
  } catch (e) {
    throw mapsError_(e);
  }
  if (!dir || dir.status !== 'OK' || !dir.routes || !dir.routes.length) {
    var st = dir && dir.status;
    if (st === 'ZERO_RESULTS' || st === 'NOT_FOUND') {
      throw new Error('Google no encontró un camino hasta ese punto. Acerca el pin a la calle o usa "Capturar km a mano".');
    }
    if (st === 'OVER_QUERY_LIMIT') throw mapsError_('quota');
    throw new Error('No se pudo calcular la ruta (' + st + ')');
  }
  var leg = dir.routes[0].legs[0];
  var out = { km: leg.distance.value / 1000, minutos: leg.duration.value / 60 };
  cache.put(cacheKey, JSON.stringify(out), 21600);
  return out;
}

function geocode_(text) {
  if (!text || String(text).trim().length < 3) return [];
  var t = getTarifas_();
  var res;
  try {
    // Prioriza resultados en ~70 km alrededor de la tienda.
    res = Maps.newGeocoder()
      .setLanguage('es')
      .setRegion('mx')
      .setBounds(t.origen_lat - 0.6, t.origen_lng - 0.6, t.origen_lat + 0.6, t.origen_lng + 0.6)
      .geocode(String(text));
  } catch (e) {
    throw mapsError_(e);
  }
  if (!res || (res.status !== 'OK' && res.status !== 'ZERO_RESULTS')) {
    throw new Error('No se pudo buscar la dirección (' + (res && res.status) + ')');
  }
  return (res.results || []).slice(0, 6).map(function (r) {
    return { label: r.formatted_address, lat: r.geometry.location.lat, lng: r.geometry.location.lng };
  });
}

/** Ubica una comunidad del catálogo; guarda lat/lng en la hoja para no volver a buscarla. */
function locateCommunity_(nombre) {
  var sh = sheet_(SHEETS.COMUNIDADES);
  var list = readSheet_(SHEETS.COMUNIDADES);
  var c = list.filter(function (x) { return String(x.comunidad) === String(nombre); })[0];
  if (!c) throw new Error('Comunidad no encontrada');
  if (c.lat !== '' && c.lng !== '') return { lat: num_(c.lat), lng: num_(c.lng), guardado: true };
  var clean = String(nombre).replace(/\(.*?\)/g, '').trim();
  var hits = geocode_(clean + ', Jilotepec, Estado de México, México');
  if (!hits.length) hits = geocode_(clean);
  if (!hits.length) return null;
  var h = hits[0];
  var headers = headers_(sh);
  sh.getRange(c._row, headers.indexOf('lat') + 1).setValue(h.lat);
  sh.getRange(c._row, headers.indexOf('lng') + 1).setValue(h.lng);
  return { lat: h.lat, lng: h.lng, guardado: false };
}

/* ------------------------------------------------------------------ */
/* Cotización y pedidos                                                */
/* ------------------------------------------------------------------ */

function resolveVehicle_(id) {
  if (!id) return { unidad: '', factor: 1 };
  var v = readSheet_(SHEETS.VEHICULOS).filter(function (x) { return String(x.id) === String(id); })[0];
  return v ? { unidad: String(v.unidad), factor: num_(v.factor, 1) || 1 } : { unidad: '', factor: 1 };
}

function quote_(input) {
  var t = getTarifas_();
  var r;
  if (yes_(input.manual)) {
    r = { km: num_(input.km), minutos: num_(input.minutos) };
    if (!r.km) throw new Error('Captura los km de la ruta');
  } else {
    r = route_(input.lat, input.lng);
  }
  var veh = resolveVehicle_(input.vehiculo_id);
  var price = computePrice(t, {
    km: r.km, minutos: r.minutos, monto_compra: input.monto_compra, factor: veh.factor,
    urgente: input.urgente, zona_dificil: input.zona_dificil
  });
  if (yes_(input.manual)) {
    price.requiere_autorizacion = true;
    price.motivo_autorizacion = 'Km capturados a mano';
  }
  return price;
}

function checkPin_(auth) {
  if (!auth || !auth.nombre || !auth.pin) throw new Error('Se requiere autorización (nombre y PIN)');
  var ok = readSheet_(SHEETS.AUTORIZADORES).some(function (a) {
    return yes_(a.activo) && String(a.nombre) === String(auth.nombre) && String(a.pin) === String(auth.pin);
  });
  if (!ok) throw new Error('PIN incorrecto para ' + auth.nombre);
  return String(auth.nombre);
}

function nextFolio_() {
  var props = PropertiesService.getScriptProperties();
  var n = parseInt(props.getProperty('LAST_FOLIO') || '0', 10);
  if (!n) {
    readSheet_(SHEETS.PEDIDOS).forEach(function (r) {
      var m = String(r.folio).match(/FDN-(\d+)/);
      if (m) n = Math.max(n, parseInt(m[1], 10));
    });
  }
  n += 1;
  props.setProperty('LAST_FOLIO', String(n));
  return 'FDN-' + ('0000' + n).slice(-4);
}

function createOrder_(d, auth) {
  ['no_ticket', 'nombre_cliente', 'telefono', 'direccion'].forEach(function (f) {
    if (!String(d[f] || '').trim()) throw new Error('Falta el campo: ' + f.replace(/_/g, ' '));
  });
  // El precio se recalcula aquí: lo que mande la pantalla no se toma como bueno.
  var q = quote_(d);
  var veh = resolveVehicle_(d.vehiculo_id);
  var costo = q.total;
  var autorizo = '', motivoAjuste = '';
  var hayAjuste = d.ajuste_monto !== undefined && d.ajuste_monto !== '' && d.ajuste_monto !== null;

  if (hayAjuste || q.requiere_autorizacion) {
    autorizo = checkPin_(auth);
    motivoAjuste = String(d.ajuste_motivo || q.motivo_autorizacion || '').trim();
    if (hayAjuste) {
      if (!motivoAjuste) throw new Error('Escribe el motivo del ajuste');
      costo = num_(d.ajuste_monto);
    }
  }

  var comunidad = String(d.comunidad || '');
  var precioTabla = '';
  if (comunidad) {
    var c = readSheet_(SHEETS.COMUNIDADES).filter(function (x) { return String(x.comunidad) === comunidad; })[0];
    if (c) precioTabla = num_(c.precio_tabla);
  }

  var order = {
    folio: nextFolio_(),
    fecha_creacion: new Date(),
    no_ticket: String(d.no_ticket).trim(),
    no_vendedor: String(d.no_vendedor || '').trim(),
    nombre_cliente: String(d.nombre_cliente).trim(),
    telefono: String(d.telefono).trim(),
    direccion: String(d.direccion).trim(),
    comunidad: comunidad,
    lat: d.lat || '', lng: d.lng || '',
    km: q.km, minutos: q.minutos,
    ruta_manual: yes_(d.manual) ? 'SI' : 'NO',
    monto_de_compra: num_(d.monto_compra),
    unidades: num_(d.unidades),
    unidad_requerida: veh.unidad,
    factor_unidad: veh.factor,
    urgente: yes_(d.urgente) ? 'SI' : 'NO',
    zona_dificil: yes_(d.zona_dificil) ? 'SI' : 'NO',
    envio_calculado: q.total,
    descuento: q.descuento,
    extras: q.extras,
    costo_de_envio: costo,
    ajuste_motivo: motivoAjuste,
    autorizo: autorizo,
    precio_tabla: precioTabla,
    estado: ESTADOS.PENDIENTE,
    intentos: 0,
    updated_at: new Date()
  };
  appendRow_(SHEETS.PEDIDOS, order);
  if (autorizo) {
    log_(order.folio, hayAjuste ? 'Ajuste de monto' : 'Autorización',
      'Calculado $' + q.total + ' → cobrado $' + costo + '. ' + motivoAjuste, autorizo);
  }
  order.fecha_creacion = order.fecha_creacion.toISOString();
  order.updated_at = order.updated_at.toISOString();
  return order;
}

function listOrders_(estado) {
  var list = readSheet_(SHEETS.PEDIDOS);
  if (estado) list = list.filter(function (r) { return String(r.estado) === String(estado); });
  var emb = {};
  readSheet_(SHEETS.EMBARQUES).forEach(function (e) { emb[e.folio] = e; });
  return list.map(function (r) { r.embarque = emb[r.folio] || null; delete r._row; return r; }).reverse();
}

function ship_(d) {
  var o = findOrder_(d.folio);
  if (o.estado !== ESTADOS.PENDIENTE) throw new Error('El pedido no está pendiente (estado: ' + o.estado + ')');
  if (!String(d.chofer || '').trim()) throw new Error('Escribe el nombre del chofer');
  var v = readSheet_(SHEETS.VEHICULOS).filter(function (x) { return String(x.id) === String(d.vehiculo_id); })[0];
  var unidad = v ? String(v.unidad) : String(d.unidad || '');
  var placas = v ? String(v.placas || '') : String(d.placas || '');
  if (!unidad) throw new Error('Elige la unidad');
  var e = { folio: o.folio, fecha: new Date(), vehiculo_id: v ? String(v.id) : '', unidad: unidad, placas: placas, chofer: String(d.chofer).trim() };
  appendRow_(SHEETS.EMBARQUES, e);
  updateRow_(SHEETS.PEDIDOS, o._row, { estado: ESTADOS.TRANSITO, updated_at: new Date() });
  e.fecha = e.fecha.toISOString();
  return e;
}

function getEvidenceFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('EVIDENCE_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* recrear */ }
  }
  var ssFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  var parents = ssFile.getParents();
  var parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  var folder = parent.createFolder('Delivery - Evidencias');
  props.setProperty('EVIDENCE_FOLDER_ID', folder.getId());
  return folder;
}

function savePhoto_(folio, dataUrl, tag) {
  if (!dataUrl) return '';
  var m = String(dataUrl).match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) throw new Error('Foto inválida');
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1],
    folio + '_' + tag + '_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd_HHmm') + '.jpg');
  var file = getEvidenceFolder_().createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* política del dominio */ }
  return file.getUrl();
}

function deliver_(d) {
  var o = findOrder_(d.folio);
  if (o.estado !== ESTADOS.TRANSITO) throw new Error('El pedido no está en tránsito');
  if (!d.foto) throw new Error('La foto de entrega es obligatoria');
  var url = savePhoto_(o.folio, d.foto, 'entregado');
  appendRow_(SHEETS.EVIDENCIAS, {
    folio: o.folio, fecha: new Date(), resultado: ESTADOS.ENTREGADO, motivo: '',
    recibio: String(d.recibio || ''), foto_url: url, lat: d.lat || '', lng: d.lng || ''
  });
  updateRow_(SHEETS.PEDIDOS, o._row, { estado: ESTADOS.ENTREGADO, updated_at: new Date() });
  return { folio: o.folio, foto_url: url };
}

function fail_(d) {
  var o = findOrder_(d.folio);
  if (o.estado !== ESTADOS.TRANSITO) throw new Error('El pedido no está en tránsito');
  if (!String(d.motivo || '').trim()) throw new Error('Escribe el motivo de no entrega');
  if (!d.foto) throw new Error('La foto del domicilio es obligatoria');
  var url = savePhoto_(o.folio, d.foto, 'no_entregado');
  appendRow_(SHEETS.EVIDENCIAS, {
    folio: o.folio, fecha: new Date(), resultado: ESTADOS.NO_ENCONTRADO, motivo: String(d.motivo).trim(),
    recibio: '', foto_url: url, lat: d.lat || '', lng: d.lng || ''
  });
  updateRow_(SHEETS.PEDIDOS, o._row, { estado: ESTADOS.NO_ENCONTRADO, updated_at: new Date() });
  return { folio: o.folio, foto_url: url };
}

function reschedule_(folio) {
  var o = findOrder_(folio);
  if (o.estado !== ESTADOS.NO_ENCONTRADO) throw new Error('Solo se reprograman pedidos "No Encontrado"');
  updateRow_(SHEETS.PEDIDOS, o._row, { estado: ESTADOS.PENDIENTE, intentos: num_(o.intentos) + 1, updated_at: new Date() });
  log_(o.folio, 'Reprogramado', 'Intento ' + (num_(o.intentos) + 2), '');
  return { folio: o.folio };
}

function cancel_(folio, motivo, auth) {
  var who = checkPin_(auth);
  if (!String(motivo || '').trim()) throw new Error('Escribe el motivo de cancelación');
  var o = findOrder_(folio);
  if (o.estado === ESTADOS.ENTREGADO) throw new Error('No se puede cancelar un pedido entregado');
  updateRow_(SHEETS.PEDIDOS, o._row, { estado: ESTADOS.CANCELADO, updated_at: new Date() });
  log_(o.folio, 'Cancelado', String(motivo).trim(), who);
  return { folio: o.folio };
}

/* ------------------------------------------------------------------ */
/* Administración                                                      */
/* ------------------------------------------------------------------ */

function login_(auth) {
  var who = checkPin_(auth);
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('tok_' + token, who, 21600); // 6 horas
  return { token: token, nombre: who };
}

function requireToken_(token) {
  var who = token && CacheService.getScriptCache().get('tok_' + token);
  if (!who) throw new Error('Sesión vencida. Vuelve a entrar a Admin.');
  return who;
}

function adminData_() {
  var ev = {};
  readSheet_(SHEETS.EVIDENCIAS).forEach(function (e) { (ev[e.folio] = ev[e.folio] || []).push(e); });
  var orders = listOrders_().map(function (o) { o.evidencias = ev[o.folio] || []; return o; });
  var bit = readSheet_(SHEETS.BITACORA).map(function (b) { delete b._row; return b; }).reverse().slice(0, 300);
  return { pedidos: orders, bitacora: bit, config: getConfig_() };
}

function adminUpdate_(folio, data, who) {
  var o = findOrder_(folio);
  var allowed = ['no_ticket', 'monto_de_compra', 'estado', 'costo_de_envio', 'telefono', 'direccion'];
  var changes = {}, detalle = [];
  allowed.forEach(function (k) {
    if (data[k] !== undefined && String(data[k]) !== String(o[k])) {
      changes[k] = data[k];
      detalle.push(k + ': ' + o[k] + ' → ' + data[k]);
    }
  });
  if (!detalle.length) return { folio: folio, sinCambios: true };
  changes.updated_at = new Date();
  updateRow_(SHEETS.PEDIDOS, o._row, changes);
  log_(folio, 'Edición Admin', detalle.join('; '), who);
  return { folio: folio };
}

function adminDelete_(folio, who) {
  var o = findOrder_(folio);
  [SHEETS.EVIDENCIAS, SHEETS.EMBARQUES].forEach(function (name) {
    var rows = readSheet_(name).filter(function (r) { return String(r.folio) === String(folio); })
      .map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
    var sh = sheet_(name);
    rows.forEach(function (r) { sh.deleteRow(r); });
  });
  sheet_(SHEETS.PEDIDOS).deleteRow(o._row);
  log_(folio, 'Eliminado', 'Cliente: ' + o.nombre_cliente + ', envío $' + o.costo_de_envio, who);
  return { folio: folio };
}
