type Props = {
  variant?: 'full' | 'wordmark'
  size?: number
}

export default function HollerLogo({ variant = 'full', size }: Props) {
  if (variant === 'wordmark') {
    return (
      <span style={{
        fontFamily: "'Teko', sans-serif",
        fontSize: size ?? 48,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: '#e09030',
        lineHeight: 1,
        display: 'inline-block',
      }}>
        HOLLER
      </span>
    )
  }

  const svgProps = size
    ? { width: size, height: Math.round(size * (270 / 520)) }
    : { width: '100%', height: 'auto' }

  return (
    <svg
      viewBox="0 0 520 270"
      {...svgProps}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Holler"
      style={{ display: 'block' }}
    >
      {/* Background */}
      <rect width="520" height="270" fill="#1e1508"/>

      {/* Dark border bands */}
      <rect x="0"   y="0"   width="520" height="28"  fill="#120d04"/>
      <rect x="0"   y="242" width="520" height="28"  fill="#120d04"/>
      <rect x="0"   y="0"   width="28"  height="270" fill="#120d04"/>
      <rect x="492" y="0"   width="28"  height="270" fill="#120d04"/>

      {/* Corner diamonds */}
      <polygon points="14,4 24,14 14,24 4,14"   fill="#a07830"/>
      <polygon points="506,4 516,14 506,24 496,14" fill="#a07830"/>
      <polygon points="14,246 24,256 14,266 4,256"   fill="#a07830"/>
      <polygon points="506,246 516,256 506,266 496,256" fill="#a07830"/>

      {/* Top border diamonds */}
      {[44,68,92,116,140,164,188,212,236,260,284,308,332,356,380,404,428,452,476].map(x => (
        <polygon key={`t${x}`} points={`${x},7 ${x+7},14 ${x},21 ${x-7},14`} fill="#6b4e20"/>
      ))}
      {[56,80,104,128,152,176,200,224,248,272,296,320,344,368,392,416,440,464].map(x => (
        <polygon key={`ts${x}`} points={`${x},11 ${x+3},14 ${x},17 ${x-3},14`} fill="#3d2c10"/>
      ))}

      {/* Bottom border diamonds */}
      {[44,68,92,116,140,164,188,212,236,260,284,308,332,356,380,404,428,452,476].map(x => (
        <polygon key={`b${x}`} points={`${x},249 ${x+7},256 ${x},263 ${x-7},256`} fill="#6b4e20"/>
      ))}
      {[56,80,104,128,152,176,200,224,248,272,296,320,344,368,392,416,440,464].map(x => (
        <polygon key={`bs${x}`} points={`${x},253 ${x+3},256 ${x},259 ${x-3},256`} fill="#3d2c10"/>
      ))}

      {/* Left border diamonds */}
      {[44,68,92,116,140,164,188,212].map(y => (
        <polygon key={`l${y}`} points={`14,${y} 21,${y+7} 14,${y+14} 7,${y+7}`} fill="#6b4e20"/>
      ))}
      {[58,82,106,130,154,178,202].map(y => (
        <polygon key={`ls${y}`} points={`14,${y} 17,${y+3} 14,${y+6} 11,${y+3}`} fill="#3d2c10"/>
      ))}

      {/* Right border diamonds */}
      {[44,68,92,116,140,164,188,212].map(y => (
        <polygon key={`r${y}`} points={`506,${y} 513,${y+7} 506,${y+14} 499,${y+7}`} fill="#6b4e20"/>
      ))}
      {[58,82,106,130,154,178,202].map(y => (
        <polygon key={`rs${y}`} points={`506,${y} 509,${y+3} 506,${y+6} 503,${y+3}`} fill="#3d2c10"/>
      ))}

      {/* Inner border lines */}
      <rect x="0" y="0" width="520" height="270" fill="none" stroke="#6b4e20" strokeWidth="1.5"/>
      <rect x="28" y="28" width="464" height="214" fill="none" stroke="#3d2c10" strokeWidth="0.75"/>
      <line x1="48" y1="65"  x2="472" y2="65"  stroke="#3d2c10" strokeWidth="0.5"/>
      <line x1="48" y1="215" x2="472" y2="215" stroke="#3d2c10" strokeWidth="0.5"/>

      {/* Side stars */}
      <text x="60"  y="152" textAnchor="middle" fontFamily="serif" fontSize="18" fill="#6b4e20">✦</text>
      <text x="460" y="152" textAnchor="middle" fontFamily="serif" fontSize="18" fill="#6b4e20">✦</text>

      {/* HOLLER text — SVG text, no foreignObject */}
      <text
        x="260"
        y="200"
        textAnchor="middle"
        fontFamily="Teko, sans-serif"
        fontWeight="600"
        fontSize="158"
        fill="#e09030"
        letterSpacing="2"
      >
        HOLLER
      </text>
    </svg>
  )
}
