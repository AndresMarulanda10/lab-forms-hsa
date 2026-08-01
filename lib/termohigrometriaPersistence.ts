import type { LecturasTermohigrometria } from "@/lib/types";

export interface TermohigrometriaInfo {
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

export interface TermohigrometriaFirmas {
  manana: string;
  tarde: string;
  noche: string;
}

export interface TermohigrometriaDraftData {
  info: TermohigrometriaInfo;
  firmas: TermohigrometriaFirmas;
  lecturas: LecturasTermohigrometria;
  lecturasOriginales: LecturasTermohigrometria;
  jornadaAdd: "M" | "T" | "N";
  inputDia: string;
  inputTemp: string;
  inputHum: string;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
}

export interface StoredTermohigrometriaDraft {
  data: TermohigrometriaDraftData;
  baseUpdatedAt: string | null;
  legacy: boolean;
}

export interface MonthContext {
  year: number;
  month: number;
}

const DRAFT_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isJornada = (value: unknown): value is "M" | "T" | "N" =>
  value === "M" || value === "T" || value === "N";

const hasOwn = (source: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(source, key);

const hasOnlyKeys = (source: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(source).every(key => keys.includes(key));

const isOptionalString = (source: Record<string, unknown>, key: string) =>
  !hasOwn(source, key) || typeof source[key] === "string";

const isOptionalReading = (source: Record<string, unknown>, key: "temp" | "hum") =>
  !hasOwn(source, key) || source[key] === null ||
  (typeof source[key] === "number" && Number.isFinite(source[key]));

const isStrictReading = (value: unknown): boolean => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["temp", "hum", "ts", "quien", "firma", "prev"]) ||
    !isOptionalReading(value, "temp") || !isOptionalReading(value, "hum")) return false;
  if (!isOptionalString(value, "ts") || !isOptionalString(value, "quien") || !isOptionalString(value, "firma")) return false;
  if (!hasOwn(value, "prev")) return true;
  return Array.isArray(value.prev) && value.prev.every(isStrictReading);
};

const isStrictLecturas = (value: unknown): value is LecturasTermohigrometria =>
  isRecord(value) && Object.values(value).every(isStrictReading);

const INFO_KEYS: Array<keyof TermohigrometriaInfo> = [
  "ubicacion",
  "dispositivo_nombre",
  "dispositivo_marca",
  "dispositivo_modelo",
  "dispositivo_serial",
  "certificado",
  "factor_correccion_temp",
  "factor_correccion_hum",
  "responsable_manana",
  "responsable_tarde",
  "responsable_noche",
  "observaciones",
];

const isStrictInfo = (value: unknown): value is TermohigrometriaInfo =>
  isRecord(value) && hasOnlyKeys(value, INFO_KEYS) &&
  INFO_KEYS.every(key => hasOwn(value, key) && typeof value[key] === "string");

const isStrictFirmas = (value: unknown): value is TermohigrometriaFirmas =>
  isRecord(value) && hasOnlyKeys(value, ["manana", "tarde", "noche"]) &&
  ["manana", "tarde", "noche"].every(
    key => hasOwn(value, key) && typeof value[key] === "string",
  );

const isStrictDraftData = (value: unknown): value is TermohigrometriaDraftData => {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    "info", "firmas", "lecturas", "lecturasOriginales", "jornadaAdd", "inputDia", "inputTemp",
    "inputHum", "tempMin", "tempMax", "humMin", "humMax",
  ])) return false;
  return isStrictInfo(value.info) &&
    isStrictFirmas(value.firmas) &&
    isStrictLecturas(value.lecturas) &&
    isStrictLecturas(value.lecturasOriginales) &&
    isJornada(value.jornadaAdd) &&
    typeof value.inputDia === "string" &&
    typeof value.inputTemp === "string" &&
    typeof value.inputHum === "string" &&
    ["tempMin", "tempMax", "humMin", "humMax"].every(
      key => typeof value[key] === "number" && Number.isFinite(value[key]),
    );
};

const readText = (source: Record<string, unknown>, key: keyof TermohigrometriaInfo, fallback = "") => {
  const value = source[key];
  return typeof value === "string" ? value : fallback;
};

