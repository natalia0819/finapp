# FinApp · App de finanzas personales (PWA)

Reparte tu plata en **espacios**, registra ingresos, gastos y traslados, y mira el saldo de cada uno.
Funciona en celular y PC, se instala como app y sirve sin internet.
**No hay servidor:** cada persona guarda sus datos en una hoja de Google Sheets dentro de **su propio Google Drive**.

## Qué incluye (fases 1 a 5)

| Fase | Funciones |
|---|---|
| 1 | Inicio de sesión con Google, creación automática de la hoja, ventana del apodo, espacios predeterminados (Ahorro e Inversión a la felicidad) |
| 2 | Crear, editar, eliminar y archivar espacios (8 colores, 12 íconos, meta). Si un espacio tiene saldo, pide trasladarlo antes de archivarlo. Reactivar archivados |
| 3 | Registrar ingresos (también repartidos en varios espacios) y gastos, con advertencia si superan el saldo y confirmación al gastar del ahorro |
| 4 | Historial agrupado por día, filtros por mes/espacio/tipo, resumen entró/salió, editar y eliminar, exportar a Excel (.xlsx) o CSV |
| 5 | Traslados entre espacios, metas con barra de progreso, modo sin conexión con cola de sincronización, instalación como PWA y publicación automática |

Además: modo claro/oscuro/automático, diseño adaptado a celular y a PC, y accesibilidad (etiquetas reales, navegación con teclado, contraste).

---

## 1. Crear el proyecto en Google Cloud (una sola vez)

1. Entra a https://console.cloud.google.com y crea un proyecto (por ejemplo "Espacios Finanzas").
2. En **APIs y servicios → Biblioteca**, habilita **Google Drive API** y **Google Sheets API**.
3. Configura la **pantalla de consentimiento de OAuth** (en la consola nueva aparece como **Google Auth Platform**):
   - Tipo de usuario: **Externo**. Nombre de la app, correo de soporte y de contacto.
   - Permisos (scopes): agrega solo `https://www.googleapis.com/auth/drive.file`.
   - Mientras esté en modo **Prueba**, agrega en **Usuarios de prueba** los correos que van a usarla (hasta 100).
4. Crea las credenciales: **ID de cliente de OAuth → Aplicación web**.
   En **Orígenes de JavaScript autorizados** agrega:
   - `http://localhost:5173` (para desarrollo)
   - la URL donde la publiques, por ejemplo `https://TU-USUARIO.github.io` (sin la ruta del repositorio)
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`).

> **¿Por qué `drive.file`?** Le permite a la app ver y editar **solo** los archivos que ella misma creó. No puede leer
> el resto del Drive. Google lo considera un permiso **no sensible**, así que para abrirla a cualquier persona no se
> exige la revisión de seguridad que piden los permisos amplios (a lo sumo, una verificación básica de marca).

## 2. Correr la app en tu PC

Necesitas **Node.js 18 o superior**.

```bash
npm install
cp .env.example .env.local      # en Windows: copy .env.example .env.local
# abre .env.local y pega tu ID de cliente
npm run dev
```

Abre http://localhost:5173

Para probar desde tu celular en la misma red Wi-Fi: `npm run dev -- --host`. Ojo: el inicio de sesión de Google solo funciona
en orígenes autorizados (localhost o tu dominio con https), así que en el celular pruébala mejor ya publicada.

## 3. Publicar gratis en GitHub Pages

1. Crea un repositorio en GitHub y sube el proyecto (el archivo `.env.local` **no** se sube; está en `.gitignore`).
2. En el repositorio: **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**
   - Nombre: `VITE_GOOGLE_CLIENT_ID` · Valor: tu ID de cliente.
3. **Settings → Pages → Source: GitHub Actions**.
4. Sube un cambio a `main` (o ejecuta el flujo "Publicar en GitHub Pages" desde la pestaña **Actions**).
5. Tu app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
6. Agrega `https://TU-USUARIO.github.io` a los **Orígenes autorizados** del paso 1.4.

