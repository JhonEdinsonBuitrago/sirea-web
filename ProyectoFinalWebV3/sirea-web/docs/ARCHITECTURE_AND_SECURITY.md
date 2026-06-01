# RLS, Auth y Storage — Sistema de Reporte de Incidentes

Este documento resume las decisiones de seguridad, RLS y sincronización entre `auth.users` y la tabla `profiles`.

1) Sincronización de usuarios
- Se creó la función `handle_new_user()` y un trigger sobre `auth.users` que inserta/actualiza registros en `public.profiles`.
- En el cliente también se valida la existencia del perfil al iniciar sesión y se crea si no existe (redundancia que evita fallos comunes donde el usuario aparece en Auth pero no en `profiles`).

2) Tabla `profiles`
- Campos: `id` (UUID PK), `nombre`, `email`, `rol` (default 'usuario'), `created_at`.

3) Tabla `incidents`
- Campos: `id`, `usuario_id`, `tipo`, `descripcion`, `imagen_url`, `ubicacion_texto`, `latitud`, `longitud`, `estado`, `grupo_id`, `created_at`, `updated_at`.

4) RLS (Row Level Security)
- `profiles`:
  - SELECT: solo el propio usuario o admin puede leer.
  - INSERT/UPDATE: comprobaciones que aseguran `auth.uid() = id` para usuarios.
- `incidents`:
  - SELECT: usuarios solo ven sus incidentes; admin ve todos.
  - INSERT: `usuario_id` debe ser `auth.uid()`.
  - UPDATE: usuarios pueden actualizar sus propios registros; admin puede actualizar cualquiera.

5) Storage (bucket `reports`)
- Recomendación: crear bucket `reports` en Supabase y decidir si los objetos serán públicos o privados.
- Políticas sugeridas (en `sql/schema.sql`) permiten:
  - Insert por usuarios autenticados solo para tipos `png/jpg/webp`.
  - Select público sobre `reports` (si se desea URLs públicas).
  - Delete/update solo por owner (metadata.owner) o admin.

6) Notas de seguridad
- Validar y sanear inputs en el backend/SQL según sea necesario.
- Limitar tamaño de subida en la UI y validar content-type antes de upload.
- Revisar configuración de CORS y tokens en producción.
