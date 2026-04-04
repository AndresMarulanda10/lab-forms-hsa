"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import type { LecturasTermohigrometria } from "@/lib/types";
import { getDiasEnMes, formatearTs } from "@/lib/types";

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
  /** Desplazamiento visual adicional para separar las líneas (no afecta valores reales) */
  offsetVisual?: number;
}

function CustomTooltip({ active, payload, unidad }: {
  active?: boolean;
  payload?: {
    name: string; value: number; color: string;
    payload: { corregidaReal?: number; auditTs?: string; auditQuien?: string };
  }[];
  unidad?: string;
}) {
  if (!active || !payload?.length) return null;
  const p0 = payload[0];
  const hasAudit = p0?.payload.auditTs;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      {payload.map(p => {
        if (p.value == null) return null;
        const display = p.name === "Corregida" && p.payload.corregidaReal != null
          ? p.payload.corregidaReal : p.value;
        return (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }}/>
            <span className="text-gray-500">{p.name}:</span>
            <span className="font-bold">{display.toFixed(1)}{unidad}</span>
          </div>
        );
      })}
      {hasAudit && (
        <div className="pt-1 border-t border-gray-100 text-[10px] text-gray-400 space-y-0.5">
          <div>🕐 {formatearTs(p0.payload.auditTs!)}</div>
          <div>👤 {p0.payload.auditQuien}</div>
        </div>
      )}
    </div>
  );
}

export default function RegistroChart({
  modo, lecturas, mes, año,
  rangoMin, rangoMax, factorCorreccion = 0, titulo, unidad = "°C",
  offsetVisual = 3,
}: Props) {
  const dias = getDiasEnMes(mes, año);

  const data = Array.from({ length: dias }, (_, i) => {
    const dia  = i + 1;
    const l    = lecturas[String(dia)];
    const v    = l ? (modo === "temperatura" ? l.temp : l.hum) : undefined;
    const real = v != null && factorCorreccion !== 0 ? v + factorCorreccion : null;
    return {
      dia,
      lectura:       v    != null ? parseFloat(v.toFixed(1))    : null,
      corregidaReal: real != null ? parseFloat(real.toFixed(1)) : null,
      corregida:     real != null ? parseFloat((real + offsetVisual).toFixed(1)) : null,
      // Auditoría para tooltip
      auditTs:    l?.ts,
      auditQuien: l?.quien,
    };
  });

  const yMin = rangoMin - 3;
  const yMax = rangoMax + 3 + (factorCorreccion !== 0 ? offsetVisual : 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-4 pt-3 pb-1 text-xs text-gray-500">
        <span className="font-semibold text-gray-700">{titulo}</span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="w-5 h-0.5 bg-hsa-blue inline-block"/>
          <span>Lectura</span>
        </div>
        {factorCorreccion !== 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-5 inline-block border-t-2 border-dashed border-sky-400"/>
            <span>Corregida</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb"/>
          <ReferenceArea y1={rangoMin} y2={rangoMax} fill="#dbeafe" fillOpacity={0.4} stroke="none"/>
          <ReferenceLine y={rangoMin} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1}
            label={{ value: `${rangoMin}${unidad}`, position: "insideBottomRight", fontSize: 9, fill: "#3b82f6" }}/>
          <ReferenceLine y={rangoMax} stroke="#3b82f6" strokeDasharray="4 2" strokeWidth={1}
            label={{ value: `${rangoMax}${unidad}`, position: "insideTopRight", fontSize: 9, fill: "#3b82f6" }}/>
          <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false}
            axisLine={{ stroke: "#d1d5db" }}
            label={{ value: "Días", position: "insideBottom", offset: -10, fontSize: 10, fill: "#9ca3af" }}/>
          <YAxis domain={[yMin, yMax]} tickCount={12} tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false} axisLine={false}
            tickFormatter={v => Number.isInteger(v) ? `${v}${unidad}` : `${v.toFixed(1)}${unidad}`}/>
          <Tooltip content={<CustomTooltip unidad={unidad}/>} cursor={{ stroke: "#e5e7eb", strokeDasharray: "3 3" }}/>

          {/* Línea 1: lectura real — azul sólido grueso, puntos rellenos */}
          <Line type="linear" dataKey="lectura" name={`${titulo}`}
            stroke="#1d4ed8" strokeWidth={2.5} connectNulls={false}
            dot={({ key: _k, cx, cy, payload }) => {
              if (!cx || !cy || payload?.lectura == null) return <g key={_k}/>;
              const fuera = payload.lectura < rangoMin || payload.lectura > rangoMax;
              return <circle key={_k} cx={cx} cy={cy} r={4}
                fill={fuera ? "#ef4444" : "#1d4ed8"} stroke="white" strokeWidth={1.5}/>;
            }}
            activeDot={{ r: 6 }}/>

          {/* Línea 2: corregida — celeste discontinuo, rombo hueco */}
          {factorCorreccion !== 0 && (
            <Line type="linear" dataKey="corregida" name="Corregida"
              stroke="#0284c7" strokeWidth={2} strokeDasharray="7 4" connectNulls={false}
              dot={({ key: _k, cx, cy, payload }) => {
                if (!cx || !cy || payload?.corregida == null) return <g key={_k}/>;
                const s = 5;
                return (
                  <polygon key={_k}
                    points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`}
                    fill="white" stroke="#0284c7" strokeWidth={2}/>
                );
              }}
              activeDot={{ r: 6 }}/>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
