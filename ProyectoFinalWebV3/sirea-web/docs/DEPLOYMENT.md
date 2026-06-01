# Despliegue

## Vercel
1. Crear un nuevo proyecto en Vercel.
2. En la configuración del proyecto, agregar variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Seleccionar el repositorio y desplegar.

Vercel detecta Vite automáticamente. No se necesita configuración adicional para el enrutamiento SPA gracias a `vercel.json`.

## Netlify
1. Crear un nuevo sitio en Netlify.
2. Agregar variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. En la sección de Build, usar:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Netlify usará el archivo `netlify.toml` y `_redirects` para asegurar el enrutamiento SPA.

## Notas
- Asegúrate de que el bucket `reports` exista en Supabase Storage.
- Configura las políticas RLS y de Storage según el archivo `sql/schema.sql`.
- Nunca subas `VITE_SUPABASE_ANON_KEY` a un repositorio público sin protección.