const readNumber = (source: Record<string, unknown>, key: string, fallback: number) => {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const normalizeLecturas = (value: unknown): LecturasTermohigrometria =>
  isRecord(value) ? { ...(value as LecturasTermohigrometria) } : {};

export const normalizeTermohigrometriaInfo = (value: unknown): TermohigrometriaInfo => {
  const source = isRecord(value) ? value : {};
  const legacyFactor = typeof source.factor_correccion === "string" ? source.factor_correccion : "0";

  return {
    ubicacion: readText(source, "ubicacion"),
    dispositivo_nombre: readText(source, "dispositivo_nombre", "TERMOHIGROMETRO"),
    dispositivo_marca: readText(source, "dispositivo_marca"),
    dispositivo_modelo: readText(source, "dispositivo_modelo"),
    dispositivo_serial: readText(source, "dispositivo_serial"),
    certificado: readText(source, "certificado"),
    factor_correccion_temp: readText(source, "factor_correccion_temp", legacyFactor),
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

const normalizeDraftData = (value: unknown): TermohigrometriaDraftData | null => {
  if (!isRecord(value)) return null;

  return {
    info: normalizeTermohigrometriaInfo(value.info),
    firmas: normalizeFirmas(value.firmas),
    lecturas: normalizeLecturas(value.lecturas),
    lecturasOriginales: normalizeLecturas(value.lecturasOriginales),
    jornadaAdd: isJornada(value.jornadaAdd) ? value.jornadaAdd : "M",
    inputDia: typeof value.inputDia === "string" ? value.inputDia : "1",
    inputTemp: typeof value.inputTemp === "string" ? value.inputTemp : "",
    inputHum: typeof value.inputHum === "string" ? value.inputHum : "",
    tempMin: readNumber(value, "tempMin", 15),
    tempMax: readNumber(value, "tempMax", 30),
    humMin: readNumber(value, "humMin", 40),
    humMax: readNumber(value, "humMax", 70),
  };
};

export const buildTermohigrometriaDraftKey = (year: number, month: number) =>
  `lab-forms-hsa:termohigrometria:draft:${year}-${String(month).padStart(2, "0")}`;

export const readTermohigrometriaDraft = (
  storage: Pick<Storage, "getItem">,
  legacyStorage: Pick<Storage, "getItem">,
  year: number,
  month: number,
): StoredTermohigrometriaDraft | null => {
  try {
    const key = buildTermohigrometriaDraftKey(year, month);
    const raw = storage.getItem(key) ?? legacyStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    if (parsed.version === DRAFT_VERSION) {
      const validBase = parsed.baseUpdatedAt === null ||
        (typeof parsed.baseUpdatedAt === "string" && !Number.isNaN(Date.parse(parsed.baseUpdatedAt)));
      if (!hasOnlyKeys(parsed, ["version", "savedAt", "baseUpdatedAt", "data"]) ||
        !isStrictDraftData(parsed.data) || !validBase || typeof parsed.savedAt !== "string") return null;
      return { data: parsed.data, baseUpdatedAt: parsed.baseUpdatedAt as string | null, legacy: false };
    }

    if (hasOwn(parsed, "version")) return null;

    const data = normalizeDraftData(parsed);
    return data ? { data, baseUpdatedAt: null, legacy: true } : null;
  } catch {
    return null;
  }
};

export const resolveTermohigrometriaDraft = (
  draft: StoredTermohigrometriaDraft,
  databaseUpdatedAt: string | null,
  hasDatabaseRow: boolean,
) => {
  if (draft.legacy) return hasDatabaseRow ? null : draft.data;
  return draft.baseUpdatedAt === databaseUpdatedAt ? draft.data : null;
};

export const writeTermohigrometriaDraft = (
  storage: Pick<Storage, "setItem">,
  year: number,
  month: number,
  data: TermohigrometriaDraftData,
  baseUpdatedAt: string | null,
) => {
  storage.setItem(buildTermohigrometriaDraftKey(year, month), JSON.stringify({
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    baseUpdatedAt,
    data,
  }));
};

export const clearTermohigrometriaDraft = (
  storage: Pick<Storage, "removeItem">,
  legacyStorage: Pick<Storage, "removeItem">,
  year: number,
  month: number,
) => {
  const key = buildTermohigrometriaDraftKey(year, month);
  storage.removeItem(key);
  legacyStorage.removeItem(key);
};

export const termohigrometriaDraftsEqual = (
  left: TermohigrometriaDraftData,
  right: TermohigrometriaDraftData,
) => JSON.stringify(left) === JSON.stringify(right);

const singleQueryValue = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : null;

export const parseMonthContext = (
  yearValue: string | string[] | undefined,
  monthValue: string | string[] | undefined,
): MonthContext | null => {
  const year = singleQueryValue(yearValue);
  const month = singleQueryValue(monthValue);
  if (!year || !month || !/^\d{4}$/.test(year) || !/^(?:[1-9]|1[0-2])$/.test(month)) return null;

  const parsedYear = Number(year);
  if (parsedYear < 2020) return null;
  return { year: parsedYear, month: Number(month) };
};
