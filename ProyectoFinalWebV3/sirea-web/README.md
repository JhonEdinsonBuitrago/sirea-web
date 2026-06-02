# SIREA — Sistema de Reporte de Incidentes

### Universidad de la Amazonia · Ingeniería de Sistemas 2026-I

Aplicación web desarrollada con React + Vite, TailwindCSS y Supabase para reportar y gestionar incidentes dentro de las instalaciones de la Universidad de la Amazonia.

## Tecnologías utilizadas

- **React 18** + **TypeScript** — interfaz de usuario
- **Vite** — bundler y servidor de desarrollo
- **TailwindCSS** — estilos y diseño responsivo
- **Supabase** — base de datos, autenticación y almacenamiento
- **Recharts** — gráficas y estadísticas
- **React Router** — navegación
- **Zod** + **React Hook Form** — validación de formularios

## Requisitos previos

- Node.js >= 18
- npm o yarn
- Cuenta en Supabase con URL y ANON KEY

## Instalación y ejecución local

```bash
# Clonar el repositorio
git clone https://github.com/JhonEdinsonBuitrago/sirea-web.git
cd sirea-web

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

## Scripts disponibles

| Comando           | Descripción                         |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo    |
| `npm run build`   | Genera la build de producción       |
| `npm run preview` | Previsualiza la build de producción |

## Estructura del proyecto

```
sirea-web/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── context/        # Contexto de autenticación
│   ├── hooks/          # Hooks personalizados
│   ├── pages/          # Páginas de la aplicación
│   │   ├── Admin/      # Panel administrativo
│   │   ├── Auth/       # Login y registro
│   │   └── Incidents/  # Reportes de incidentes
│   ├── services/       # Servicios de Supabase
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilidades
├── sql/                # Scripts SQL para Supabase
├── docs/               # Documentación técnica
└── public/             # Recursos públicos
```

## Requerimientos funcionales implementados

- **RF-01 al RF-04** — Autenticación con Supabase Auth (registro, login, logout)
- **RF-05** — Formulario de reporte con foto, ubicación GPS y descripción
- **RF-06 y RF-07** — Almacenamiento en Supabase con estructura completa
- **RF-08** — Listado de incidentes con filtros y vista detallada
- **RF-09** — Gestión de estados por administrador (Reportado → En proceso → Resuelto)
- **RF-10** — Agrupación inteligente de incidentes duplicados
- **RF-11** — Estadísticas por periodo con gráficas
- **RF-12** — Exportación e impresión de estadísticas
- **RF-13** — Notificaciones al usuario cuando cambia el estado de su reporte
- **RF-14** — Notificaciones al administrador de nuevos incidentes

## Despliegue en Vercel

1. Conecta el repositorio en [vercel.com](https://sirea-web.vercel.app/)
2. Configura las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. Vercel detecta automáticamente la configuración de Vite

## Base de datos

Ejecutar los scripts SQL en el siguiente orden desde el SQL Editor de Supabase:

1. `sql/schema.sql` — tablas principales y RLS
2. `sql/notifications.sql` — sistema de notificaciones
3. `sql/incident_grouping_schema.sql` — agrupación de incidentes RF-10
4. `sql/rf10_setup_completo.sql` — configuración completa RF-10

## Documentación adicional

- `docs/ARCHITECTURE_AND_SECURITY.md` — arquitectura, RLS y seguridad
- `docs/DEPLOYMENT.md` — guía de despliegue detallada
