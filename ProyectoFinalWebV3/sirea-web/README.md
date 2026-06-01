# Sistema de Reporte de Incidentes — Universidad de la Amazonia

Proyecto generado por Copilot (arquitecto/ingeniero) — stack: React + Vite, TailwindCSS, Supabase.

## Resumen
Aplicación web para reportar y gestionar incidentes en la Universidad de la Amazonia.

## Requisitos
- Node >= 18
- npm o yarn
- Cuenta Supabase con la URL y ANON KEY proporcionadas

## Variables de entorno
Copiar `.env.example` a `.env` y rellenar:

VITE_SUPABASE_URL=https://kempjcbrugbwngivjofc.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY

## Scripts
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Estructura
- `src/` - código fuente
- `sql/` - scripts SQL para tablas, triggers y RLS
- `public/` - recursos públicos

## Notas
- El proyecto incluye SQL para crear `profiles` e `incidents`, triggers para sincronizar `auth.users` y políticas RLS.
- Usa `sql/final_schema.sql` como script final para Supabase.

## Documentación de seguridad y despliegue
- Ver `docs/ARCHITECTURE_AND_SECURITY.md` para detalles sobre RLS, Auth y Storage.
- Ver `docs/DEPLOYMENT.md` para despliegue en Vercel y Netlify.

## Despliegue (Vercel / Netlify)
- Configura las variables de entorno en la plataforma: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Asegúrate de que el bucket `reports` exista en Supabase y las políticas RLS/storage estén aplicadas.
- Netlify usa `netlify.toml` y `_redirects` para SPA routing.
- Vercel usa `vercel.json` para rewrite a `index.html`.

## Comandos locales
```bash
npm install
npm run dev
```

