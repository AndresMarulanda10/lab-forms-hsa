"use client";

import { useEffect, useState } from "react";
import {
  Thermometer, Refrigerator, ChevronRight, ChevronLeft,
  X, BarChart2, Printer, Check, PenLine,
} from "lucide-react";

// ─── Definición de slides ─────────────────────────────────────────────────────

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
  visual: React.ReactNode;
  bg: string;
}

// ── Visuales reutilizables ────────────────────────────────────────────────────

const CHART_DEMO = (
  <div className="flex flex-col gap-1.5 mt-3">
    {[
      { label: "Mañana", color: "#006b3c", values: [22, 21, 23, 22, 21] },
      { label: "Tarde",  color: "#d97706", values: [24, 25, 26, 24, 28] },
      { label: "Noche",  color: "#4338ca", values: [20, 21, 19, 21, 20] },
    ].map(({ label, color, values }) => (
      <div key={label} className="flex items-center gap-2">
        <span className="text-[9px] w-12 text-right font-semibold text-white/80">{label}</span>
        <div className="flex items-end gap-1 h-8">
          {values.map((v, i) => {
            const outOfRange = v > 27;
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full">
                <div
                  className={`w-2 rounded-full ${outOfRange ? "ring-2 ring-red-300 bg-red-500" : ""}`}
                  style={{
                    height: `${((v - 18) / 12) * 28}px`,
                    backgroundColor: outOfRange ? "#ef4444" : color,
                    opacity: 0.85,
                  }}
                />
              </div>
            );
          })}
        </div>
        <span className="text-[8px] text-white/50">{values[values.length - 1].toFixed(1)}°</span>
      </div>
    ))}
  </div>
);

const TABLE_DEMO = (
  <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 text-[10px]">
    <div className="grid grid-cols-4 bg-hsa-green text-white font-semibold text-center">
      {["Día","Mañana","Tarde","Noche"].map(h => (
        <div key={h} className="py-1 px-1">{h}</div>
      ))}
    </div>
    {[
      [1, "22.1°", "23.4°", "21.8°"],
      [2, "—",     "24.0°", "22.5°"],
      [3, "28.2°⚠️", "23.1°", "22.9°"],
    ].map(([d, m, t, n]) => (
      <div key={String(d)} className="grid grid-cols-4 text-center border-t border-gray-50">
        <div className="py-1 font-bold text-gray-600">{d}</div>
        <div className={`py-1 ${String(m).includes("⚠️") ? "text-red-500 font-bold" : "text-gray-700"}`}>{m}</div>
        <div className="py-1 text-gray-700">{t}</div>
        <div className="py-1 text-gray-700">{n}</div>
      </div>
    ))}
  </div>
);

const MONTH_DEMO = (
  <div className="flex items-center justify-center gap-3 mt-4">
    <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><ChevronLeft size={14}/></div>
    <div className="px-4 py-1.5 bg-hsa-green/10 text-hsa-green rounded-xl text-xs font-bold">
      Abril 2026
    </div>
    <div className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><ChevronRight size={14}/></div>
  </div>
);

const FRIDGE_DEMO = (
  <div className="flex flex-col items-center gap-2 mt-3">
    <div className="flex gap-2">
      {["Nevera A","Nevera B","Nevera C"].map((n, i) => (
        <div key={n} className={`text-[10px] px-2 py-1 rounded-full font-semibold ${i === 0 ? "bg-hsa-green text-white" : "bg-gray-100 text-gray-500"}`}>
          {n}
        </div>
      ))}
    </div>
    <div className="text-[9px] text-gray-400 mt-1">Selecciona la nevera a registrar</div>
  </div>
);

const FIRMA_DEMO = (
  <div className="flex justify-center gap-3 mt-3">
    <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-white/15 rounded-xl">
      <PenLine size={13} className="text-green-100"/>
      <span className="text-[9px] text-green-100 font-semibold text-center leading-tight">Confirmar y<br/>agregar</span>
      <span className="text-[8px] text-green-200">por lectura</span>
    </div>
    <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-white/15 rounded-xl">
      <PenLine size={13} className="text-green-100"/>
      <span className="text-[9px] text-green-100 font-semibold text-center leading-tight">Guardar<br/>mes</span>
      <span className="text-[8px] text-green-200">cierre mensual</span>
    </div>
    <div className="flex flex-col items-center gap-1.5 px-3 py-2 bg-white/15 rounded-xl">
      <Printer size={13} className="text-green-100"/>
      <span className="text-[9px] text-green-100 font-semibold text-center leading-tight">Imprimir<br/>PDF</span>
      <span className="text-[8px] text-green-200">institucional</span>
    </div>
  </div>
);

