import type { Incident } from '../types';

export interface SimilarIncidentPair {
  id: string;
  score: number;
  reasons: string[];
  incidentIds: string[];
  primary: Incident;
  duplicate: Incident;
}

const STOP_WORDS = new Set([
  'con', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'para', 'por', 'que', 'como', 'esta', 'este', 'esto',
  'hay', 'muy', 'sin', 'sobre', 'entre', 'donde', 'cuando', 'desde', 'hacia', 'incidente', 'problema', 'reporte'
]);

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensFromIncident(incident: Incident) {
  const text = normalizeText([
    incident.titulo,
    incident.descripcion,
    incident.tipo,
    incident.ubicacion_texto,
    incident.salon
  ].filter(Boolean).join(' '));

  return new Set(
    text
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !STOP_WORDS.has(token))
  );
}

function jaccardSimilarity(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function distanceInMeters(left: Incident, right: Incident) {
  if (
    typeof left.latitud !== 'number' ||
    typeof left.longitud !== 'number' ||
    typeof right.latitud !== 'number' ||
    typeof right.longitud !== 'number'
  ) {
    return null;
  }

  const earthRadius = 6371000;
  const lat1 = (left.latitud * Math.PI) / 180;
  const lat2 = (right.latitud * Math.PI) / 180;
  const deltaLat = ((right.latitud - left.latitud) * Math.PI) / 180;
  const deltaLon = ((right.longitud - left.longitud) * Math.PI) / 180;

  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function daysBetween(left?: string, right?: string) {
  if (!left || !right) return null;
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return null;
  return Math.abs(leftTime - rightTime) / (1000 * 60 * 60 * 24);
}

function sameNormalizedValue(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function similarLocationText(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  return Boolean(
    normalizedLeft &&
    normalizedRight &&
    normalizedLeft.length >= 5 &&
    normalizedRight.length >= 5 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  );
}

function isGrouped(incident: Incident) {
  return Boolean(incident.grupo_id || incident.group_id);
}

export function calculateIncidentSimilarity(left: Incident, right: Incident) {
  let score = 0;
  const reasons: string[] = [];

  if (sameNormalizedValue(left.tipo, right.tipo)) {
    score += 25;
    reasons.push('Mismo tipo de incidente');
  }

  if (sameNormalizedValue(left.salon, right.salon)) {
    score += 18;
    reasons.push('Mismo salón o dependencia');
  }

  if (sameNormalizedValue(left.ubicacion_texto, right.ubicacion_texto)) {
    score += 18;
    reasons.push('Misma ubicación registrada');
  } else if (similarLocationText(left.ubicacion_texto, right.ubicacion_texto)) {
    score += 10;
    reasons.push('Ubicaciones textuales parecidas');
  }

  const meters = distanceInMeters(left, right);
  if (meters !== null) {
    if (meters <= 50) {
      score += 22;
      reasons.push('Ubicación geográfica muy cercana');
    } else if (meters <= 150) {
      score += 14;
      reasons.push('Ubicación geográfica cercana');
    }
  }

  const textSimilarity = jaccardSimilarity(tokensFromIncident(left), tokensFromIncident(right));
  if (textSimilarity >= 0.45) {
    score += 25;
    reasons.push('Título o descripción muy similares');
  } else if (textSimilarity >= 0.25) {
    score += 16;
    reasons.push('Coincidencias en palabras clave');
  } else if (textSimilarity >= 0.12) {
    score += 8;
    reasons.push('Algunas palabras clave coinciden');
  }

  const elapsedDays = daysBetween(left.created_at, right.created_at);
  if (elapsedDays !== null) {
    if (elapsedDays <= 1) {
      score += 10;
      reasons.push('Reportados en menos de 24 horas');
    } else if (elapsedDays <= 3) {
      score += 6;
      reasons.push('Reportados en fechas cercanas');
    }
  }

  if (left.estado !== 'resuelto' && right.estado !== 'resuelto') {
    score += 5;
    reasons.push('Ambos siguen sin resolver');
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons.length > 0 ? reasons : ['Coincidencia general detectada']
  };
}

export function buildDuplicateSuggestions(incidents: Incident[], threshold = 55): SimilarIncidentPair[] {
  const candidates = incidents.filter((incident) => !isGrouped(incident));
  const pairs: SimilarIncidentPair[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i];
      const right = candidates[j];
      const result = calculateIncidentSimilarity(left, right);

      if (result.score >= threshold) {
        pairs.push({
          id: `${left.id}-${right.id}`,
          score: result.score,
          reasons: result.reasons,
          incidentIds: [left.id, right.id],
          primary: left,
          duplicate: right
        });
      }
    }
  }

  return pairs
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}
