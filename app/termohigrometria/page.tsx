"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Printer, Loader2,
  CheckCircle, AlertCircle, Plus, PenLine,
} from "lucide-react";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import RegistroChart from "@/components/RegistroChart";
import FirmaGuardadoModal from "@/components/FirmaGuardadoModal";
import type { LecturasTermohigrometria, RegistroTermohigrometria } from "@/lib/types";
import { MESES, getDiasEnMes, enriquecerLecturasTermohigro } from "@/lib/types";

export default function TermohigrometriaPage() {
  const now = new Date();
  const [año, setAño] = useState(now.getFullYear());
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [firmaModal, setFirmaModal] = useState(false);
  const [firmas,     setFirmas]     = useState({ manana: "", tarde: "", noche: "" });
  const [toast,      setToast]      = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [tempMin, setTempMin] = useState(15);
  const [tempMax, setTempMax] = useState(30);
  const [humMin,  setHumMin]  = useState(40);
  const [humMax,  setHumMax]  = useState(70);

  // lecturas: key = String(día), value = { temp, hum, ts?, quien?, firma?, prev? }
  const [lecturas, setLecturas] = useState<LecturasTermohigrometria>({});
  /** Snapshot de lo que cargó desde DB — para detectar cambios al guardar */
  const lecturasOriginales = useRef<LecturasTermohigrometria>({});
  const [info, setInfo] = useState({
    ubicacion: "", dispositivo_nombre: "TERMOHIGROMETRO",
    dispositivo_marca: "", dispositivo_modelo: "",
    dispositivo_serial: "", certificado: "",
    factor_correccion: "0.54",
    responsable_manana: "", responsable_tarde: "", responsable_noche: "",
    observaciones: "",
  });

  // Ingreso
  const [inputDia,  setInputDia]  = useState(String(now.getDate()));
  const [inputTemp, setInputTemp] = useState("");
  const [inputHum,  setInputHum]  = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/termohigrometria?año=${año}&mes=${mes}`);
    const data: RegistroTermohigrometria[] = await res.json();
    if (data.length > 0) {
      const r = data[0];
      setInfo({
        ubicacion: r.ubicacion, dispositivo_nombre: r.dispositivo_nombre,
        dispositivo_marca: r.dispositivo_marca, dispositivo_modelo: r.dispositivo_modelo,
        dispositivo_serial: r.dispositivo_serial, certificado: r.certificado,
        factor_correccion: r.factor_correccion,
        responsable_manana: r.responsable_manana ?? "",
        responsable_tarde:  r.responsable_tarde  ?? "",
        responsable_noche:  r.responsable_noche  ?? "",
        observaciones: r.observaciones,
      });
      setFirmas({ manana: r.firma_manana ?? "", tarde: r.firma_tarde ?? "", noche: r.firma_noche ?? "" });
      const lecs = (r.lecturas || {}) as LecturasTermohigrometria;
      setLecturas(lecs);
      lecturasOriginales.current = lecs;   // ← snapshot
    } else {
      setInfo({
        ubicacion: "", dispositivo_nombre: "TERMOHIGROMETRO",
        dispositivo_marca: "", dispositivo_modelo: "",
        dispositivo_serial: "", certificado: "",
        factor_correccion: "0.54",
        responsable_manana: "", responsable_tarde: "", responsable_noche: "",
        observaciones: "",
      });
      setFirmas({ manana: "", tarde: "", noche: "" });
      setLecturas({});
      lecturasOriginales.current = {};
    }
    setLoading(false);
  }, [año, mes]);

  useEffect(() => { load(); }, [load]);

  const agregar = () => {
    const dia  = parseInt(inputDia);
    const temp = parseFloat(inputTemp);
    const max  = getDiasEnMes(mes, año);
    if (isNaN(dia) || dia < 1 || dia > max) { showToast(`Día inválido (1–${max})`, "err"); return; }
    if (isNaN(temp)) { showToast("Ingresá temperatura", "err"); return; }
    const hum = parseFloat(inputHum);
    setLecturas(prev => ({
      ...prev,
      [String(dia)]: {
        temp,
        hum: isNaN(hum) ? null : hum,
      },
    }));
    setInputTemp("");
    setInputHum("");
    setInputDia(String(dia < max ? dia + 1 : dia));
  };

  const pedirFirma = () => {
    if (Object.keys(lecturas).length === 0) {
      showToast("Ingresá al menos una lectura antes de guardar", "err");
      return;
    }
    setFirmaModal(true);
  };

  const handleSaveWithFirma = async ({ firma: f, jornada }: { firma: string; jornada?: "manana" | "tarde" | "noche" }) => {
    setSaving(true);

    const jornadaKey = (jornada ?? "manana") as "manana" | "tarde" | "noche";
    const responsableDeJornada =
      jornadaKey === "manana" ? info.responsable_manana :
      jornadaKey === "tarde"  ? info.responsable_tarde  :
                                info.responsable_noche;

    // Enriquecer lecturas con auditoría: timestamp, quien, firma
    const audit = {
      ts: new Date().toISOString(),
      quien: responsableDeJornada || "—",
      firma: f,
    };
    const lecturasAuditadas = enriquecerLecturasTermohigro(
      lecturas, lecturasOriginales.current, audit,
    );
    lecturasOriginales.current = lecturasAuditadas;
    setLecturas(lecturasAuditadas);

    const nuevasFirmas = { ...firmas };
    nuevasFirmas[jornadaKey] = f;
    setFirmas(nuevasFirmas);

    const res = await fetch("/api/termohigrometria", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        año, mes, ...info,
        lecturas: lecturasAuditadas,
        firma_manana: nuevasFirmas.manana,
        firma_tarde:  nuevasFirmas.tarde,
        firma_noche:  nuevasFirmas.noche,
        // campos legacy vacíos para compatibilidad
        responsable: responsableDeJornada || "",
        firma: f,
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

  const cargarDatosPrueba = () => {
    const nuevas: LecturasTermohigrometria = {};
    const dias = getDiasEnMes(mes, año);
    for (let d = 1; d <= dias; d++) {
      nuevas[String(d)] = {
        temp: parseFloat((tempMin + Math.random() * (tempMax - tempMin + 4) - 2).toFixed(1)),
        hum:  parseFloat((humMin  + Math.random() * (humMax  - humMin  + 8) - 4).toFixed(1)),
      };
    }
    setLecturas(nuevas);
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"} text-white`}>
          {toast.type === "ok" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* ── Encabezado ───────────────────────────────────────────────────────── */}
      <HospitalHeader
        codigo="M-GAD-LAB-F-021" version="2"
        nombreDocumento="FORMATO PARA REGISTRO DE CONDICIONES AMBIENTALES DE ALMACENAMIENTO (T°C Y HUMEDAD)"
      />

      {/* ── Metadatos (igual al formato físico) ──────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 divide-x divide-y divide-gray-200">
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
          <div className="px-3 py-2 col-span-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Ubicación</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.ubicacion} onChange={e => setInfo(i => ({...i, ubicacion: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Dispositivo</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.dispositivo_nombre} onChange={e => setInfo(i => ({...i, dispositivo_nombre: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Marca</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.dispositivo_marca} onChange={e => setInfo(i => ({...i, dispositivo_marca: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Modelo</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.dispositivo_modelo} onChange={e => setInfo(i => ({...i, dispositivo_modelo: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corrección</p>
            <input type="number" step="0.01"
              className="w-full bg-transparent font-bold text-hsa-green focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion} onChange={e => setInfo(i => ({...i, factor_correccion: e.target.value}))} placeholder="0"/>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50/50">
          <div className="px-3 py-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Temperatura Ambiente</span>
              <input type="number" step="0.5"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                value={tempMin} onChange={e => setTempMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="0.5"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                value={tempMax} onChange={e => setTempMax(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">°C</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Humedad Relativa</span>
              <input type="number" step="1"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
                value={humMin} onChange={e => setHumMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="1"
                className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
                value={humMax} onChange={e => setHumMax(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">%</span>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Serial</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.dispositivo_serial} onChange={e => setInfo(i => ({...i, dispositivo_serial: e.target.value}))} placeholder="—"/>
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

      {/* ── Gráficas ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={28} className="animate-spin mr-2"/> Cargando…
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {/* Temperatura */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <RegistroChart
                modo="temperatura" lecturas={lecturas} mes={mes} año={año}
                rangoMin={tempMin} rangoMax={tempMax}
                factorCorreccion={fc}
                titulo="Temperatura Ambiental (°C)" unidad="°C"/>

              {/* Ingreso */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50 no-print">
                <span className="text-xs text-gray-400 font-medium">Agregar:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Día</span>
                  <input type="number" min={1} max={getDiasEnMes(mes, año)}
                    className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-hsa-green focus:ring-opacity-30"
                    value={inputDia} onChange={e => setInputDia(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("temp-in")?.focus()}
                    max={getDiasEnMes(mes, año)}/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Temp °C</span>
                  <input id="temp-in" type="number" step="0.1"
                    className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-hsa-green focus:ring-opacity-30"
                    value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("hum-in")?.focus()}
                    placeholder="0.0"/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Hum %</span>
                  <input id="hum-in" type="number" step="0.1"
                    className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-30"
                    value={inputHum} onChange={e => setInputHum(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && agregar()}
                    placeholder="0.0"/>
                </div>
                {inputTemp && fc !== 0 && !isNaN(parseFloat(inputTemp)) && (
                  <span className="text-xs text-hsa-green font-semibold">
                    → {(parseFloat(inputTemp) + fc).toFixed(1)}°C corregida
                  </span>
                )}
                <button onClick={agregar} disabled={!inputTemp}
                  className="flex items-center gap-1 px-3 py-1 bg-hsa-green text-white rounded-lg text-xs font-semibold hover:bg-hsa-green-light transition-colors disabled:opacity-40">
                  <Plus size={12}/> Agregar
                </button>
              </div>
            </div>

            {/* Humedad */}
            <RegistroChart
              modo="humedad" lecturas={lecturas} mes={mes} año={año}
              rangoMin={humMin} rangoMax={humMax}
              titulo="Humedad Relativa (%)" unidad="%"/>
          </div>

          {/* ── Responsables por jornada ────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-gray-200">
              <div className="px-4 py-3">
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Mañana</p>
                <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
                  value={info.responsable_manana}
                  onChange={e => setInfo(i => ({...i, responsable_manana: e.target.value}))}
                  placeholder="Nombre y cargo"/>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Tarde</p>
                <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
                  value={info.responsable_tarde}
                  onChange={e => setInfo(i => ({...i, responsable_tarde: e.target.value}))}
                  placeholder="Nombre y cargo"/>
              </div>
              <div className="px-4 py-3">
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Responsable Noche</p>
                <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
                  value={info.responsable_noche}
                  onChange={e => setInfo(i => ({...i, responsable_noche: e.target.value}))}
                  placeholder="Nombre y cargo"/>
              </div>
            </div>
            <div className="border-t border-gray-200">
              <div className="px-4 py-3">
                <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Observaciones</p>
                <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
                  value={info.observaciones}
                  onChange={e => setInfo(i => ({...i, observaciones: e.target.value}))}
                  placeholder="Novedades del mes…"/>
              </div>
            </div>
          </div>
        </>
      )}

      <HospitalFooter/>

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
        titulo="Firmar y guardar — F-021 Termohigrometría"
      />
    </div>
  );
}
