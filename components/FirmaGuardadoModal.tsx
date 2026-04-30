"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ShieldCheck, X, Save, Loader2, AlertCircle } from "lucide-react";

type Jornada = "manana" | "tarde" | "noche";

interface Responsables {
  manana: string;
  tarde: string;
  noche: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Callback de confirmación. Envía `firma` vacía solo por compatibilidad con
   * columnas legacy; el flujo actual no captura firma dibujada.
   * Debe retornar una Promise que resuelve cuando el guardado termina.
   */
  onConfirm: (params: { firma: string; jornada?: Jornada }) => Promise<void>;
  /** Para F-029: nombres de los tres responsables */
  responsables?: Responsables;
  /** Para F-021: nombre del único responsable */
  responsable?: string;
  /** Título del modal */
  titulo?: string;
  /** Pre-selecciona la jornada al abrir (útil para confirmar una lectura individual) */
  jornadaDefault?: Jornada;
}

const JORNADAS: { key: Jornada; label: string; color: string }[] = [
  { key: "manana", label: "Mañana",  color: "bg-amber-50  border-amber-300  text-amber-700"  },
  { key: "tarde",  label: "Tarde",   color: "bg-blue-50   border-blue-300   text-blue-700"   },
  { key: "noche",  label: "Noche",   color: "bg-indigo-50 border-indigo-300 text-indigo-700" },
];

export default function FirmaGuardadoModal({
  open, onClose, onConfirm, responsables, responsable, titulo, jornadaDefault,
}: Props) {
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [jornada,    setJornada]    = useState<Jornada>("manana");

  /* ── Reset al abrir ──────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setError("");
      setSaving(false);
      setJornada(jornadaDefault ?? "manana");
    }
  }, [open, jornadaDefault]);

  /* ── Nombre a mostrar bajo la confirmación ────────────── */
  const nombreFirmante = responsables
    ? (responsables[jornada] || "——")
    : (responsable || "——");

  /* ── Confirmar ───────────────────────────────────────── */
  const handleConfirm = async () => {
    // 1. Validar que haya nombre para la jornada seleccionada
    if (responsables && !responsables[jornada]?.trim()) {
      setError(`Completa el nombre del responsable de ${
        jornada === "manana" ? "Mañana" : jornada === "tarde" ? "Tarde" : "Noche"
      } antes de confirmar.`);
      return;
    }
    // 2. Validar que haya nombre para el responsable único (F-021 sin jornadas)
    if (responsable !== undefined && !responsable?.trim()) {
      setError("Completa el nombre del responsable antes de confirmar.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm({ firma: "", jornada: responsables ? jornada : undefined });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm
                      border border-gray-200 overflow-hidden">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4
                        bg-hsa-green-pale/60
                        border-b border-hsa-green/20">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-hsa-green"/>
            <h2 className="font-bold text-hsa-green text-sm">
              {titulo ?? "Confirmar guardado"}
            </h2>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18}/>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Selector jornada (solo para F-029) ────────── */}
          {responsables && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                ¿Cuál es tu jornada?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {JORNADAS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setJornada(key)}
                    className={`rounded-xl py-2 text-xs font-bold border-2 transition-all
                      ${jornada === key ? color + " shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Responsable:{" "}
                <span className="font-semibold text-gray-700">
                  {responsables[jornada] || <span className="italic">sin nombre</span>}
                </span>
              </p>
            </div>
          )}

          {/* ── Confirmación sin firma dibujada ─────────────── */}
          <div>
            <div className="rounded-xl border border-hsa-green/20 bg-hsa-green-pale/60 px-4 py-3 text-center">
              <CheckCircle size={22} className="mx-auto mb-2 text-hsa-green"/>
              <p className="text-sm font-semibold text-gray-700">Confirmación de responsable</p>
              <p className="mt-1 text-xs text-gray-500">
                No se requiere firma dibujada. El guardado queda auditado con el nombre del responsable y la fecha/hora del registro.
              </p>
            </div>

            {/* Nombre del responsable */}
            <div className="mt-2 pt-1.5 border-t border-gray-200 text-center">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                {nombreFirmante}
              </p>
              <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-hsa-green font-medium">
                <CheckCircle size={10}/> Responsable validado
              </div>
            </div>
          </div>

          {/* ── Error ─────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={13}/> {error}
            </div>
          )}

          {/* ── Acciones ──────────────────────────────────── */}
          <div className="flex gap-3">
            <button onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200
                         text-sm font-semibold text-gray-600
                         hover:bg-gray-50 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                          bg-hsa-green text-white text-sm font-semibold
                          transition-colors disabled:opacity-40"
              style={{ backgroundColor: saving ? undefined : "#006b3c" }}
              onMouseEnter={e => { if (!saving) (e.target as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = "#006b3c"; }}
            >
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              {saving ? "Guardando…" : "Confirmar y guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
