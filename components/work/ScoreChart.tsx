"use client";

import { GradeScale, scoreRatio } from "@/lib/grading";

/**
 * Histograma simple (SVG, sin librerías) de la distribución de notas de
 * una tarea: agrupa las notas en 5 tramos de su escala y colorea de
 * verde los tramos aprobados y de rojo los reprobados.
 */
export function ScoreChart({ scores, scale }: { scores: number[]; scale: GradeScale }) {
  const BUCKETS = 5;
  if (scores.length === 0) return null;

  const counts = new Array(BUCKETS).fill(0) as number[];
  for (const score of scores) {
    const ratio = Math.max(0, Math.min(0.999, scoreRatio(score, scale)));
    counts[Math.floor(ratio * BUCKETS)]++;
  }
  const maxCount = Math.max(...counts, 1);
  const passingRatio = scoreRatio(scale.passing, scale);

  const W = 260;
  const H = 90;
  const gap = 6;
  const barW = (W - gap * (BUCKETS - 1)) / BUCKETS;

  return (
    <div className="score-chart">
      <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" style={{ maxWidth: 300 }}>
        {counts.map((count, i) => {
          const h = (count / maxCount) * H;
          const lo = i / BUCKETS;
          const passed = lo + 0.0001 >= passingRatio;
          const x = i * (barW + gap);
          const from = (scale.min + (scale.max - scale.min) * (i / BUCKETS)).toFixed(1);
          const to = (scale.min + (scale.max - scale.min) * ((i + 1) / BUCKETS)).toFixed(1);
          return (
            <g key={i}>
              <rect
                x={x}
                y={H - h}
                width={barW}
                height={h}
                rx={2}
                fill={passed ? "var(--green)" : "var(--red)"}
                opacity={count === 0 ? 0.15 : 0.85}
              />
              {count > 0 && (
                <text x={x + barW / 2} y={H - h - 3} textAnchor="middle" className="chart-count">
                  {count}
                </text>
              )}
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" className="chart-label">
                {from}–{to}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
