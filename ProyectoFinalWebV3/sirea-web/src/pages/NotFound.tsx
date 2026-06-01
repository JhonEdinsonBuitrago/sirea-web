import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2">Página no encontrada</p>
        <Link to="/" className="mt-4 inline-block text-sky-600">Volver al inicio</Link>
      </div>
    </div>
  );
}
