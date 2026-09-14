export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="logo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B2450" />
          <stop offset="100%" stopColor="#0B0E1A" />
        </linearGradient>
        <linearGradient id="logo-sun" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B9D" />
          <stop offset="100%" stopColor="#F2C572" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill="url(#logo-sky)" />
      <circle cx="24" cy="24" r="23" fill="none" stroke="#FF6B9D" strokeWidth="1.5" opacity="0.7" />
      <circle cx="24" cy="19" r="7" fill="url(#logo-sun)" />
      <path
        d="M4 34 L17 20 L24 28 L31 19 L44 34 Z"
        fill="#0E1730"
        stroke="#4DA3FF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M13.5 25.5 L17 20 L20.5 25.5 Z" fill="#E8EDFF" opacity="0.85" />
      <path d="M27.5 24.5 L31 19 L34.5 24.5 Z" fill="#E8EDFF" opacity="0.85" />
      <path
        d="M4 37 q6 -3 12 0 t12 0 t12 0"
        fill="none"
        stroke="#4DA3FF"
        strokeWidth="1.4"
        opacity="0.6"
      />
    </svg>
  );
}
