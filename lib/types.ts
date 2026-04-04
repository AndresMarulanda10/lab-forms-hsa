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

// ─── Termohigrometría ─────────────────────────────────────────────────────────

/** Lecturas indexadas por "día_jornada", ej: "1_M", "15_T", "31_N" */
export type LecturasTermohigrometria = Record<
  string,
  { temp?: number | null; hum?: number | null }
>;

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

/** Lecturas indexadas por número de día, ej: "1": 4.5, "15": 3.8 */
export type LecturasNevera = Record<string, number | null>;

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
  // Firmas (legacy, kept for DB compat)
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
