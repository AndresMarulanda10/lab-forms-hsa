"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, Printer, Loader2,
  CheckCircle, AlertCircle, Refrigerator, Plus, PenLine, Save,
} from "lucide-react";
import Link from "next/link";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import NeveraChart from "@/components/NeveraChart";
import FirmaGuardadoModal from "@/components/FirmaGuardadoModal";
import NeveraPrintTemplate from "@/components/NeveraPrintTemplate";
import type {
  Nevera, RegistroNevera, LecturasNevera,
  JornadaKey, Jornada, LecturaAuditada, LecturaHistorial,
  RegistroNeveraCachedState, RegistroNeveraFormInfo,
} from "@/lib/types";
import {
  MESES, getDiasEnMes, lecturaClave,
  valorDeLectura, esLecturaAuditada,
} from "@/lib/types";

type NeveraDeviceField =
  | "dispositivo"
  | "dispositivo_marca"
  | "dispositivo_modelo"
  | "dispositivo_serial"
  | "certificado"
  | "factor_correccion";

type NeveraDeviceDraft = Pick<Nevera, NeveraDeviceField>;

// ─── Colores y etiquetas por jornada ─────────────────────────────────────────
const J_COLOR: Record<Jornada, string> = { M: "#006b3c", T: "#d97706", N: "#4338ca" };
const J_LABEL: Record<Jornada, string> = { M: "Mañana", T: "Tarde", N: "Noche" };
const JORNADAS: Jornada[] = ["M", "T", "N"];

const EMPTY_FIRMAS: Record<JornadaKey, string> = { manana: "", tarde: "", noche: "" };

const EMPTY_INFO: RegistroNeveraFormInfo = {
  responsable_manana: "",
  responsable_tarde: "",
  responsable_noche: "",
  fecha_limpieza: "",
  observaciones: "",
};

const EMPTY_DEVICE_DRAFT: NeveraDeviceDraft = {
  dispositivo: "",
  dispositivo_marca: "",
  dispositivo_modelo: "",
  dispositivo_serial: "",
  certificado: "",
  factor_correccion: "0",
};

const DEVICE_INPUT_CLASS = "w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors";

const getDeviceDraft = (nevera: Nevera | null): NeveraDeviceDraft => ({
  dispositivo: nevera?.dispositivo ?? "",
  dispositivo_marca: nevera?.dispositivo_marca ?? "",
  dispositivo_modelo: nevera?.dispositivo_modelo ?? "",
  dispositivo_serial: nevera?.dispositivo_serial ?? "",
  certificado: nevera?.certificado ?? "",
  factor_correccion: nevera?.factor_correccion ?? "0",
});

/** Jornada (M/T/N) → JornadaKey (manana/tarde/noche) */
const toJornadaKey = (j: Jornada): JornadaKey =>
  j === "M" ? "manana" : j === "T" ? "tarde" : "noche";

/** JornadaKey → Jornada */
const toJornada = (k: JornadaKey): Jornada =>
  k === "manana" ? "M" : k === "tarde" ? "T" : "N";

