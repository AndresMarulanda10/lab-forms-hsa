"use client";

export default function HospitalFooter() {
  return (
    <div className="border border-gray-400 rounded-b-lg overflow-hidden bg-white print:bg-white">
      <div className="grid grid-cols-[1fr_auto_auto] divide-x divide-gray-300">

        {/* ── Info de contacto ──────────────────────── */}
        <div className="px-4 py-2.5">
          <p className="text-[8.5px] italic text-gray-500 mb-1 leading-snug">
            Este documento es controlado. La versión vigente reposa en el Sistema de Gestión de la Calidad.
          </p>
          <div className="text-[9px] text-gray-700 leading-relaxed">
            <p><span className="font-bold">Dirección:</span> Carrera 10 No. 8 - 24</p>
            <p><span className="font-bold">Teléfono:</span> 5140707</p>
            <p>
              <span className="font-bold">Correo:</span>{" "}
              <a href="mailto:hchia@esehospitalchia.gov.co"
                className="text-hsa-green hover:underline">
                hchia@esehospitalchia.gov.co
              </a>
            </p>
            <p className="font-bold">Chía – Cundinamarca - Colombia</p>
          </div>
        </div>

        {/* ── Gobernación de Cundinamarca ───────────── */}
        <div className="flex flex-col items-center justify-center px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/gobernacion_cundinamarca.jpeg"
            alt="Gobernación de Cundinamarca"
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* ── Red Global de Hospitales Verdes ──────── */}
        <div className="flex flex-col items-center justify-center px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/red_global_hospitales.jpeg"
            alt="Red Global de Hospitales Verdes y Saludables"
            className="h-12 w-auto object-contain"
          />
        </div>

      </div>
    </div>
  );
}
