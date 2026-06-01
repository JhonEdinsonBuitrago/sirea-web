import React from 'react';
import { Link } from 'react-router-dom';
import { Incident } from '../types';
import { motion } from 'framer-motion';

export default function IncidentCard({ incident }: { incident: Incident }) {
  const color = incident.estado === 'resuelto' ? 'bg-green-50' : incident.estado === 'en_proceso' ? 'bg-yellow-50' : 'bg-red-50';
  return (
    <motion.div whileHover={{ y: -4 }} className={`p-4 rounded shadow ${color}`}>
      <Link to={`/incidents/${incident.id}`} className="block">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold text-slate-900">{incident.tipo}</h3>
          {incident.incident_groups?.title ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{incident.incident_groups.title}</span>
          ) : (incident.group_id || incident.grupo_id) ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Agrupado</span>
          ) : null}
        </div>
        <img src={incident.imagen_url} alt="imagen" className="w-full h-40 object-cover rounded mb-2" />
        <p className="text-sm text-slate-600">{incident.descripcion}</p>
        <p className="text-xs mt-2 text-slate-500">{new Date(incident.created_at || '').toLocaleString()}</p>
      </Link>
    </motion.div>
  );
}
