type Props = {
  variant?: 'full' | 'wordmark'
  size?: number
}

export default function HollerLogo({ variant = 'full', size }: Props) {
  if (variant === 'wordmark') {
    const fontSize = size ?? 48
    return (
      <svg
        viewBox="0 0 300 80"
        width={size ? size * (300 / 80) : 300}
        height={size ?? 80}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Holler"
      >
        <defs>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@500&display=swap');`}</style>
        </defs>
        <text
          x="150"
          y="66"
          textAnchor="middle"
          fontFamily="'Teko', sans-serif"
          fontSize={fontSize}
          fontWeight="500"
          letterSpacing="-1"
          fill="#c87d22"
        >
          HOLLER
        </text>
      </svg>
    )
  }

  // full variant — framed woodblock logo
  const w = size ?? 520
  const h = Math.round(w * (320 / 520))

  return (
    <svg
      viewBox="0 0 520 320"
      width={w}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Holler"
    >
      <defs>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@500&display=swap');`}</style>
        <pattern id="hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <line x1="0" y1="6" x2="6" y2="0" stroke="#2a1e0a" strokeWidth="0.4" opacity="0.6"/>
        </pattern>
        <clipPath id="cardClip"><rect x="0" y="0" width="520" height="320"/></clipPath>
      </defs>

      <rect width="520" height="320" fill="#191108"/>
      <rect width="520" height="320" fill="url(#hatch)" opacity="0.45"/>

      <g clipPath="url(#cardClip)">
        {/* Border strip backgrounds */}
        <rect x="0"   y="0"   width="520" height="30" fill="#111009"/>
        <rect x="0"   y="290" width="520" height="30" fill="#111009"/>
        <rect x="0"   y="0"   width="30"  height="320" fill="#111009"/>
        <rect x="490" y="0"   width="30"  height="320" fill="#111009"/>

        {/* TOP LARGE diamonds — centered, 20px padding each side */}
        <g fill="#7a5a22">
          <polygon points="20,8 27,15 20,22 13,15"/><polygon points="44,8 51,15 44,22 37,15"/>
          <polygon points="68,8 75,15 68,22 61,15"/><polygon points="92,8 99,15 92,22 85,15"/>
          <polygon points="116,8 123,15 116,22 109,15"/><polygon points="140,8 147,15 140,22 133,15"/>
          <polygon points="164,8 171,15 164,22 157,15"/><polygon points="188,8 195,15 188,22 181,15"/>
          <polygon points="212,8 219,15 212,22 205,15"/><polygon points="236,8 243,15 236,22 229,15"/>
          <polygon points="260,8 267,15 260,22 253,15"/><polygon points="284,8 291,15 284,22 277,15"/>
          <polygon points="308,8 315,15 308,22 301,15"/><polygon points="332,8 339,15 332,22 325,15"/>
          <polygon points="356,8 363,15 356,22 349,15"/><polygon points="380,8 387,15 380,22 373,15"/>
          <polygon points="404,8 411,15 404,22 397,15"/><polygon points="428,8 435,15 428,22 421,15"/>
          <polygon points="452,8 459,15 452,22 445,15"/><polygon points="476,8 483,15 476,22 469,15"/>
          <polygon points="500,8 507,15 500,22 493,15"/>
        </g>
        {/* TOP SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="32,12 35,15 32,18 29,15"/><polygon points="56,12 59,15 56,18 53,15"/>
          <polygon points="80,12 83,15 80,18 77,15"/><polygon points="104,12 107,15 104,18 101,15"/>
          <polygon points="128,12 131,15 128,18 125,15"/><polygon points="152,12 155,15 152,18 149,15"/>
          <polygon points="176,12 179,15 176,18 173,15"/><polygon points="200,12 203,15 200,18 197,15"/>
          <polygon points="224,12 227,15 224,18 221,15"/><polygon points="248,12 251,15 248,18 245,15"/>
          <polygon points="272,12 275,15 272,18 269,15"/><polygon points="296,12 299,15 296,18 293,15"/>
          <polygon points="320,12 323,15 320,18 317,15"/><polygon points="344,12 347,15 344,18 341,15"/>
          <polygon points="368,12 371,15 368,18 365,15"/><polygon points="392,12 395,15 392,18 389,15"/>
          <polygon points="416,12 419,15 416,18 413,15"/><polygon points="440,12 443,15 440,18 437,15"/>
          <polygon points="464,12 467,15 464,18 461,15"/><polygon points="488,12 491,15 488,18 485,15"/>
        </g>

        {/* BOTTOM LARGE diamonds */}
        <g fill="#7a5a22">
          <polygon points="20,298 27,305 20,312 13,305"/><polygon points="44,298 51,305 44,312 37,305"/>
          <polygon points="68,298 75,305 68,312 61,305"/><polygon points="92,298 99,305 92,312 85,305"/>
          <polygon points="116,298 123,305 116,312 109,305"/><polygon points="140,298 147,305 140,312 133,305"/>
          <polygon points="164,298 171,305 164,312 157,305"/><polygon points="188,298 195,305 188,312 181,305"/>
          <polygon points="212,298 219,305 212,312 205,305"/><polygon points="236,298 243,305 236,312 229,305"/>
          <polygon points="260,298 267,305 260,312 253,305"/><polygon points="284,298 291,305 284,312 277,305"/>
          <polygon points="308,298 315,305 308,312 301,305"/><polygon points="332,298 339,305 332,312 325,305"/>
          <polygon points="356,298 363,305 356,312 349,305"/><polygon points="380,298 387,305 380,312 373,305"/>
          <polygon points="404,298 411,305 404,312 397,305"/><polygon points="428,298 435,305 428,312 421,305"/>
          <polygon points="452,298 459,305 452,312 445,305"/><polygon points="476,298 483,305 476,312 469,305"/>
          <polygon points="500,298 507,305 500,312 493,305"/>
        </g>
        {/* BOTTOM SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="32,302 35,305 32,308 29,305"/><polygon points="56,302 59,305 56,308 53,305"/>
          <polygon points="80,302 83,305 80,308 77,305"/><polygon points="104,302 107,305 104,308 101,305"/>
          <polygon points="128,302 131,305 128,308 125,305"/><polygon points="152,302 155,305 152,308 149,305"/>
          <polygon points="176,302 179,305 176,308 173,305"/><polygon points="200,302 203,305 200,308 197,305"/>
          <polygon points="224,302 227,305 224,308 221,305"/><polygon points="248,302 251,305 248,308 245,305"/>
          <polygon points="272,302 275,305 272,308 269,305"/><polygon points="296,302 299,305 296,308 293,305"/>
          <polygon points="320,302 323,305 320,308 317,305"/><polygon points="344,302 347,305 344,308 341,305"/>
          <polygon points="368,302 371,305 368,308 365,305"/><polygon points="392,302 395,305 392,308 389,305"/>
          <polygon points="416,302 419,305 416,308 413,305"/><polygon points="440,302 443,305 440,308 437,305"/>
          <polygon points="464,302 467,305 464,308 461,305"/><polygon points="488,302 491,305 488,308 485,305"/>
        </g>

        {/* LEFT LARGE diamonds (cx=15) */}
        <g fill="#7a5a22">
          <polygon points="15,35 22,42 15,49 8,42"/><polygon points="15,59 22,66 15,73 8,66"/>
          <polygon points="15,83 22,90 15,97 8,90"/><polygon points="15,107 22,114 15,121 8,114"/>
          <polygon points="15,131 22,138 15,145 8,138"/><polygon points="15,155 22,162 15,169 8,162"/>
          <polygon points="15,179 22,186 15,193 8,186"/><polygon points="15,203 22,210 15,217 8,210"/>
          <polygon points="15,227 22,234 15,241 8,234"/><polygon points="15,251 22,258 15,265 8,258"/>
          <polygon points="15,275 22,282 15,289 8,282"/>
        </g>
        {/* LEFT SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="15,51 18,54 15,57 12,54"/><polygon points="15,75 18,78 15,81 12,78"/>
          <polygon points="15,99 18,102 15,105 12,102"/><polygon points="15,123 18,126 15,129 12,126"/>
          <polygon points="15,147 18,150 15,153 12,150"/><polygon points="15,171 18,174 15,177 12,174"/>
          <polygon points="15,195 18,198 15,201 12,198"/><polygon points="15,219 18,222 15,225 12,222"/>
          <polygon points="15,243 18,246 15,249 12,246"/><polygon points="15,267 18,270 15,273 12,270"/>
        </g>

        {/* RIGHT LARGE diamonds (cx=505) */}
        <g fill="#7a5a22">
          <polygon points="505,35 512,42 505,49 498,42"/><polygon points="505,59 512,66 505,73 498,66"/>
          <polygon points="505,83 512,90 505,97 498,90"/><polygon points="505,107 512,114 505,121 498,114"/>
          <polygon points="505,131 512,138 505,145 498,138"/><polygon points="505,155 512,162 505,169 498,162"/>
          <polygon points="505,179 512,186 505,193 498,186"/><polygon points="505,203 512,210 505,217 498,210"/>
          <polygon points="505,227 512,234 505,241 498,234"/><polygon points="505,251 512,258 505,265 498,258"/>
          <polygon points="505,275 512,282 505,289 498,282"/>
        </g>
        {/* RIGHT SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="505,51 508,54 505,57 502,54"/><polygon points="505,75 508,78 505,81 502,78"/>
          <polygon points="505,99 508,102 505,105 502,102"/><polygon points="505,123 508,126 505,129 502,126"/>
          <polygon points="505,147 508,150 505,153 502,150"/><polygon points="505,171 508,174 505,177 502,174"/>
          <polygon points="505,195 508,198 505,201 502,198"/><polygon points="505,219 508,222 505,225 502,222"/>
          <polygon points="505,243 508,246 505,249 502,246"/><polygon points="505,267 508,270 505,273 502,270"/>
        </g>
      </g>

      {/* Outer border */}
      <rect x="0" y="0" width="520" height="320" fill="none" stroke="#4a3518" strokeWidth="1.5"/>
      {/* Inner border */}
      <rect x="30" y="30" width="460" height="260" fill="none" stroke="#2e200a" strokeWidth="0.75"/>

      {/* Thin rules */}
      <line x1="50" y1="70" x2="470" y2="70" stroke="#2e200a" strokeWidth="0.5"/>
      <line x1="50" y1="255" x2="470" y2="255" stroke="#2e200a" strokeWidth="0.5"/>

      {/* Star accents */}
      <text x="80" y="168" textAnchor="middle" fontFamily="serif" fontSize="16" fill="#4a3518">✦</text>
      <text x="440" y="168" textAnchor="middle" fontFamily="serif" fontSize="16" fill="#4a3518">✦</text>

      {/* HOLLER wordmark */}
      <text
        x="260" y="222"
        textAnchor="middle"
        fontFamily="'Teko', sans-serif"
        fontSize="172" fontWeight="500"
        letterSpacing="-1"
        fill="#c87d22"
      >
        HOLLER
      </text>
    </svg>
  )
}
