interface HospitalLogoProps {
  className?: string;
  color?: string;
}

/**
 * SVG recreation of the "Unidos por su Salud" logo.
 * No background — fully transparent, scales to any size.
 */
export default function HospitalLogo({
  className = "",
  color = "#006b3c",
}: HospitalLogoProps) {
  return (
    <svg
      viewBox="0 0 110 90"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hospital San Antonio de Chía — Unidos por su Salud"
    >
      {/* ── Left figure ───────────────────────────────── */}
      {/* Head */}
      <circle cx="23" cy="8" r="6.5" fill={color} />
      {/* Wing / outstretched arms shape */}
      <path
        d="M23 14
           C23 14 8 17 2 27
           L14 27
           C14 20 18 16 23 16
           C28 16 32 20 32 27
           L44 27
           C38 17 23 14 23 14 Z"
        fill={color}
      />
      {/* Left vertical bar of H */}
      <rect x="14" y="27" width="18" height="40" rx="2" fill={color} />

      {/* ── Right figure ──────────────────────────────── */}
      {/* Head */}
      <circle cx="87" cy="8" r="6.5" fill={color} />
      {/* Wing */}
      <path
        d="M87 14
           C87 14 72 17 66 27
           L78 27
           C78 20 82 16 87 16
           C92 16 96 20 96 27
           L108 27
           C102 17 87 14 87 14 Z"
        fill={color}
      />
      {/* Right vertical bar of H */}
      <rect x="78" y="27" width="18" height="40" rx="2" fill={color} />

      {/* ── Horizontal bar of H ───────────────────────── */}
      <rect x="32" y="38" width="46" height="15" fill={color} />

      {/* ── Text ──────────────────────────────────────── */}
      <text
        x="55"
        y="80"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="9.5"
        fontStyle="italic"
        fill={color}
        letterSpacing="0.3"
      >
        Unidos por su Salud
      </text>
    </svg>
  );
}
