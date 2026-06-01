import React from 'react';

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/40 text-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-700" />
        <p className="text-base font-medium text-slate-800">Restaurando tu sesión...</p>
        <p className="mt-2 text-sm text-slate-500">Un momento mientras verificamos tu autenticación segura.</p>
      </div>
    </div>
  );
}
