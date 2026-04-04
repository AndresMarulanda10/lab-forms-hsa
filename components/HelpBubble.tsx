"use client";

import { useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Check,
  Thermometer, Refrigerator,
  Printer, BarChart2, PenLine, Settings, Plus,
} from "lucide-react";

// ─── Slides de ayuda general ─────────────────────────────────────────────────

const SLIDES = [
  {
    bg: "bg-hsa-green",
    icon: <Settings size={26} className="text-white"/>,
    title: "Bienvenido al Sistema de Registros",
    body: "Plataforma digital del Laboratorio Clínico del E.S.E. Hospital San Antonio de Chía. Registrá, visualizá y exportá los formularios F-021 y F-029 sin papel.",
    visual: (
      <div className="flex justify-center gap-3 mt-4">
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Thermometer size={18} className="text-white"/>
          </div>
          <span className="text-[10px] text-green-100">F-021 Termohigrometría</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Refrigerator size={18} className="text-white"/>
          </div>
          <span className="text-[10px] text-green-100">F-029 Neveras</span>
        </div>
      </div>
    ),
  },
  {
    bg: "bg-amber-500",
    icon: <Plus size={26} className="text-white"/>,
    title: "Ingresar lecturas",
    body: "Escribí el día y el valor de temperatura (y humedad en F-021), luego presioná Enter o el botón Agregar. Usá 🧪 Prueba para cargar datos de ejemplo y ver las gráficas de inmediato.",
    visual: (
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-xl text-white text-xs font-semibold">
          <span className="bg-white/30 px-2 py-0.5 rounded-lg text-[11px]">Día 15</span>
          <span className="bg-white/30 px-2 py-0.5 rounded-lg text-[11px]">5.2°C</span>
          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">🧪 Prueba</span>
        </div>
      </div>
    ),
  },
  {
    bg: "bg-violet-500",
    icon: <BarChart2 size={26} className="text-white"/>,
    title: "Gráfica interactiva",
    body: "Ves dos líneas: lectura real (sólida) y corregida con el factor (punteada). La banda de color es el rango aceptable. Los puntos rojos indican valores fuera de rango.",
    visual: (
      <div className="flex items-end justify-center gap-1.5 h-14 mt-3">
        {[5, 6, 5.5, 7, 9.5, 6, 5, 4, 6, 7].map((v, i) => {
          const ok = v >= 2 && v <= 8;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className={`w-2.5 h-2.5 rounded-full ${ok ? "bg-violet-200" : "bg-red-400 ring-2 ring-red-200"}`}/>
            </div>
          );
        })}
      </div>
    ),
  },
  {
    bg: "bg-hsa-green",
    icon: <PenLine size={26} className="text-white"/>,
    title: "Firmar y guardar",
    body: "Al presionar «Firmar y guardar», se abre un modal. En F-029 elegís la jornada (Mañana / Tarde / Noche). Luego dibujás tu firma con el dedo o mouse. La firma queda vinculada al registro.",
    visual: (
      <div className="flex justify-center mt-3 gap-2">
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-amber-300/70 text-[8px] flex items-center justify-center font-bold text-amber-800">M</div>
          <span className="text-[8px] text-green-100">Mañana</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-blue-300/70 text-[8px] flex items-center justify-center font-bold text-blue-800">T</div>
          <span className="text-[8px] text-green-100">Tarde</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-indigo-300/70 text-[8px] flex items-center justify-center font-bold text-indigo-800">N</div>
          <span className="text-[8px] text-green-100">Noche</span>
        </div>
        <div className="ml-2 w-24 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
          <span className="text-white/60 text-[9px] italic">Firma aquí…</span>
        </div>
      </div>
    ),
  },
  {
    bg: "bg-hsa-green",
    icon: <Printer size={26} className="text-white"/>,
    title: "Imprimir el formulario",
    body: "Con el botón Imprimir generás el PDF institucional con el encabezado y pie de página del hospital tal como lo exige el Sistema de Gestión de la Calidad.",
    visual: (
      <div className="flex justify-center mt-4">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white/20 rounded-xl text-white text-xs font-semibold">
          <Printer size={13}/> Imprimir formulario
        </div>
      </div>
    ),
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function HelpBubble() {
  const [open,    setOpen]    = useState(false);
  const [slide,   setSlide]   = useState(0);
  const [exiting, setExiting] = useState(false);

  const total = SLIDES.length;
  const s     = SLIDES[slide];

  const openModal = () => { setSlide(0); setOpen(true); };

  const close = () => {
    setExiting(true);
    setTimeout(() => { setOpen(false); setExiting(false); }, 280);
  };

  const next = () => slide < total - 1 ? setSlide(i => i + 1) : close();
  const prev = () => slide > 0 && setSlide(i => i - 1);

  return (
    <>
      {/* ── Burbuja flotante ──────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={openModal}
          title="Ayuda — ¿cómo usar el sistema?"
          className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-xl
            flex items-center justify-center
            bg-hsa-green hover:bg-hsa-green-light text-white text-xl font-black
            hover:scale-110 active:scale-95 transition-all duration-200
            no-print"
        >
          ?
        </button>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4
            transition-all duration-280 ${exiting ? "opacity-0" : "opacity-100"}`}
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && close()}
        >
          <div className={`relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden
              transition-all duration-280 ${exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}>

            {/* Header */}
            <div className={`${s.bg} px-6 pt-7 pb-5 flex flex-col items-center text-center`}>
              <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                {s.icon}
              </div>
              <h2 className="text-white font-bold text-base leading-snug">{s.title}</h2>
              {s.visual}
            </div>

            {/* Cuerpo */}
            <div className="px-6 pt-5 pb-2">
              <p className="text-gray-600 text-sm leading-relaxed text-center">{s.body}</p>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-1.5 py-4">
              {SLIDES.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={`rounded-full transition-all duration-200
                    ${i === slide ? `w-5 h-2 ${s.bg}` : "w-2 h-2 bg-gray-200 hover:bg-gray-300"}`}
                />
              ))}
            </div>

            {/* Navegación */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button onClick={prev} disabled={slide === 0}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-all">
                <ChevronLeft size={14}/> Anterior
              </button>
              <button onClick={next}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                  text-white font-semibold text-sm transition-all active:scale-95 ${s.bg} shadow-md`}>
                {slide === total - 1
                  ? <><Check size={15}/> ¡Entendido!</>
                  : <>Siguiente <ChevronRight size={15}/></>}
              </button>
            </div>

            {/* Cerrar */}
            <button onClick={close}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors">
              <X size={14}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
