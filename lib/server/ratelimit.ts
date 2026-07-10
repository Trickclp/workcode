/**
 * Límite de intentos en memoria (ventana deslizante) para frenar abuso:
 * fuerza bruta en login, registro masivo y spam de calificación.
 *
 * Es best-effort: en Vercel puede haber varias instancias serverless,
 * así que el límite real es por instancia. Suficiente como primera
 * barrera; para algo estricto se conecta Upstash/Redis manteniendo esta
 * misma interfaz.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0];
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000) };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  // Limpieza oportunista para no crecer sin límite.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterSec: 0 };
}

/** IP del cliente detrás del proxy de Vercel. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "desconocida";
}
