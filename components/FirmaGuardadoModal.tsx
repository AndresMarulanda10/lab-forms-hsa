"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Pen, Trash2, CheckCircle, X, Save, Loader2, AlertCircle } from "lucide-react";

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
   * Callback que recibe la firma (base64) y, si aplica, la jornada.
   * Debe retornar una Promise que resuelve cuando el guardado termina.
   */
  onConfirm: (params: { firma: string; jornada?: Jornada }) => Promise<void>;
  /** Para F-029: nombres de los tres responsables */
  responsables?: Responsables;
  /** Para F-021: nombre del único responsable */
  responsable?: string;
  /** Título del modal */
  titulo?: string;
  /** Pre-selecciona la jornada al abrir (útil para firma por lectura individual) */
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
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const lastPos      = useRef<{ x: number; y: number } | null>(null);
  const [drawing,    setDrawing]    = useState(false);
  const [hasStroke,  setHasStroke]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [jornada,    setJornada]    = useState<Jornada>("manana");

  /* ── Reset al abrir ──────────────────────────────────── */
  useEffect(() => {
    if (open) {
      clearCanvas();
      setError("");
      setSaving(false);
      setJornada(jornadaDefault ?? "manana");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jornadaDefault]);

  /* ── Canvas helpers ──────────────────────────────────── */
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const curr = getPos(e);
    const prev = lastPos.current ?? curr;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
    ctx.strokeStyle = "#006b3c";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = curr;
    setHasStroke(true);
  }, [drawing]);

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  /* ── Nombre a mostrar bajo el canvas ─────────────────── */
  const nombreFirmante = responsables
    ? (responsables[jornada] || "——")
    : (responsable || "——");

  /* ── Confirmar ───────────────────────────────────────── */
  const handleConfirm = async () => {
    // 1. Validar que haya nombre para la jornada seleccionada
    if (responsables && !responsables[jornada]?.trim()) {
      setError(`Completá el nombre del responsable de ${
        jornada === "manana" ? "Mañana" : jornada === "tarde" ? "Tarde" : "Noche"
      } antes de firmar.`);
      return;
    }
    // 2. Validar que haya nombre para el responsable único (F-021 sin jornadas)
    if (responsable !== undefined && !responsable?.trim()) {
      setError("Completá el nombre del responsable antes de firmar.");
      return;
    }
    // 3. Validar que haya firma dibujada
    if (!hasStroke) { setError("Dibujá tu firma antes de guardar."); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError("");
    try {
      const firma = canvas.toDataURL("image/png");
      await onConfirm({ firma, jornada: responsables ? jornada : undefined });
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
            <Pen size={16} className="text-hsa-green"/>
            <h2 className="font-bold text-hsa-green text-sm">
              {titulo ?? "Firmar y guardar registro"}
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

          {/* ── Canvas de firma ────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                Firmá aquí
              </p>
              {hasStroke && (
                <button onClick={clearCanvas}
                  className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={10}/> Limpiar
                </button>
              )}
            </div>

            <div
              className={`relative rounded-xl border-2 transition-colors overflow-hidden
                ${hasStroke ? "border-hsa-green/60 bg-white" : "border-dashed border-gray-200 bg-gray-50"}
                ${drawing ? "border-hsa-green" : ""}`}
              style={{ touchAction: "none" }}
            >
              <canvas
                ref={canvasRef}
                width={360}
                height={100}
                className="w-full"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                style={{ cursor: "crosshair" }}
              />
              {!hasStroke && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                  <Pen size={18} className="text-gray-300"/>
                  <span className="text-[11px] text-gray-300">
                    Dibujá tu firma
                  </span>
                </div>
              )}
            </div>

            {/* Línea de nombre */}
            <div className="mt-2 pt-1.5 border-t border-gray-200 text-center">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                {nombreFirmante}
              </p>
              {hasStroke && (
                <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-hsa-green font-medium">
                  <CheckCircle size={10}/> Firma capturada
                </div>
              )}
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
            <button onClick={handleConfirm} disabled={saving || !hasStroke}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-hsa-green text-white text-sm font-semibold
                         transition-colors disabled:opacity-40"
              style={{ backgroundColor: saving ? undefined : hasStroke ? "#006b3c" : undefined }}
              onMouseEnter={e => { if (!saving && hasStroke) (e.target as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.backgroundColor = "#006b3c"; }}
            >
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              {saving ? "Guardando…" : "Guardar con firma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
