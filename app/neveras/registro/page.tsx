"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Save, Printer, Loader2,
  CheckCircle, AlertCircle, Refrigerator, Plus, PenLine, History,
} from "lucide-react";
import Link from "next/link";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import NeveraChart from "@/components/NeveraChart";
import FirmaGuardadoModal from "@/components/FirmaGuardadoModal";
import type { Nevera, RegistroNevera, LecturasNevera, JornadaKey } from "@/lib/types";
import {
  MESES, getDiasEnMes, valorDeLectura, esLecturaAuditada,
  enriquecerLecturas, formatearTs, JORNADA_LABEL,
} from "@/lib/types";

export default function NeverasRegistroPage() {
  const now = new Date();
  const [año, setAño]   = useState(now.getFullYear());
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [neveras,        setNeveras]        = useState<Nevera[]>([]);
  const [selectedNevera, setSelectedNevera] = useState<Nevera | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [firmaModal,     setFirmaModal]     = useState(false);
  const [firmas,         setFirmas]         = useState({ manana: "", tarde: "", noche: "" });
  const [toast,          setToast]          = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [rangoMin, setRangoMin] = useState(2);
  const [rangoMax, setRangoMax] = useState(8);

  const [lecturas, setLecturas] = useState<LecturasNevera>({});
  /** Snapshot de lo que cargó desde DB — para detectar cambios al guardar */
  const lecturasOriginales = useRef<LecturasNevera>({});
  const [info, setInfo] = useState({
    marca: "", modelo: "", serial: "", ubicacion: "", certificado: "", factor_correccion: "0.54",
    responsable_manana: "", responsable_tarde: "", responsable_noche: "",
    fecha_limpieza: "", observaciones: "",
  });

  const [inputDia,  setInputDia]  = useState(String(now.getDate()));
  const [inputTemp, setInputTemp] = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadNeveras = async () => {
    try {
      const res  = await fetch("/api/neveras");
      const data = await res.json();
      const arr: Nevera[] = Array.isArray(data) ? data : [];
      const activas = arr.filter(n => n.activa);
      setNeveras(activas);
      if (activas.length > 0) setSelectedNevera(activas[0]);
    } catch { setNeveras([]); }
  };

  const loadRegistro = useCallback(async () => {
    if (!selectedNevera) return;
    setLoading(true);
    const res  = await fetch(`/api/neveras-registros?nevera_id=${selectedNevera.id}&año=${año}&mes=${mes}`);
    const data: RegistroNevera[] = await res.json();
    if (data.length > 0) {
      const r = data[0];
      const lecs = (r.lecturas || {}) as LecturasNevera;
      setLecturas(lecs);
      lecturasOriginales.current = lecs;   // ← snapshot para detectar cambios
      setInfo(prev => ({
        ...prev,
        marca:               r.dispositivo_marca   ?? "",
        modelo:              r.dispositivo_modelo  ?? "",
        serial:              r.dispositivo_serial  ?? "",
        certificado:         r.certificado         ?? "",
        factor_correccion:   r.factor_correccion   ?? "0.54",
        responsable_manana:  r.responsable_manana,
        responsable_tarde:   r.responsable_tarde,
        responsable_noche:   r.responsable_noche,
        fecha_limpieza:      r.fecha_limpieza ?? "",
        observaciones:       r.observaciones,
      }));
    } else {
      setLecturas({});
      lecturasOriginales.current = {};     // ← mes vacío
      setInfo(prev => ({
        ...prev,
        responsable_manana: "", responsable_tarde: "", responsable_noche: "",
        fecha_limpieza: "", observaciones: "",
      }));
    }
    setLoading(false);
  }, [selectedNevera, año, mes]);

  useEffect(() => { loadNeveras(); }, []);
  useEffect(() => { loadRegistro(); }, [loadRegistro]);

  const agregar = () => {
    const dia  = parseInt(inputDia);
    const temp = parseFloat(inputTemp);
    const max  = getDiasEnMes(mes, año);
    if (isNaN(dia) || dia < 1 || dia > max) { showToast(`Día inválido (1–${max})`, "err"); return; }
    if (isNaN(temp)) { showToast("Ingresá una temperatura", "err"); return; }
    // Guarda el número plano — se enriquece con auditoría al firmar y guardar
    setLecturas(prev => ({ ...prev, [String(dia)]: temp }));
    setInputTemp("");
    setInputDia(String(dia < max ? dia + 1 : dia));
  };

  /** Abre el modal de firma — se llama al presionar el botón Guardar */
  const pedirFirma = () => {
    if (!selectedNevera) return;
    if (Object.keys(lecturas).length === 0) {
      showToast("Ingresá al menos una lectura antes de guardar", "err");
      return;
    }
    setFirmaModal(true);
  };

  /** Se llama desde el modal, con la firma capturada y la jornada seleccionada */
  const handleSaveWithFirma = async ({ firma, jornada }: { firma: string; jornada?: "manana" | "tarde" | "noche" }) => {
    if (!selectedNevera) return;
    setSaving(true);

    const jornadaKey = (jornada ?? "manana") as JornadaKey;
    const responsableDeJornada =
      jornadaKey === "manana" ? info.responsable_manana :
      jornadaKey === "tarde"  ? info.responsable_tarde  :
                                info.responsable_noche;

    // Enriquecer lecturas con auditoría: timestamp, quien, jornada, firma
    const audit = {
      ts: new Date().toISOString(),
      quien: responsableDeJornada || "—",
      jornada: jornadaKey,
      firma,
    };
    const lecturasAuditadas = enriquecerLecturas(
      lecturas, lecturasOriginales.current, audit,
    );

    // Actualizar el snapshot para próximas ediciones en la misma sesión
    lecturasOriginales.current = lecturasAuditadas;
    setLecturas(lecturasAuditadas);

    // Actualizar firma a nivel de mes (para compatibilidad con el schema actual)
    const nuevasFirmas = { ...firmas };
    if (jornada) nuevasFirmas[jornada] = firma;
    setFirmas(nuevasFirmas);

    const res = await fetch("/api/neveras-registros", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nevera_id:           selectedNevera.id,
        año, mes,
        lecturas:            lecturasAuditadas,   // ← JSONB enriquecido
        dispositivo_marca:   info.marca,
        dispositivo_modelo:  info.modelo,
        dispositivo_serial:  info.serial,
        certificado:         info.certificado,
        factor_correccion:   info.factor_correccion,
        responsable_manana:  info.responsable_manana,
        responsable_tarde:   info.responsable_tarde,
        responsable_noche:   info.responsable_noche,
        fecha_limpieza:      info.fecha_limpieza || null,
        observaciones:       info.observaciones,
        firma_manana:        nuevasFirmas.manana,
        firma_tarde:         nuevasFirmas.tarde,
        firma_noche:         nuevasFirmas.noche,
      }),
    });
    setSaving(false);
    if (!res.ok) throw new Error((await res.json()).error);
    showToast("Registro guardado con firma ✓");
  };

  const navMes = (d: number) => {
    let m = mes + d, a = año;
    if (m > 12) { m = 1; a++; }
    if (m < 1)  { m = 12; a--; }
    setMes(m); setAño(a);
  };

  const fc = parseFloat(info.factor_correccion) || 0;

  const TEMP_MIN = rangoMin;
  const TEMP_MAX = rangoMax;

  const cargarDatosPrueba = () => {
    const nuevas: LecturasNevera = {};
    const dias = getDiasEnMes(mes, año);
    for (let d = 1; d <= dias; d++) {
      const esOutlier = Math.random() < 0.07;
      nuevas[String(d)] = esOutlier
        ? (Math.random() < 0.5
            ? parseFloat((Math.random() * 1.9).toFixed(1))
            : parseFloat((8.1 + Math.random() * 2.4).toFixed(1)))
        : parseFloat((2.2 + Math.random() * 5.6).toFixed(1));
    }
    setLecturas(nuevas);
  };

  if (neveras.length === 0 && !loading) return (
    <div className="space-y-4">
      <HospitalHeader codigo="M-GADT-LAB-F-029" version="2"
        nombreDocumento="FORMATO PARA REGISTRO DE TEMPERATURA DE LA CADENA DE FRÍO" />
      <div className="card text-center py-12">
        <Refrigerator size={44} className="text-gray-200 mx-auto mb-3"/>
        <p className="text-gray-500 mb-4">No hay neveras activas.</p>
        <Link href="/neveras" className="btn-success"><Plus size={15}/> Crear nevera</Link>
      </div>
      <HospitalFooter />
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"} text-white`}>
          {toast.type === "ok" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          ENCABEZADO — igual al formato físico
      ═══════════════════════════════════════════════════════════ */}
      <HospitalHeader codigo="M-GADT-LAB-F-029" version="2"
        nombreDocumento="FORMATO PARA REGISTRO DE TEMPERATURA DE LA CADENA DE FRÍO" />

      {/* ─── Fila de metadatos ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 divide-x divide-y divide-gray-200">

          {/* Mes / Año */}
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Mes</p>
            <div className="flex items-center gap-1">
              <button onClick={() => navMes(-1)} className="text-gray-400 hover:text-hsa-green"><ChevronLeft size={12}/></button>
              <span className="font-bold text-hsa-green capitalize text-xs">{MESES[mes-1]}</span>
              <button onClick={() => navMes(1)} className="text-gray-400 hover:text-hsa-green"><ChevronRight size={12}/></button>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Año</p>
            <span className="font-bold">{año}</span>
          </div>

          {/* Nevera */}
          <div className="px-3 py-2 col-span-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Nevera</p>
            <select className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs"
              value={selectedNevera?.id || ""}
              onChange={e => setSelectedNevera(neveras.find(n => n.id === e.target.value) || null)}>
              {neveras.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>

          {/* Dispositivo */}
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Marca</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.marca} onChange={e => setInfo(i => ({...i, marca: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Modelo</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.modelo} onChange={e => setInfo(i => ({...i, modelo: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Serial</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.serial} onChange={e => setInfo(i => ({...i, serial: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corrección</p>
            <input type="number" step="0.01"
              className="w-full bg-transparent font-bold text-hsa-green focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion} onChange={e => setInfo(i => ({...i, factor_correccion: e.target.value}))} placeholder="0"/>
          </div>

        </div>

        {/* Segunda fila: parámetro + ubicación + certificado */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50/50">
          <div className="px-3 py-1.5 col-span-1 flex items-center gap-2 flex-wrap">
            <span className="text-gray-400 text-[10px] font-semibold uppercase">Temperatura refrigeración</span>
            <div className="flex items-center gap-1 text-[10px]">
              <input type="number" step="0.5"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold"
                value={rangoMin} onChange={e => setRangoMin(parseFloat(e.target.value) || 0)}/>
              <span className="text-gray-400">°C —</span>
              <input type="number" step="0.5"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold"
                value={rangoMax} onChange={e => setRangoMax(parseFloat(e.target.value) || 0)}/>
              <span className="text-gray-400">°C</span>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Ubicación</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.ubicacion ?? ""} onChange={e => setInfo(i => ({...i, ubicacion: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Certificado</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.certificado} onChange={e => setInfo(i => ({...i, certificado: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-1.5 flex items-center gap-2 justify-end no-print">
            <button onClick={cargarDatosPrueba}
              className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-semibold hover:bg-amber-200 transition-colors">
              🧪 Prueba
            </button>
            <button onClick={pedirFirma} disabled={saving || loading}
              className="flex items-center gap-1 px-3 py-1 bg-hsa-green text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#006b3c" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#006b3c"; }}>
              {saving ? <Loader2 size={11} className="animate-spin"/> : <PenLine size={11}/>}
              {saving ? "Guardando…" : "Firmar y guardar"}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition-colors no-print">
              <Printer size={11}/> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          GRÁFICA — elemento principal
      ═══════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-2"/> Cargando…
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Leyenda mínima */}
          <div className="flex items-center gap-4 px-4 pt-3 pb-1 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-0.5 bg-hsa-green inline-block"/>
              <span>Lectura</span>
            </div>
            {fc !== 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-5 inline-block border-t-2 border-dashed border-hsa-green"/>
                <span>Corregida (+{fc})</span>
              </div>
            )}
          </div>

          <NeveraChart
            lecturas={lecturas} mes={mes} año={año}
            rangoMin={rangoMin} rangoMax={rangoMax}
            factorCorreccion={fc} />

          {/* Ingreso de lectura — debajo de la gráfica, dentro del mismo bloque */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 no-print">
            <span className="text-xs text-gray-400 font-medium">Agregar:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Día</span>
              <input type="number" min={1} max={getDiasEnMes(mes, año)} step={1}
                className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-hsa-green focus:ring-opacity-30"
                value={inputDia} onChange={e => setInputDia(e.target.value)}
                onKeyDown={e => e.key === "Enter" && document.getElementById("temp-in")?.focus()} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Temp °C</span>
              <input id="temp-in" type="number" step="0.1"
                className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-hsa-green focus:ring-opacity-30"
                value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                onKeyDown={e => e.key === "Enter" && agregar()}
                placeholder="0.0" />
            </div>
            {inputTemp && fc !== 0 && !isNaN(parseFloat(inputTemp)) && (
              <span className="text-xs text-hsa-green font-semibold">
                → {(parseFloat(inputTemp) + fc).toFixed(1)}°C corregida
              </span>
            )}
            <button onClick={agregar} disabled={!inputTemp}
              className="flex items-center gap-1 px-3 py-1 bg-hsa-green text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
              style={{ backgroundColor: "#006b3c" }}
              onMouseEnter={e => { if (!!(e.currentTarget as HTMLButtonElement).disabled === false) (e.currentTarget as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#006b3c"; }}>
              <Plus size={12}/> Agregar
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          RESPONSABLES — igual al formato físico
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-gray-200">
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Mañana</p>
            <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.responsable_manana}
              onChange={e => setInfo(i => ({...i, responsable_manana: e.target.value}))}
              placeholder="Nombre y firma"/>
          </div>
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Tarde</p>
            <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.responsable_tarde}
              onChange={e => setInfo(i => ({...i, responsable_tarde: e.target.value}))}
              placeholder="Nombre y firma"/>
          </div>
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Noche</p>
            <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.responsable_noche}
              onChange={e => setInfo(i => ({...i, responsable_noche: e.target.value}))}
              placeholder="Nombre y firma"/>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Fecha Limpieza y Desinfección</p>
            <input type="date" className="border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.fecha_limpieza}
              onChange={e => setInfo(i => ({...i, fecha_limpieza: e.target.value}))} />
          </div>
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable</p>
            <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.observaciones}
              onChange={e => setInfo(i => ({...i, observaciones: e.target.value}))}
              placeholder="Nombre"/>
          </div>
        </div>
      </div>

      <HospitalFooter />

      {/* ── Modal de firma ──────────────────────────────── */}
      <FirmaGuardadoModal
        open={firmaModal}
        onClose={() => setFirmaModal(false)}
        onConfirm={handleSaveWithFirma}
        responsables={{
          manana: info.responsable_manana,
          tarde:  info.responsable_tarde,
          noche:  info.responsable_noche,
        }}
      />
    </div>
  );
}
