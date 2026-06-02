'use client'

// Renders a paisley/boteh pattern in the gutters outside the page container.
// Uses an inline SVG as a background so it doesn't get stripped by PostCSS.
export default function PaisleyBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        // The pattern only shows in the gutters — the page-container sits on top
        pointerEvents: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <defs>
          <pattern id="paisley" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse">
            {/* ── Boteh 1: large, top-left, tilted -30° ── */}
            <g transform="translate(36,46) rotate(-30)">
              {/* Outer teardrop */}
              <path d="M0,-24 C11,-24 20,-15 20,0 C20,13 9,24 0,30 C-9,24 -20,13 -20,0 C-20,-15 -11,-24 0,-24 Z"
                fill="none" stroke="#6b4e20" strokeWidth="1.3" opacity="0.6" />
              {/* Curved hooked tip */}
              <path d="M0,24 C5,31 13,33 10,28" fill="none" stroke="#6b4e20" strokeWidth="1.1" opacity="0.55" />
              {/* Inner concentric arc */}
              <path d="M-13,0 C-13,-9 -7,-16 0,-16" fill="none" stroke="#a07830" strokeWidth="0.8" opacity="0.45" />
              <path d="M-8,5 C-8,-4 -4,-11 0,-11" fill="none" stroke="#a07830" strokeWidth="0.6" opacity="0.35" />
              {/* Center fill dot */}
              <circle cx="0" cy="0" r="3" fill="#6b4e20" opacity="0.4" />
              {/* Small accent diamonds */}
              <rect x="-2.5" y="-22" width="5" height="5" transform="rotate(45 0 -19)" fill="#a07830" opacity="0.35" />
              <rect x="16" y="-7" width="4" height="4" transform="rotate(45 18 -5)" fill="#6b4e20" opacity="0.3" />
              <rect x="-18" y="-7" width="4" height="4" transform="rotate(45 -16 -5)" fill="#6b4e20" opacity="0.3" />
              {/* Small petal fills */}
              <ellipse cx="0" cy="-18" rx="2" ry="3" transform="rotate(-30)" fill="#a07830" opacity="0.2" />
            </g>

            {/* ── Boteh 2: large, bottom-right, rotated 150° ── */}
            <g transform="translate(124,114) rotate(150)">
              <path d="M0,-24 C11,-24 20,-15 20,0 C20,13 9,24 0,30 C-9,24 -20,13 -20,0 C-20,-15 -11,-24 0,-24 Z"
                fill="none" stroke="#6b4e20" strokeWidth="1.3" opacity="0.6" />
              <path d="M0,24 C5,31 13,33 10,28" fill="none" stroke="#6b4e20" strokeWidth="1.1" opacity="0.55" />
              <path d="M-13,0 C-13,-9 -7,-16 0,-16" fill="none" stroke="#a07830" strokeWidth="0.8" opacity="0.45" />
              <path d="M-8,5 C-8,-4 -4,-11 0,-11" fill="none" stroke="#a07830" strokeWidth="0.6" opacity="0.35" />
              <circle cx="0" cy="0" r="3" fill="#6b4e20" opacity="0.4" />
              <rect x="-2.5" y="-22" width="5" height="5" transform="rotate(45 0 -19)" fill="#a07830" opacity="0.35" />
              <rect x="16" y="-7" width="4" height="4" transform="rotate(45 18 -5)" fill="#6b4e20" opacity="0.3" />
              <rect x="-18" y="-7" width="4" height="4" transform="rotate(45 -16 -5)" fill="#6b4e20" opacity="0.3" />
            </g>

            {/* ── Boteh 3: small, top-right ── */}
            <g transform="translate(122,30) rotate(25) scale(0.52)">
              <path d="M0,-24 C11,-24 20,-15 20,0 C20,13 9,24 0,30 C-9,24 -20,13 -20,0 C-20,-15 -11,-24 0,-24 Z"
                fill="none" stroke="#a07830" strokeWidth="1.1" opacity="0.45" />
              <path d="M0,24 C5,31 13,33 10,28" fill="none" stroke="#a07830" strokeWidth="0.9" opacity="0.4" />
              <path d="M-13,0 C-13,-9 -7,-16 0,-16" fill="none" stroke="#6b4e20" strokeWidth="0.7" opacity="0.3" />
              <circle cx="0" cy="0" r="2.5" fill="#a07830" opacity="0.35" />
            </g>

            {/* ── Boteh 4: small, bottom-left ── */}
            <g transform="translate(36,130) rotate(205) scale(0.52)">
              <path d="M0,-24 C11,-24 20,-15 20,0 C20,13 9,24 0,30 C-9,24 -20,13 -20,0 C-20,-15 -11,-24 0,-24 Z"
                fill="none" stroke="#a07830" strokeWidth="1.1" opacity="0.45" />
              <path d="M0,24 C5,31 13,33 10,28" fill="none" stroke="#a07830" strokeWidth="0.9" opacity="0.4" />
              <circle cx="0" cy="0" r="2.5" fill="#a07830" opacity="0.35" />
            </g>

            {/* ── Filler: center diamond ── */}
            <rect x="77" y="77" width="7" height="7" transform="rotate(45 80.5 80.5)" fill="#6b4e20" opacity="0.3" />
            {/* Small dots at corners */}
            <circle cx="4" cy="4" r="1.5" fill="#6b4e20" opacity="0.25" />
            <circle cx="156" cy="4" r="1.5" fill="#6b4e20" opacity="0.25" />
            <circle cx="4" cy="156" r="1.5" fill="#6b4e20" opacity="0.25" />
            <circle cx="156" cy="156" r="1.5" fill="#6b4e20" opacity="0.25" />
            {/* Fine cross at center */}
            <line x1="79" y1="80.5" x2="82" y2="80.5" stroke="#a07830" strokeWidth="0.8" opacity="0.3" />
            <line x1="80.5" y1="79" x2="80.5" y2="82" stroke="#a07830" strokeWidth="0.8" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#paisley)" />
      </svg>
    </div>
  )
}
