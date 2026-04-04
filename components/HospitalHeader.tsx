"use client";

import HospitalLogo from "./HospitalLogo";

interface HospitalHeaderProps {
  codigo: string;
  version?: string;
  fechaVigencia?: string;
  proceso?: string;
  subproceso?: string;
  nombreDocumento: string;
}

export default function HospitalHeader({
  codigo,
  version = "2",
  fechaVigencia = "21/01/2026",
  proceso = "GESTIÓN DE APOYO DIAGNÓSTICO Y TERAPÉUTICO",
  subproceso = "LABORATORIO CLÍNICO",
  nombreDocumento,
}: HospitalHeaderProps) {
  return (
    <div className="border-2 border-gray-400 rounded-t-lg overflow-hidden bg-white print:rounded-none">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {/* ── Fila 1 ───────────────────────────────────────────── */}
          <tr>
            {/* Col 1 – Logo hospital (rowspan 2) */}
            <td rowSpan={2}
              className="border border-gray-400 p-2 w-[16%] align-middle text-center">
              <HospitalLogo className="h-14 w-auto mx-auto" color="#006b3c" />
              <p className="text-[7px] font-bold text-gray-600 uppercase leading-tight mt-1">
                EMPRESA SOCIAL DEL ESTADO
              </p>
              <p className="text-[7px] text-gray-500 leading-tight">
                Hospital San Antonio de Chía
              </p>
            </td>

            {/* Col 2 – Nombre institución */}
            <td className="border border-gray-400 p-3 align-middle text-center">
              <p className="font-black text-gray-900 text-[12px] leading-snug tracking-wide">
                EMPRESA SOCIAL DEL ESTADO
              </p>
              <p className="font-black text-gray-900 text-[12px] leading-snug tracking-wide">
                HOSPITAL SAN ANTONIO DE CHÍA
              </p>
            </td>

            {/* Col 3 – Código / Versión / Fecha */}
            <td className="border border-gray-400 p-2 w-[22%] align-top">
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold">Código:</span> {codigo}
              </p>
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold">Fecha Vigencia:</span> {fechaVigencia}
              </p>
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold">Documento Controlado:</span> Versión {version}
              </p>
            </td>

            {/* Col 4 – Sabana Centro (rowspan 2) */}
            <td rowSpan={2}
              className="border border-gray-400 p-2 w-[16%] align-middle text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sabana_centro.jpeg"
                alt="ESE Región de Salud Sabana Centro"
                className="h-16 w-auto mx-auto object-contain"
              />
            </td>
          </tr>

          {/* ── Fila 2 ───────────────────────────────────────────── */}
          <tr>
            {/* Col 2+3 juntos – Proceso / Sub Proceso / Nombre */}
            <td colSpan={2}
              className="border border-gray-400 px-3 py-2 align-middle">
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold">PROCESO:</span>{" "}
                <span className="uppercase">{proceso}</span>
              </p>
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold underline">SUB PROCESO:</span>{" "}
                <span className="uppercase">{subproceso}</span>
              </p>
              <p className="text-[9px] leading-relaxed">
                <span className="font-bold">NOMBRE DEL DOCUMENTO:</span>{" "}
                <span className="uppercase font-semibold">{nombreDocumento}</span>
              </p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
