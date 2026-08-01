"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  ChevronLeft, ChevronRight, FileDown, Printer, Loader2,
  CheckCircle, AlertCircle, PenLine,
} from "lucide-react";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import RegistroChart from "@/components/RegistroChart";
import FirmaGuardadoModal from "@/components/FirmaGuardadoModal";
import TermoPrintTemplate from "@/components/TermoPrintTemplate";
import type {
  LecturasTermohigrometria, LecturaDiaTermohigro,
  RegistroTermohigrometria, JornadaKey,
} from "@/lib/types";
import { MESES, getDiasEnMes, enriquecerLecturasTermohigro } from "@/lib/types";
import { buildPdfFilename, downloadElementAsPdf } from "@/lib/exportPdf";

// ─── Colores y etiquetas de jornada ──────────────────────────────────────────
type J = "M" | "T" | "N";
const J_COLOR: Record<J, string> = { M: "#006b3c", T: "#d97706", N: "#4338ca" };
const J_LABEL: Record<J, string> = { M: "Mañana", T: "Tarde", N: "Noche" };
const JORNADAS: J[] = ["M", "T", "N"];

interface TermohigrometriaInfo {
  ubicacion: string;
  dispositivo_nombre: string;
  dispositivo_marca: string;
  dispositivo_modelo: string;
  dispositivo_serial: string;
  certificado: string;
  factor_correccion_temp: string;
  factor_correccion_hum: string;
  responsable_manana: string;
  responsable_tarde: string;
  responsable_noche: string;
  observaciones: string;
}

interface TermohigrometriaFirmas {
  manana: string;
  tarde: string;
  noche: string;
}

interface TermohigrometriaDraft {
  info: TermohigrometriaInfo;
  firmas: TermohigrometriaFirmas;
  lecturas: LecturasTermohigrometria;
  lecturasOriginales: LecturasTermohigrometria;
  jornadaAdd: J;
  inputDia: string;
  inputTemp: string;
  inputHum: string;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
}

const EMPTY_FIRMAS: TermohigrometriaFirmas = { manana: "", tarde: "", noche: "" };

const EMPTY_INFO: TermohigrometriaInfo = {
  ubicacion: "",
  dispositivo_nombre: "TERMOHIGROMETRO",
  dispositivo_marca: "",
  dispositivo_modelo: "",
  dispositivo_serial: "",
  certificado: "",
  factor_correccion_temp: "0",
  factor_correccion_hum: "0",
  responsable_manana: "",
  responsable_tarde: "",
  responsable_noche: "",
  observaciones: "",
};

