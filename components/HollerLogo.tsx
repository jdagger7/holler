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

  // Content area: x 36-484, y 36-234
  // Text area between rules: y 64 to y 214, center = 139
  // Teko at fontSize 130: cap height ~90px, so baseline = 139 + 45 = 184
  // Stars sit at y center of side bands inside content: x ~55 and ~465

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
      <polygon points="14,4 24,14 14,24 4,14"           fill="#a07830"/>
      <polygon points="506,4 516,14 506,24 496,14"      fill="#a07830"/>
      <polygon points="14,246 24,256 14,266 4,256"      fill="#a07830"/>
      <polygon points="506,246 516,256 506,266 496,256" fill="#a07830"/>

      {/* Top border diamonds — large */}
      {[44,68,92,116,140,164,188,212,236,260,284,308,332,356,380,404,428,452,476].map(x => (
        <polygon key={`t${x}`} points={`${x},7 ${x+7},14 ${x},21 ${x-7},14`} fill="#6b4e20"/>
      ))}
      {/* Top border diamonds — small */}
      {[56,80,104,128,152,176,200,224,248,272,296,320,344,368,392,416,440,464].map(x => (
        <polygon key={`ts${x}`} points={`${x},11 ${x+3},14 ${x},17 ${x-3},14`} fill="#3d2c10"/>
      ))}

      {/* Bottom border diamonds — large */}
      {[44,68,92,116,140,164,188,212,236,260,284,308,332,356,380,404,428,452,476].map(x => (
        <polygon key={`b${x}`} points={`${x},249 ${x+7},256 ${x},263 ${x-7},256`} fill="#6b4e20"/>
      ))}
      {/* Bottom border diamonds — small */}
      {[56,80,104,128,152,176,200,224,248,272,296,320,344,368,392,416,440,464].map(x => (
        <polygon key={`bs${x}`} points={`${x},253 ${x+3},256 ${x},259 ${x-3},256`} fill="#3d2c10"/>
      ))}

      {/* Left border diamonds — large */}
      {[44,68,92,116,140,164,188,212].map(y => (
        <polygon key={`l${y}`} points={`14,${y} 21,${y+7} 14,${y+14} 7,${y+7}`} fill="#6b4e20"/>
      ))}
      {/* Left border diamonds — small */}
      {[58,82,106,130,154,178,202].map(y => (
        <polygon key={`ls${y}`} points={`14,${y} 17,${y+3} 14,${y+6} 11,${y+3}`} fill="#3d2c10"/>
      ))}

      {/* Right border diamonds — large */}
      {[44,68,92,116,140,164,188,212].map(y => (
        <polygon key={`r${y}`} points={`506,${y} 513,${y+7} 506,${y+14} 499,${y+7}`} fill="#6b4e20"/>
      ))}
      {/* Right border diamonds — small */}
      {[58,82,106,130,154,178,202].map(y => (
        <polygon key={`rs${y}`} points={`506,${y} 509,${y+3} 506,${y+6} 503,${y+3}`} fill="#3d2c10"/>
      ))}

      {/* Outer border */}
      <rect x="0" y="0" width="520" height="270" fill="none" stroke="#6b4e20" strokeWidth="1.5"/>
      {/* Inner frame */}
      <rect x="32" y="32" width="456" height="206" fill="none" stroke="#3d2c10" strokeWidth="0.75"/>
      {/* Horizontal rules above and below text */}
      <line x1="52" y1="66"  x2="468" y2="66"  stroke="#3d2c10" strokeWidth="0.75"/>
      <line x1="52" y1="210" x2="468" y2="210" stroke="#3d2c10" strokeWidth="0.75"/>

      {/* Stars — inside content area, flanking the text */}
      <text x="58"  y="143" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#6b4e20">✦</text>
      <text x="462" y="143" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#6b4e20">✦</text>

      {/* HOLLER text
          viewBox height of text area: 66 to 210 = 144px
          Teko fontSize 130 — ascender ~100px above baseline
          To center: midpoint = 138, baseline = 138 + (130 * 0.35) ≈ 184
      */}
      <text
        x="260"
        y="175"
        textAnchor="middle"
        fontFamily="'Teko', sans-serif"
        fontWeight="600"
        fontSize="130"
        fill="#e09030"
      >
        HOLLER
      </text>
    </svg>
  )
}
