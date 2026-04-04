"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import type { LecturasNevera } from "@/lib/types";
import { getDiasEnMes } from "@/lib/types";

interface Props {
  lecturas: LecturasNevera;
  mes: number;
  año: number;
  rangoMin: number;
  rangoMax: number;
  factorCorreccion: number;
  /** Desplazamiento visual adicional para separar las líneas en pantalla (no afecta valores reales) */
  offsetVisual?: number;
}

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; payload: { corregidaReal?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      {payload.map(p => {
        if (p.value == null) return null;
        // Para "Corregida", mostrar el valor real (no el desplazado visualmente)
        const display = p.name === "Corregida" && p.payload.corregidaReal != null
          ? p.payload.corregidaReal
          : p.value;
        return (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
            <span className="text-gray-500">{p.name}:</span>
            <span className="font-bold">{display.toFixed(1)}°C</span>
          </div>
        );
      })}
    </div>
  );
}

export default function NeveraChart({ lecturas, mes, año, rangoMin, rangoMax, factorCorreccion, offsetVisual = 2 }: Props) {
  const dias = getDiasEnMes(mes, año);

  // Un dato por día: lectura cruda y corregida
  // corregidaDisplay = valor real + offsetVisual extra para separación visual
  // corregidaReal    = valor real (solo para tooltip)
  const data = Array.from({ length: dias }, (_, i) => {
    const dia = i + 1;
    const v   = lecturas[String(dia)];
    const real = v != null ? v + factorCorreccion : null;
    return {
      dia,
      lectura:        v    != null ? parseFloat(v.toFixed(1))    : null,
      corregidaReal:  real != null ? parseFloat(real.toFixed(1)) : null,
      corregida:      real != null ? parseFloat((real + offsetVisual).toFixed(1)) : null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={440}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />

        {/* Zona aceptable */}
        <ReferenceArea y1={rangoMin} y2={rangoMax} fill="#dcfce7" fillOpacity={0.5} stroke="none" />
        <ReferenceLine y={rangoMin} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1}
          label={{ value: `${rangoMin}°C`, position: "insideBottomRight", fontSize: 9, fill: "#16a34a" }} />
        <ReferenceLine y={rangoMax} stroke="#16a34a" strokeDasharray="4 2" strokeWidth={1}
          label={{ value: `${rangoMax}°C`, position: "insideTopRight", fontSize: 9, fill: "#16a34a" }} />

        <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false}
          axisLine={{ stroke: "#d1d5db" }}
          label={{ value: "Días", position: "insideBottom", offset: -10, fontSize: 10, fill: "#9ca3af" }} />
        <YAxis domain={[-2, 10 + offsetVisual]} tickCount={14}
          tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
          tickFormatter={v => Number.isInteger(v) ? `${v}°` : `${v.toFixed(1)}°`}
          label={{ value: "Temperatura", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af", offset: 10 }} />

        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeDasharray: "3 3" }} />

        {/* Línea 1: lectura real — verde sólido, puntos rellenos */}
        <Line type="linear" dataKey="lectura" name="Lectura"
          stroke="#006b3c" strokeWidth={2.5} connectNulls={false}
          dot={({ key: _k, cx, cy, payload }) => {
            if (!cx || !cy || payload?.lectura == null) return <g key={_k} />;
            const fuera = payload.lectura < rangoMin || payload.lectura > rangoMax;
            return <circle key={_k} cx={cx} cy={cy} r={4}
              fill={fuera ? "#ef4444" : "#006b3c"} stroke="white" strokeWidth={1.5} />;
          }}
          activeDot={{ r: 6 }} />

        {/* Línea 2: lectura corregida — azul discontinuo más grueso, rombo hueco */}
        {factorCorreccion !== 0 && (
          <Line type="linear" dataKey="corregida" name="Corregida"
            stroke="#0052a5" strokeWidth={2} strokeDasharray="7 4" connectNulls={false}
            dot={({ key: _k, cx, cy, payload }) => {
              if (!cx || !cy || payload?.corregida == null) return <g key={_k} />;
              // Rombo (diamante) para diferenciar del punto circular
              const s = 5;
              return (
                <polygon key={_k}
                  points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                  fill="white" stroke="#0052a5" strokeWidth={2} />
              );
            }}
            activeDot={{ r: 6 }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
