# Cotiza

Presupuestos para oficios. Aplicación completa en Next.js con PostgreSQL y cuentas de Supabase Auth: presupuestos, clientes, servicios, PDF del navegador y respuestas por enlace.

## Servicios

- Producción: https://cotiza-nine.vercel.app
- Los cobros siguen desactivados. Todos los usuarios tienen 3 presupuestos nuevos por mes; Profesional continúa como propuesta.

## Entorno

Configurar las variables indicadas en `.env.example`. La URL y clave pública identifican el proyecto de Auth. `DATABASE_URL` es privada y pertenece exclusivamente al servidor. Usar el pooler de transacciones de Supabase, con su host exacto tomado de **Connect**, no un host construido a partir de la región. El adaptador desactiva prepared statements y pipelining.

En Supabase Auth, conservar la confirmación de correo y configurar:

- Site URL: `https://cotiza-nine.vercel.app`
- Redirect URL: `https://cotiza-nine.vercel.app/auth/callback`
- Redirect URL de recuperación: `https://cotiza-nine.vercel.app/auth/callback?flow=recovery`

Las páginas `/acceso`, `/acceso/registro`, `/acceso/recuperar` y `/acceso/actualizar` gestionan el acceso. El servidor verifica la sesión con Supabase; no confía en encabezados de identidad enviados por el cliente. El cierre de sesión usa `POST /auth/signout`.

## Desarrollo y validación

```sh
npm ci
npm run dev
npm run typecheck
npm test
node --test lib/supabase/paths.test.mjs
npm run build
```

Las pruebas de API utilizan PostgreSQL en PGlite y la misma migración/adaptador. Cubren aislamiento, cuotas, importes, vigencia, respuestas públicas y rollback; las conexiones alojadas y los correos requieren verificación con los servicios configurados.

## Migraciones y despliegue

`npm run db:migrate` aplica los archivos de `migrations/` en orden, registra su SHA256 y rechaza cambios a archivos ya aplicados. Puede usarse `DATABASE_MIGRATION_URL` con una conexión administrativa de sesión distinta a la conexión limitada de la app. Nunca se crean tablas desde una petición HTTP.

Cada petición de datos usa una transacción y un bloqueo por usuario, de modo que la cuota y los cambios de moneda no dependen de una lectura concurrente sin protección. Los datos están aislados por usuario y los enlaces públicos usan tokens aleatorios revocables.

Para publicar desde esta carpeta vinculada:

```sh
npx vercel@65.11.0 deploy --prod
```

Los secretos y las salidas locales quedan ignorados por Git y por el envío a Vercel. No añadir credenciales a código, migraciones ni documentos.
