import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left column */}
          <section>
            <div className="inline-flex items-center gap-2 bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-sm w-max">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.567 3-3.5S13.657 1 12 1 9 2.567 9 4.5 10.343 8 12 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              </svg>
              Portal Institucional · Universidad de la Amazonia
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Sistema de Reporte de{' '}
              <span className="text-sky-700">Incidentes</span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              Reporta daños, problemas de infraestructura y situaciones de riesgo dentro de la Universidad de la Amazonia de forma rápida y segura. Seguimiento en tiempo real para cada reporte.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-full shadow font-semibold transition"
              >
                Ingresar al sistema
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 bg-white text-slate-700 rounded-full shadow-sm font-semibold transition hover:bg-slate-50"
              >
                Registrarse
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-12 flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-bold text-slate-900">100%</p>
                <p className="text-sm text-slate-500 mt-1">Seguimiento en línea</p>
              </div>
              <div className="border-l border-slate-200 pl-8">
                <p className="text-2xl font-bold text-slate-900">RF-10</p>
                <p className="text-sm text-slate-500 mt-1">Agrupación inteligente</p>
              </div>
              <div className="border-l border-slate-200 pl-8">
                <p className="text-2xl font-bold text-slate-900">GPS</p>
                <p className="text-sm text-slate-500 mt-1">Geolocalización exacta</p>
              </div>
            </div>
          </section>

          {/* Right column - Mockup */}
          <section className="relative mt-8 lg:mt-0">
            <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-5 overflow-hidden">
              {/* Mockup header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="text-xs text-slate-400 font-medium">SIREA · Panel de Incidentes</div>
                <div className="w-16" />
              </div>

              {/* Mockup content */}
              <div className="bg-slate-950/60 rounded-xl p-4 space-y-3">
                {/* Stat cards row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/80 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-xl font-bold text-white mt-1">24</p>
                    <p className="text-xs text-sky-400 mt-1">Reportes</p>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3">
                    <p className="text-xs text-slate-400">En Proceso</p>
                    <p className="text-xl font-bold text-amber-400 mt-1">8</p>
                    <p className="text-xs text-slate-400 mt-1">Activos</p>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Resueltos</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">14</p>
                    <p className="text-xs text-slate-400 mt-1">Completados</p>
                  </div>
                </div>

                {/* Incident list mockup */}
                <div className="bg-slate-800/60 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">Últimos reportes</p>
                  {[
                    { tipo: 'Infraestructura', lugar: 'Bloque B - Piso 2', estado: 'En proceso', color: 'text-amber-400' },
                    { tipo: 'Electricidad', lugar: 'Lab. de Sistemas', estado: 'Reportado', color: 'text-rose-400' },
                    { tipo: 'Baño', lugar: 'Bloque A - Piso 1', estado: 'Resuelto', color: 'text-emerald-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-900/60 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-white">{item.tipo}</p>
                        <p className="text-xs text-slate-500">{item.lugar}</p>
                      </div>
                      <span className={`text-xs font-semibold ${item.color}`}>{item.estado}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overlay notification card */}
            <div className="absolute -bottom-4 left-4 w-[70%] bg-white rounded-xl shadow-xl p-4 flex items-center justify-between border border-slate-100">
              <div>
                <div className="text-xs text-slate-500">Notificación reciente</div>
                <div className="font-semibold text-slate-900 text-sm mt-0.5">Reporte marcado como resuelto</div>
              </div>
              <span className="ml-3 shrink-0 inline-block bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">✓ Resuelto</span>
            </div>
          </section>
        </div>
      </div>

      {/* Features section */}
      <div className="max-w-7xl mx-auto px-6 pb-20 mt-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Funcionalidades</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900">Todo lo que necesitas para gestionar incidentes</h2>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">Una plataforma completa diseñada para la comunidad universitaria de la Amazonia.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '📋',
              title: 'Reporte fácil',
              desc: 'Formulario rápido con foto, ubicación GPS y descripción detallada del incidente.'
            },
            {
              icon: '🔔',
              title: 'Notificaciones en tiempo real',
              desc: 'Recibe alertas cuando el estado de tu reporte cambie o sea resuelto.'
            },
            {
              icon: '📊',
              title: 'Estadísticas y reportes',
              desc: 'Visualiza gráficas por tipo, estado y periodo. Exporta e imprime fácilmente.'
            },
            {
              icon: '🗂️',
              title: 'Agrupación inteligente',
              desc: 'El sistema detecta incidentes similares y permite agruparlos para un mejor seguimiento.'
            },
            {
              icon: '📍',
              title: 'Geolocalización GPS',
              desc: 'Registra la ubicación exacta del incidente con coordenadas desde tu dispositivo.'
            },
            {
              icon: '🔐',
              title: 'Acceso institucional',
              desc: 'Solo usuarios con correo @uniamazonia.edu.co pueden registrarse en el sistema.'
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-6">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA bottom */}
        <div className="mt-16 rounded-3xl bg-sky-700 px-8 py-12 text-center text-white shadow-lg">
          <h2 className="text-2xl font-bold">¿Listo para reportar un incidente?</h2>
          <p className="mt-3 text-sky-200 max-w-md mx-auto">Accede con tu correo institucional y contribuye a mantener la universidad en óptimas condiciones.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-sky-700 font-semibold rounded-full shadow transition hover:bg-sky-50"
            >
              Crear cuenta
            </Link>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 border border-sky-400 text-white font-semibold rounded-full transition hover:bg-sky-600"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
