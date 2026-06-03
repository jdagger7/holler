// Server component — renders the bandana-style paisley pattern in the gutters
export default function PaisleyBackground() {
  return (
    <div
      aria-hidden="true"
      className="paisley-bg"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', display: 'none' }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bandana" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">

            {/* ── Large primary boteh — top-left, bold filled ── */}
            <g transform="translate(42,52) rotate(-40)">
              {/* Outer filled teardrop */}
              <path d="M0,-30 C14,-30 26,-18 26,0 C26,16 12,30 0,38 C-12,30 -26,16 -26,0 C-26,-18 -14,-30 0,-30 Z"
                fill="#3d2c10" opacity="0.7" />
              {/* Inner lighter teardrop */}
              <path d="M0,-20 C9,-20 17,-12 17,0 C17,10 8,20 0,25 C-8,20 -17,10 -17,0 C-17,-12 -9,-20 0,-20 Z"
                fill="#6b4e20" opacity="0.5" />
              {/* Core dot */}
              <circle cx="0" cy="0" r="5" fill="#a07830" opacity="0.6" />
              {/* Curved hook tip */}
              <path d="M0,30 C6,40 16,44 13,36" fill="none" stroke="#3d2c10" strokeWidth="2" opacity="0.7" />
              {/* Inner detail arc */}
              <path d="M-16,0 C-16,-12 -8,-20 0,-20" fill="none" stroke="#a07830" strokeWidth="1" opacity="0.5" />
              {/* Accent teardrop inside */}
              <path d="M0,-12 C4,-12 8,-8 8,0 C8,5 4,10 0,12 C-4,10 -8,5 -8,0 C-8,-8 -4,-12 0,-12 Z"
                fill="none" stroke="#a07830" strokeWidth="0.8" opacity="0.45" />
              {/* Pearl dots border */}
              {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
                const r = 29, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="1.8" fill="#6b4e20" opacity="0.55" />
              })}
            </g>

            {/* ── Large primary boteh — bottom-right, mirrored ── */}
            <g transform="translate(158,148) rotate(140)">
              <path d="M0,-30 C14,-30 26,-18 26,0 C26,16 12,30 0,38 C-12,30 -26,16 -26,0 C-26,-18 -14,-30 0,-30 Z"
                fill="#3d2c10" opacity="0.7" />
              <path d="M0,-20 C9,-20 17,-12 17,0 C17,10 8,20 0,25 C-8,20 -17,10 -17,0 C-17,-12 -9,-20 0,-20 Z"
                fill="#6b4e20" opacity="0.5" />
              <circle cx="0" cy="0" r="5" fill="#a07830" opacity="0.6" />
              <path d="M0,30 C6,40 16,44 13,36" fill="none" stroke="#3d2c10" strokeWidth="2" opacity="0.7" />
              <path d="M-16,0 C-16,-12 -8,-20 0,-20" fill="none" stroke="#a07830" strokeWidth="1" opacity="0.5" />
              {[0,45,90,135,180,225,270,315].map((deg, i) => {
                const r = 29, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="1.8" fill="#6b4e20" opacity="0.55" />
              })}
            </g>

            {/* ── Medium boteh — top-right ── */}
            <g transform="translate(158,42) rotate(30) scale(0.65)">
              <path d="M0,-30 C14,-30 26,-18 26,0 C26,16 12,30 0,38 C-12,30 -26,16 -26,0 C-26,-18 -14,-30 0,-30 Z"
                fill="#3d2c10" opacity="0.55" />
              <path d="M0,-18 C8,-18 15,-10 15,0 C15,9 7,18 0,22 C-7,18 -15,9 -15,0 C-15,-10 -8,-18 0,-18 Z"
                fill="#6b4e20" opacity="0.4" />
              <circle cx="0" cy="0" r="4" fill="#a07830" opacity="0.5" />
              <path d="M0,28 C5,36 13,38 10,31" fill="none" stroke="#3d2c10" strokeWidth="1.5" opacity="0.6" />
            </g>

            {/* ── Medium boteh — bottom-left ── */}
            <g transform="translate(42,158) rotate(210) scale(0.65)">
              <path d="M0,-30 C14,-30 26,-18 26,0 C26,16 12,30 0,38 C-12,30 -26,16 -26,0 C-26,-18 -14,-30 0,-30 Z"
                fill="#3d2c10" opacity="0.55" />
              <path d="M0,-18 C8,-18 15,-10 15,0 C15,9 7,18 0,22 C-7,18 -15,9 -15,0 C-15,-10 -8,-18 0,-18 Z"
                fill="#6b4e20" opacity="0.4" />
              <circle cx="0" cy="0" r="4" fill="#a07830" opacity="0.5" />
              <path d="M0,28 C5,36 13,38 10,31" fill="none" stroke="#3d2c10" strokeWidth="1.5" opacity="0.6" />
            </g>

            {/* ── Small teardrop clusters — bandana border style ── */}
            {/* Top row small teardrops */}
            {[20, 60, 100, 140, 180].map((x, i) => (
              <g key={`tr${i}`} transform={`translate(${x}, 12) rotate(${i % 2 === 0 ? 0 : 180})`}>
                <path d="M0,-8 C4,-8 7,-4 7,0 C7,4 3,8 0,10 C-3,8 -7,4 -7,0 C-7,-4 -4,-8 0,-8 Z"
                  fill="#6b4e20" opacity="0.5" />
              </g>
            ))}
            {/* Bottom row small teardrops */}
            {[20, 60, 100, 140, 180].map((x, i) => (
              <g key={`br${i}`} transform={`translate(${x}, 188) rotate(${i % 2 === 0 ? 180 : 0})`}>
                <path d="M0,-8 C4,-8 7,-4 7,0 C7,4 3,8 0,10 C-3,8 -7,4 -7,0 C-7,-4 -4,-8 0,-8 Z"
                  fill="#6b4e20" opacity="0.5" />
              </g>
            ))}
            {/* Left col small teardrops */}
            {[40, 80, 120, 160].map((y, i) => (
              <g key={`lc${i}`} transform={`translate(12, ${y}) rotate(${i % 2 === 0 ? -90 : 90})`}>
                <path d="M0,-8 C4,-8 7,-4 7,0 C7,4 3,8 0,10 C-3,8 -7,4 -7,0 C-7,-4 -4,-8 0,-8 Z"
                  fill="#6b4e20" opacity="0.5" />
              </g>
            ))}
            {/* Right col small teardrops */}
            {[40, 80, 120, 160].map((y, i) => (
              <g key={`rc${i}`} transform={`translate(188, ${y}) rotate(${i % 2 === 0 ? 90 : -90})`}>
                <path d="M0,-8 C4,-8 7,-4 7,0 C7,4 3,8 0,10 C-3,8 -7,4 -7,0 C-7,-4 -4,-8 0,-8 Z"
                  fill="#6b4e20" opacity="0.5" />
              </g>
            ))}

            {/* ── Pearl/dot border lines ── */}
            {[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120,128,136,144,152,160,168,176,184,192].map((x, i) => (
              <circle key={`pt${i}`} cx={x} cy="4" r="1.2" fill="#6b4e20" opacity="0.4" />
            ))}
            {[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120,128,136,144,152,160,168,176,184,192].map((x, i) => (
              <circle key={`pb${i}`} cx={x} cy="196" r="1.2" fill="#6b4e20" opacity="0.4" />
            ))}

            {/* ── Center accent ── */}
            <circle cx="100" cy="100" r="4" fill="#6b4e20" opacity="0.3" />
            <circle cx="100" cy="100" r="8" fill="none" stroke="#6b4e20" strokeWidth="0.8" opacity="0.25" />

            {/* ── Diamond accents scattered ── */}
            {[
              [100, 25], [175, 100], [100, 175], [25, 100],
              [100, 60], [140, 100], [100, 140], [60, 100],
            ].map(([x, y], i) => (
              <rect key={`d${i}`} x={x - 3} y={y - 3} width="6" height="6"
                transform={`rotate(45 ${x} ${y})`} fill="#6b4e20" opacity="0.35" />
            ))}

            {/* ── Tiny dot fills ── */}
            {[
              [30, 30], [170, 30], [30, 170], [170, 170],
              [75, 75], [125, 75], [75, 125], [125, 125],
            ].map(([x, y], i) => (
              <circle key={`dd${i}`} cx={x} cy={y} r="1.5" fill="#a07830" opacity="0.28" />
            ))}

          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bandana)" />
      </svg>
    </div>
  )
}
