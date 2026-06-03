// Server component — very faint bandana texture in gutters
// Should feel like a textured dark background, not a visible pattern
export default function PaisleyBackground() {
  return (
    <div
      aria-hidden="true"
      className="paisley-bg"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', display: 'none' }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bandana" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">

            {/* PRIMARY BOTEH 1 — top-left */}
            <g transform="translate(38,50) rotate(-38)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#d4c9a0" opacity="0.08" />
              <path d="M0,-22 C10,-22 19,-13 19,0 C19,11 9,22 0,28 C-9,22 -19,11 -19,0 C-19,-13 -10,-22 0,-22 Z"
                fill="#b8a870" opacity="0.1" />
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="none" stroke="#c8b880" strokeWidth="1" opacity="0.15" />
              <circle cx="0" cy="0" r="4" fill="#d4c9a0" opacity="0.12" />
              <path d="M0,38 C7,50 20,55 16,44 C12,36 4,38 0,44" fill="none" stroke="#c8b880" strokeWidth="1.5" opacity="0.12" />
              <path d="M-18,0 C-18,-14 -9,-22 0,-22" fill="none" stroke="#b8a870" strokeWidth="0.8" opacity="0.1" />
              {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
                const r = 33, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="1.5" fill="#c8b880" opacity="0.1" />
              })}
            </g>

            {/* PRIMARY BOTEH 2 — bottom-right */}
            <g transform="translate(142,130) rotate(142)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="#d4c9a0" opacity="0.08" />
              <path d="M0,-22 C10,-22 19,-13 19,0 C19,11 9,22 0,28 C-9,22 -19,11 -19,0 C-19,-13 -10,-22 0,-22 Z"
                fill="#b8a870" opacity="0.1" />
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="none" stroke="#c8b880" strokeWidth="1" opacity="0.15" />
              <circle cx="0" cy="0" r="4" fill="#d4c9a0" opacity="0.12" />
              <path d="M0,38 C7,50 20,55 16,44 C12,36 4,38 0,44" fill="none" stroke="#c8b880" strokeWidth="1.5" opacity="0.12" />
              <path d="M-18,0 C-18,-14 -9,-22 0,-22" fill="none" stroke="#b8a870" strokeWidth="0.8" opacity="0.1" />
              {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
                const r = 33, rad = deg * Math.PI / 180
                return <circle key={i} cx={r * Math.sin(rad)} cy={-r * Math.cos(rad)} r="1.5" fill="#c8b880" opacity="0.1" />
              })}
            </g>

            {/* MEDIUM BOTEH — top-right */}
            <g transform="translate(142,38) rotate(28) scale(0.6)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="none" stroke="#c8b880" strokeWidth="1.2" opacity="0.13" />
              <path d="M0,-20 C9,-20 16,-11 16,0 C16,10 8,20 0,25 C-8,20 -16,10 -16,0 C-16,-11 -9,-20 0,-20 Z"
                fill="#b8a870" opacity="0.08" />
              <circle cx="0" cy="0" r="3" fill="#d4c9a0" opacity="0.1" />
              <path d="M0,36 C6,46 17,50 13,41 C10,34 3,36 0,42" fill="none" stroke="#c8b880" strokeWidth="1.2" opacity="0.12" />
            </g>

            {/* MEDIUM BOTEH — bottom-left */}
            <g transform="translate(38,142) rotate(208) scale(0.6)">
              <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                fill="none" stroke="#c8b880" strokeWidth="1.2" opacity="0.13" />
              <path d="M0,-20 C9,-20 16,-11 16,0 C16,10 8,20 0,25 C-8,20 -16,10 -16,0 C-16,-11 -9,-20 0,-20 Z"
                fill="#b8a870" opacity="0.08" />
              <circle cx="0" cy="0" r="3" fill="#d4c9a0" opacity="0.1" />
              <path d="M0,36 C6,46 17,50 13,41 C10,34 3,36 0,42" fill="none" stroke="#c8b880" strokeWidth="1.2" opacity="0.12" />
            </g>

            {/* EDGE TEARDROPS */}
            {[15,45,75,105,135,165].map((x, i) => (
              <g key={`te${i}`} transform={`translate(${x},10) rotate(${i%2===0?0:180})`}>
                <path d="M0,-9 C4,-9 8,-4 8,0 C8,4 4,9 0,11 C-4,9 -8,4 -8,0 C-8,-4 -4,-9 0,-9 Z"
                  fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.12" />
                <path d="M0,10 C2,14 6,16 4,11" fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.1" />
              </g>
            ))}
            {[15,45,75,105,135,165].map((x, i) => (
              <g key={`be${i}`} transform={`translate(${x},170) rotate(${i%2===0?180:0})`}>
                <path d="M0,-9 C4,-9 8,-4 8,0 C8,4 4,9 0,11 C-4,9 -8,4 -8,0 C-8,-4 -4,-9 0,-9 Z"
                  fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.12" />
                <path d="M0,10 C2,14 6,16 4,11" fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.1" />
              </g>
            ))}
            {[20,55,90,125,160].map((y, i) => (
              <g key={`le${i}`} transform={`translate(10,${y}) rotate(${i%2===0?-90:90})`}>
                <path d="M0,-9 C4,-9 8,-4 8,0 C8,4 4,9 0,11 C-4,9 -8,4 -8,0 C-8,-4 -4,-9 0,-9 Z"
                  fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.12" />
              </g>
            ))}
            {[20,55,90,125,160].map((y, i) => (
              <g key={`re${i}`} transform={`translate(170,${y}) rotate(${i%2===0?90:-90})`}>
                <path d="M0,-9 C4,-9 8,-4 8,0 C8,4 4,9 0,11 C-4,9 -8,4 -8,0 C-8,-4 -4,-9 0,-9 Z"
                  fill="none" stroke="#c8b880" strokeWidth="0.8" opacity="0.12" />
              </g>
            ))}

            {/* PEARL DOTS */}
            {Array.from({length:22},(_,i)=>i*9).map((x,i)=>(
              <circle key={`pt${i}`} cx={x} cy="3" r="1.2" fill="#c8b880" opacity="0.1" />
            ))}
            {Array.from({length:22},(_,i)=>i*9).map((x,i)=>(
              <circle key={`pb${i}`} cx={x} cy="177" r="1.2" fill="#c8b880" opacity="0.1" />
            ))}

            {/* DIAMOND ACCENTS */}
            {[[90,18],[162,90],[90,162],[18,90],[90,54],[126,90],[90,126],[54,90]].map(([x,y],i)=>(
              <rect key={`d${i}`} x={x-3} y={y-3} width="6" height="6"
                transform={`rotate(45 ${x} ${y})`} fill="#c8b880" opacity="0.1" />
            ))}

            {/* CENTER MINI OUTLINES */}
            {[[90,90,0],[60,30,45],[120,30,-45],[60,150,-45],[120,150,45]].map(([x,y,rot],i)=>(
              <g key={`mf${i}`} transform={`translate(${x},${y}) rotate(${rot}) scale(0.3)`}>
                <path d="M0,-34 C16,-34 30,-20 30,0 C30,18 14,34 0,44 C-14,34 -30,18 -30,0 C-30,-20 -16,-34 0,-34 Z"
                  fill="none" stroke="#b8a870" strokeWidth="1.5" opacity="0.1" />
                <path d="M0,36 C6,46 17,50 13,41" fill="none" stroke="#b8a870" strokeWidth="1" opacity="0.1" />
              </g>
            ))}

          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bandana)" />
      </svg>
    </div>
  )
}