**Alternativa: Netlify o Vercel.** Importa el repositorio, comando `npm run build`, carpeta `dist`, y crea la variable de
entorno `VITE_GOOGLE_CLIENT_ID`. No necesitas `BASE_PATH`.

Cuando la app esté lista para más personas, en Google Auth Platform pasa la app de **Prueba** a **En producción**.

## 4. Instalarla

- **Android / PC (Chrome o Edge):** Ajustes → "Instalar en este dispositivo", o el ícono de instalar en la barra de direcciones.
- **iPhone:** abre la página en **Safari** → Compartir → **Agregar a inicio**.

---

## Cómo funciona por dentro

### Datos (en la hoja del usuario)
- **Perfil:** apodo, fecha_registro
- **Espacios:** id, nombre, color, icono, meta, activo, es_predeterminado, fecha_creacion
- **Movimientos:** id, fecha, tipo (ingreso | gasto | traslado), monto, espacio_id, espacio_destino_id, descripcion, grupo_id

Una sola tabla de movimientos, relaciones por id y **saldos calculados**: nunca se guardan, se suman los movimientos.
Los espacios predeterminados tienen ids fijos (`ahorro`, `felicidad`) para que la app sepa cuál es el ahorro aunque lo renombres.

### Primero local, después Google (modo sin conexión)
1. Cada cambio se aplica al instante en pantalla y en una copia del dispositivo (`localStorage`).
2. El cambio se anota en una **cola**. Cuando hay internet y sesión, la cola se sube a Google Sheets.
3. Las operaciones buscan cada fila por su id antes de escribir, así que si una se repite (por un corte de internet) no se duplica nada.
4. Al volver a la app o recuperar internet, también se traen los cambios hechos desde otro dispositivo.
5. El **service worker** guarda la app para que abra sin internet.

La copia local vive solo en el navegador de esa persona y se borra al cerrar sesión. Nada pasa por un servidor propio.

### Sesión
El token de Google dura una hora y vive en la pestaña. Cuando vence, la app sigue funcionando con la copia local y muestra
un botón **Conectar** para sincronizar. Si se cierra sesión con cambios pendientes, la app avisa antes.

### Organización del código
```
src/
  App.jsx                  Navegación y ventanas
  hooks/useFinanzas.js     Estado central, cola y sincronización
  lib/sheetsApi.js         Drive + Sheets: crear, buscar, leer, aplicar la cola
  lib/googleAuth.js        Inicio de sesión (Google Identity Services)
  lib/almacenLocal.js      Copia local del dispositivo
  lib/movimientos.js       Filtrar, agrupar y resumir movimientos
  lib/exportar.js          Excel y CSV
  lib/formato.js           Pesos COP, fechas, ids
  lib/tema.js              Claro / oscuro
  constants/espacios.js    Paleta, íconos y espacios predeterminados
  components/              Pantallas y piezas de la interfaz
  styles.css               Colores, móvil primero y adaptación a PC
```

Para cambiar los espacios con los que nace cada cuenta (por ejemplo, volver a llamar "La cárcel" al ahorro), edita
`espaciosPredeterminados` en `src/constants/espacios.js`.

## Problemas comunes

| Síntoma | Solución |
|---|---|
| "Falta VITE_GOOGLE_CLIENT_ID" | Crea `.env.local` (o la variable en GitHub/Netlify) y reinicia `npm run dev`. |
| Error 400 / origen no permitido | Agrega el origen exacto en **Orígenes de JavaScript autorizados**. Puede tardar unos minutos en aplicar. |
| "Acceso bloqueado: la app no completó la verificación" | Agrega el correo como usuario de prueba o pasa la app a producción. |
| "Google no dio permiso" (403) | Revisa que Drive API y Sheets API estén habilitadas y que se marcó la casilla de permiso. |
| El navegador bloqueó la ventana de Google | Permite ventanas emergentes para el sitio. |
| La app publicada no ve cambios nuevos | Cierra y vuelve a abrir la app; el service worker se actualiza solo. |
| Borré o moví la hoja a la papelera | Recupérala de la papelera de Drive. Si no, cierra sesión y vuelve a entrar: la app crea una nueva. |
