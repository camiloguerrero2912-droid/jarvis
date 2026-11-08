# J.A.R.V.I.S.

Asistente virtual con voz, interfaz HUD, IA de Claude y acciones reales.

Archivos: `index.html`, `style.css`, `script.js`, `google.js`.

## 1. Subirlo a GitHub Pages (gratis, con https)

1. Crea un repositorio en GitHub (por ejemplo `jarvis`).
2. Sube estos 5 archivos a la raíz del repositorio.
3. Ve a **Settings → Pages**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. En un par de minutos queda en `https://TU-USUARIO.github.io/jarvis/`.

**Nunca escribas tu clave de Anthropic dentro de los archivos.** Se pega en Ajustes y se guarda solo en tu navegador. El Client ID de Google sí es público por diseño.

## 2. Conectar Google (Calendar, Gmail, Tasks y música)

1. Entra a [Google Cloud Console](https://console.cloud.google.com) y crea un proyecto.
2. En **APIs y servicios → Biblioteca**, activa: Google Calendar API, Gmail API, Google Tasks API y YouTube Data API v3.
3. En **Pantalla de consentimiento de OAuth**: tipo *Externo*, déjala en modo *Prueba* y agrega tu correo en *Usuarios de prueba*.
4. En **Credenciales → Crear credenciales → ID de cliente de OAuth**: tipo *Aplicación web*. En *Orígenes autorizados de JavaScript* agrega:
   - `https://TU-USUARIO.github.io` (solo el dominio, sin la ruta)
   - `http://localhost:5500` (si la pruebas con Live Server)
5. Copia el Client ID, pégalo en **Ajustes** de Jarvis y pulsa el botón **Google**.
6. Google dirá "app no verificada": pulsa *Avanzado → Continuar* (es tu propia app).

El permiso dura 1 hora. Si pasa el tiempo, pulsa otra vez el botón Google.

## Notas

- No funciona abriendo el archivo con doble clic (`file://`): Google y el reproductor de YouTube exigen una dirección http(s).
- Los recordatorios con hora se crean como eventos de Google Calendar con alarma, así suenan en tu celular aunque cierres la pestaña.
- Google Keep no tiene API para cuentas personales; se usa Google Tasks, que también sincroniza con el celular.
- La música se busca en YouTube y suena en el reproductor de la página. Controlar la app de YouTube Music directamente no es posible.
