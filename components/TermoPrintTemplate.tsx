"use client";

import type { LecturasTermohigrometria } from "@/lib/types";
import { getDiasEnMes, lecturaClave, MESES } from "@/lib/types";
import PrintChart, { type PrintDataPoint } from "@/components/PrintChart";

interface TermoPrintInfo {
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

interface PrintFirmas {
  manana: string;
  tarde: string;
  noche: string;
}

interface TermoPrintTemplateProps {
  lecturas: LecturasTermohigrometria;
  mes: number;
  año: number;
  info: TermoPrintInfo;
  firmas: PrintFirmas;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  className?: string;
}

const JORNADAS = ["M", "T", "N"] as const;

type TermoJornada = (typeof JORNADAS)[number];
type TermoCampo = "temp" | "hum";

function parseCorrectionFactor(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderFirma(src: string) {
  if (!src.trim()) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Firma responsable" className="mx-auto max-h-6 max-w-16 object-contain" />
  );
}

function getEntry(lecturas: LecturasTermohigrometria, dia: number, jornada: TermoJornada) {
  const entry = lecturas[lecturaClave(dia, jornada)];
  if (entry !== undefined) return entry;
  if (jornada === "M") return lecturas[String(dia)];
  return undefined;
}

function buildPrintData(
  lecturas: LecturasTermohigrometria,
  campo: TermoCampo,
  factorCorreccion: number,
  diasEnMes: number,
): PrintDataPoint[] {
  const hasCorrection = factorCorreccion !== 0;

  return Array.from({ length: diasEnMes }, (_, index) => {
    const dia = index + 1;
    const values = Object.fromEntries(
      JORNADAS.map((jornada) => [jornada, getEntry(lecturas, dia, jornada)?.[campo] ?? null]),
    ) as Record<TermoJornada, number | null>;

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

export default function TermoPrintTemplate({
  lecturas,
  mes,
  año,
  info,
  firmas,
  tempMin,
  tempMax,
  humMin,
  humMax,
  className = "",
}: TermoPrintTemplateProps) {
  const diasEnMes = getDiasEnMes(mes, año);
  const fcTemp = parseCorrectionFactor(info.factor_correccion_temp);
  const fcHum = parseCorrectionFactor(info.factor_correccion_hum);
  const tempData = buildPrintData(lecturas, "temp", fcTemp, diasEnMes);
  const humData = buildPrintData(lecturas, "hum", fcHum, diasEnMes);
  const metadata = `Mes: ${MESES[mes - 1]} ${año} · Ubicación: ${info.ubicacion || ""} · Dispositivo: ${info.dispositivo_nombre || ""} · Marca: ${info.dispositivo_marca || ""} · Modelo: ${info.dispositivo_modelo || ""} · Serial: ${info.dispositivo_serial || ""} · Certificado: ${info.certificado || ""}`;

  return (
    <div className={`space-y-1 bg-white text-gray-900 ${className}`.trim()}>
      <p className="mb-0 text-[7px] text-gray-600">
        {metadata} · Rango: {tempMin}–{tempMax} °C · Factor corrección: {info.factor_correccion_temp || "0"}
      </p>
      <PrintChart
        titulo="Temperatura (°C)"
        unidad="°C"
        rangoMin={tempMin}
        rangoMax={tempMax}
        factorCorreccion={fcTemp}
        data={tempData}
        width={720}
        height={220}
      />

      <p className="mb-0 text-[7px] text-gray-600">
        {metadata} · Rango: {humMin}–{humMax} % · Factor corrección: {info.factor_correccion_hum || "0"}
      </p>
      <PrintChart
        titulo="Humedad (%)"
        unidad="%"
        rangoMin={humMin}
        rangoMax={humMax}
        factorCorreccion={fcHum}
        data={humData}
        width={720}
        height={220}
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
          <span className="font-bold uppercase">Observaciones: </span>{info.observaciones}
        </div>
      </section>
    </div>
  );
}
