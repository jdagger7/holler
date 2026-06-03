// Server component — bandana-style paisley in gutters
// Fades horizontally toward center, constant top-to-bottom, softens but doesn't go to black
export default function PaisleyBackground() {
  return (
    <div
      aria-hidden="true"
      className="paisley-bg"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', display: 'none' }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Horizontal-only linear gradient masks — fade toward center, stop at ~40% opacity not 0 */}
          <linearGradient id="fade-l" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="70%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="fade-r" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="70%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="side-fade">
            <rect width="50%" height="100%" fill="url(#fade-l)" />
            <rect x="50%" width="50%" height="100%" fill="url(#fade-r)" />
          </mask>

          <pattern id="bandana" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">

            {/* ── PRIMARY BOTEH 1: large, top-left ── */}
            <g transform="translate(38,50) rotate(-38)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#e8dfc0" opacity="0.55" />
              <path d="M0,-22 C10,-22 19,-13 19,0 C19,11 9,22 0,28 C-9,22 -19,11 -19,0 C-19,-13 -10,-22 0,-22 Z"
                fill="#c8b888" opacity="0.45" />
              <path d="M0,-12 C6,-12 10,-7 10,0 C10,6 5,12 0,15 C-5,12 -10,6 -10,0 C-10,-7 -6,-12 0,-12 Z"
                fill="#e8dfc0" opacity="0.5" />
              <circle cx="0" cy="0" r="4" fill="#f5eed8" opacity="0.6" />
              <path d="M0,38 C7,50 20,55 16,44 C12,36 4,38 0,44" fill="none" stroke="#e8dfc0" strokeWidth="2" opacity="0.6" />
              <path d="M-18,0 C-18,-14 -9,-22 0,-22" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.5" />
              <path d="M-10,4 C-10,-6 -5,-12 0,-12" fill="none" stroke="#e8dfc0" strokeWidth="0.8" opacity="0.4" />
              {[0,24,48,72,96,120,144,168,192,216,240,264,288,312,336].map((deg, i) => {
                const r = 33, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="2" fill="#e8dfc0" opacity="0.5" />
              })}
              <circle cx="0" cy="-32" r="2.5" fill="#c8b888" opacity="0.45" />
              <circle cx="22" cy="-22" r="1.8" fill="#c8b888" opacity="0.4" />
              <circle cx="-22" cy="-22" r="1.8" fill="#c8b888" opacity="0.4" />
            </g>

            {/* ── PRIMARY BOTEH 2: large, bottom-right ── */}
            <g transform="translate(142,130) rotate(142)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#e8dfc0" opacity="0.55" />
              <path d="M0,-22 C10,-22 19,-13 19,0 C19,11 9,22 0,28 C-9,22 -19,11 -19,0 C-19,-13 -10,-22 0,-22 Z"
                fill="#c8b888" opacity="0.45" />
              <path d="M0,-12 C6,-12 10,-7 10,0 C10,6 5,12 0,15 C-5,12 -10,6 -10,0 C-10,-7 -6,-12 0,-12 Z"
                fill="#e8dfc0" opacity="0.5" />
              <circle cx="0" cy="0" r="4" fill="#f5eed8" opacity="0.6" />
              <path d="M0,38 C7,50 20,55 16,44 C12,36 4,38 0,44" fill="none" stroke="#e8dfc0" strokeWidth="2" opacity="0.6" />
              <path d="M-18,0 C-18,-14 -9,-22 0,-22" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.5" />
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
                const r = 33, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="2" fill="#e8dfc0" opacity="0.5" />
              })}
            </g>

            {/* ── MEDIUM BOTEH: top-right ── */}
            <g transform="translate(142,38) rotate(28) scale(0.6)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#c8b888" opacity="0.45" />
              <path d="M0,-20 C9,-20 16,-11 16,0 C16,10 8,20 0,25 C-8,20 -16,10 -16,0 C-16,-11 -9,-20 0,-20 Z"
                fill="#e8dfc0" opacity="0.4" />
              <circle cx="0" cy="0" r="3.5" fill="#f5eed8" opacity="0.55" />
              <path d="M0,36 C6,46 17,50 13,41 C10,34 3,36 0,42" fill="none" stroke="#c8b888" strokeWidth="1.5" opacity="0.55" />
              <path d="M-16,0 C-16,-12 -8,-20 0,-20" fill="none" stroke="#e8dfc0" strokeWidth="1" opacity="0.4" />
              {[0,45,90,135,180,225,270,315].map((deg, i) => {
                const r = 30, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="1.5" fill="#c8b888" opacity="0.4" />
              })}
            </g>

            {/* ── MEDIUM BOTEH: bottom-left ── */}
            <g transform="translate(38,142) rotate(208) scale(0.6)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#c8b888" opacity="0.45" />
              <path d="M0,-20 C9,-20 16,-11 16,0 C16,10 8,20 0,25 C-8,20 -16,10 -16,0 C-16,-11 -9,-20 0,-20 Z"
                fill="#e8dfc0" opacity="0.4" />
              <circle cx="0" cy="0" r="3.5" fill="#f5eed8" opacity="0.55" />
              <path d="M0,36 C6,46 17,50 13,41 C10,34 3,36 0,42" fill="none" stroke="#c8b888" strokeWidth="1.5" opacity="0.55" />
            </g>

            {/* ── SMALL CATTAIL TEARDROPS — border clusters ── */}
            {[15, 45, 75, 105, 135, 165].map((x, i) => (
              <g key={`te${i}`} transform={`translate(${x}, 10) rotate(${i % 2 === 0 ? 0 : 180})`}>
                <path d="M0,-10 C5,-10 9,-5 9,0 C9,5 4,10 0,13 C-4,10 -9,5 -9,0 C-9,-5 -5,-10 0,-10 Z"
                  fill="#c8b888" opacity="0.5" />
                <path d="M0,11 C2,16 7,18 5,13" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.45" />
                <circle cx="0" cy="0" r="1.5" fill="#f5eed8" opacity="0.5" />
              </g>
            ))}
            {[15, 45, 75, 105, 135, 165].map((x, i) => (
              <g key={`be${i}`} transform={`translate(${x}, 170) rotate(${i % 2 === 0 ? 180 : 0})`}>
                <path d="M0,-10 C5,-10 9,-5 9,0 C9,5 4,10 0,13 C-4,10 -9,5 -9,0 C-9,-5 -5,-10 0,-10 Z"
                  fill="#c8b888" opacity="0.5" />
                <path d="M0,11 C2,16 7,18 5,13" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.45" />
                <circle cx="0" cy="0" r="1.5" fill="#f5eed8" opacity="0.5" />
              </g>
            ))}
            {[20, 55, 90, 125, 160].map((y, i) => (
              <g key={`le${i}`} transform={`translate(10, ${y}) rotate(${i % 2 === 0 ? -90 : 90})`}>
                <path d="M0,-10 C5,-10 9,-5 9,0 C9,5 4,10 0,13 C-4,10 -9,5 -9,0 C-9,-5 -5,-10 0,-10 Z"
                  fill="#c8b888" opacity="0.5" />
                <path d="M0,11 C2,16 7,18 5,13" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.45" />
                <circle cx="0" cy="0" r="1.5" fill="#f5eed8" opacity="0.5" />
              </g>
            ))}
            {[20, 55, 90, 125, 160].map((y, i) => (
              <g key={`re${i}`} transform={`translate(170, ${y}) rotate(${i % 2 === 0 ? 90 : -90})`}>
                <path d="M0,-10 C5,-10 9,-5 9,0 C9,5 4,10 0,13 C-4,10 -9,5 -9,0 C-9,-5 -5,-10 0,-10 Z"
                  fill="#c8b888" opacity="0.5" />
                <path d="M0,11 C2,16 7,18 5,13" fill="none" stroke="#c8b888" strokeWidth="1.2" opacity="0.45" />
                <circle cx="0" cy="0" r="1.5" fill="#f5eed8" opacity="0.5" />
              </g>
            ))}

            {/* ── PEARL DOT BORDERS ── */}
            {Array.from({length: 22}, (_, i) => i * 9).map((x, i) => (
              <circle key={`pt${i}`} cx={x} cy="3" r="1.5" fill="#e8dfc0" opacity="0.45" />
            ))}
            {Array.from({length: 22}, (_, i) => i * 9).map((x, i) => (
              <circle key={`pb${i}`} cx={x} cy="177" r="1.5" fill="#e8dfc0" opacity="0.45" />
            ))}

            {/* ── DIAMOND ACCENTS ── */}
            {[
              [90,18],[162,90],[90,162],[18,90],
              [90,54],[126,90],[90,126],[54,90],
            ].map(([x,y],i) => (
              <rect key={`da${i}`} x={x-4} y={y-4} width="8" height="8"
                transform={`rotate(45 ${x} ${y})`} fill="#e8dfc0" opacity="0.4" />
            ))}

            {/* ── MINI OUTLINE BOTEH fills ── */}
            {[
              [90,90,0],[60,30,45],[120,30,-45],[60,150,-45],[120,150,45],
            ].map(([x,y,rot],i) => (
              <g key={`mf${i}`} transform={`translate(${x},${y}) rotate(${rot}) scale(0.35)`}>
                <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                  fill="none" stroke="#c8b888" strokeWidth="2" opacity="0.35" />
                <path d="M0,36 C6,46 17,50 13,41" fill="none" stroke="#c8b888" strokeWidth="1.5" opacity="0.35" />
              </g>
            ))}

          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#bandana)" mask="url(#side-fade)" />
      </svg>
    </div>
  )
}
