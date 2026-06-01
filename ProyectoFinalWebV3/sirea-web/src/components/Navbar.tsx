import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, FileText, Grid, LogOut, Menu, ShieldAlert, UserCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useNotifications } from '../hooks/useNotifications';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await logout();
    if (error) {
      console.error('Logout error:', error);
      return;
    }
    setMobileMenuOpen(false);
    navigate('/auth/login');
  };

  if (loading || !user) {
    return null;
  }

  const isAdmin = profile?.rol === 'admin';

  const portalTitle = isAdmin
    ? 'Panel Administrativo'
    : 'Portal de Incidentes';

  const portalSubtitle = isAdmin
    ? 'Control General del Sistema'
    : 'Sistema de Reportes';

  const dashboardLabel = isAdmin
    ? 'Dashboard General'
    : 'Panel Principal';

  const reportsLabel = isAdmin
    ? 'Todos los Reportes'
    : 'Mis Reportes';

  const statsLabel = isAdmin
    ? 'Estadísticas Globales'
    : 'Mis Estadísticas';

  const welcomeRole = isAdmin
    ? 'Administrador del sistema'
    : 'Usuario del sistema';

  const navItems = [
    {
      to: '/dashboard',
      label: dashboardLabel,
      icon: Grid,
      match: ['/dashboard'],
    },
    {
      to: '/reports',
      label: reportsLabel,
      icon: FileText,
      match: ['/reports', '/incidents'],
    },
    {
      to: '/notifications',
      label: 'Notificaciones',
      icon: Activity,
      match: ['/notifications'],
      badge: unreadCount,
    },
    {
      to: '/statistics',
      label: statsLabel,
      icon: BarChart3,
      match: ['/statistics'],
    },
    ...(isAdmin
      ? [
          {
            to: '/admin',
            label: portalTitle,
            icon: ShieldAlert,
            match: ['/admin'],
          },
        ]
      : []),
    {
      to: '/profile',
      label: 'Perfil',
      icon: UserCircle,
      match: ['/profile'],
    },
  ];

  const isActive = (paths: string[]) => paths.some((path) => location.pathname.startsWith(path));

  const desktopLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
      active
        ? 'bg-sky-900 text-white shadow-sm shadow-sky-900/10'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const mobileLinkClass = (active: boolean) =>
    `flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
      active
        ? 'bg-sky-900 text-white shadow-sm shadow-sky-900/10'
        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      <aside className="no-print hidden lg:fixed lg:top-0 lg:left-0 lg:z-20 lg:h-screen lg:w-72 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-slate-200 lg:bg-white lg:px-6 lg:py-8 lg:overflow-y-auto">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-sky-900 text-white shadow-lg shadow-sky-900/10">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {portalTitle}
              </p>
              <p className="truncate text-xs text-slate-500">
                {portalSubtitle}
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.match);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={desktopLinkClass(active)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[0.65rem] font-semibold text-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bienvenido</p>
            <p className="mt-2 truncate font-semibold text-slate-900">{profile?.nombre ?? 'Usuario'}</p>
            <p className="text-xs text-slate-500">{welcomeRole}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-900 text-white shadow-sm shadow-sky-900/10">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{portalTitle}</p>
              <p className="truncate text-xs text-slate-500">{portalSubtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mt-3 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-xl shadow-slate-900/10">
            <div className="mb-3 rounded-2xl bg-white p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Bienvenido</p>
              <p className="mt-2 truncate font-semibold text-slate-900">{profile?.nombre ?? 'Usuario'}</p>
              <p className="text-xs text-slate-500">{welcomeRole}</p>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.match);

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileLinkClass(active)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && item.badge > 0 && (
                      <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-[0.65rem] font-semibold text-white">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </div>
        )}
      </header>
    </>
  );
}
