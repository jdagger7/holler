type Props = {
  variant?: 'full' | 'wordmark'
  size?: number
}

export default function HollerLogo({ variant = 'full', size }: Props) {
  if (variant === 'wordmark') {
    return (
      <div style={{
        fontFamily: "'Teko', sans-serif",
        fontSize: size ?? 48,
        fontWeight: 500,
        letterSpacing: '-0.5px',
        color: '#c87d22',
        lineHeight: 1,
      }}>
        HOLLER
      </div>
    )
  }

  const w = size ?? 480
  const h = Math.round(w * (270 / 520))

  return (
    <svg
      viewBox="0 0 520 270"
      width={w}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-label="Holler"
      style={{ display: 'block' }}
    >
      <defs>
        <pattern id="hatch" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <line x1="0" y1="6" x2="6" y2="0" stroke="#2a1e0a" strokeWidth="0.4" opacity="0.6"/>
        </pattern>
        <clipPath id="logoClip"><rect x="0" y="0" width="520" height="270"/></clipPath>
      </defs>

      <rect width="520" height="270" fill="#191108"/>
      <rect width="520" height="270" fill="url(#hatch)" opacity="0.45"/>

      <g clipPath="url(#logoClip)">
        <rect x="0"   y="0"   width="520" height="28" fill="#111009"/>
        <rect x="0"   y="242" width="520" height="28" fill="#111009"/>
        <rect x="0"   y="0"   width="28"  height="270" fill="#111009"/>
        <rect x="492" y="0"   width="28"  height="270" fill="#111009"/>

        {/* CORNERS */}
        <g fill="#8a6830">
          <polygon points="14,4 24,14 14,24 4,14"/>
          <polygon points="506,4 516,14 506,24 496,14"/>
          <polygon points="14,246 24,256 14,266 4,256"/>
          <polygon points="506,246 516,256 506,266 496,256"/>
        </g>

        {/* TOP LARGE */}
        <g fill="#7a5a22">
          <polygon points="44,7 51,14 44,21 37,14"/><polygon points="68,7 75,14 68,21 61,14"/>
          <polygon points="92,7 99,14 92,21 85,14"/><polygon points="116,7 123,14 116,21 109,14"/>
          <polygon points="140,7 147,14 140,21 133,14"/><polygon points="164,7 171,14 164,21 157,14"/>
          <polygon points="188,7 195,14 188,21 181,14"/><polygon points="212,7 219,14 212,21 205,14"/>
          <polygon points="236,7 243,14 236,21 229,14"/><polygon points="260,7 267,14 260,21 253,14"/>
          <polygon points="284,7 291,14 284,21 277,14"/><polygon points="308,7 315,14 308,21 301,14"/>
          <polygon points="332,7 339,14 332,21 325,14"/><polygon points="356,7 363,14 356,21 349,14"/>
          <polygon points="380,7 387,14 380,21 373,14"/><polygon points="404,7 411,14 404,21 397,14"/>
          <polygon points="428,7 435,14 428,21 421,14"/><polygon points="452,7 459,14 452,21 445,14"/>
          <polygon points="476,7 483,14 476,21 469,14"/>
        </g>
        <g fill="#3d2c10">
          <polygon points="56,11 59,14 56,17 53,14"/><polygon points="80,11 83,14 80,17 77,14"/>
          <polygon points="104,11 107,14 104,17 101,14"/><polygon points="128,11 131,14 128,17 125,14"/>
          <polygon points="152,11 155,14 152,17 149,14"/><polygon points="176,11 179,14 176,17 173,14"/>
          <polygon points="200,11 203,14 200,17 197,14"/><polygon points="224,11 227,14 224,17 221,14"/>
          <polygon points="248,11 251,14 248,17 245,14"/><polygon points="272,11 275,14 272,17 269,14"/>
          <polygon points="296,11 299,14 296,17 293,14"/><polygon points="320,11 323,14 320,17 317,14"/>
          <polygon points="344,11 347,14 344,17 341,14"/><polygon points="368,11 371,14 368,17 365,14"/>
          <polygon points="392,11 395,14 392,17 389,14"/><polygon points="416,11 419,14 416,17 413,14"/>
          <polygon points="440,11 443,14 440,17 437,14"/><polygon points="464,11 467,14 464,17 461,14"/>
        </g>

        {/* BOTTOM LARGE */}
        <g fill="#7a5a22">
          <polygon points="44,249 51,256 44,263 37,256"/><polygon points="68,249 75,256 68,263 61,256"/>
          <polygon points="92,249 99,256 92,263 85,256"/><polygon points="116,249 123,256 116,263 109,256"/>
          <polygon points="140,249 147,256 140,263 133,256"/><polygon points="164,249 171,256 164,263 157,256"/>
          <polygon points="188,249 195,256 188,263 181,256"/><polygon points="212,249 219,256 212,263 205,256"/>
          <polygon points="236,249 243,256 236,263 229,256"/><polygon points="260,249 267,256 260,263 253,256"/>
          <polygon points="284,249 291,256 284,263 277,256"/><polygon points="308,249 315,256 308,263 301,256"/>
          <polygon points="332,249 339,256 332,263 325,256"/><polygon points="356,249 363,256 356,263 349,256"/>
          <polygon points="380,249 387,256 380,263 373,256"/><polygon points="404,249 411,256 404,263 397,256"/>
          <polygon points="428,249 435,256 428,263 421,256"/><polygon points="452,249 459,256 452,263 445,256"/>
          <polygon points="476,249 483,256 476,263 469,256"/>
        </g>
        <g fill="#3d2c10">
          <polygon points="56,253 59,256 56,259 53,256"/><polygon points="80,253 83,256 80,259 77,256"/>
          <polygon points="104,253 107,256 104,259 101,256"/><polygon points="128,253 131,256 128,259 125,256"/>
          <polygon points="152,253 155,256 152,259 149,256"/><polygon points="176,253 179,256 176,259 173,256"/>
          <polygon points="200,253 203,256 200,259 197,256"/><polygon points="224,253 227,256 224,259 221,256"/>
          <polygon points="248,253 251,256 248,259 245,256"/><polygon points="272,253 275,256 272,259 269,256"/>
          <polygon points="296,253 299,256 296,259 293,256"/><polygon points="320,253 323,256 320,259 317,256"/>
          <polygon points="344,253 347,256 344,259 341,256"/><polygon points="368,253 371,256 368,259 365,256"/>
          <polygon points="392,253 395,256 392,259 389,256"/><polygon points="416,253 419,256 416,259 413,256"/>
          <polygon points="440,253 443,256 440,259 437,256"/><polygon points="464,253 467,256 464,259 461,256"/>
        </g>

        {/* LEFT LARGE */}
        <g fill="#7a5a22">
          <polygon points="14,44 21,51 14,58 7,51"/><polygon points="14,68 21,75 14,82 7,75"/>
          <polygon points="14,92 21,99 14,106 7,99"/><polygon points="14,116 21,123 14,130 7,123"/>
          <polygon points="14,140 21,147 14,154 7,147"/><polygon points="14,164 21,171 14,178 7,171"/>
          <polygon points="14,188 21,195 14,202 7,195"/><polygon points="14,212 21,219 14,226 7,219"/>
        </g>
        <g fill="#3d2c10">
          <polygon points="14,60 17,63 14,66 11,63"/><polygon points="14,84 17,87 14,90 11,87"/>
          <polygon points="14,108 17,111 14,114 11,111"/><polygon points="14,132 17,135 14,138 11,135"/>
          <polygon points="14,156 17,159 14,162 11,159"/><polygon points="14,180 17,183 14,186 11,183"/>
          <polygon points="14,204 17,207 14,210 11,207"/>
        </g>

        {/* RIGHT LARGE */}
        <g fill="#7a5a22">
          <polygon points="506,44 513,51 506,58 499,51"/><polygon points="506,68 513,75 506,82 499,75"/>
          <polygon points="506,92 513,99 506,106 499,99"/><polygon points="506,116 513,123 506,130 499,123"/>
          <polygon points="506,140 513,147 506,154 499,147"/><polygon points="506,164 513,171 506,178 499,171"/>
          <polygon points="506,188 513,195 506,202 499,195"/><polygon points="506,212 513,219 506,226 499,219"/>
        </g>
        <g fill="#3d2c10">
          <polygon points="506,60 509,63 506,66 503,63"/><polygon points="506,84 509,87 506,90 503,87"/>
          <polygon points="506,108 509,111 506,114 503,111"/><polygon points="506,132 509,135 506,138 503,135"/>
          <polygon points="506,156 509,159 506,162 503,159"/><polygon points="506,180 509,183 506,186 503,183"/>
          <polygon points="506,204 509,207 506,210 503,207"/>
        </g>
      </g>

      {/* Borders and rules */}
      <rect x="0" y="0" width="520" height="270" fill="none" stroke="#4a3518" strokeWidth="1.5"/>
      <rect x="28" y="28" width="464" height="214" fill="none" stroke="#2e200a" strokeWidth="0.75"/>
      <line x1="48" y1="65" x2="472" y2="65" stroke="#2e200a" strokeWidth="0.5"/>
      <line x1="48" y1="215" x2="472" y2="215" stroke="#2e200a" strokeWidth="0.5"/>

      {/* Stars */}
      <text x="60" y="148" textAnchor="middle" fontFamily="serif" fontSize="20" fill="#6a4e20">✦</text>
      <text x="460" y="148" textAnchor="middle" fontFamily="serif" fontSize="20" fill="#6a4e20">✦</text>

      {/* Wordmark via foreignObject — uses page fonts, no SVG font loading issues */}
      <foreignObject x="48" y="68" width="424" height="148">
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Teko', sans-serif",
            fontSize: '148px',
            fontWeight: 500,
            color: '#c87d22',
            letterSpacing: '-1px',
            lineHeight: 1,
            overflow: 'hidden',
          }}
        >
          HOLLER
        </div>
      </foreignObject>
    </svg>
  )
}
