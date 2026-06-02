type Props = {
  variant?: 'full' | 'wordmark'
  size?: number
}

export default function HollerLogo({ variant = 'full', size }: Props) {
  if (variant === 'wordmark') {
    return (
      <svg
        viewBox="0 0 300 72"
        width={size ? size * (300 / 72) : 300}
        height={size ?? 72}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Holler"
      >
        <defs>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=Teko:wght@500&display=swap');`}</style>
        </defs>
        <text
          x="150" y="60"
          textAnchor="middle"
          fontFamily="'Teko', sans-serif"
          fontSize="60"
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
  // ViewBox: 520 wide x 270 tall (tighter vertically than before)
  const w = size ?? 480
  const h = Math.round(w * (270 / 520))

  return (
    <svg
      viewBox="0 0 520 270"
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
        <clipPath id="logoClip"><rect x="0" y="0" width="520" height="270"/></clipPath>
      </defs>

      <rect width="520" height="270" fill="#191108"/>
      <rect width="520" height="270" fill="url(#hatch)" opacity="0.45"/>

      <g clipPath="url(#logoClip)">
        {/* Border strip backgrounds */}
        <rect x="0"   y="0"   width="520" height="28" fill="#111009"/>
        <rect x="0"   y="242" width="520" height="28" fill="#111009"/>
        <rect x="0"   y="0"   width="28"  height="270" fill="#111009"/>
        <rect x="492" y="0"   width="28"  height="270" fill="#111009"/>

        {/* TOP LARGE diamonds — centered, 20px padding each side, y center=14 */}
        <g fill="#7a5a22">
          <polygon points="20,7 27,14 20,21 13,14"/>
          <polygon points="44,7 51,14 44,21 37,14"/>
          <polygon points="68,7 75,14 68,21 61,14"/>
          <polygon points="92,7 99,14 92,21 85,14"/>
          <polygon points="116,7 123,14 116,21 109,14"/>
          <polygon points="140,7 147,14 140,21 133,14"/>
          <polygon points="164,7 171,14 164,21 157,14"/>
          <polygon points="188,7 195,14 188,21 181,14"/>
          <polygon points="212,7 219,14 212,21 205,14"/>
          <polygon points="236,7 243,14 236,21 229,14"/>
          <polygon points="260,7 267,14 260,21 253,14"/>
          <polygon points="284,7 291,14 284,21 277,14"/>
          <polygon points="308,7 315,14 308,21 301,14"/>
          <polygon points="332,7 339,14 332,21 325,14"/>
          <polygon points="356,7 363,14 356,21 349,14"/>
          <polygon points="380,7 387,14 380,21 373,14"/>
          <polygon points="404,7 411,14 404,21 397,14"/>
          <polygon points="428,7 435,14 428,21 421,14"/>
          <polygon points="452,7 459,14 452,21 445,14"/>
          <polygon points="476,7 483,14 476,21 469,14"/>
          <polygon points="500,7 507,14 500,21 493,14"/>
        </g>
        {/* TOP SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="32,11 35,14 32,17 29,14"/>
          <polygon points="56,11 59,14 56,17 53,14"/>
          <polygon points="80,11 83,14 80,17 77,14"/>
          <polygon points="104,11 107,14 104,17 101,14"/>
          <polygon points="128,11 131,14 128,17 125,14"/>
          <polygon points="152,11 155,14 152,17 149,14"/>
          <polygon points="176,11 179,14 176,17 173,14"/>
          <polygon points="200,11 203,14 200,17 197,14"/>
          <polygon points="224,11 227,14 224,17 221,14"/>
          <polygon points="248,11 251,14 248,17 245,14"/>
          <polygon points="272,11 275,14 272,17 269,14"/>
          <polygon points="296,11 299,14 296,17 293,14"/>
          <polygon points="320,11 323,14 320,17 317,14"/>
          <polygon points="344,11 347,14 344,17 341,14"/>
          <polygon points="368,11 371,14 368,17 365,14"/>
          <polygon points="392,11 395,14 392,17 389,14"/>
          <polygon points="416,11 419,14 416,17 413,14"/>
          <polygon points="440,11 443,14 440,17 437,14"/>
          <polygon points="464,11 467,14 464,17 461,14"/>
          <polygon points="488,11 491,14 488,17 485,14"/>
        </g>

        {/* BOTTOM LARGE diamonds — y center=256 */}
        <g fill="#7a5a22">
          <polygon points="20,249 27,256 20,263 13,256"/>
          <polygon points="44,249 51,256 44,263 37,256"/>
          <polygon points="68,249 75,256 68,263 61,256"/>
          <polygon points="92,249 99,256 92,263 85,256"/>
          <polygon points="116,249 123,256 116,263 109,256"/>
          <polygon points="140,249 147,256 140,263 133,256"/>
          <polygon points="164,249 171,256 164,263 157,256"/>
          <polygon points="188,249 195,256 188,263 181,256"/>
          <polygon points="212,249 219,256 212,263 205,256"/>
          <polygon points="236,249 243,256 236,263 229,256"/>
          <polygon points="260,249 267,256 260,263 253,256"/>
          <polygon points="284,249 291,256 284,263 277,256"/>
          <polygon points="308,249 315,256 308,263 301,256"/>
          <polygon points="332,249 339,256 332,263 325,256"/>
          <polygon points="356,249 363,256 356,263 349,256"/>
          <polygon points="380,249 387,256 380,263 373,256"/>
          <polygon points="404,249 411,256 404,263 397,256"/>
          <polygon points="428,249 435,256 428,263 421,256"/>
          <polygon points="452,249 459,256 452,263 445,256"/>
          <polygon points="476,249 483,256 476,263 469,256"/>
          <polygon points="500,249 507,256 500,263 493,256"/>
        </g>
        {/* BOTTOM SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="32,253 35,256 32,259 29,256"/>
          <polygon points="56,253 59,256 56,259 53,256"/>
          <polygon points="80,253 83,256 80,259 77,256"/>
          <polygon points="104,253 107,256 104,259 101,256"/>
          <polygon points="128,253 131,256 128,259 125,256"/>
          <polygon points="152,253 155,256 152,259 149,256"/>
          <polygon points="176,253 179,256 176,259 173,256"/>
          <polygon points="200,253 203,256 200,259 197,256"/>
          <polygon points="224,253 227,256 224,259 221,256"/>
          <polygon points="248,253 251,256 248,259 245,256"/>
          <polygon points="272,253 275,256 272,259 269,256"/>
          <polygon points="296,253 299,256 296,259 293,256"/>
          <polygon points="320,253 323,256 320,259 317,256"/>
          <polygon points="344,253 347,256 344,259 341,256"/>
          <polygon points="368,253 371,256 368,259 365,256"/>
          <polygon points="392,253 395,256 392,259 389,256"/>
          <polygon points="416,253 419,256 416,259 413,256"/>
          <polygon points="440,253 443,256 440,259 437,256"/>
          <polygon points="464,253 467,256 464,259 461,256"/>
          <polygon points="488,253 491,256 488,259 485,256"/>
        </g>

        {/* LEFT LARGE diamonds (cx=14), y: 42,66,90,114,138,162,186,210 */}
        <g fill="#7a5a22">
          <polygon points="14,35 21,42 14,49 7,42"/>
          <polygon points="14,59 21,66 14,73 7,66"/>
          <polygon points="14,83 21,90 14,97 7,90"/>
          <polygon points="14,107 21,114 14,121 7,114"/>
          <polygon points="14,131 21,138 14,145 7,138"/>
          <polygon points="14,155 21,162 14,169 7,162"/>
          <polygon points="14,179 21,186 14,193 7,186"/>
          <polygon points="14,203 21,210 14,217 7,210"/>
        </g>
        {/* LEFT SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="14,47 17,50 14,53 11,50"/>
          <polygon points="14,71 17,74 14,77 11,74"/>
          <polygon points="14,95 17,98 14,101 11,98"/>
          <polygon points="14,119 17,122 14,125 11,122"/>
          <polygon points="14,143 17,146 14,149 11,146"/>
          <polygon points="14,167 17,170 14,173 11,170"/>
          <polygon points="14,191 17,194 14,197 11,194"/>
        </g>

        {/* RIGHT LARGE diamonds (cx=506) */}
        <g fill="#7a5a22">
          <polygon points="506,35 513,42 506,49 499,42"/>
          <polygon points="506,59 513,66 506,73 499,66"/>
          <polygon points="506,83 513,90 506,97 499,90"/>
          <polygon points="506,107 513,114 506,121 499,114"/>
          <polygon points="506,131 513,138 506,145 499,138"/>
          <polygon points="506,155 513,162 506,169 499,162"/>
          <polygon points="506,179 513,186 506,193 499,186"/>
          <polygon points="506,203 513,210 506,217 499,210"/>
        </g>
        {/* RIGHT SMALL diamonds */}
        <g fill="#3d2c10">
          <polygon points="506,47 509,50 506,53 503,50"/>
          <polygon points="506,71 509,74 506,77 503,74"/>
          <polygon points="506,95 509,98 506,101 503,98"/>
          <polygon points="506,119 509,122 506,125 503,122"/>
          <polygon points="506,143 509,146 506,149 503,146"/>
          <polygon points="506,167 509,170 506,173 503,170"/>
          <polygon points="506,191 509,194 506,197 503,194"/>
        </g>
      </g>

      {/* Outer border */}
      <rect x="0" y="0" width="520" height="270" fill="none" stroke="#4a3518" strokeWidth="1.5"/>
      {/* Inner border */}
      <rect x="28" y="28" width="464" height="214" fill="none" stroke="#2e200a" strokeWidth="0.75"/>

      {/* Thin rules flanking wordmark */}
      <line x1="48" y1="62" x2="472" y2="62" stroke="#2e200a" strokeWidth="0.5"/>
      <line x1="48" y1="218" x2="472" y2="218" stroke="#2e200a" strokeWidth="0.5"/>

      {/* Star accents */}
      <text x="75" y="145" textAnchor="middle" fontFamily="serif" fontSize="15" fill="#4a3518">✦</text>
      <text x="445" y="145" textAnchor="middle" fontFamily="serif" fontSize="15" fill="#4a3518">✦</text>

      {/* HOLLER wordmark */}
      <text
        x="260" y="196"
        textAnchor="middle"
        fontFamily="'Teko', sans-serif"
        fontSize="158" fontWeight="500"
        letterSpacing="-1"
        fill="#c87d22"
      >
        HOLLER
      </text>
    </svg>
  )
}
