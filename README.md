# Ferre Nico Delivery 3.0

App de cobro y rastreo de entregas a domicilio de **Ferre Don Nico** (Jilotepec).

- **Pedido**: el vendedor marca el destino (comunidad, dirección o pin en el mapa) y el sistema calcula con **Google Maps** la ruta real y el envío tipo Uber: **banderazo + km + minutos**, con descuentos y extras.
- **Embarque**: asigna unidad y chofer, imprime el ticket de 80 mm.
- **Entrega**: foto obligatoria, hora y ubicación; "No encontrado" con motivo, reprogramar o cancelar (con autorización).
- **Admin**: entra con PIN, ve indicadores, gráficas, bitácora de ajustes y exporta a CSV.

Todo corre sin costo y sin tarjeta: Google Sheets + Apps Script (datos), el servicio de **Google Maps incluido en Apps Script** (km y minutos de ruta, búsqueda de direcciones; 1,000 consultas diarias con cuenta Gmail, 10,000 con Workspace), OpenStreetMap (dibujo del mapa) y Cloudflare Pages (publicación).

## Fórmula de cobro

```
Envío = máx($35, $10 + $2.60 × km + $2.50 × minutos) × factor de unidad
        − descuento  (gratis: compra ≥ $5,000 y ≤ 10 km  |  50%: compra ≥ $1,500)
        + urgente $50  + zona difícil $30
        → redondeado a $5.  Más de 60 km o km a mano: requiere autorización.
```

Todos los valores viven en la pestaña **Tarifas** de la hoja: se cambian ahí, sin tocar código.
Cambiar el monto calculado requiere motivo y PIN de un autorizador (pestaña **Autorizadores**); todo queda en **Bitacora**.

---

## Guía de instalación (una sola vez)

### Paso 1 — Hoja de Google y script
1. En Google Drive crea una **hoja de cálculo nueva** llamada `Ferre Nico Delivery`.
2. Menú **Extensiones → Apps Script**. Borra lo que aparezca y pega todo el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guarda (ícono de disco).
3. Elige la función **`setup`** en la barra de arriba y presiona **Ejecutar**. Acepta los permisos (Avanzado → Ir a proyecto; pide acceso a la hoja, a Drive para las fotos y a servicios externos). Se crean las pestañas con sus columnas, las tarifas, las 59 comunidades, la carpeta `Delivery - Evidencias` para las fotos y la clave de conexión **API_KEY**, que aparece en el *Registro de ejecución* (cópiala para el paso 2; también queda en Configuración del proyecto → Propiedades del script).
4. En la hoja, pestaña **Autorizadores**, cambia los PIN `CAMBIAR-1/2/3` de Eryho, Itzel y Belén.
5. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - Implementar → copia la **URL que termina en `/exec`**.

> Si después cambias el código: Implementar → Administrar implementaciones → lápiz → Versión: **Nueva versión**. Así la URL no cambia.

### Paso 2 — Publicar en Cloudflare Pages
1. Crea tu cuenta gratis en <https://dash.cloudflare.com/sign-up>.
2. **Workers & Pages → Create → pestaña Pages → Connect to Git** (Import an existing Git repository). Autoriza GitHub y elige el repositorio `Ferre-Nico-Delivery-2.0`.
3. Configuración de build:
   - Framework preset: **Vite** (o None)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. **Environment variables** (Variables de entorno), agrega:
   - `VITE_SHEETS_API_URL` = la URL `/exec` del paso 1
   - `VITE_SHEETS_API_KEY` = la clave `API_KEY` que mostró `setup` en el paso 1
   - `NODE_VERSION` = `22`
5. **Save and Deploy**. Al terminar te da una dirección tipo `https://ferre-nico-delivery.pages.dev`.

Cada vez que se suba un cambio a la rama `main` en GitHub, Cloudflare vuelve a publicar solo.
Si cambias una variable de entorno, ve a *Deployments → Retry deployment* para que tome efecto.

### Paso 3 — Prueba rápida
1. Abre la app → **Pedido** → Comunidad: *Canalejas*. Debe aparecer el pin, los km/minutos y el desglose.
2. Registra un pedido de prueba → **Embarque** → **Entrega** con una foto.
3. **Admin** con tu PIN: revisa que aparezca con su foto y ubicación. Luego bórralo.

### Si se llega al límite diario de Google Maps
Con cuenta Gmail son 1,000 rutas al día (las rutas repetidas se reutilizan por 6 horas y no cuentan). Si se llegara al límite, la app avisa y se puede usar **"Capturar km a mano"** con autorización; al día siguiente se restablece.

### Después: cargar vehículos
Pestaña **Vehiculos** de la hoja: `id` (V1, V2…), `unidad` (ej. NP300 Blanca), `placas`, `factor` (1 = sin recargo; 1.3 = 30% más), `activo` (SI/NO).
Mientras la pestaña esté vacía, en Embarque se escribe la unidad a mano.

---

## Pestañas de la hoja

| Pestaña | Para qué sirve |
|---|---|
| Pedidos | Un renglón por pedido, con km, minutos, cálculo, ajuste, autorizador y estado |
| Embarques | Unidad, placas y chofer de cada salida |
| Evidencias | Resultado de la entrega, motivo, enlace a la foto y ubicación |
| Tarifas | Banderazo, precio por km y minuto, mínimos, descuentos, extras, ubicación de la tienda |
| Vehiculos | Catálogo de unidades y su factor |
| Comunidades | Tabla anterior como referencia; lat/lng se llenan solas la primera vez que se usan |
| Autorizadores | Nombre, PIN y si está activo |
| Bitacora | Ajustes, autorizaciones, cancelaciones, reprogramaciones y cambios de Admin |

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # llena la URL /exec y la API_KEY
npm run dev                  # http://localhost:3000
npm test                     # prueba la fórmula contra la tabla de comunidades
```
