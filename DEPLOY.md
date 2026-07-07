# Desplegar Work.Code como página web real

Guía para publicar la plataforma en internet con dominio propio.

---

## Opción A — Vercel (recomendada: gratis para empezar, 20 minutos)

Vercel es de los creadores de Next.js; el despliegue es casi automático.

### 1. Sube el código a GitHub
```bash
cd C:\Users\letel\Desktop\Claude.tableton
git init
git add .
git commit -m "Work.Code v1"
```
Crea un repositorio vacío en https://github.com/new (ej: `workcode`) y:
```bash
git remote add origin https://github.com/TU_USUARIO/workcode.git
git push -u origin main
```
> `.gitignore` ya excluye `.env` y la base de datos local — tus secretos no se suben.

### 2. Crea la base de datos Postgres (gratis)
SQLite no funciona en Vercel (sistema de archivos de solo lectura).
Crea un Postgres gratuito en **https://neon.tech** (o Supabase / Vercel Postgres)
y copia la cadena de conexión (`postgresql://...`).

Cambia el proveedor en `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"   // antes: "sqlite"
  url      = env("DATABASE_URL")
}
```
Regenera la migración para Postgres y súbela:
```bash
# con DATABASE_URL de Neon en .env
rmdir /s /q prisma\migrations
npx prisma migrate dev --name init
npx prisma db seed
git add . && git commit -m "Postgres" && git push
```

### 3. Importa el proyecto en Vercel
1. https://vercel.com → **Add New → Project** → importa tu repo de GitHub.
2. En **Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la URL de Neon/Supabase |
| `AUTH_SECRET` | genera uno nuevo: `npx auth secret` |
| `AUTH_GOOGLE_ID` | (opcional) de Google Cloud Console |
| `AUTH_GOOGLE_SECRET` | (opcional) |
| `ANTHROPIC_API_KEY` | (opcional) activa el AI Tutor con Claude |
| `EXECUTION_PROVIDER` | vacío (Wandbox) o `piston` si autoalojas |

3. **Deploy**. En ~2 minutos tienes `https://workcode.vercel.app` (puedes
   conectar tu dominio propio en Settings → Domains).

### 4. Google OAuth en producción (opcional)
En Google Cloud Console → Credentials → tu OAuth Client → agrega:
- Authorized redirect URI: `https://TU-DOMINIO/api/auth/callback/google`

---

## Activar "Continuar con Google" (funciona también en localhost)

El botón aparece bloqueado hasta que registres la app en Google y pegues
las credenciales en `.env`. Pasos exactos:

1. Entra a **https://console.cloud.google.com** con tu cuenta de Google.
2. Arriba a la izquierda → selector de proyecto → **Proyecto nuevo** →
   nómbralo `Work.Code` → Crear (y selecciónalo).
3. Menú ☰ → **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** → Crear.
   - Nombre de la app: `Work.Code`; correo de asistencia: el tuyo → Guardar
     hasta el final (los pasos de alcances/scopes se pueden dejar tal cual).
   - En **Público / Usuarios de prueba** agrega tu propio Gmail (y el de
     quien quieras que pruebe). ⚠ Mientras la app esté en modo *Prueba*,
     SOLO esos correos podrán entrar — a cualquier otro Google le mostrará
     "Acceso bloqueado: app no verificada". Para abrirla a todo el mundo:
     botón **Publicar aplicación**.
4. **APIs y servicios → Credenciales → + Crear credenciales →
   ID de cliente de OAuth**:
   - Tipo: **Aplicación web**, nombre `Work.Code Web`.
   - Orígenes de JavaScript autorizados: `http://localhost:3000`
   - URI de redireccionamiento autorizados:
     `http://localhost:3000/api/auth/callback/google`
   - Crear → copia el **ID de cliente** y el **Secreto de cliente**.
5. Abre `.env` (en la carpeta del proyecto) y pega:
   ```
   AUTH_GOOGLE_ID=xxxxxxxx.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxx
   ```
6. Reinicia el servidor (cierra la ventana de `Iniciar Work.Code.cmd` y
   vuelve a abrirla). El botón de Google se habilita automáticamente.

El primer login con Google pasa por el onboarding para elegir rol
(Alumno/Profesor); los siguientes entran directo.

---

## Opción B — VPS propio (DigitalOcean, Hetzner, AWS EC2...)

Para control total (y poder autoalojar el motor de ejecución Piston):

```bash
# En el servidor (Ubuntu):
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
git clone https://github.com/TU_USUARIO/workcode.git && cd workcode
npm install
cp .env.example .env   # completa DATABASE_URL y AUTH_SECRET
npx prisma migrate deploy && npx prisma db seed
npm run build
npm install -g pm2
pm2 start "npm start" --name workcode   # sirve en :3000
```
- SQLite SÍ funciona en un VPS (archivo persistente), aunque Postgres sigue
  siendo lo recomendado para múltiples cursos.
- Pon **Caddy** o **Nginx** delante para HTTPS con tu dominio.
- Motor de ejecución propio (sin depender de Wandbox):
  `docker run -d -p 2000:2000 ghcr.io/engineer-man/piston` y en `.env`:
  `EXECUTION_PROVIDER=piston`, `EXECUTION_API_URL=http://localhost:2000/api/v2`.

---

## Checklist previo a producción

- [ ] `npm run build` pasa sin errores (verificado en desarrollo)
- [ ] `AUTH_SECRET` nuevo y distinto al de desarrollo
- [ ] Postgres en la nube (Vercel) o respaldos del SQLite (VPS)
- [ ] Google OAuth con el redirect del dominio real
- [ ] Cuenta demo del seed: cámbiale la contraseña o elimínala
      (`npx prisma studio` → tabla User)