// ── Construcción de slides por modo ───────────────────────────────────────────

function buildSlides(modo: "termohigrometria" | "neveras"): Slide[] {
  return [
    {
      icon: modo === "termohigrometria"
        ? <Thermometer size={28} className="text-white"/>
        : <Refrigerator size={28} className="text-white"/>,
      bg: "bg-hsa-green",
      title: modo === "termohigrometria"
        ? "Registro de Termohigrometría"
        : "Control de Neveras — Cadena de Frío",
      body: modo === "termohigrometria"
        ? "Esta pantalla reemplaza el formulario físico F-021. Registra temperatura y humedad del ambiente en tres jornadas: Mañana, Tarde y Noche. Cada lectura queda trazable por responsable y fecha."
        : "Esta pantalla reemplaza el formulario F-029. Registra la temperatura de cada nevera en las tres jornadas del día. Cada lectura queda trazable por responsable y fecha.",
      visual: modo === "neveras" ? FRIDGE_DEMO : MONTH_DEMO,
    },
    {
      icon: <BarChart2 size={28} className="text-white"/>,
      bg: "bg-hsa-green",
      title: "Navegación por mes",
      body: "Usa las flechas para moverte entre meses. Los datos de cada mes se guardan por separado. El mes actual carga automáticamente al entrar.",
      visual: MONTH_DEMO,
    },
    {
      icon: <PenLine size={28} className="text-white"/>,
      bg: "bg-amber-500",
      title: "Confirmar y agregar lecturas",
      body: "Selecciona la jornada, escribe el día y el valor. Al presionar «Confirmar y agregar» se valida el responsable y el dato se guarda automáticamente en la base de datos con trazabilidad completa.",
      visual: TABLE_DEMO,
    },
    {
      icon: <BarChart2 size={28} className="text-white"/>,
      bg: "bg-violet-500",
      title: "Gráfica con tres jornadas",
      body: "Mañana en verde, Tarde en ámbar y Noche en índigo — cada jornada tiene su propia línea. Los valores en el eje Y incluyen decimales. Los puntos rojos indican lecturas fuera del rango aceptable.",
      visual: CHART_DEMO,
    },
    {
      icon: <Printer size={28} className="text-white"/>,
      bg: "bg-hsa-green",
      title: "Guardar mes e imprimir",
      body: "Cada lectura se guarda automáticamente al confirmarla. «Guardar mes» registra los metadatos del formulario y el responsable de jornada. Usa Imprimir para generar el PDF institucional del hospital.",
      visual: FIRMA_DEMO,
    },
  ];
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  modo: "termohigrometria" | "neveras";
  storageKey?: string;
}

export default function OnboardingModal({ modo, storageKey }: Props) {
  const key = storageKey ?? `onboarding-${modo}-seen`;
  const [open,    setOpen]    = useState(false);
  const [slide,   setSlide]   = useState(0);
  const [exiting, setExiting] = useState(false);

  const slides = buildSlides(modo);
  const total  = slides.length;

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(t);
    }
  }, [key]);

  const close = () => {
    setExiting(true);
    setTimeout(() => {
      setOpen(false);
      setExiting(false);
      localStorage.setItem(key, "1");
    }, 300);
  };

  const next = () => {
    if (slide < total - 1) setSlide(s => s + 1);
    else close();
  };

  const prev = () => { if (slide > 0) setSlide(s => s - 1); };

  const s = open ? slides[slide] : slides[0];

  if (!open) return null;

  return (
    // Overlay
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4
        transition-all duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      {/* Card */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden
          transition-all duration-300 ${exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Header colorido */}
        <div className={`${s.bg} px-6 pt-8 pb-6 flex flex-col items-center text-center`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 shadow-inner">
            {s.icon}
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">{s.title}</h2>
          {s.visual}
        </div>

        {/* Contenido */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-gray-600 text-sm leading-relaxed text-center">{s.body}</p>
        </div>

        {/* Dots progress */}
        <div className="flex items-center justify-center gap-1.5 py-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-300
                ${i === slide
                  ? `w-5 h-2 ${s.bg}`
                  : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                }`}
            />
          ))}
        </div>

        {/* Navegación */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={prev}
            disabled={slide === 0}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-all"
          >
            <ChevronLeft size={14}/> Anterior
          </button>

          <button
            onClick={next}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-white font-semibold text-sm transition-all active:scale-95 ${s.bg} shadow-md`}
          >
            {slide === total - 1
              ? <><Check size={15}/> ¡Entendido!</>
              : <>Siguiente <ChevronRight size={15}/></>
            }
          </button>
        </div>

        {/* Skip */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          title="Cerrar"
        >
          <X size={14}/>
        </button>
      </div>
    </div>
  );
}
