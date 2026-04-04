"use client";

import { useEffect, useState } from "react";
import {
  Thermometer, Refrigerator, ChevronRight, ChevronLeft,
  X, BarChart2, Save, Printer, Check,
} from "lucide-react";

// ─── Definición de slides ─────────────────────────────────────────────────────

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
  visual: React.ReactNode;
  color: string;
  bg: string;
}

const DOT_DEMO = (
  <div className="flex items-end justify-center gap-2 h-20 mt-2">
    {[18, 22, null, 25, 14, 28, 31, 24, null, 20].map((v, i) => {
      if (v === null) return <div key={i} className="w-3" />;
      const ok = v >= 15 && v <= 30;
      return (
        <div key={i} className="flex flex-col items-center gap-1">
          <span className={`text-[9px] font-bold ${ok ? "text-green-600" : "text-red-500"}`}>
            {v}°
          </span>
          <div
            className={`w-3 h-3 rounded-full border-2 border-white shadow-md ${ok ? "bg-amber-400" : "bg-red-500 ring-4 ring-red-200"}`}
          />
        </div>
      );
    })}
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
      [2, "—", "24.0°", "22.5°"],
      [3, "31.2°⚠️", "23.1°", "22.9°"],
    ].map(([d, m, t, n]) => (
      <div key={d} className="grid grid-cols-4 text-center border-t border-gray-50">
        <div className="py-1 font-bold text-gray-600">{d}</div>
        <div className={`py-1 ${String(m).includes("⚠️") ? "text-red-500 font-bold" : "text-gray-700"}`}>{m}</div>
        <div className="py-1 text-gray-700">{t}</div>
        <div className="py-1 text-gray-700">{n}</div>
      </div>
    ))}
  </div>
);

const SAVE_DEMO = (
  <div className="flex items-center justify-center gap-3 mt-4">
    <div className="flex items-center gap-2 px-3 py-2 bg-hsa-green text-white rounded-xl text-xs font-semibold shadow-md">
      <Save size={13} /> Guardar
    </div>
    <div className="flex items-center gap-2 px-3 py-2 bg-hsa-green text-white rounded-xl text-xs font-semibold shadow-md">
      <Printer size={13} /> Imprimir
    </div>
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
    <div className="text-[9px] text-gray-400 mt-1">Seleccioná la nevera a registrar</div>
  </div>
);

function buildSlides(modo: "termohigrometria" | "neveras"): Slide[] {
  return [
    {
      icon: <Thermometer size={28} className="text-white" />,
      color: "text-hsa-green",
      bg: "bg-hsa-green",
      title: modo === "termohigrometria"
        ? "Registro de Termohigrometría"
        : "Control de Neveras — Cadena de Frío",
      body: modo === "termohigrometria"
        ? "Esta pantalla reemplaza el formulario físico F-021. Registrá temperatura y humedad del ambiente tres veces por día: mañana, tarde y noche."
        : "Esta pantalla reemplaza el formulario F-029. Registrá la temperatura de cada nevera en las tres jornadas del día.",
      visual: modo === "neveras" ? FRIDGE_DEMO : MONTH_DEMO,
    },
    {
      icon: <BarChart2 size={28} className="text-white" />,
      color: "text-hsa-green",
      bg: "bg-hsa-green",
      title: "Navegación por mes",
      body: "Usá las flechas para moverse entre meses. Los datos de cada mes se guardan por separado. El mes actual carga automáticamente.",
      visual: MONTH_DEMO,
    },
    {
      icon: modo === "termohigrometria"
        ? <Thermometer size={28} className="text-white" />
        : <Refrigerator size={28} className="text-white" />,
      color: "text-amber-600",
      bg: "bg-amber-500",
      title: "Cómo ingresar lecturas",
      body: "En la tabla encontrás una fila por día. Cada columna es una jornada (M/T/N). Escribí el valor numérico y presioná Tab o Enter para avanzar. Los valores fuera de rango se marcan en rojo automáticamente.",
      visual: TABLE_DEMO,
    },
    {
      icon: <BarChart2 size={28} className="text-white" />,
      color: "text-violet-600",
      bg: "bg-violet-500",
      title: "Gráfica interactiva",
      body: "Cada punto representa una lectura. La banda verde muestra el rango aceptable. Los puntos rojos con halo indican valores fuera de rango. Pasá el mouse sobre un punto para ver el detalle.",
      visual: DOT_DEMO,
    },
    {
      icon: <Save size={28} className="text-white" />,
      color: "text-hsa-green",
      bg: "bg-hsa-green",
      title: "Guardar e imprimir",
      body: "Hacé clic en Guardar para registrar todos los datos en la base de datos. Usá Imprimir para generar el PDF institucional con el formato oficial del hospital.",
      visual: SAVE_DEMO,
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
        </div>

        {/* Contenido */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-gray-600 text-sm leading-relaxed text-center">{s.body}</p>
          {s.visual}
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
