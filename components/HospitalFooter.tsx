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
        <div className="flex flex-col items-center justify-center px-6 py-2 gap-0.5">
          {/* Sello circular simplificado */}
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
            <circle cx="24" cy="24" r="23" fill="#1a2a5e"/>
            <circle cx="24" cy="24" r="19" fill="none" stroke="#c8a951" strokeWidth="1.2"/>
            <circle cx="24" cy="20" r="3.5" fill="white"/>
            <ellipse cx="24" cy="29" rx="3.5" ry="5" fill="white"/>
            <path d="M20.5 25 C16 23 9 25 6 30 C10 27.5 16 26 20.5 27" fill="white"/>
            <path d="M27.5 25 C32 23 39 25 42 30 C38 27.5 32 26 27.5 27" fill="white"/>
            <path d="M21 33 L24 40 L27 33" fill="white"/>
            <path d="M22.5 19.5 L24 22 L25.5 19.5" fill="#c8a951"/>
          </svg>
          <p className="text-[7.5px] italic text-gray-500 leading-tight">Gobernación de</p>
          <p className="text-[9px] font-bold text-[#1a2a5e] leading-tight">Cundinamarca</p>
        </div>

        {/* ── Red Global de Hospitales Verdes ──────── */}
        <div className="flex flex-col items-center justify-center px-6 py-2 gap-1">
          {/* Grilla 4×4 */}
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
            {[
              "#1a7a4a","#2ea65a","#0f5c38","#4ab870",
              "#1565a0","#1a7a4a","#2ea65a","#0f5c38",
              "#0f5c38","#1565a0","#1a7a4a","#4ab870",
              "#4ab870","#0f5c38","#1565a0","#1a7a4a",
            ].map((color, i) => (
              <rect key={i}
                x={(i % 4) * 10.5} y={Math.floor(i / 4) * 10.5}
                width={9} height={9} fill={color} rx="1"/>
            ))}
          </svg>
          <div className="text-center leading-tight">
            <p className="text-[7px] text-gray-500">Red <span className="font-black text-gray-700">GLOBAL</span></p>
            <p className="text-[7px] text-gray-500">de HOSPITALES</p>
            <p className="text-[7px] font-bold text-hsa-green">VERDES y SALUDABLES</p>
          </div>
        </div>

      </div>
    </div>
  );
}