const buildDraftKey = (año: number, mes: number) =>
  `lab-forms-hsa:termohigrometria:draft:${año}-${String(mes).padStart(2, "0")}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const getApiErrorMessage = async (res: Response, fallback: string) => {
  try {
    const body: unknown = await res.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string" &&
      body.error.trim()
    ) {
      return body.error;
    }
  } catch {
    // Ignore malformed/non-JSON error bodies and use the provided fallback.
  }

  return fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isJornada = (value: unknown): value is J =>
  value === "M" || value === "T" || value === "N";

const readText = (source: Record<string, unknown>, key: keyof TermohigrometriaInfo, fallback = "") => {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
};

const readNumber = (source: Record<string, unknown>, key: string, fallback: number) => {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeInfo = (value: unknown): TermohigrometriaInfo => {
  const source = isRecord(value) ? value : {};
  return {
    ubicacion: readText(source, "ubicacion"),
    dispositivo_nombre: readText(source, "dispositivo_nombre", "TERMOHIGROMETRO"),
    dispositivo_marca: readText(source, "dispositivo_marca"),
    dispositivo_modelo: readText(source, "dispositivo_modelo"),
    dispositivo_serial: readText(source, "dispositivo_serial"),
    certificado: readText(source, "certificado"),
    factor_correccion_temp: readText(source, "factor_correccion_temp", "0"),
    factor_correccion_hum: readText(source, "factor_correccion_hum", "0"),
    responsable_manana: readText(source, "responsable_manana"),
    responsable_tarde: readText(source, "responsable_tarde"),
    responsable_noche: readText(source, "responsable_noche"),
    observaciones: readText(source, "observaciones"),
  };
};

const normalizeFirmas = (value: unknown): TermohigrometriaFirmas => {
  const source = isRecord(value) ? value : {};
  return {
    manana: typeof source.manana === "string" ? source.manana : "",
    tarde: typeof source.tarde === "string" ? source.tarde : "",
    noche: typeof source.noche === "string" ? source.noche : "",
  };
};

const normalizeLecturas = (value: unknown): LecturasTermohigrometria =>
  isRecord(value) ? { ...(value as LecturasTermohigrometria) } : {};

const applyRegistro = (
  registro: RegistroTermohigrometria | null,
  setInfo: Dispatch<SetStateAction<TermohigrometriaInfo>>,
  setFirmas: Dispatch<SetStateAction<TermohigrometriaFirmas>>,
  setLecturas: Dispatch<SetStateAction<LecturasTermohigrometria>>,
  lecturasOriginales: MutableRefObject<LecturasTermohigrometria>,
) => {
  if (!registro) {
    setInfo({ ...EMPTY_INFO });
    setFirmas({ ...EMPTY_FIRMAS });
    setLecturas({});
    lecturasOriginales.current = {};
    return;
  }

  const lecturasHydrated = normalizeLecturas(registro.lecturas);

  setInfo({
    ubicacion: registro.ubicacion,
    dispositivo_nombre: registro.dispositivo_nombre,
    dispositivo_marca: registro.dispositivo_marca,
    dispositivo_modelo: registro.dispositivo_modelo,
    dispositivo_serial: registro.dispositivo_serial,
    certificado: registro.certificado,
    factor_correccion_temp: registro.factor_correccion_temp ?? registro.factor_correccion ?? "0",
    factor_correccion_hum: registro.factor_correccion_hum ?? "0",
    responsable_manana: registro.responsable_manana ?? "",
    responsable_tarde: registro.responsable_tarde ?? "",
    responsable_noche: registro.responsable_noche ?? "",
    observaciones: registro.observaciones,
  });
  setFirmas({
    manana: registro.firma_manana ?? "",
    tarde: registro.firma_tarde ?? "",
    noche: registro.firma_noche ?? "",
  });
  setLecturas(lecturasHydrated);
  lecturasOriginales.current = lecturasHydrated;
};

const readTermohigrometriaDraft = (año: number, mes: number): TermohigrometriaDraft | null => {
  try {
    const key = buildDraftKey(año, mes);
    const raw = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    return {
      info: normalizeInfo(parsed.info),
      firmas: normalizeFirmas(parsed.firmas),
      lecturas: normalizeLecturas(parsed.lecturas),
      lecturasOriginales: normalizeLecturas(parsed.lecturasOriginales),
      jornadaAdd: isJornada(parsed.jornadaAdd) ? parsed.jornadaAdd : "M",
      inputDia: typeof parsed.inputDia === "string" ? parsed.inputDia : "1",
      inputTemp: typeof parsed.inputTemp === "string" ? parsed.inputTemp : "",
      inputHum: typeof parsed.inputHum === "string" ? parsed.inputHum : "",
      tempMin: readNumber(parsed, "tempMin", 15),
      tempMax: readNumber(parsed, "tempMax", 30),
      humMin: readNumber(parsed, "humMin", 40),
      humMax: readNumber(parsed, "humMax", 70),
    };
  } catch {
    return null;
  }
};

const writeTermohigrometriaDraft = (año: number, mes: number, draft: TermohigrometriaDraft) => {
  try {
    window.localStorage.setItem(buildDraftKey(año, mes), JSON.stringify(draft));
  } catch {
    // localStorage puede no estar disponible; en ese caso dejamos que la DB sea la fuente.
  }
};

const clearTermohigrometriaDraft = (año: number, mes: number) => {
  try {
    const key = buildDraftKey(año, mes);
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    // No-op: limpiar borrador es una mejora, no debe romper el guardado.
  }
};

// Mappers entre J y JornadaKey
const toJornadaKey = (j: J): JornadaKey =>
  j === "M" ? "manana" : j === "T" ? "tarde" : "noche";

export default function TermohigrometriaPage() {
  const now = new Date();
  const [año, setAño] = useState(now.getFullYear());
  const [mes,  setMes]  = useState(now.getMonth() + 1);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [firmaModal,   setFirmaModal]   = useState(false);
  const [firmaModalAdd, setFirmaModalAdd] = useState(false);
  const [pendingAdd,   setPendingAdd]   = useState<{ dia: number; temp: number; hum: number | null } | null>(null);
  const [firmas,       setFirmas]       = useState({ manana: "", tarde: "", noche: "" });
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [tempMin, setTempMin] = useState(15);
  const [tempMax, setTempMax] = useState(30);
  const [humMin,  setHumMin]  = useState(40);
  const [humMax,  setHumMax]  = useState(70);

  const [lecturas, setLecturas] = useState<LecturasTermohigrometria>({});
  const lecturasOriginales = useRef<LecturasTermohigrometria>({});
  const draftHydrated = useRef(false);
  const [info, setInfo] = useState<TermohigrometriaInfo>({ ...EMPTY_INFO });
  const printTemplateRef = useRef<HTMLDivElement>(null);
  const pdfExportInProgress = useRef(false);

  // ── Ingreso ────────────────────────────────────────────────────────────────
  const [jornadaAdd, setJornadaAdd] = useState<J>("M");
  const [inputDia,   setInputDia]   = useState(String(now.getDate()));
  const [inputTemp,  setInputTemp]  = useState("");
  const [inputHum,   setInputHum]   = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const load = async () => {
      draftHydrated.current = false;
      setLoading(true);
      setLoadError(null);

      try {
        const res  = await fetch(`/api/termohigrometria?año=${año}&mes=${mes}`);
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "No se pudo cargar el registro de termohigrometría."));
        }

        const data: unknown = await res.json();
        const registros = Array.isArray(data) ? data as RegistroTermohigrometria[] : [];
        if (!active) return;

        applyRegistro(registros[0] ?? null, setInfo, setFirmas, setLecturas, lecturasOriginales);

        const draft = readTermohigrometriaDraft(año, mes);
        if (draft) {
          setInfo(draft.info);
          setFirmas(draft.firmas);
          setLecturas(normalizeLecturas(draft.lecturas));
          lecturasOriginales.current = normalizeLecturas(draft.lecturasOriginales);
          setJornadaAdd(draft.jornadaAdd);
          setInputDia(draft.inputDia);
          setInputTemp(draft.inputTemp);
          setInputHum(draft.inputHum);
          setTempMin(draft.tempMin);
          setTempMax(draft.tempMax);
          setHumMin(draft.humMin);
          setHumMax(draft.humMax);
        }
      } catch (error: unknown) {
        if (!active) return;
        const message = getErrorMessage(error, "No se pudo cargar el registro de termohigrometría.");
        const draft = readTermohigrometriaDraft(año, mes);

        if (draft) {
          setInfo(draft.info);
          setFirmas(draft.firmas);
          setLecturas(normalizeLecturas(draft.lecturas));
          lecturasOriginales.current = normalizeLecturas(draft.lecturasOriginales);
          setJornadaAdd(draft.jornadaAdd);
          setInputDia(draft.inputDia);
          setInputTemp(draft.inputTemp);
          setInputHum(draft.inputHum);
          setTempMin(draft.tempMin);
          setTempMax(draft.tempMax);
          setHumMin(draft.humMin);
          setHumMax(draft.humMax);
        } else {
          applyRegistro(null, setInfo, setFirmas, setLecturas, lecturasOriginales);
        }

        setLoadError(message);
        showToast(message, "err");
      }

      draftHydrated.current = true;
      setLoading(false);
    };

    load();

    return () => { active = false; };
  }, [año, mes]);

  useEffect(() => {
    if (loading || !draftHydrated.current) return;

    writeTermohigrometriaDraft(año, mes, {
      info,
      firmas,
      lecturas,
      lecturasOriginales: lecturasOriginales.current,
      jornadaAdd,
      inputDia,
      inputTemp,
      inputHum,
      tempMin,
      tempMax,
      humMin,
      humMax,
    });
  }, [año, mes, loading, info, firmas, lecturas, jornadaAdd, inputDia, inputTemp, inputHum, tempMin, tempMax, humMin, humMax]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const responsableDeJornada = (j: J) =>
    j === "M" ? info.responsable_manana :
    j === "T" ? info.responsable_tarde  : info.responsable_noche;

  // ── Helper para armar el body de guardado ─────────────────────────────────
  const buildSaveBody = (
    lecs: LecturasTermohigrometria,
    fs: typeof firmas,
    resp: string,
    firma?: string,
  ) => ({
    año, mes, ...info,
    lecturas: lecs,
    firma_manana: fs.manana,
    firma_tarde:  fs.tarde,
    firma_noche:  fs.noche,
    responsable:  resp,
    firma: firma ?? "",
  });

  // ── Agregar lectura (abre modal de confirmación por entrada) ──────────────
  const agregar = () => {
    // 1. Validar responsable de la jornada
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
    if (isNaN(temp)) { showToast("Ingresa la temperatura", "err"); return; }
    const humRaw = parseFloat(inputHum);
    const hum = isNaN(humRaw) ? null : humRaw;

    // 3. Guardar pending y abrir modal de confirmación
    setPendingAdd({ dia, temp, hum });
    setFirmaModalAdd(true);
  };

  // ── Confirmar lectura (auto-guarda en DB) ─────────────────────────────────
  const handleAddWithFirma = async ({ firma }: { firma: string; jornada?: JornadaKey }) => {
    if (!pendingAdd) return;
    const { dia, temp, hum } = pendingAdd;
    const clave = `${dia}_${jornadaAdd}`;
    const resp  = responsableDeJornada(jornadaAdd);
    const ts    = new Date().toISOString();

    // Construir historial previo si el día ya tenía datos
    const entryExistente = lecturas[clave];
    const prevEntry: NonNullable<LecturaDiaTermohigro["prev"]>[number] | null =
      (entryExistente?.temp != null || entryExistente?.hum != null)
        ? {
            temp:  entryExistente.temp,
            hum:   entryExistente.hum,
            ts:    entryExistente.ts,
            quien: entryExistente.quien,
            firma: entryExistente.firma,
          }
        : null;
    const prevAnterior = entryExistente?.prev ?? [];

    const nuevaEntrada: LecturaDiaTermohigro = {
      temp,
      hum,
      ts,
      quien: resp || "—",
      firma,
      prev: prevEntry ? [...prevAnterior, prevEntry] : prevAnterior,
    };

    const nuevasLecturas = { ...lecturas, [clave]: nuevaEntrada };
    setLecturas(nuevasLecturas);
    lecturasOriginales.current = nuevasLecturas;

    // Auto-guardar en DB
    const res = await fetch("/api/termohigrometria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSaveBody(nuevasLecturas, firmas, resp || "—", firma)),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    clearTermohigrometriaDraft(año, mes);

    // Limpiar inputs y avanzar día
    const max = getDiasEnMes(mes, año);
    setInputTemp("");
    setInputHum("");
    setInputDia(String(dia < max ? dia + 1 : dia));
    setPendingAdd(null);
    showToast(`Lectura día ${dia} · ${J_LABEL[jornadaAdd]} guardada ✓`);
  };

  // ── Pedir confirmación mensual ─────────────────────────────────────────────
  const pedirFirmaMensual = () => {
    if (Object.keys(lecturas).length === 0) {
      showToast("Ingresa al menos una lectura antes de guardar.", "err");
      return;
    }
    if (!info.responsable_manana.trim() && !info.responsable_tarde.trim() && !info.responsable_noche.trim()) {
      showToast("Completa el nombre de al menos un responsable antes de guardar.", "err");
      return;
    }
    setFirmaModal(true);
  };

  // ── Guardar mes con confirmación ───────────────────────────────────────────
  const handleSaveMensual = async ({ firma: f, jornada }: { firma: string; jornada?: JornadaKey }) => {
    setSaving(true);
    try {
      const jornadaKey = (jornada ?? "manana") as JornadaKey;
      const resp =
        jornadaKey === "manana" ? info.responsable_manana :
        jornadaKey === "tarde"  ? info.responsable_tarde  :
                                  info.responsable_noche;

      const audit = { ts: new Date().toISOString(), quien: resp || "—", firma: f };
      const lecturasAuditadas = enriquecerLecturasTermohigro(lecturas, lecturasOriginales.current, audit);
      lecturasOriginales.current = lecturasAuditadas;
      setLecturas(lecturasAuditadas);

      const nuevasFirmas = { ...firmas, [jornadaKey]: f };
      setFirmas(nuevasFirmas);

      const res = await fetch("/api/termohigrometria", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveBody(lecturasAuditadas, nuevasFirmas, resp || "", f)),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      clearTermohigrometriaDraft(año, mes);
      showToast("Registro guardado ✓");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfExportInProgress.current || !printTemplateRef.current) return;

    pdfExportInProgress.current = true;
    setExportingPdf(true);

    try {
      const filename = buildPdfFilename([
        "termohigrometria",
        `${año}-${String(mes).padStart(2, "0")}`,
        info.dispositivo_nombre,
      ]);
      await downloadElementAsPdf(printTemplateRef.current, filename);
      showToast("PDF descargado ✓");
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "No se pudo generar el PDF."), "err");
    } finally {
      pdfExportInProgress.current = false;
      setExportingPdf(false);
    }
  };

  // ── Navegación de mes ──────────────────────────────────────────────────────
  const navMes = (d: number) => {
    setLoading(true);
    let m = mes + d, a = año;
    if (m > 12) { m = 1; a++; }
    if (m < 1)  { m = 12; a--; }
    setMes(m); setAño(a);
  };

  const fcTemp = parseFloat(info.factor_correccion_temp) || 0;
  const fcHum  = parseFloat(info.factor_correccion_hum)  || 0;

  // ── Datos de prueba con 3 jornadas ────────────────────────────────────────
  const cargarDatosPrueba = () => {
    const nuevas: LecturasTermohigrometria = {};
    const dias = getDiasEnMes(mes, año);
    for (let d = 1; d <= dias; d++) {
      for (const j of JORNADAS) {
        nuevas[`${d}_${j}`] = {
          temp: parseFloat((tempMin + Math.random() * (tempMax - tempMin + 4) - 2).toFixed(1)),
          hum:  parseFloat((humMin  + Math.random() * (humMax  - humMin  + 8) - 4).toFixed(1)),
        };
      }
    }
    setLecturas(nuevas);
  };

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
      <HospitalHeader
        codigo="M-GAD-LAB-F-021" version="2"
        nombreDocumento="FORMATO PARA REGISTRO DE CONDICIONES AMBIENTALES DE ALMACENAMIENTO (T°C Y HUMEDAD)"
      />

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 no-print">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

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
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corr. Temp</p>
            <input type="number" step="0.01"
              className="w-full bg-transparent font-bold text-hsa-green focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion_temp} onChange={e => setInfo(i => ({...i, factor_correccion_temp: e.target.value}))} placeholder="0"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corr. Hum</p>
            <input type="number" step="0.01"
              className="w-full bg-transparent font-bold text-sky-500 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion_hum} onChange={e => setInfo(i => ({...i, factor_correccion_hum: e.target.value}))} placeholder="0"/>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50/50">
          <div className="px-3 py-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Temperatura</span>
              <input type="number" step="0.5" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                value={tempMin} onChange={e => setTempMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="0.5" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                value={tempMax} onChange={e => setTempMax(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">°C</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Humedad</span>
              <input type="number" step="1" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
                value={humMin} onChange={e => setHumMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="1" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
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
            <button onClick={handleDownloadPdf} disabled={exportingPdf || loading}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
              {exportingPdf ? <Loader2 size={11} className="animate-spin"/> : <FileDown size={11}/>}
              {exportingPdf ? "Generando…" : "Guardar PDF"}
            </button>
            <button onClick={pedirFirmaMensual} disabled={saving || loading}
              className="flex items-center gap-1 px-3 py-1 text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#006b3c" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#004d2a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "#006b3c"; }}>
              {saving ? <Loader2 size={11} className="animate-spin"/> : <PenLine size={11}/>}
              {saving ? "Guardando…" : "Guardar mes"}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition-colors no-print">
              <Printer size={11}/> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* ═══ GRÁFICAS ════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 no-print">
          <Loader2 size={28} className="animate-spin mr-2"/> Cargando…
        </div>
      ) : (
        <div className="space-y-6 no-print">
          {/* ── Temperatura ─────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <RegistroChart
              modo="temperatura" lecturas={lecturas} mes={mes} año={año}
              rangoMin={tempMin} rangoMax={tempMax}
              factorCorreccion={fcTemp}
              titulo="Temperatura Ambiental" unidad="°C"/>

            {/* Ingreso de lectura */}
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

              {/* Inputs */}
              <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Día</span>
                  <input type="number" min={1} max={getDiasEnMes(mes, año)}
                    className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                    value={inputDia} onChange={e => setInputDia(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("temp-in")?.focus()}/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Temp °C</span>
                  <input id="temp-in" type="number" step="0.1"
                    className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                    value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("hum-in")?.focus()}
                    placeholder="0.0"/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Hum %</span>
                  <input id="hum-in" type="number" step="0.1"
                    className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                    value={inputHum} onChange={e => setInputHum(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && agregar()}
                    placeholder="0.0"/>
                </div>
                {inputTemp && fcTemp !== 0 && !isNaN(parseFloat(inputTemp)) && (
                  <span className="text-xs font-semibold" style={{ color: J_COLOR[jornadaAdd] }}>
                    → {(parseFloat(inputTemp) + fcTemp).toFixed(1)}°C corregida
                  </span>
                )}
                <button onClick={agregar} disabled={!inputTemp}
                  className="flex items-center gap-1 px-3 py-1.5 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
                  style={{ backgroundColor: inputTemp ? J_COLOR[jornadaAdd] : "#9ca3af" }}>
                  <PenLine size={12}/> Confirmar y agregar
                </button>
              </div>
            </div>
          </div>

          {/* ── Humedad ────────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <RegistroChart
              modo="humedad" lecturas={lecturas} mes={mes} año={año}
              rangoMin={humMin} rangoMax={humMax}
              factorCorreccion={fcHum}
              titulo="Humedad Relativa" unidad="%"/>
          </div>

          {/* ── Responsables ────────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs">
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
        </div>
      )}

      <div ref={printTemplateRef} className="print-only">
        <TermoPrintTemplate
          lecturas={lecturas}
          mes={mes}
          año={año}
          info={info}
          firmas={firmas}
          tempMin={tempMin}
          tempMax={tempMax}
          humMin={humMin}
          humMax={humMax}
        />
      </div>

      <HospitalFooter/>

      <div className="no-print">
        {/* ── Modal de confirmación por entrada ─────────────────────────────── */}
        <FirmaGuardadoModal
          open={firmaModalAdd}
          onClose={() => { setFirmaModalAdd(false); setPendingAdd(null); }}
          onConfirm={handleAddWithFirma}
          responsable={responsableDeJornada(jornadaAdd)}
          jornadaDefault={toJornadaKey(jornadaAdd)}
          titulo={
            pendingAdd
              ? `Confirmar lectura — Día ${pendingAdd.dia} · ${J_LABEL[jornadaAdd]} · ${pendingAdd.temp}°C${pendingAdd.hum != null ? ` · ${pendingAdd.hum}%` : ""}`
              : "Confirmar lectura"
          }
        />

        {/* ── Modal de confirmación mensual ─────────────────────────────────── */}
        <FirmaGuardadoModal
          open={firmaModal}
          onClose={() => setFirmaModal(false)}
          onConfirm={handleSaveMensual}
          responsables={{
            manana: info.responsable_manana,
            tarde:  info.responsable_tarde,
            noche:  info.responsable_noche,
          }}
          titulo="Confirmar mes — F-021 Termohigrometría"
        />
      </div>
    </div>
  );
}
