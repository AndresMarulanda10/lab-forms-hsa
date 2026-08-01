"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  ChevronLeft, ChevronRight, FileDown, Printer, Loader2,
  CheckCircle, AlertCircle, PenLine,
} from "lucide-react";
import HospitalHeader from "@/components/HospitalHeader";
import HospitalFooter from "@/components/HospitalFooter";
import RegistroChart from "@/components/RegistroChart";
import FirmaGuardadoModal from "@/components/FirmaGuardadoModal";
import TermoPrintTemplate from "@/components/TermoPrintTemplate";
import PrintableSheet from "@/components/PrintableSheet";
import type {
  LecturasTermohigrometria, LecturaDiaTermohigro,
  RegistroTermohigrometria, JornadaKey,
} from "@/lib/types";
import { MESES, getDiasEnMes, enriquecerLecturasTermohigro } from "@/lib/types";
import { buildPdfFilename, downloadElementAsPdf } from "@/lib/exportPdf";
import {
  clearTermohigrometriaDraft,
  normalizeTermohigrometriaInfo,
  parseMonthContext,
  readTermohigrometriaDraft,
  resolveTermohigrometriaDraft,
  termohigrometriaDraftsEqual,
  writeTermohigrometriaDraft,
} from "@/lib/termohigrometriaPersistence";
import type {
  TermohigrometriaDraftData,
  TermohigrometriaFirmas,
  TermohigrometriaInfo,
} from "@/lib/termohigrometriaPersistence";

// ─── Colores y etiquetas de jornada ──────────────────────────────────────────
type J = "M" | "T" | "N";
const J_COLOR: Record<J, string> = { M: "#006b3c", T: "#d97706", N: "#4338ca" };
const J_LABEL: Record<J, string> = { M: "Mañana", T: "Tarde", N: "Noche" };
const JORNADAS: J[] = ["M", "T", "N"];

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

const CONFLICT_MESSAGE = "Hay datos más recientes en el servidor. Recarga la página para revisarlos y decidir si recuperas o descartas tu borrador.";

type SaveContext = {
  year: number;
  month: number;
  expectedUpdatedAt: string | null;
};

const normalizeLecturas = (value: unknown): LecturasTermohigrometria =>
  typeof value === "object" && value !== null ? { ...(value as LecturasTermohigrometria) } : {};

// Mappers entre J y JornadaKey
const toJornadaKey = (j: J): JornadaKey =>
  j === "M" ? "manana" : j === "T" ? "tarde" : "noche";

const buildDatabaseDraft = (
  registro: RegistroTermohigrometria | null,
  inputDia: string,
): TermohigrometriaDraftData => {
  const lecturas = normalizeLecturas(registro?.lecturas);
  return {
    info: normalizeTermohigrometriaInfo(registro ?? EMPTY_INFO),
    firmas: registro ? {
      manana: registro.firma_manana ?? "",
      tarde: registro.firma_tarde ?? "",
      noche: registro.firma_noche ?? "",
    } : { ...EMPTY_FIRMAS },
    lecturas,
    lecturasOriginales: lecturas,
    jornadaAdd: "M",
    inputDia,
    inputTemp: "",
    inputHum: "",
    tempMin: 15,
    tempMax: 30,
    humMin: 40,
    humMax: 70,
  };
};

const parseSavedRegistro = (value: unknown): RegistroTermohigrometria => {
  if (
    typeof value !== "object" || value === null ||
    !("updated_at" in value) || typeof value.updated_at !== "string" ||
    Number.isNaN(Date.parse(value.updated_at))
  ) {
    throw new Error("El servidor no devolvió una versión válida del registro guardado.");
  }
  return value as RegistroTermohigrometria;
};

type TermohigrometriaPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function TermohigrometriaPage({ searchParams }: TermohigrometriaPageProps) {
  const query = use(searchParams);
  const initialContext = parseMonthContext(query.year, query.month);
  const [año, setAño] = useState(initialContext?.year ?? 1970);
  const [mes,  setMes]  = useState(initialContext?.month ?? 1);
  const [contextReady, setContextReady] = useState(initialContext !== null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [conflictingDraft, setConflictingDraft] = useState<TermohigrometriaDraftData | null>(null);
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
  const baseline = useRef<TermohigrometriaDraftData | null>(null);
  const serverUpdatedAt = useRef<string | null>(null);
  const legacyAudit = useRef({ responsable: "", firma: "" });
  const [info, setInfo] = useState<TermohigrometriaInfo>({ ...EMPTY_INFO });
  const printableSheetRef = useRef<HTMLDivElement>(null);
  const pdfExportInProgress = useRef(false);
  const configSaveInProgress = useRef(false);
  const persistenceInProgress = useRef(false);
  const visibleContext = useRef({ year: año, month: mes });
  visibleContext.current = { year: año, month: mes };

  // ── Ingreso ────────────────────────────────────────────────────────────────
  const [jornadaAdd, setJornadaAdd] = useState<J>("M");
  const [inputDia,   setInputDia]   = useState("1");
  const [inputTemp,  setInputTemp]  = useState("");
  const [inputHum,   setInputHum]   = useState("");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (contextReady) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(year));
    params.set("month", String(month));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setAño(year);
    setMes(month);
    setContextReady(true);
  }, [contextReady]);

  // ── Carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!contextReady) return;
    let active = true;

    const load = async () => {
      draftHydrated.current = false;
      setLoading(true);
      setLoadError(null);
      setConflictingDraft(null);

      try {
        const res  = await fetch(`/api/termohigrometria?año=${año}&mes=${mes}`);
        if (!res.ok) {
          throw new Error(await getApiErrorMessage(res, "No se pudo cargar el registro de termohigrometría."));
        }

        const data: unknown = await res.json();
        const registros = Array.isArray(data) ? data as RegistroTermohigrometria[] : [];
        if (!active) return;

        const registro = registros[0] ?? null;
        const databaseData = buildDatabaseDraft(registro, String(new Date().getDate()));
        const storedDraft = readTermohigrometriaDraft(
          window.localStorage,
          window.sessionStorage,
          año,
          mes,
        );
        const resolvedDraft = storedDraft
          ? resolveTermohigrometriaDraft(storedDraft, registro?.updated_at ?? null, registro !== null)
          : null;
        const displayedData = resolvedDraft ?? databaseData;
        const conflict = storedDraft && !storedDraft.legacy && !resolvedDraft ? storedDraft.data : null;
        setConflictingDraft(conflict);

        if (storedDraft && !resolvedDraft && !conflict) {
          clearTermohigrometriaDraft(window.localStorage, window.sessionStorage, año, mes);
        }

        baseline.current = databaseData;
        serverUpdatedAt.current = registro?.updated_at ?? null;
        legacyAudit.current = {
          responsable: registro?.responsable ?? "",
          firma: registro?.firma ?? "",
        };
        setInfo(displayedData.info);
        setFirmas(displayedData.firmas);
        setLecturas(displayedData.lecturas);
        lecturasOriginales.current = displayedData.lecturasOriginales;
        setJornadaAdd(displayedData.jornadaAdd);
        setInputDia(displayedData.inputDia);
        setInputTemp(displayedData.inputTemp);
        setInputHum(displayedData.inputHum);
        setTempMin(displayedData.tempMin);
        setTempMax(displayedData.tempMax);
        setHumMin(displayedData.humMin);
        setHumMax(displayedData.humMax);
      } catch (error: unknown) {
        if (!active) return;
        const message = getErrorMessage(error, "No se pudo cargar el registro de termohigrometría.");
        const storedDraft = readTermohigrometriaDraft(
          window.localStorage,
          window.sessionStorage,
          año,
          mes,
        );
        const displayedData = storedDraft?.data ?? buildDatabaseDraft(null, String(new Date().getDate()));

        baseline.current = null;
        serverUpdatedAt.current = storedDraft?.baseUpdatedAt ?? null;
        setInfo(displayedData.info);
        setFirmas(displayedData.firmas);
        setLecturas(displayedData.lecturas);
        lecturasOriginales.current = displayedData.lecturasOriginales;
        setJornadaAdd(displayedData.jornadaAdd);
        setInputDia(displayedData.inputDia);
        setInputTemp(displayedData.inputTemp);
        setInputHum(displayedData.inputHum);
        setTempMin(displayedData.tempMin);
        setTempMax(displayedData.tempMax);
        setHumMin(displayedData.humMin);
        setHumMax(displayedData.humMax);

        setLoadError(message);
        showToast(message, "err");
      }

      draftHydrated.current = true;
      setLoading(false);
    };

    load();

    return () => { active = false; };
  }, [año, mes, contextReady]);

  useEffect(() => {
    if (loading || !draftHydrated.current || !baseline.current || conflictingDraft) return;

    const currentDraft: TermohigrometriaDraftData = {
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
    };

    try {
      if (termohigrometriaDraftsEqual(currentDraft, baseline.current)) {
        clearTermohigrometriaDraft(window.localStorage, window.sessionStorage, año, mes);
      } else {
        writeTermohigrometriaDraft(
          window.localStorage,
          año,
          mes,
          currentDraft,
          serverUpdatedAt.current,
        );
      }
    } catch {
      // Browser storage is optional; the database remains the source of truth.
    }
  }, [año, mes, loading, info, firmas, lecturas, jornadaAdd, inputDia, inputTemp, inputHum, tempMin, tempMax, humMin, humMax, conflictingDraft]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const responsableDeJornada = (j: J) =>
    j === "M" ? info.responsable_manana :
    j === "T" ? info.responsable_tarde  : info.responsable_noche;

  const getCurrentDraft = (
    overrides: Partial<TermohigrometriaDraftData> = {},
  ): TermohigrometriaDraftData => ({
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
    ...overrides,
  });

  const rebaseDraftAfterSave = (
    saved: RegistroTermohigrometria,
    currentDraft: TermohigrometriaDraftData,
    requestContext: SaveContext,
  ) => {
    if (
      visibleContext.current.year !== requestContext.year ||
      visibleContext.current.month !== requestContext.month ||
      serverUpdatedAt.current !== requestContext.expectedUpdatedAt
    ) return;

    const databaseData = buildDatabaseDraft(saved, String(new Date().getDate()));
    baseline.current = databaseData;
    serverUpdatedAt.current = saved.updated_at;
    legacyAudit.current = {
      responsable: saved.responsable ?? "",
      firma: saved.firma ?? "",
    };

    try {
      clearTermohigrometriaDraft(window.localStorage, window.sessionStorage, requestContext.year, requestContext.month);
      if (!termohigrometriaDraftsEqual(currentDraft, databaseData)) {
        writeTermohigrometriaDraft(
          window.localStorage,
          requestContext.year,
          requestContext.month,
          currentDraft,
          saved.updated_at,
        );
      }
    } catch {
      // Browser storage is optional; the saved server version is still authoritative.
    }
  };

  // ── Helper para armar el body de guardado ─────────────────────────────────
  const buildSaveBody = (
    requestContext: SaveContext,
    infoSnapshot: TermohigrometriaInfo,
    lecs: LecturasTermohigrometria,
    fs: typeof firmas,
    resp: string,
    firma?: string,
  ) => ({
    ...infoSnapshot,
    año: requestContext.year,
    mes: requestContext.month,
    lecturas: lecs,
    firma_manana: fs.manana,
    firma_tarde:  fs.tarde,
    firma_noche:  fs.noche,
    responsable:  resp,
    firma: firma ?? "",
    expected_updated_at: requestContext.expectedUpdatedAt,
  });

  const captureSaveContext = (): SaveContext => ({
    year: año,
    month: mes,
    expectedUpdatedAt: serverUpdatedAt.current,
  });

  const isCurrentSaveContext = (requestContext: SaveContext) =>
    visibleContext.current.year === requestContext.year &&
    visibleContext.current.month === requestContext.month &&
    serverUpdatedAt.current === requestContext.expectedUpdatedAt;

  const persistenceBlocked = () => {
    if (loading || loadError || conflictingDraft) {
      showToast(conflictingDraft
        ? "Recupera o descarta el borrador anterior antes de guardar."
        : "No se puede guardar hasta cargar correctamente los datos del servidor.", "err");
      return true;
    }
    return persistenceInProgress.current;
  };

  const throwPersistenceError = async (res: Response, fallback: string) => {
    if (res.status === 409) throw new Error(CONFLICT_MESSAGE);
    throw new Error(await getApiErrorMessage(res, fallback));
  };

  const handleSaveConfig = async () => {
    if (configSaveInProgress.current || persistenceBlocked()) return;

    const requestContext = captureSaveContext();
    const infoSnapshot = { ...info };
    const draftSnapshot = getCurrentDraft({ info: infoSnapshot });
    configSaveInProgress.current = true;
    persistenceInProgress.current = true;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/termohigrometria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveBody(
          requestContext,
          infoSnapshot,
          lecturas,
          firmas,
          legacyAudit.current.responsable,
          legacyAudit.current.firma,
        )),
      });
      if (!res.ok) {
        await throwPersistenceError(res, "No se pudo guardar la configuración.");
      }

      const saved = parseSavedRegistro(await res.json());
      rebaseDraftAfterSave(saved, draftSnapshot, requestContext);
      if (isCurrentSaveContext({ ...requestContext, expectedUpdatedAt: saved.updated_at })) {
        showToast("Configuración guardada.");
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "No se pudo guardar la configuración."), "err");
    } finally {
      configSaveInProgress.current = false;
      persistenceInProgress.current = false;
      setSavingConfig(false);
    }
  };

  // ── Agregar lectura (abre modal de confirmación por entrada) ──────────────
  const agregar = () => {
    if (persistenceBlocked()) return;
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
    if (!pendingAdd || persistenceBlocked()) return;
    const requestContext = captureSaveContext();
    const infoSnapshot = { ...info };
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
    persistenceInProgress.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/termohigrometria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSaveBody(requestContext, infoSnapshot, nuevasLecturas, firmas, resp || "—", firma)),
      });
      if (!res.ok) await throwPersistenceError(res, "No se pudo guardar la lectura.");
      const saved = parseSavedRegistro(await res.json());

      const max = getDiasEnMes(requestContext.month, requestContext.year);
      const nextInputDia = String(dia < max ? dia + 1 : dia);
      rebaseDraftAfterSave(saved, getCurrentDraft({
        info: infoSnapshot,
        lecturas: nuevasLecturas,
        lecturasOriginales: nuevasLecturas,
        inputDia: nextInputDia,
        inputTemp: "",
        inputHum: "",
      }), requestContext);
      if (isCurrentSaveContext({ ...requestContext, expectedUpdatedAt: saved.updated_at })) {
        setInputTemp("");
        setInputHum("");
        setInputDia(nextInputDia);
        setPendingAdd(null);
        showToast(`Lectura día ${dia} · ${J_LABEL[jornadaAdd]} guardada ✓`);
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "No se pudo guardar la lectura."), "err");
    } finally {
      persistenceInProgress.current = false;
      setSaving(false);
    }
  };

  // ── Pedir confirmación mensual ─────────────────────────────────────────────
  const pedirFirmaMensual = () => {
    if (persistenceBlocked()) return;
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
    if (persistenceBlocked()) return;
    const requestContext = captureSaveContext();
    const infoSnapshot = { ...info };
    persistenceInProgress.current = true;
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
        body: JSON.stringify(buildSaveBody(requestContext, infoSnapshot, lecturasAuditadas, nuevasFirmas, resp || "", f)),
      });
      if (!res.ok) await throwPersistenceError(res, "No se pudo guardar el registro.");
      const saved = parseSavedRegistro(await res.json());
      rebaseDraftAfterSave(saved, getCurrentDraft({
        info: infoSnapshot,
        firmas: nuevasFirmas,
        lecturas: lecturasAuditadas,
        lecturasOriginales: lecturasAuditadas,
      }), requestContext);
      if (isCurrentSaveContext({ ...requestContext, expectedUpdatedAt: saved.updated_at })) {
        showToast("Registro guardado ✓");
      }
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "No se pudo guardar el registro."), "err");
    } finally {
      persistenceInProgress.current = false;
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfExportInProgress.current || !printableSheetRef.current) return;

    pdfExportInProgress.current = true;
    setExportingPdf(true);

    try {
      const filename = buildPdfFilename([
        "termohigrometria",
        `${año}-${String(mes).padStart(2, "0")}`,
        info.dispositivo_nombre,
      ]);
      await downloadElementAsPdf(printableSheetRef.current, filename);
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
    if (persistenceInProgress.current) return;
    setLoading(true);
    let m = mes + d, a = año;
    if (m > 12) { m = 1; a++; }
    if (m < 1)  { m = 12; a--; }
    const params = new URLSearchParams(window.location.search);
    params.set("year", String(a));
    params.set("month", String(m));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setMes(m); setAño(a);
  };

  const fcTemp = parseFloat(info.factor_correccion_temp) || 0;
  const fcHum  = parseFloat(info.factor_correccion_hum)  || 0;
  const persistenceActive = saving || savingConfig;
  const editsDisabled = loading || persistenceActive || conflictingDraft !== null;

  const recoverConflictingDraft = () => {
    if (!conflictingDraft) return;
    setInfo(conflictingDraft.info); setFirmas(conflictingDraft.firmas); setLecturas(conflictingDraft.lecturas);
    lecturasOriginales.current = conflictingDraft.lecturasOriginales;
    setJornadaAdd(conflictingDraft.jornadaAdd); setInputDia(conflictingDraft.inputDia);
    setInputTemp(conflictingDraft.inputTemp); setInputHum(conflictingDraft.inputHum);
    setTempMin(conflictingDraft.tempMin); setTempMax(conflictingDraft.tempMax);
    setHumMin(conflictingDraft.humMin); setHumMax(conflictingDraft.humMax);
    setConflictingDraft(null);
  };

  const discardConflictingDraft = () => {
    clearTermohigrometriaDraft(window.localStorage, window.sessionStorage, año, mes);
    setConflictingDraft(null);
  };

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

  if (!contextReady) {
    return (
      <div className="flex min-h-48 items-center justify-center text-gray-400">
        <Loader2 size={28} className="mr-2 animate-spin" /> Cargando…
      </div>
    );
  }

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
      <div className="no-print">
        <HospitalHeader
          codigo="M-GAD-LAB-F-021" version="2"
          nombreDocumento="FORMATO PARA REGISTRO DE CONDICIONES AMBIENTALES DE ALMACENAMIENTO (T°C Y HUMEDAD)"
        />
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 no-print">
          <AlertCircle size={16} />
          {loadError}
        </div>
      )}

      {conflictingDraft && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 no-print">
          <p className="font-semibold">Se conservó un borrador basado en una versión anterior.</p>
          <p className="mt-1">Estás viendo los datos actuales del servidor. Recupera el borrador para revisarlo o descártalo.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={recoverConflictingDraft} className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white">Recuperar borrador</button>
            <button onClick={discardConflictingDraft} className="rounded-lg border border-amber-400 px-3 py-1.5 font-semibold">Descartar borrador</button>
          </div>
        </div>
      )}

      {/* ─── Metadatos ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden text-xs no-print">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 divide-x divide-y divide-gray-200">
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Mes</p>
            <div className="flex items-center gap-1">
              <button onClick={() => navMes(-1)} disabled={persistenceActive} className="text-gray-400 hover:text-hsa-green disabled:opacity-40"><ChevronLeft size={12}/></button>
              <span className="font-bold text-hsa-green capitalize text-xs">{MESES[mes-1]}</span>
              <button onClick={() => navMes(1)} disabled={persistenceActive} className="text-gray-400 hover:text-hsa-green disabled:opacity-40"><ChevronRight size={12}/></button>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Año</p>
            <span className="font-bold">{año}</span>
          </div>
          <div className="px-3 py-2 col-span-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Ubicación</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.ubicacion} onChange={e => setInfo(i => ({...i, ubicacion: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Dispositivo</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.dispositivo_nombre} onChange={e => setInfo(i => ({...i, dispositivo_nombre: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Marca</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.dispositivo_marca} onChange={e => setInfo(i => ({...i, dispositivo_marca: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">Modelo</p>
            <input className="w-full bg-transparent font-medium text-gray-700 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.dispositivo_modelo} onChange={e => setInfo(i => ({...i, dispositivo_modelo: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corr. Temp</p>
            <input type="number" step="0.01"
              disabled={editsDisabled}
              className="w-full bg-transparent font-bold text-hsa-green focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion_temp} onChange={e => setInfo(i => ({...i, factor_correccion_temp: e.target.value}))} placeholder="0"/>
          </div>
          <div className="px-3 py-2">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-1 text-[10px]">F. Corr. Hum</p>
            <input type="number" step="0.01"
              disabled={editsDisabled}
              className="w-full bg-transparent font-bold text-sky-500 focus:outline-none text-xs border-b border-transparent focus:border-gray-300 transition-colors"
              value={info.factor_correccion_hum} onChange={e => setInfo(i => ({...i, factor_correccion_hum: e.target.value}))} placeholder="0"/>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50/50">
          <div className="px-3 py-1.5 flex flex-col gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Temperatura</span>
              <input type="number" step="0.5" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                disabled={editsDisabled}
                value={tempMin} onChange={e => setTempMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="0.5" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-hsa-green text-gray-700 font-semibold text-[10px]"
                disabled={editsDisabled}
                value={tempMax} onChange={e => setTempMax(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">°C</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-400 text-[10px] font-semibold uppercase">Humedad</span>
              <input type="number" step="1" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
                disabled={editsDisabled}
                value={humMin} onChange={e => setHumMin(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">–</span>
              <input type="number" step="1" className="w-10 text-center bg-transparent border-b border-gray-300 focus:outline-none focus:border-sky-400 text-gray-700 font-semibold text-[10px]"
                disabled={editsDisabled}
                value={humMax} onChange={e => setHumMax(parseFloat(e.target.value)||0)}/>
              <span className="text-gray-400 text-[10px]">%</span>
            </div>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Serial</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.dispositivo_serial} onChange={e => setInfo(i => ({...i, dispositivo_serial: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-1.5">
            <p className="text-gray-400 uppercase tracking-wide font-semibold mb-0.5 text-[10px]">Certificado</p>
            <input className="w-full bg-transparent text-gray-600 focus:outline-none text-[10px] border-b border-transparent focus:border-gray-300 transition-colors"
              disabled={editsDisabled}
              value={info.certificado} onChange={e => setInfo(i => ({...i, certificado: e.target.value}))} placeholder="—"/>
          </div>
          <div className="px-3 py-1.5 flex items-center gap-2 justify-end no-print">
            <button onClick={cargarDatosPrueba} disabled={editsDisabled || loadError !== null}
              className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[11px] font-semibold hover:bg-amber-200 transition-colors">
              🧪 Prueba
            </button>
            <button onClick={handleDownloadPdf} disabled={exportingPdf || loading}
              className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
              {exportingPdf ? <Loader2 size={11} className="animate-spin"/> : <FileDown size={11}/>}
              {exportingPdf ? "Generando…" : "Guardar PDF"}
            </button>
            <button onClick={handleSaveConfig} disabled={persistenceActive || loading || loadError !== null || conflictingDraft !== null}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-hsa-green rounded-lg text-[11px] font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50">
              {savingConfig ? <Loader2 size={11} className="animate-spin"/> : <CheckCircle size={11}/>}
              {savingConfig ? "Guardando…" : "Guardar configuración"}
            </button>
            <button onClick={pedirFirmaMensual} disabled={persistenceActive || loading || loadError !== null || conflictingDraft !== null}
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
                      <button key={j} onClick={() => setJornadaAdd(j)} disabled={editsDisabled}
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
                    disabled={editsDisabled}
                    className="w-12 text-center text-sm font-bold border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                    value={inputDia} onChange={e => setInputDia(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("temp-in")?.focus()}/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Temp °C</span>
                  <input id="temp-in" type="number" step="0.1"
                    disabled={editsDisabled}
                    className="w-20 text-center text-sm font-bold border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-opacity-30"
                    value={inputTemp} onChange={e => setInputTemp(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && document.getElementById("hum-in")?.focus()}
                    placeholder="0.0"/>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Hum %</span>
                  <input id="hum-in" type="number" step="0.1"
                    disabled={editsDisabled}
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
                <button onClick={agregar} disabled={!inputTemp || editsDisabled || loadError !== null}
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
                      disabled={editsDisabled}
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
                  disabled={editsDisabled}
                  value={info.observaciones}
                  onChange={e => setInfo(i => ({...i, observaciones: e.target.value}))}
                  placeholder="Novedades del mes…"/>
              </div>
            </div>
          </div>
        </div>
      )}

      <PrintableSheet
        ref={printableSheetRef}
        header={(
          <HospitalHeader
            codigo="M-GAD-LAB-F-021" version="2"
            nombreDocumento="FORMATO PARA REGISTRO DE CONDICIONES AMBIENTALES DE ALMACENAMIENTO (T°C Y HUMEDAD)"
          />
        )}
      >
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
      </PrintableSheet>

      <div className="no-print">
        <HospitalFooter/>
      </div>

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
