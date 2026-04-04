// ─── Supabase Database Types ──────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      neveras: {
        Row: Nevera;
        Insert: NeveraInsert;
        Update: Partial<NeveraInsert>;
      };
      registros_termohigrometria: {
        Row: RegistroTermohigrometria;
        Insert: RegistroTermohigrometriaInsert;
        Update: Partial<RegistroTermohigrometriaInsert>;
      };
      registros_neveras: {
        Row: RegistroNevera;
        Insert: RegistroNeveraInsert;
        Update: Partial<RegistroNeveraInsert>;
      };
    };
  };
};

// ─── Neveras ──────────────────────────────────────────────────────────────────

export interface Nevera {
  id: string;
  nombre: string;
  codigo: string;
  ubicacion: string;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export type NeveraInsert = Omit<Nevera, "id" | "created_at" | "updated_at">;

// ─── Trazabilidad / Audit Trail ───────────────────────────────────────────────

export type JornadaKey = "manana" | "tarde" | "noche";

/** Registro de una versión anterior de una lectura (historial de cambios) */
export interface LecturaHistorial {
  v: number;       // valor anterior
  ts: string;      // ISO timestamp de cuándo existió este valor
  quien: string;   // responsable que lo modificó
  jornada: JornadaKey;
  firma: string;   // base64 PNG de la firma que autorizó el cambio
}

/**
 * Lectura con trazabilidad completa.
 * Reemplaza el número plano en el JSONB de lecturas.
 */
export interface LecturaAuditada {
  v: number;             // valor actual medido
  ts: string;            // ISO timestamp de cuando se guardó
  quien: string;         // nombre del responsable que firmó
  jornada: JornadaKey;   // turno de quien firmó
  firma: string;         // base64 PNG de la firma al momento de guardar
  prev?: LecturaHistorial[];  // historial de versiones anteriores
}

/** Una entrada en el mapa de lecturas: número legacy O objeto con auditoría */
export type LecturaEntry = number | LecturaAuditada;

/** Extrae el valor numérico de una entrada (legacy o auditada) */
export function valorDeLectura(e: LecturaEntry | null | undefined): number | null {
  if (e == null) return null;
  if (typeof e === "number") return e;
  return e.v;
}

/** Type guard */
export function esLecturaAuditada(e: LecturaEntry): e is LecturaAuditada {
  return typeof e === "object" && e !== null && "v" in e && "ts" in e;
}

/**
 * Toma el mapa de lecturas actual vs. el original (de DB),
 * y enriquece con auditoría todos los días que cambiaron.
 * Las lecturas no modificadas conservan su auditoría previa.
 */
export function enriquecerLecturas(
  actuales: LecturasNevera,
  originales: LecturasNevera,
  audit: { ts: string; quien: string; jornada: JornadaKey; firma: string },
): LecturasNevera {
  const resultado: LecturasNevera = { ...originales };

  for (const [dia, entryActual] of Object.entries(actuales)) {
    const valorActual = valorDeLectura(entryActual);
    if (valorActual == null) continue;

    const entryOriginal = originales[dia];
    const valorOriginal = valorDeLectura(entryOriginal);

    const cambio = valorOriginal !== valorActual;

    if (!cambio && esLecturaAuditada(entryOriginal)) {
      // Sin cambio: conservar el objeto auditado existente
      resultado[dia] = entryOriginal;
    } else if (!cambio && typeof entryOriginal === "number") {
      // Sin cambio pero aún era número legacy: enriquecer igual (primera vez)
      resultado[dia] = { v: valorActual, ...audit, prev: [] };
    } else {
      // Cambio real: mover el valor anterior a prev[]
      const prevEntry: LecturaHistorial | null =
        entryOriginal == null
          ? null
          : esLecturaAuditada(entryOriginal)
          ? { v: entryOriginal.v, ts: entryOriginal.ts, quien: entryOriginal.quien, jornada: entryOriginal.jornada, firma: entryOriginal.firma }
          : null;

      const prevAnterior: LecturaHistorial[] =
        esLecturaAuditada(entryOriginal) ? (entryOriginal.prev ?? []) : [];

      resultado[dia] = {
        v: valorActual,
        ...audit,
        prev: prevEntry ? [...prevAnterior, prevEntry] : prevAnterior,
      };
    }
  }

  return resultado;
}

/**
 * Igual que enriquecerLecturas pero para termohigrometría
 * (cada entrada tiene {temp, hum} en lugar de un número único)
 */
export function enriquecerLecturasTermohigro(
  actuales: LecturasTermohigrometria,
  originales: LecturasTermohigrometria,
  audit: { ts: string; quien: string; firma: string },
): LecturasTermohigrometria {
  const resultado: LecturasTermohigrometria = { ...originales };

  for (const [dia, entryActual] of Object.entries(actuales)) {
    const entryOriginal = originales[dia] ?? {};

    const tempCambio = entryActual.temp !== entryOriginal.temp;
    const humCambio = entryActual.hum !== entryOriginal.hum;

    if (!tempCambio && !humCambio) {
      resultado[dia] = entryOriginal;
      continue;
    }

    // Construir historial de versiones anteriores
    const prevEntry = (entryOriginal.temp != null || entryOriginal.hum != null)
      ? {
          temp: entryOriginal.temp,
          hum: entryOriginal.hum,
          ts: entryOriginal.ts,
          quien: entryOriginal.quien,
          firma: entryOriginal.firma,
        }
      : null;

    const prevAnterior: LecturasTermohigrometria[string]["prev"] =
      entryOriginal.prev ?? [];

    resultado[dia] = {
      temp: entryActual.temp,
      hum: entryActual.hum,
      ...audit,
      prev: prevEntry ? [...prevAnterior, prevEntry] : prevAnterior,
    };
  }

  return resultado;
}

// ─── Termohigrometría ─────────────────────────────────────────────────────────

export interface LecturaDiaTermohigro {
  temp?: number | null;
  hum?: number | null;
  // Auditoría (opcional para compatibilidad con datos legacy)
  ts?: string;
  quien?: string;
  firma?: string;
  prev?: Array<{
    temp?: number | null;
    hum?: number | null;
    ts?: string;
    quien?: string;
    firma?: string;
  }>;
}

/** Lecturas indexadas por número de día como string: "1", "15", "31" */
export type LecturasTermohigrometria = Record<string, LecturaDiaTermohigro>;

export interface RegistroTermohigrometria {
  id: string;
  año: number;
  mes: number; // 1-12
  ubicacion: string;
  dispositivo_nombre: string;
  dispositivo_marca: string;
  dispositivo_modelo: string;
  dispositivo_serial: string;
  certificado: string;
  factor_correccion: string;
  lecturas: LecturasTermohigrometria;
  // Tres jornadas (igual que F-029)
  responsable_manana: string;
  responsable_tarde: string;
  responsable_noche: string;
  firma_manana: string;
  firma_tarde: string;
  firma_noche: string;
  // Legacy (compatibilidad)
  responsable: string;
  firma: string;
  observaciones: string;
  created_at: string;
  updated_at: string;
}

export type RegistroTermohigrometriaInsert = Omit<
  RegistroTermohigrometria,
  "id" | "created_at" | "updated_at"
>;

// ─── Registros Neveras ────────────────────────────────────────────────────────

/** Lecturas indexadas por número de día como string: "1", "15", "31" */
export type LecturasNevera = Record<string, LecturaEntry>;

export interface RegistroNevera {
  id: string;
  nevera_id: string;
  año: number;
  mes: number; // 1-12
  lecturas: LecturasNevera;
  // Dispositivo (termómetro)
  dispositivo_marca: string;
  dispositivo_modelo: string;
  dispositivo_serial: string;
  certificado: string;
  factor_correccion: string;
  // Responsables
  responsable_manana: string;
  responsable_tarde: string;
  responsable_noche: string;
  // Firmas a nivel de mes (mantiene compatibilidad DB)
  firma_manana: string;
  firma_tarde: string;
  firma_noche: string;
  fecha_limpieza: string | null;
  observaciones: string;
  created_at: string;
  updated_at: string;
  nevera?: Nevera; // join
}

export type RegistroNeveraInsert = Omit<
  RegistroNevera,
  "id" | "created_at" | "updated_at" | "nevera"
>;

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const JORNADAS = [
  { key: "M", label: "Mañana" },
  { key: "T", label: "Tarde" },
  { key: "N", label: "Noche" },
] as const;

export type Jornada = "M" | "T" | "N";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export function getDiasEnMes(mes: number, año: number): number {
  return new Date(año, mes, 0).getDate();
}

export function lecturaClave(dia: number, jornada: Jornada): string {
  return `${dia}_${jornada}`;
}

/** Formatea un ISO timestamp a fecha/hora local legible */
export function formatearTs(ts: string): string {
  try {
    return new Date(ts).toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export const JORNADA_LABEL: Record<JornadaKey, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};
