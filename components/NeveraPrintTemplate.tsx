"use client";

import type { LecturasNevera } from "@/lib/types";
import { getDiasEnMes, lecturaClave, MESES, valorDeLectura } from "@/lib/types";
import PrintChart, { type PrintDataPoint } from "@/components/PrintChart";

interface NeveraPrintInfo {
  marca: string;
  modelo: string;
  serial: string;
  certificado: string;
  factor_correccion: string;
  responsable_manana: string;
  responsable_tarde: string;
  responsable_noche: string;
  fecha_limpieza: string;
  observaciones: string;
}

interface PrintFirmas {
  manana: string;
  tarde: string;
  noche: string;
}

interface NeveraPrintTemplateProps {
  lecturas: LecturasNevera;
  mes: number;
  año: number;
  neveraNombre: string;
  info: NeveraPrintInfo;
  firmas: PrintFirmas;
  rangoMin: number;
  rangoMax: number;
  className?: string;
}

const JORNADAS = ["M", "T", "N"] as const;

type NeveraJornada = (typeof JORNADAS)[number];

function parseCorrectionFactor(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(dateValue: string): string {
  if (!dateValue.trim()) return "";

  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;

  return `${day}/${month}/${year}`;
}

function renderFirma(src: string) {
  if (!src.trim()) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Firma responsable" className="mx-auto max-h-6 max-w-16 object-contain" />
  );
}

function getEntry(lecturas: LecturasNevera, dia: number, jornada: NeveraJornada) {
  const entry = lecturas[lecturaClave(dia, jornada)];
  if (entry !== undefined) return entry;
  if (jornada === "M") return lecturas[String(dia)];
  return undefined;
}

function buildNeveraPrintData(
  lecturas: LecturasNevera,
  factorCorreccion: number,
  diasEnMes: number,
): PrintDataPoint[] {
  const hasCorrection = factorCorreccion !== 0;

  return Array.from({ length: diasEnMes }, (_, index) => {
    const dia = index + 1;
    const values = Object.fromEntries(
      JORNADAS.map((jornada) => [jornada, valorDeLectura(getEntry(lecturas, dia, jornada))]),
    ) as Record<NeveraJornada, number | null>;

    return {
      dia,
      M: values.M,
      T: values.T,
      N: values.N,
      M_corr: hasCorrection && values.M != null ? Number.parseFloat((values.M + factorCorreccion).toFixed(2)) : null,
      T_corr: hasCorrection && values.T != null ? Number.parseFloat((values.T + factorCorreccion).toFixed(2)) : null,
      N_corr: hasCorrection && values.N != null ? Number.parseFloat((values.N + factorCorreccion).toFixed(2)) : null,
    };
  });
}

export default function NeveraPrintTemplate({
  lecturas,
  mes,
  año,
  neveraNombre,
  info,
  firmas,
  rangoMin,
  rangoMax,
  className = "",
}: NeveraPrintTemplateProps) {
  const diasEnMes = getDiasEnMes(mes, año);
  const fc = parseCorrectionFactor(info.factor_correccion);
  const data = buildNeveraPrintData(lecturas, fc, diasEnMes);
  const metadata = `Mes: ${MESES[mes - 1]} ${año} · Nevera: ${neveraNombre} · Dispositivo: ${info.marca || ""} ${info.modelo || ""} · Serial: ${info.serial || ""} · Certificado: ${info.certificado || ""} · Rango: ${rangoMin}–${rangoMax} °C · Factor corrección: ${info.factor_correccion || "0"}`;

  return (
    <div className={`space-y-1 bg-white text-gray-900 ${className}`.trim()}>
      <p className="mb-0 text-[7px] text-gray-600">{metadata}</p>
      <PrintChart
        titulo="Temperatura Neveras (°C)"
        unidad="°C"
        rangoMin={rangoMin}
        rangoMax={rangoMax}
        factorCorreccion={fc}
        data={data}
        width={720}
        height={240}
      />

      <section className="break-inside-avoid text-[7px]">
        <div className="grid grid-cols-3 border border-gray-500">
          <div className="border-r border-gray-500 px-1 py-0.5 text-center">
            <p className="font-bold uppercase">Responsable Mañana</p>
            <p className="min-h-3">{info.responsable_manana}</p>
            <div className="h-6">{renderFirma(firmas.manana)}</div>
          </div>
          <div className="border-r border-gray-500 px-1 py-0.5 text-center">
            <p className="font-bold uppercase">Responsable Tarde</p>
            <p className="min-h-3">{info.responsable_tarde}</p>
            <div className="h-6">{renderFirma(firmas.tarde)}</div>
          </div>
          <div className="px-1 py-0.5 text-center">
            <p className="font-bold uppercase">Responsable Noche</p>
            <p className="min-h-3">{info.responsable_noche}</p>
            <div className="h-6">{renderFirma(firmas.noche)}</div>
          </div>
        </div>
        <div className="border-x border-b border-gray-500 px-1 py-0.5">
          <span className="font-bold uppercase">Fecha Limpieza y Desinfección: </span>{formatDate(info.fecha_limpieza)}
        </div>
        <div className="border-x border-b border-gray-500 px-1 py-0.5">
          <span className="font-bold uppercase">Observaciones: </span>{info.observaciones}
        </div>
      </section>
    </div>
  );
}
