"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Pen, Trash2, CheckCircle } from "lucide-react";

interface Props {
  /** Nombre del firmante (muestra encima de la línea) */
  nombre: string;
  /** Cargo o jornada (ej: "Bacteriólogo", "Responsable Mañana") */
  cargo?: string;
  /** Valor actual — base64 data URL del canvas, o "" si vacío */
  value: string;
  /** Callback cuando cambia la firma */
  onChange: (dataUrl: string) => void;
  /** Deshabilitar edición */
  readOnly?: boolean;
}

export default function FirmaDigital({ nombre, cargo, value, onChange, readOnly }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing,  setDrawing]  = useState(false);
  const [hasStroke, setHasStroke] = useState(!!value);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Carga la firma guardada al montar o cuando cambia value externamente
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
      setHasStroke(true);
    } else {
      setHasStroke(false);
    }
  // Solo cuando el value cambia desde afuera (no mientras dibuja)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (readOnly) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  }, [readOnly]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || readOnly) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const curr = getPos(e);
    const prev = lastPos.current ?? curr;

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    // Curva cuadrática para trazo más suave
    ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();

    lastPos.current = curr;
    setHasStroke(true);
  }, [drawing, readOnly]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (canvas && hasStroke) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [drawing, hasStroke, onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    onChange("");
  };

  const isEmpty = !hasStroke && !value;

  return (
    <div className="firma-digital">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Pen size={12} className="text-gray-400"/>
          <span className="text-xs font-semibold text-gray-600">
            {cargo ?? "Firma"}
          </span>
        </div>
        {hasStroke && !readOnly && (
          <button
            onClick={clear}
            type="button"
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={10}/> Limpiar
          </button>
        )}
        {hasStroke && (
          <div className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <CheckCircle size={10}/> Firmado
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className={`relative rounded-xl border-2 transition-colors overflow-hidden
        ${isEmpty ? "border-dashed border-gray-200 bg-gray-50/50" : "border-gray-200 bg-white"}
        ${drawing ? "border-hsa-green" : ""}
        ${readOnly ? "cursor-default" : "cursor-crosshair"}`}
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          width={340}
          height={90}
          className="w-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {/* Placeholder */}
        {isEmpty && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <Pen size={16} className="text-gray-300"/>
            <span className="text-[11px] text-gray-300">Firmá aquí</span>
          </div>
        )}
      </div>

      {/* Línea de nombre */}
      <div className="mt-2 pt-1.5 border-t border-gray-200 text-center">
        <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide leading-tight">
          {nombre || "——————————————"}
        </p>
        {cargo && (
          <p className="text-[10px] text-gray-400 mt-0.5">{cargo}</p>
        )}
      </div>
    </div>
  );
}
