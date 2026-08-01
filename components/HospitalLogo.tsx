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
  const source = encodeURIComponent(`
    <svg width="110" height="90" viewBox="0 0 110 90" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <circle cx="23" cy="8" r="6.5" fill="${color}" />
      <path d="M23 14 C23 14 8 17 2 27 L14 27 C14 20 18 16 23 16 C28 16 32 20 32 27 L44 27 C38 17 23 14 23 14 Z" fill="${color}" />
      <rect x="14" y="27" width="18" height="40" rx="2" fill="${color}" />
      <circle cx="87" cy="8" r="6.5" fill="${color}" />
      <path d="M87 14 C87 14 72 17 66 27 L78 27 C78 20 82 16 87 16 C92 16 96 20 96 27 L108 27 C102 17 87 14 87 14 Z" fill="${color}" />
      <rect x="78" y="27" width="18" height="40" rx="2" fill="${color}" />
      <rect x="32" y="38" width="46" height="15" fill="${color}" />
      <text x="55" y="80" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="9.5" font-style="italic" fill="${color}" letter-spacing="0.3">Unidos por su Salud</text>
    </svg>
  `);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`data:image/svg+xml;charset=utf-8,${source}`}
      width={110}
      height={90}
      className={className}
      alt="Hospital San Antonio de Chía — Unidos por su Salud"
    />
  );
}
