import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text */}
          <section>
            <div className="inline-flex items-center gap-3 bg-sky-50 text-sky-700 px-3 py-1 rounded-full text-sm w-max">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.567 3-3.5S13.657 1 12 1 9 2.567 9 4.5 10.343 8 12 8zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              </svg>
              Portal Institucional de Transparencia
            </div>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Sistema de Reporte de
              <br />
              Incidentes
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              Reporta daños, problemas de infraestructura y situaciones de riesgo dentro de la Universidad de la Amazonia de forma rápida y segura. Nuestra plataforma garantiza un seguimiento en tiempo real.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/incidents/new" className="inline-flex items-center gap-2 px-5 py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-full shadow">
                Reportar incidente
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <Link to="/statistics" className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 bg-white text-slate-700 rounded-full shadow-sm">
                Ver estadísticas
              </Link>
            </div>
          </section>

          {/* Right column - Mockup / card */}
          <section className="relative">
            <div className="w-full h-80 sm:h-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-6 overflow-hidden relative">
              <div className="h-full w-full rounded-xl bg-[linear-gradient(180deg,#0f1724_0%,#0b1220_100%)] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="text-sm opacity-80">Uniamazonia Report</div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-700/40" />
                    <div className="w-8 h-8 rounded bg-slate-700/40" />
                    <div className="w-8 h-8 rounded bg-slate-700/40" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-12 gap-4">
                  <div className="col-span-8 h-36 bg-slate-700/30 rounded-lg" />
                  <div className="col-span-4 h-36 bg-slate-700/20 rounded-lg" />
                  <div className="col-span-4 h-24 bg-slate-700/20 rounded-lg" />
                  <div className="col-span-8 h-24 bg-slate-700/30 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Overlay card */}
            <div className="absolute -bottom-6 left-6 transform translate-y-6 w-[68%] sm:w-2/3">
              <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Último reporte resuelto</div>
                  <div className="font-semibold text-slate-900">Laboratorio de Redes - Piso 3</div>
                </div>
                <div className="ml-4">
                  <span className="inline-block bg-sky-100 text-sky-700 text-sm px-3 py-1 rounded-full">Completado</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
