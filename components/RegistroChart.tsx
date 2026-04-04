"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import type { LecturasTermohigrometria } from "@/lib/types";
import { getDiasEnMes, formatearTs } from "@/lib/types";

// ─── Colores por jornada (igual que NeveraChart) ──────────────────────────────
type J = "M" | "T" | "N";
const J_COLOR: Record<J, string> = {
  M: "#006b3c",
  T: "#d97706",
  N: "#4338ca",
};
const J_LABEL: Record<J, string> = {
  M: "Mañana",
  T: "Tarde",
  N: "Noche",
};
const JORNADAS: J[] = ["M", "T", "N"];

interface DataPoint {
  dia: number;
  M: number | null;
  T: number | null;
  N: number | null;
  M_corr: number | null;
  T_corr: number | null;
  N_corr: number | null;
  auditM?: string | null;
  auditT?: string | null;
  auditN?: string | null;
  quienM?: string | null;
  quienT?: string | null;
  quienN?: string | null;
}

interface Props {
  modo: "temperatura" | "humedad";
  lecturas: LecturasTermohigrometria;
  mes: number;
  año: number;
  rangoMin: number;
  rangoMax: number;
  factorCorreccion?: number;
  titulo?: string;
  unidad?: string;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function CustomTooltip({
  active, payload, rangoMin, rangoMax, unidad, factorCorreccion,
}: {
  active?: boolean;
  payload?: { payload: DataPoint }[];
  rangoMin: number;
  rangoMax: number;
  unidad: string;
  factorCorreccion: number;
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload;
  if (!JORNADAS.some(j => pt[j] != null)) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1.5 max-w-[220px]">
      <div className="font-semibold text-gray-600 border-b border-gray-100 pb-1">
        Día {pt.dia}
      </div>
      {JORNADAS.map(j => {
        const v = pt[j];
        if (v == null) return null;
        const fuera = v < rangoMin || v > rangoMax;
        const corr = factorCorreccion !== 0 ? (v + factorCorreccion).toFixed(1) : null;
        const ts   = pt[`audit${j}` as "auditM" | "auditT" | "auditN"];
        const quien = pt[`quien${j}` as "quienM" | "quienT" | "quienN"];
        return (
          <div key={j} className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: J_COLOR[j] }} />
              <span className="text-gray-500 text-[11px]">{J_LABEL[j]}:</span>
              <span className={`font-bold ${fuera ? "text-red-500" : "text-gray-800"}`}>
                {v.toFixed(1)}{unidad}
              </span>
              {corr && <span className="text-gray-400 text-[10px]">→ {corr}{unidad}</span>}
              {fuera && <span className="text-red-400 text-[10px] font-medium">⚠ fuera</span>}
            </div>
            {ts && (
              <div className="ml-4 text-[10px] text-gray-400 space-y-0.5">
                <div>🕐 {formatearTs(ts)}</div>
                {quien && <div>👤 {quien}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
/**
 * Renderiza el gráfico SIN wrapper de card — el padre es responsable de envolverlo.
 * Esto permite añadir secciones de input debajo del gráfico dentro del mismo card.
 */
export default function RegistroChart({
  modo, lecturas, mes, año,
  rangoMin, rangoMax, factorCorreccion = 0,
  titulo, unidad = "°C",
}: Props) {
  const dias = getDiasEnMes(mes, año);

  /** Backward-compat: clave legacy "dia" → Mañana */
  const getEntry = (dia: number, j: J) => {
    const entry = lecturas[`${dia}_${j}`];
    if (entry !== undefined) return entry;
    if (j === "M") return lecturas[String(dia)];
    return undefined;
  };

  const getVal = (dia: number, j: J): number | null => {
    const e = getEntry(dia, j);
    if (!e) return null;
    const raw = modo === "temperatura" ? e.temp : e.hum;
    return raw != null ? raw : null;
  };

  const hasCorr = factorCorreccion !== 0;

  const data: DataPoint[] = Array.from({ length: dias }, (_, i) => {
    const dia = i + 1;
    const eM = getEntry(dia, "M");
    const eT = getEntry(dia, "T");
    const eN = getEntry(dia, "N");
    const vM = getVal(dia, "M");
    const vT = getVal(dia, "T");
    const vN = getVal(dia, "N");
    return {
      dia,
      M: vM,
      T: vT,
      N: vN,
      M_corr: hasCorr && vM != null ? parseFloat((vM + factorCorreccion).toFixed(2)) : null,
      T_corr: hasCorr && vT != null ? parseFloat((vT + factorCorreccion).toFixed(2)) : null,
      N_corr: hasCorr && vN != null ? parseFloat((vN + factorCorreccion).toFixed(2)) : null,
      auditM: eM?.ts ?? null,
      auditT: eT?.ts ?? null,
      auditN: eN?.ts ?? null,
      quienM: eM?.quien ?? null,
      quienT: eT?.quien ?? null,
      quienN: eN?.quien ?? null,
    };
  });

  // Ticks explícitos: 0.5 para °C, 1 para %
  const step = unidad === "%" ? 1 : 0.5;
  const yMin = parseFloat((rangoMin - 3).toFixed(1));
  const yMax = parseFloat((rangoMax + 3).toFixed(1));
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.001; v += step) {
    yTicks.push(parseFloat(v.toFixed(1)));
  }

  return (
    <>
      {/* Leyenda */}
      <div className="flex items-center gap-4 px-4 pt-3 pb-1 text-xs text-gray-500 flex-wrap">
        {titulo && <span className="font-semibold text-gray-700 mr-1">{titulo}</span>}
        {JORNADAS.map(j => (
          <div key={j} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block" style={{ background: J_COLOR[j] }} />
            <span style={{ color: J_COLOR[j] }} className="font-medium text-[11px]">{J_LABEL[j]}</span>
          </div>
        ))}
        {hasCorr && (
          <div className="flex items-center gap-1.5 ml-1">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 2"/></svg>
            <span className="text-gray-400 text-[11px]">Corregido ({factorCorreccion > 0 ? "+" : ""}{factorCorreccion})</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 32, left: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
          <ReferenceArea y1={rangoMin} y2={rangoMax} fill="#dbeafe" fillOpacity={0.35} stroke="none" />
          <ReferenceLine y={rangoMin} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1}
            label={{ value: `${rangoMin}${unidad}`, position: "insideBottomRight", fontSize: 9, fill: "#3b82f6" }} />
          <ReferenceLine y={rangoMax} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1}
            label={{ value: `${rangoMax}${unidad}`, position: "insideTopRight", fontSize: 9, fill: "#3b82f6" }} />
          <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
            label={{ value: "Días", position: "insideBottom", offset: -10, fontSize: 10, fill: "#9ca3af" }} />
          <YAxis domain={[yMin, yMax]} ticks={yTicks}
            tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false}
            tickFormatter={v => `${v.toFixed(1)}${unidad}`}
            width={44} />
          <Tooltip
            content={
              <CustomTooltip rangoMin={rangoMin} rangoMax={rangoMax} unidad={unidad} factorCorreccion={factorCorreccion} />
            }
            cursor={{ stroke: "#e5e7eb", strokeDasharray: "3 3" }}
          />

          {JORNADAS.map(j => (
            <Line
              key={j}
              type="linear"
              dataKey={j}
              name={J_LABEL[j]}
              stroke={J_COLOR[j]}
              strokeWidth={2}
              connectNulls={false}
              dot={({ key: _k, cx, cy, payload }: { key: string; cx: number; cy: number; payload: DataPoint }) => {
                const v = payload?.[j as keyof DataPoint] as number | null | undefined;
                if (!cx || !cy || v == null) return <g key={_k} />;
                const fuera = v < rangoMin || v > rangoMax;
                return (
                  <circle
                    key={_k} cx={cx} cy={cy} r={4}
                    fill={fuera ? "#ef4444" : J_COLOR[j]}
                    stroke="white" strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 6 }}
            />
          ))}

          {/* Líneas corregidas (punteadas) — solo cuando factorCorreccion ≠ 0 */}
          {hasCorr && JORNADAS.map(j => {
            const corrKey = `${j}_corr` as "M_corr" | "T_corr" | "N_corr";
            return (
              <Line
                key={`${j}_corr`}
                type="linear"
                dataKey={corrKey}
                name={`${J_LABEL[j]} corregido`}
                stroke={J_COLOR[j]}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                strokeOpacity={0.55}
                connectNulls={false}
                dot={false}
                activeDot={false}
                legendType="none"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
