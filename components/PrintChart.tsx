"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

const JORNADAS = ["M", "T", "N"] as const;

type JornadaChartKey = (typeof JORNADAS)[number];
type CorrectionChartKey = `${JornadaChartKey}_corr`;

const J_COLOR: Record<JornadaChartKey, string> = {
  M: "#006b3c",
  T: "#d97706",
  N: "#4338ca",
};

const J_LABEL: Record<JornadaChartKey, string> = {
  M: "Mañana",
  T: "Tarde",
  N: "Noche",
};

export interface PrintDataPoint {
  dia: number;
  M: number | null;
  T: number | null;
  N: number | null;
  M_corr: number | null;
  T_corr: number | null;
  N_corr: number | null;
}

interface PrintChartProps {
  titulo: string;
  unidad: string;
  rangoMin: number;
  rangoMax: number;
  factorCorreccion: number;
  data: PrintDataPoint[];
  width?: number;
  height?: number;
}

function buildYTicks(rangoMin: number, rangoMax: number, unidad: string): number[] {
  const padding = unidad === "%" ? 3 : 2;
  const step = unidad === "%" ? 1 : 0.5;
  const yMin = Number.parseFloat((rangoMin - padding).toFixed(1));
  const yMax = Number.parseFloat((rangoMax + padding).toFixed(1));
  const ticks: number[] = [];

  for (let value = yMin; value <= yMax + 0.001; value += step) {
    ticks.push(Number.parseFloat(value.toFixed(1)));
  }

  return ticks;
}

export default function PrintChart({
  titulo,
  unidad,
  rangoMin,
  rangoMax,
  factorCorreccion,
  data,
  width = 720,
  height = 260,
}: PrintChartProps) {
  const [isClient, setIsClient] = useState(false);
  const hasCorrection = factorCorreccion !== 0;
  const yTicks = buildYTicks(rangoMin, rangoMax, unidad);
  const yMin = yTicks[0] ?? rangoMin;
  const yMax = yTicks[yTicks.length - 1] ?? rangoMax;

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <section className="break-inside-avoid space-y-0.5">
      <div className="flex flex-wrap items-center gap-2 text-[7px] text-gray-600">
        <span className="font-black uppercase text-gray-900">{titulo}</span>
        {JORNADAS.map((jornada) => (
          <span key={jornada} className="inline-flex items-center gap-1">
            <span className="inline-block h-0.5 w-4" style={{ background: J_COLOR[jornada] }} />
            <span style={{ color: J_COLOR[jornada] }}>{J_LABEL[jornada]}</span>
          </span>
        ))}
        {hasCorrection && (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <svg width="16" height="6" aria-hidden="true">
              <line x1="0" y1="3" x2="16" y2="3" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 2" />
            </svg>
            Corregido ({factorCorreccion > 0 ? "+" : ""}{factorCorreccion}{unidad})
          </span>
        )}
      </div>

      {isClient ? (
        <LineChart width={width} height={height} data={data} margin={{ top: 4, right: 28, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
          <ReferenceArea y1={rangoMin} y2={rangoMax} fill="#dbeafe" fillOpacity={0.35} stroke="none" />
          <ReferenceLine
            y={rangoMin}
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: `${rangoMin}${unidad}`, position: "insideBottomRight", fontSize: 9, fill: "#3b82f6" }}
          />
          <ReferenceLine
            y={rangoMax}
            stroke="#3b82f6"
            strokeDasharray="4 2"
            strokeWidth={1}
            label={{ value: `${rangoMax}${unidad}`, position: "insideTopRight", fontSize: 9, fill: "#3b82f6" }}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 8, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
            label={{ value: "Días", position: "insideBottom", offset: -6, fontSize: 8, fill: "#6b7280" }}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={yTicks}
            tick={{ fontSize: 8, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${Number(value).toFixed(1)}${unidad}`}
            width={44}
          />

          {JORNADAS.map((jornada) => (
            <Line
              key={jornada}
              type="linear"
              dataKey={jornada}
              name={J_LABEL[jornada]}
              stroke={J_COLOR[jornada]}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 2 }}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}

          {hasCorrection && JORNADAS.map((jornada) => {
            const correctionKey: CorrectionChartKey = `${jornada}_corr`;

            return (
              <Line
                key={correctionKey}
                type="linear"
                dataKey={correctionKey}
                name={`${J_LABEL[jornada]} corregido`}
                stroke={J_COLOR[jornada]}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                strokeOpacity={0.55}
                connectNulls={false}
                dot={false}
                activeDot={false}
                legendType="none"
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      ) : (
        <div aria-hidden="true" className="w-full" style={{ width, height }} />
      )}
    </section>
  );
}
