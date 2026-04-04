import Link from "next/link";
import {
  Thermometer, Refrigerator, ArrowRight,
  Settings, ChevronRight, Calendar, CloudOff,
} from "lucide-react";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";

export default function Dashboard() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.toLocaleString("es-CO", { month: "long" });
  const day   = now.getDate();

  return (
    <div className="space-y-6 pb-10">
      <HospitalHeader
        codigo="M-GADT-LAB"
        version="3"
        nombreDocumento="SISTEMA DE REGISTROS DE LABORATORIO CLÍNICO"
        proceso="GESTIÓN DE APOYO DIAGNÓSTICO Y TERAPÉUTICO"
        subproceso="LABORATORIO CLÍNICO"
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-card bg-gradient-to-br from-hsa-green to-hsa-green-light text-white px-6 py-7 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">
            E.S.E. Hospital San Antonio de Chía
          </p>
          <h1 className="text-2xl font-bold leading-tight">
            Registros de Laboratorio
          </h1>
          <div className="flex items-center gap-2 mt-2 text-blue-100 text-sm">
            <Calendar size={13} />
            <span className="capitalize font-medium">{month} {year}</span>
            <span className="opacity-50">·</span>
            <span>Día {day}</span>
          </div>
        </div>
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
          <span className="text-2xl font-black text-white">HSA</span>
        </div>
      </div>

      {/* ── Módulos principales ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">
          Formularios activos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Termohigrometría */}
          <Link href="/termohigrometria" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:border-hsa-green transition-all duration-200">
              {/* Barra de color */}
              <div className="h-1.5 w-full bg-hsa-green rounded-t-2xl"/>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-hsa-green-pale flex items-center justify-center
                    group-hover:bg-hsa-green transition-colors duration-200">
                    <Thermometer size={22} className="text-hsa-green group-hover:text-white transition-colors duration-200"/>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    F-021
                  </span>
                </div>
                <h2 className="font-bold text-gray-800 group-hover:text-hsa-green transition-colors text-base">
                  Termohigrometría
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Temperatura ambiental y humedad relativa · 15–30°C / 40–70%
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">Mañana</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">Tarde</span>
                    <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium">Noche</span>
                  </div>
                  <ArrowRight size={15} className="text-hsa-green group-hover:translate-x-1 transition-transform"/>
                </div>
              </div>
            </div>
          </Link>

          {/* Neveras */}
          <Link href="/neveras/registro" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:border-hsa-green transition-all duration-200">
              <div className="h-1.5 w-full bg-hsa-green rounded-t-2xl"/>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-hsa-green-pale flex items-center justify-center
                    group-hover:bg-hsa-green transition-colors duration-200">
                    <Refrigerator size={22} className="text-hsa-green group-hover:text-white transition-colors duration-200"/>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    F-029
                  </span>
                </div>
                <h2 className="font-bold text-gray-800 group-hover:text-hsa-green transition-colors text-base">
                  Cadena de Frío
                </h2>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Control de temperatura de neveras · Rango óptimo 2–8°C
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">Mañana</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">Tarde</span>
                    <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full font-medium">Noche</span>
                  </div>
                  <ArrowRight size={15} className="text-hsa-green group-hover:translate-x-1 transition-transform"/>
                </div>
              </div>
            </div>
          </Link>

        </div>
      </div>

      {/* ── Acciones rápidas ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3 px-1">
          Acciones rápidas
        </p>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden divide-y divide-gray-50">
          <Link href="/termohigrometria"
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-hsa-green/5 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-hsa-green-pale flex items-center justify-center flex-shrink-0">
              <Thermometer size={14} className="text-hsa-green"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 group-hover:text-hsa-green transition-colors">
                Registro del mes — Termohigrometría
              </p>
              <p className="text-xs text-gray-400 capitalize">{month} {year}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-hsa-green flex-shrink-0"/>
          </Link>

          <Link href="/neveras/registro"
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-hsa-green/5 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-hsa-green-pale flex items-center justify-center flex-shrink-0">
              <Refrigerator size={14} className="text-hsa-green"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 group-hover:text-hsa-green transition-colors">
                Registro del mes — Neveras
              </p>
              <p className="text-xs text-gray-400 capitalize">{month} {year}</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-hsa-green flex-shrink-0"/>
          </Link>

          <Link href="/neveras"
            className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Settings size={14} className="text-gray-500"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">Administrar neveras</p>
              <p className="text-xs text-gray-400">Agregar, editar, activar o desactivar</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0"/>
          </Link>
        </div>
      </div>

      {/* ── Info del sistema ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CloudOff size={14} className="text-gray-400"/>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sistema</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
          {[
            ["Almacenamiento", "Supabase (nube)"],
            ["Exportación", "PDF institucional"],
            ["Alertas", "Valores fuera de rango en rojo"],
            ["Acceso", "Navegador / móvil"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="font-medium text-gray-400">{k}</span>
              <span className="text-gray-600">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <HospitalFooter />
    </div>
  );
}
