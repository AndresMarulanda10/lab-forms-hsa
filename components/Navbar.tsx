"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Thermometer, Refrigerator } from "lucide-react";
import HospitalLogo from "./HospitalLogo";

const links = [
  { href: "/termohigrometria", label: "F-021 Termohigrometría", icon: Thermometer },
  { href: "/neveras/registro",  label: "F-029 Temperatura Neveras", icon: Refrigerator },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-hsa-green shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          <Link href="/" className="flex items-center gap-2.5">
            <HospitalLogo className="h-9 w-auto" color="white" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white font-bold text-sm tracking-wide">
                Hospital San Antonio de Chía
              </span>
              <span className="text-green-200 text-[10px] font-medium tracking-wider uppercase">
                Laboratorio Clínico
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    active
                      ? "bg-white text-hsa-green font-bold shadow-sm ring-1 ring-white/60"
                      : "text-green-100 font-medium hover:text-white"
                  }`}
                  style={!active ? {} : undefined}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "#004d2a"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <Icon size={15} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