export default function NeverasRegistroPage() {
  const now = new Date();
  const [año, setAño]   = useState(now.getFullYear());
  const [mes, setMes]   = useState(now.getMonth() + 1);
  const [neveras,        setNeveras]        = useState<Nevera[]>([]);
  const [selectedNevera, setSelectedNevera] = useState<Nevera | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [toast,          setToast]          = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [rangoMin, setRangoMin] = useState(2);
  const [rangoMax, setRangoMax] = useState(8);

  const [lecturas, setLecturas] = useState<LecturasNevera>({});
  const lecturasOriginales = useRef<LecturasNevera>({});
  const cachedStates = useRef<Record<string, RegistroNeveraCachedState>>({});
  const selectedNeveraIdRef = useRef<string | null>(null);
  const [firmas, setFirmas] = useState<Record<JornadaKey, string>>({ ...EMPTY_FIRMAS });
  const [info, setInfo] = useState<RegistroNeveraFormInfo>({ ...EMPTY_INFO });
  const [deviceDraft, setDeviceDraft] = useState<NeveraDeviceDraft>({ ...EMPTY_DEVICE_DRAFT });

  // ── Ingreso por lectura ────────────────────────────────────────────────────
  const [jornadaAdd,    setJornadaAdd]    = useState<Jornada>("M");
  const [inputDia,      setInputDia]      = useState(String(now.getDate()));
  const [inputTemp,     setInputTemp]     = useState("");
  // Modal para confirmación por lectura individual
  const [pendingAdd,    setPendingAdd]    = useState<{ dia: number; temp: number } | null>(null);
  const [firmaModalAdd, setFirmaModalAdd] = useState(false);
  // Modal para confirmación mensual (responsables + observaciones)
  const [firmaModal,    setFirmaModal]    = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Carga ──────────────────────────────────────────────────────────────────
  const loadNeveras = async () => {
    try {
      const res  = await fetch("/api/neveras");
      const data = await res.json();
      const arr: Nevera[] = Array.isArray(data) ? data : [];
      const activas = arr.filter(n => n.activa);
      setNeveras(activas);
      if (activas.length > 0) {
        setSelectedNevera(current => {
          const next = current ? activas.find(n => n.id === current.id) ?? activas[0] : activas[0];
          setDeviceDraft(getDeviceDraft(next));
          return next;
        });
      }
    } catch { setNeveras([]); }
  };

  useEffect(() => { loadNeveras(); }, []);

  useEffect(() => {
    selectedNeveraIdRef.current = selectedNevera?.id ?? null;
  }, [selectedNevera?.id]);

  useEffect(() => {
    if (!selectedNevera) return;

    const cached = cachedStates.current[selectedNevera.id];
    if (cached && cached.año === año && cached.mes === mes) {
      setLecturas(cached.lecturas);
      lecturasOriginales.current = cached.lecturasOriginales;
      setFirmas(cached.firmas);
      setInfo(cached.info);
      setDeviceDraft(getDeviceDraft(selectedNevera));
      setLoading(false);
      return;
    }

    const loadRegistro = async () => {
      setLoading(true);
      const res  = await fetch(`/api/neveras-registros?nevera_id=${selectedNevera.id}&año=${año}&mes=${mes}`);
      const data: RegistroNevera[] = await res.json();
      if (data.length > 0) {
        const r = data[0];
        const lecs = (r.lecturas || {}) as LecturasNevera;
        const nextInfo: RegistroNeveraFormInfo = {
          responsable_manana: r.responsable_manana,
          responsable_tarde: r.responsable_tarde,
          responsable_noche: r.responsable_noche,
          fecha_limpieza: r.fecha_limpieza ?? "",
          observaciones: r.observaciones,
        };
        setLecturas(lecs);
        lecturasOriginales.current = lecs;
        setFirmas({ manana: r.firma_manana ?? "", tarde: r.firma_tarde ?? "", noche: r.firma_noche ?? "" });
        setInfo(nextInfo);
      } else {
        setLecturas({});
        lecturasOriginales.current = {};
        setFirmas({ ...EMPTY_FIRMAS });
        setInfo({ ...EMPTY_INFO });
      }
      setLoading(false);
    };

    loadRegistro();
  }, [selectedNevera, año, mes]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const responsableDeJornada = (j: Jornada) =>
    j === "M" ? info.responsable_manana :
    j === "T" ? info.responsable_tarde  : info.responsable_noche;

  const cacheCurrentNeveraState = () => {
    if (!selectedNevera) return;
    cachedStates.current[selectedNevera.id] = {
      año,
      mes,
      lecturas,
      lecturasOriginales: lecturasOriginales.current,
      firmas,
      info,
    };
  };

  const handleNeveraChange = async (neveraId: string) => {
    try {
      await saveDeviceDraft();
    } catch (err: unknown) {
      showToast((err as Error).message || "Error al guardar dispositivo", "err");
    }
    cacheCurrentNeveraState();
    const nextNevera = neveras.find(n => n.id === neveraId) ?? null;
    selectedNeveraIdRef.current = nextNevera?.id ?? null;
    setSelectedNevera(nextNevera);
    setDeviceDraft(getDeviceDraft(nextNevera));

    if (!nextNevera) return;
    const cached = cachedStates.current[nextNevera.id];
    if (cached) {
      setAño(cached.año);
      setMes(cached.mes);
      setLecturas(cached.lecturas);
      lecturasOriginales.current = cached.lecturasOriginales;
      setFirmas(cached.firmas);
      setInfo(cached.info);
      setLoading(false);
    }
  };

  const updateDeviceDraft = (field: NeveraDeviceField, value: string) => {
    setDeviceDraft(current => ({ ...current, [field]: value }));
  };

  const saveDeviceDraft = async () => {
    if (!selectedNevera) return;

    const hasChanges = (Object.keys(deviceDraft) as NeveraDeviceField[]).some(
      field => (selectedNevera[field] ?? "") !== deviceDraft[field],
    );
    if (!hasChanges) return;

    const previousId = selectedNevera.id;

    const res = await fetch(`/api/neveras/${previousId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deviceDraft),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    const updated: Nevera = await res.json();

    if (selectedNeveraIdRef.current === previousId) {
      setSelectedNevera(updated);
      setDeviceDraft(getDeviceDraft(updated));
    }
    cachedStates.current[previousId] = {
      año,
      mes,
      lecturas,
      lecturasOriginales: lecturasOriginales.current,
      firmas,
      info,
    };
    setNeveras(current => current.map(n => (n.id === updated.id ? updated : n)));
  };

  const persistDeviceDraft = async () => {
    try {
      await saveDeviceDraft();
    } catch (err: unknown) {
      showToast((err as Error).message || "Error al guardar dispositivo", "err");
    }
  };

  /** Construye el objeto de save para la API */
  const buildSaveBody = (lecs: LecturasNevera, fs: typeof firmas) => ({
    nevera_id: selectedNevera!.id, año, mes,
    lecturas: lecs,
    responsable_manana: info.responsable_manana,
    responsable_tarde:  info.responsable_tarde,
    responsable_noche:  info.responsable_noche,
    fecha_limpieza:     info.fecha_limpieza || null,
    observaciones:      info.observaciones,
    firma_manana:       fs.manana,
    firma_tarde:        fs.tarde,
    firma_noche:        fs.noche,
  });

  // ── Agregar lectura: valida y abre modal de confirmación ──────────────────
  const agregar = () => {
    // 1. Validar responsable de la jornada seleccionada
    if (!responsableDeJornada(jornadaAdd).trim()) {
      showToast(
        `Completa el nombre del responsable de ${J_LABEL[jornadaAdd]} antes de ingresar datos.`,
        "err",
      );
      return;
    }
    // 2. Validar día y temperatura
    const dia  = parseInt(inputDia);
    const temp = parseFloat(inputTemp);
    const max  = getDiasEnMes(mes, año);
    if (isNaN(dia) || dia < 1 || dia > max) { showToast(`Día inválido (1–${max})`, "err"); return; }
    if (isNaN(temp)) { showToast("Ingresa una temperatura", "err"); return; }

    // 3. Guardar pendiente y abrir modal de confirmación
    setPendingAdd({ dia, temp });
    setFirmaModalAdd(true);
  };

  // ── Confirmar lectura individual: crea LecturaAuditada + guarda ───────────
  const handleAddWithFirma = async ({ firma, jornada }: { firma: string; jornada?: JornadaKey }) => {
    if (!pendingAdd || !selectedNevera) return;

    const jornadaKey = jornada ?? toJornadaKey(jornadaAdd);
    const jornadaSuf = toJornada(jornadaKey);
    const clave      = lecturaClave(pendingAdd.dia, jornadaSuf);
    const resp       = responsableDeJornada(jornadaSuf);

    // Construir historial previo si existía una lectura para ese día/jornada
    const entryExistente = lecturas[clave];
    let prevAnterior: LecturaHistorial[] = [];
    let prevEntry: LecturaHistorial | undefined;

    if (entryExistente !== undefined) {
      const vExistente = valorDeLectura(entryExistente);
      if (esLecturaAuditada(entryExistente)) {
        prevAnterior = entryExistente.prev ?? [];
        if (vExistente !== pendingAdd.temp) {
          prevEntry = {
            v: entryExistente.v, ts: entryExistente.ts,
            quien: entryExistente.quien, jornada: entryExistente.jornada,
            firma: entryExistente.firma,
          };
        }
      } else if (vExistente !== null && vExistente !== pendingAdd.temp) {
        // Era número legacy
        prevEntry = {
          v: vExistente, ts: new Date().toISOString(),
          quien: "—", jornada: jornadaKey, firma: "",
        };
      }
    }

    const nuevaLectura: LecturaAuditada = {
      v: pendingAdd.temp,
      ts: new Date().toISOString(),
      quien: resp || "—",
      jornada: jornadaKey,
      firma,
      prev: prevEntry ? [...prevAnterior, prevEntry] : prevAnterior,
    };

    const nuevasLecturas: LecturasNevera = { ...lecturas, [clave]: nuevaLectura };
    setLecturas(nuevasLecturas);
    lecturasOriginales.current = nuevasLecturas; // actualizar snapshot
    cachedStates.current[selectedNevera.id] = {
      año,
      mes,
      lecturas: nuevasLecturas,
      lecturasOriginales: nuevasLecturas,
      firmas,
      info,
    };

    await saveDeviceDraft();

    // Guardar inmediatamente en DB
    const res = await fetch("/api/neveras-registros", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSaveBody(nuevasLecturas, firmas)),
    });
    if (!res.ok) throw new Error((await res.json()).error);

    // Limpiar inputs y avanzar día
    const nextDia = pendingAdd.dia < getDiasEnMes(mes, año) ? pendingAdd.dia + 1 : pendingAdd.dia;
    setPendingAdd(null);
    setInputTemp("");
    setInputDia(String(nextDia));
    showToast(`Lectura del día ${pendingAdd.dia} registrada ✓`);
  };

  // ── Guardar mensual: responsables, observaciones y confirmación mensual ───
  const pedirFirmaMensual = () => {
    if (!selectedNevera) return;
    if (!info.responsable_manana.trim() && !info.responsable_tarde.trim() && !info.responsable_noche.trim()) {
      showToast("Completa el nombre de al menos un responsable antes de guardar.", "err");
      return;
    }
    setFirmaModal(true);
  };

  const handleSaveMensual = async ({ firma, jornada }: { firma: string; jornada?: JornadaKey }) => {
    if (!selectedNevera) return;
    setSaving(true);
    try {
      const jornadaKey = jornada ?? "manana";
      const nuevasFirmas = { ...firmas, [jornadaKey]: firma };
      setFirmas(nuevasFirmas);
      cachedStates.current[selectedNevera.id] = {
        año,
        mes,
        lecturas,
        lecturasOriginales: lecturasOriginales.current,
        firmas: nuevasFirmas,
        info,
      };

      await saveDeviceDraft();

      const res = await fetch("/api/neveras-registros", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveBody(lecturas, nuevasFirmas)),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast("Registro mensual guardado ✓");
    } finally {
      setSaving(false);
    }
  };

  // ── Navegación de mes ──────────────────────────────────────────────────────
  const navMes = (d: number) => {
    cacheCurrentNeveraState();
    let m = mes + d, a = año;
    if (m > 12) { m = 1; a++; }
    if (m < 1)  { m = 12; a--; }
    setMes(m); setAño(a);
  };

  const fc = parseFloat(deviceDraft.factor_correccion) || 0;
  const printInfo = {
    dispositivo: deviceDraft.dispositivo,
    marca: deviceDraft.dispositivo_marca,
    modelo: deviceDraft.dispositivo_modelo,
    serial: deviceDraft.dispositivo_serial,
    certificado: deviceDraft.certificado,
    factor_correccion: deviceDraft.factor_correccion,
    ...info,
  };

  // Datos de prueba: genera lecturas sin confirmación de responsable
  const cargarDatosPrueba = () => {
    const nuevas: LecturasNevera = {};
    const dias = getDiasEnMes(mes, año);
    for (let d = 1; d <= dias; d++) {
      for (const j of JORNADAS) {
        const outlier = Math.random() < 0.06;
        nuevas[lecturaClave(d, j)] = outlier
          ? (Math.random() < 0.5
              ? parseFloat((Math.random() * 1.9).toFixed(1))
              : parseFloat((8.1 + Math.random() * 2.4).toFixed(1)))
          : parseFloat((2.2 + Math.random() * 5.6).toFixed(1));
      }
    }
    setLecturas(nuevas);
  };

  // ── Sin neveras ────────────────────────────────────────────────────────────
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
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium no-print ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"} text-white`}>
          {toast.type === "ok" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* ═══ ENCABEZADO ══════════════════════════════════════════════════════ */}
      <HospitalHeader codigo="M-GADT-LAB-F-029" version="2"
        nombreDocumento="FORMATO PARA REGISTRO DE TEMPERATURA DE LA CADENA DE FRÍO" />

      {/* ─── Metadatos ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs no-print">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 divide-x divide-y divide-gray-200">
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
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Nevera</p>
            <select className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs"
              value={selectedNevera?.id || ""}
              onChange={e => handleNeveraChange(e.target.value)}>
              {neveras.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Dispositivo</p>
            <input className={DEVICE_INPUT_CLASS}
              value={deviceDraft.dispositivo} onChange={e => updateDeviceDraft("dispositivo", e.target.value)} onBlur={persistDeviceDraft} placeholder="—" />
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Marca</p>
            <input className={DEVICE_INPUT_CLASS}
              value={deviceDraft.dispositivo_marca} onChange={e => updateDeviceDraft("dispositivo_marca", e.target.value)} onBlur={persistDeviceDraft} placeholder="—" />
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Modelo</p>
            <input className={DEVICE_INPUT_CLASS}
              value={deviceDraft.dispositivo_modelo} onChange={e => updateDeviceDraft("dispositivo_modelo", e.target.value)} onBlur={persistDeviceDraft} placeholder="—" />
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Serial</p>
            <input className={DEVICE_INPUT_CLASS}
              value={deviceDraft.dispositivo_serial} onChange={e => updateDeviceDraft("dispositivo_serial", e.target.value)} onBlur={persistDeviceDraft} placeholder="—" />
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corrección</p>
            <input type="number" step="0.01"
              className="w-full bg-transparent font-bold text-hsa-green focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={deviceDraft.factor_correccion} onChange={e => updateDeviceDraft("factor_correccion", e.target.value)} onBlur={persistDeviceDraft} placeholder="0" />
          </div>
        </div>

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
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Certificado</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              value={deviceDraft.certificado} onChange={e => updateDeviceDraft("certificado", e.target.value)} onBlur={persistDeviceDraft} placeholder="—" />
          </div>
          <div className="px-3 py-1.5 col-span-2 flex items-center gap-2 justify-end no-print">
            <button onClick={cargarDatosPrueba}
              className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-semibold hover:bg-amber-200 transition-colors">
              🧪 Prueba
            </button>
            {/* Guardar mensual: responsables + confirmación mensual */}
            <button onClick={pedirFirmaMensual} disabled={saving || loading}
              className="flex items-center gap-1 px-3 py-1 text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#006b3c" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#006b3c"; }}>
              {saving ? <Loader2 size={11} className="animate-spin"/> : <Save size={11}/>}
              {saving ? "Guardando…" : "Guardar mes"}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition-colors no-print">
              <Printer size={11}/> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* ═══ GRÁFICA ═════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 no-print">
          <Loader2 size={28} className="animate-spin mr-2"/> Cargando…
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden no-print">
          {/* Leyenda */}
          <div className="flex items-center gap-4 px-4 pt-3 pb-1 text-xs text-gray-500 flex-wrap">
            {JORNADAS.map(j => (
              <div key={j} className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 inline-block" style={{ background: J_COLOR[j] }}/>
                <span className="font-medium text-[11px]" style={{ color: J_COLOR[j] }}>{J_LABEL[j]}</span>
              </div>
            ))}
            {fc !== 0 && (
              <span className="text-gray-400 text-[11px] ml-auto">
                F. corrección: +{fc}°C (en tooltip)
              </span>
            )}
          </div>

          <NeveraChart
            lecturas={lecturas} mes={mes} año={año}
            rangoMin={rangoMin} rangoMax={rangoMax}
            factorCorreccion={fc} />

          {/* ─── Ingreso de lectura (confirmación requerida por entrada) ─── */}
          <div className="border-t border-gray-100 bg-gray-50/50 no-print">

            {/* Selector de jornada */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Jornada:</span>
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {JORNADAS.map(j => {
                  const hasResp = responsableDeJornada(j).trim() !== "";
                  return (
                    <button key={j} onClick={() => setJornadaAdd(j)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        jornadaAdd === j ? "bg-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                      }`}
                      style={jornadaAdd === j ? { color: J_COLOR[j] } : {}}>
                      {J_LABEL[j]}
                      {!hasResp && <span className="text-amber-400 text-[10px]">⚠</span>}
                    </button>
                  );
                })}
              </div>
              {!responsableDeJornada(jornadaAdd).trim() && (
                <span className="text-[11px] text-amber-600 font-medium">
                  ← Completa el responsable de {J_LABEL[jornadaAdd]} para poder agregar lecturas.
                </span>
              )}
            </div>

              {/* Inputs + botón Confirmar y agregar */}
            <div className="flex items-center gap-3 px-4 pb-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Día</span>
                <input type="number" min={1} max={getDiasEnMes(mes, año)} step={1}
                  className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                  value={inputDia} onChange={e => setInputDia(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && document.getElementById("temp-in")?.focus()} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Temp °C</span>
                <input id="temp-in" type="number" step="0.1"
                  className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                  value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && agregar()}
                  placeholder="0.0" />
              </div>
              {inputTemp && fc !== 0 && !isNaN(parseFloat(inputTemp)) && (
                <span className="text-xs font-semibold" style={{ color: J_COLOR[jornadaAdd] }}>
                  → {(parseFloat(inputTemp) + fc).toFixed(1)}°C corregida
                </span>
              )}
              {/* Botón principal: abre modal de confirmación antes de registrar */}
              <button onClick={agregar} disabled={!inputTemp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: inputTemp ? J_COLOR[jornadaAdd] : "#9ca3af" }}>
                <PenLine size={12}/>
                Confirmar y agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESPONSABLES ════════════════════════════════════════════════════ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs no-print">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-gray-200">
          {JORNADAS.map(j => {
            const campo = j === "M" ? "responsable_manana" : j === "T" ? "responsable_tarde" : "responsable_noche";
            return (
              <div key={j} className="px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: J_COLOR[j] }}>
                  Responsable {J_LABEL[j]}
                </p>
                <input
                  className="w-full border-b border-gray-300 focus:outline-none pb-1 text-sm"
                  value={info[campo as keyof typeof info]}
                  onChange={e => setInfo(i => ({...i, [campo]: e.target.value}))}
                  placeholder="Nombre y cargo"
                  onFocus={() => setJornadaAdd(j)}
                />
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Fecha Limpieza y Desinfección</p>
            <input type="date" className="border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.fecha_limpieza}
              onChange={e => setInfo(i => ({...i, fecha_limpieza: e.target.value}))} />
          </div>
          <div className="px-4 py-3">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-2 text-[10px]">Observaciones</p>
            <input className="w-full border-b border-gray-300 focus:outline-none focus:border-hsa-green pb-1 text-sm"
              value={info.observaciones}
              onChange={e => setInfo(i => ({...i, observaciones: e.target.value}))}
              placeholder="Novedades del mes…"/>
          </div>
        </div>
      </div>

      <NeveraPrintTemplate
        className="print-only"
        lecturas={lecturas}
        mes={mes}
        año={año}
        neveraNombre={selectedNevera?.nombre ?? ""}
        info={printInfo}
        firmas={firmas}
        rangoMin={rangoMin}
        rangoMax={rangoMax}
      />

      <HospitalFooter />

      <div className="no-print">
        {/* ── Modal de confirmación POR LECTURA ────────────────────────────── */}
        <FirmaGuardadoModal
          open={firmaModalAdd}
          onClose={() => { setFirmaModalAdd(false); setPendingAdd(null); }}
          onConfirm={handleAddWithFirma}
          jornadaDefault={toJornadaKey(jornadaAdd)}
          responsables={{
            manana: info.responsable_manana,
            tarde:  info.responsable_tarde,
            noche:  info.responsable_noche,
          }}
          titulo={
            pendingAdd
              ? `Confirmar lectura — Día ${pendingAdd.dia} · ${J_LABEL[jornadaAdd]} · ${pendingAdd.temp}°C`
              : "Confirmar lectura"
          }
        />

        {/* ── Modal de confirmación MENSUAL ────────────────────────────────── */}
        <FirmaGuardadoModal
          open={firmaModal}
          onClose={() => setFirmaModal(false)}
          onConfirm={handleSaveMensual}
          responsables={{
            manana: info.responsable_manana,
            tarde:  info.responsable_tarde,
            noche:  info.responsable_noche,
          }}
          titulo="Confirmar registro mensual — F-029"
        />
      </div>
    </div>
  );
}
