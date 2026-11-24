import type { ReactNode } from 'react'
import type { ArtKind, Product } from '@/types'

/**
 * Ilustrasi kemasan produk (SVG) — dipakai bila produk belum punya foto unggahan.
 * Tidak memakai logo merek asli; hanya bentuk kemasan dan warna.
 */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * (amt < 0 ? v : 255 - v))))
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function Art({ kind, color, accent }: { kind: ArtKind; color: string; accent: string }): ReactNode {
  const dark = shade(color, -0.28)
  const light = shade(color, 0.35)
  const shadow = <ellipse cx="60" cy="108" rx="30" ry="4.5" fill="#000" opacity="0.16" />
  switch (kind) {
    case 'noodle':
      return (
        <g>
          {shadow}
          <rect x="22" y="26" width="76" height="78" rx="5" fill={color} />
          <path d="M22 26h76v7H22z M22 97h76v7H22z" fill={dark} />
          {Array.from({ length: 13 }).map((_, i) => (
            <path key={i} d={`M${24 + i * 6} 26v7`} stroke={shade(color, -0.45)} strokeWidth="1" opacity="0.55" />
          ))}
          <rect x="22" y="48" width="76" height="30" fill={accent} />
          <circle cx="60" cy="63" r="19" fill="#FFF6E0" />
          <path d="M46 63c4-9 24-9 28 0-5 8-23 8-28 0z" fill={shade('#C98B4B', 0)} />
          <path d="M50 60c3-4 17-4 20 0M50 66c3 3 17 3 20 0" stroke="#7a4a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <rect x="30" y="38" width="60" height="6" rx="3" fill="#fff" opacity="0.9" />
          <path d="M26 30l6 66" stroke="#fff" opacity="0.18" strokeWidth="5" />
        </g>
      )
    case 'bottle':
    case 'bigbottle': {
      const big = kind === 'bigbottle'
      const top = big ? 10 : 18
      return (
        <g>
          {shadow}
          <rect x="52" y={top} width="16" height="9" rx="2" fill={color} />
          <path d={`M54 ${top + 9}h12v${big ? 12 : 9}c0 5 14 8 14 18v${big ? 60 : 46}c0 5-4 8-8 8H48c-4 0-8-3-8-8V${top + (big ? 39 : 36)}c0-10 14-13 14-18z`} fill={color} opacity="0.88" />
          <path d={`M44 ${big ? 62 : 58}h32v${big ? 30 : 26}H44z`} fill={accent} />
          <path d={`M44 ${big ? 70 : 66}h32`} stroke={color} strokeWidth="3" />
          <path d={`M44 ${big ? 82 : 78}h32`} stroke={color} strokeWidth="2" opacity="0.6" />
          <path d="M46 40v52" stroke="#fff" opacity="0.35" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    }
    case 'tea':
      return (
        <g>
          {shadow}
          <rect x="52" y="12" width="16" height="9" rx="2" fill={accent} />
          <path d="M54 21h12v10c0 5 13 8 13 18v50c0 5-4 8-8 8H49c-4 0-8-3-8-8V49c0-10 13-13 13-18z" fill="#6ec47f" opacity="0.9" />
          <path d="M41 56h38v34H41z" fill={color} />
          <circle cx="60" cy="73" r="10" fill="#fff" opacity="0.92" />
          <path d="M54 76c0-8 6-13 12-14-1 8-5 13-12 14z" fill={color} />
          <path d="M43 40v52" stroke="#fff" opacity="0.3" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'can':
      return (
        <g>
          {shadow}
          <path d="M40 30h40v70c0 4-9 7-20 7s-20-3-20-7z" fill={color} />
          <ellipse cx="60" cy="30" rx="20" ry="5" fill={light} />
          <ellipse cx="60" cy="30" rx="15" ry="3" fill={dark} />
          <rect x="40" y="52" width="40" height="30" fill={accent} />
          <path d="M48 67c0-8 5-12 12-12 0 8-5 12-12 12z" fill={color} />
          <path d="M52 66h16" stroke={dark} strokeWidth="2" strokeLinecap="round" />
          <path d="M45 34v66" stroke="#fff" opacity="0.28" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'bread':
      return (
        <g>
          {shadow}
          <path d="M16 72c0-26 20-42 44-42s44 16 44 42c0 14-8 28-44 28S16 86 16 72z" fill="#d9a15f" />
          <path d="M16 72c0 14 8 28 44 28s44-14 44-28c0 6-4 12-44 12S16 78 16 72z" fill={shade('#d9a15f', -0.2)} />
          <path d="M34 54c10-8 18-6 26-12M58 50c10-6 20-4 28 2" stroke={accent} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M30 60c10-6 22-3 32-8M62 58c8-4 18-2 26 2" stroke={accent} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
          <rect x="18" y="68" width="84" height="22" rx="6" fill="#fff" opacity="0.16" />
          <rect x="38" y="72" width="44" height="14" rx="3" fill={color} />
          <path d="M26 40c6-4 10-8 20-10" stroke="#fff" opacity="0.4" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      )
    case 'carton':
      return (
        <g>
          {shadow}
          <path d="M32 34 44 20h32l12 14z" fill={light} />
          <path d="M32 34h56v70H32z" fill={color} />
          <path d="M32 34h56v6H32z" fill={dark} />
          <rect x="32" y="56" width="56" height="30" fill={accent} />
          <circle cx="60" cy="71" r="9" fill={color} />
          <path d="M55 71h10M60 66v10" stroke={accent} strokeWidth="2" />
          <path d="M80 34l8 0v70h-8z" fill="#000" opacity="0.18" />
        </g>
      )
    case 'chips':
      return (
        <g>
          {shadow}
          <path d="M28 22h64l-4 80c0 3-2 5-5 5H37c-3 0-5-2-5-5z" fill={color} />
          <path d="M28 22h64v9H28z" fill={shade(color, -0.3)} />
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d={`M${31 + i * 4} 22v9`} stroke={shade(color, -0.5)} strokeWidth="0.8" opacity="0.6" />
          ))}
          <ellipse cx="60" cy="64" rx="22" ry="20" fill={accent} />
          <ellipse cx="60" cy="64" rx="15" ry="9" fill="#e8b84a" />
          <ellipse cx="60" cy="63" rx="12" ry="6" fill="#f6d06a" />
          <path d="M34 36v62" stroke="#fff" opacity="0.2" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'biscuit':
      return (
        <g>
          {shadow}
          <rect x="24" y="24" width="72" height="80" rx="4" fill={color} />
          <rect x="24" y="24" width="72" height="12" rx="4" fill={shade(color, -0.3)} />
          <circle cx="60" cy="66" r="22" fill={accent} />
          <circle cx="60" cy="66" r="17" fill="#d9a15f" />
          {[[54, 60], [66, 62], [58, 72], [68, 72], [52, 70]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#6b3f1a" />
          ))}
          <rect x="32" y="92" width="56" height="5" rx="2.5" fill="#fff" opacity="0.85" />
        </g>
      )
    case 'sport':
      return (
        <g>
          {shadow}
          <rect x="50" y="10" width="20" height="10" rx="4" fill="#fff" />
          <rect x="54" y="20" width="12" height="7" fill={dark} />
          <path d="M52 27h16c0 6 14 8 14 20v52c0 5-4 8-8 8H46c-4 0-8-3-8-8V47c0-12 14-14 14-20z" fill={color} />
          <path d="M38 62h44v24H38z" fill={accent} />
          <path d="M44 74l8-6 8 6 8-6 6 4" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M43 40v54" stroke="#fff" opacity="0.4" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'sugar':
      return (
        <g>
          {shadow}
          <path d="M30 26h60v78c0 2-2 4-4 4H34c-2 0-4-2-4-4z" fill={color} />
          <path d="M30 26h60v8H30z" fill={shade(color, -0.12)} />
          <path d="M30 34h60l1 12H29z" fill={accent} />
          <circle cx="60" cy="72" r="13" fill="#fff" />
          <path d="M53 74l7-12 7 12z" fill={accent} opacity="0.85" />
          <path d="M36 52v52" stroke="#fff" opacity="0.55" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
    case 'oil':
      return (
        <g>
          {shadow}
          <path d="M52 12h16v10H52z" fill={accent} />
          <path d="M54 22h12v8c0 4 18 6 18 20v50c0 5-4 8-8 8H44c-4 0-8-3-8-8V50c0-14 18-16 18-20z" fill={color} />
          <path d="M84 52c10 0 12 6 12 14s-2 14-12 14" stroke={color} strokeWidth="5" fill="none" />
          <rect x="36" y="58" width="48" height="32" fill="#fff" opacity="0.94" />
          <path d="M60 64c-6 8-6 12 0 16 6-4 6-8 0-16z" fill={accent} />
          <path d="M40 38v60" stroke="#fff" opacity="0.4" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'soap':
      return (
        <g>
          {shadow}
          <rect x="22" y="40" width="76" height="52" rx="14" fill={color} transform="rotate(-6 60 66)" />
          <rect x="30" y="47" width="60" height="38" rx="9" fill={shade(color, 0.18)} transform="rotate(-6 60 66)" />
          <path d="M44 66c0-8 6-12 16-12s16 4 16 12-6 12-16 12-16-4-16-12z" fill={accent} opacity="0.35" transform="rotate(-6 60 66)" />
          <circle cx="92" cy="36" r="5" fill="#fff" opacity="0.4" />
          <circle cx="102" cy="28" r="3" fill="#fff" opacity="0.3" />
        </g>
      )
    case 'cup':
      return (
        <g>
          {shadow}
          <ellipse cx="60" cy="96" rx="40" ry="8" fill="#fff" />
          <ellipse cx="60" cy="94" rx="40" ry="7" fill="#e7e5df" />
          <path d="M30 48h60l-6 40c-1 6-6 9-12 9H48c-6 0-11-3-12-9z" fill="#fff" />
          <path d="M90 56c13 0 16 6 15 13s-7 11-17 11" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="60" cy="48" rx="30" ry="7" fill={color} />
          <ellipse cx="60" cy="48" rx="22" ry="4.5" fill={shade(color, 0.28)} />
          <path d="M42 30c-4-6 4-8 0-14M60 28c-4-6 4-8 0-14M78 30c-4-6 4-8 0-14" stroke="#b8b4aa" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
          <path d="M38 56l3 30" stroke="#d8d5cd" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'glass':
      return (
        <g>
          {shadow}
          <path d="M82 14 70 56" stroke={accent} strokeWidth="5" strokeLinecap="round" />
          <path d="M36 30h48l-6 70c-.5 5-4 8-9 8H51c-5 0-8.500-3-9-8z" fill="#fff" opacity="0.55" />
          <path d="M38.500 48h43l-4.500 52c-.5 5-4 8-9 8H52c-5 0-8.500-3-9-8z" fill={color} opacity="0.92" />
          <path d="M38.500 48h43" stroke={shade(color, 0.4)} strokeWidth="3" />
          <rect x="46" y="54" width="14" height="14" rx="3" fill="#fff" opacity="0.5" transform="rotate(-12 53 61)" />
          <rect x="62" y="66" width="13" height="13" rx="3" fill="#fff" opacity="0.4" transform="rotate(10 68 72)" />
          <path d="M42 34l4 62" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </g>
      )
    case 'plate':
      return (
        <g>
          {shadow}
          <ellipse cx="60" cy="80" rx="50" ry="17" fill="#fff" />
          <ellipse cx="60" cy="78" rx="50" ry="17" fill="#f1efe9" />
          <ellipse cx="60" cy="77" rx="36" ry="11" fill="#fff" />
          <path d="M30 74c2-22 18-34 30-34s28 12 30 34c-8 9-52 9-60 0z" fill={color} />
          <path d="M40 66c6-6 14-8 22-6M58 58c8-4 16-3 22 3M46 72c8 3 20 3 28 0" stroke={shade(color, -0.25)} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
          <circle cx="52" cy="52" r="4" fill="#6ba43a" /><circle cx="70" cy="56" r="3.500" fill="#d8412f" />
          <path d="M88 38c3-6 9-8 12-4" stroke="#b8b4aa" strokeWidth="2.200" fill="none" strokeLinecap="round" opacity="0.7" />
        </g>
      )
    case 'bowl':
      return (
        <g>
          {shadow}
          <path d="M14 56h92c0 26-18 44-46 44S14 82 14 56z" fill="#fff" />
          <path d="M14 56h92c0 5-.5 9-1.500 13H15.500C14.500 65 14 61 14 56z" fill={accent} opacity="0.9" />
          <ellipse cx="60" cy="56" rx="46" ry="9" fill={color} />
          <ellipse cx="60" cy="55" rx="38" ry="6" fill={shade(color, 0.3)} />
          <circle cx="48" cy="54" r="3.500" fill="#fff" opacity="0.85" /><circle cx="68" cy="56" r="4" fill="#b5651d" /><circle cx="78" cy="53" r="2.500" fill="#6ba43a" />
          <path d="M44 38c-4-6 4-8 0-14M62 36c-4-6 4-8 0-14M80 38c-4-6 4-8 0-14" stroke="#b8b4aa" strokeWidth="2.200" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      )
    case 'cake':
      return (
        <g>
          {shadow}
          <ellipse cx="60" cy="96" rx="44" ry="9" fill="#fff" />
          <path d="M22 62 98 50v34c0 6-4 10-10 11l-56 4c-6 .5-10-3-10-9z" fill={color} />
          <path d="M22 62 98 50v10L22 72z" fill={accent} />
          <path d="M22 62 60 34 98 50z" fill={shade(color, 0.18)} />
          <path d="M22 62 60 34l38 16-38 8z" fill={shade(color, 0.3)} />
          <circle cx="60" cy="40" r="5" fill="#d8412f" /><path d="M60 35c1-5 5-6 7-5" stroke="#4a7c2a" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'tissue':
      return (
        <g>
          {shadow}
          <path d="M44 42c4-14 10-18 16-8 4-10 12-8 14 8z" fill="#fff" />
          <path d="M44 42c4-6 10-6 16 0 4-6 10-6 14 0" stroke="#d7e3f1" strokeWidth="1.5" fill="none" />
          <rect x="24" y="42" width="72" height="56" rx="8" fill={color} />
          <rect x="34" y="52" width="52" height="8" rx="4" fill={shade(color, -0.3)} />
          <rect x="34" y="66" width="36" height="6" rx="3" fill="#fff" opacity="0.9" />
          <rect x="34" y="78" width="26" height="5" rx="2.5" fill="#fff" opacity="0.55" />
          <path d="M28 46v48" stroke="#fff" opacity="0.25" strokeWidth="4" strokeLinecap="round" />
        </g>
      )
  }
}

export function ProductArt({
  product,
  className = '',
  rounded = true,
}: {
  product: Pick<Product, 'art' | 'color' | 'accent' | 'image' | 'name'>
  className?: string
  rounded?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden bg-secondary ${rounded ? 'rounded-lg' : ''} ${className}`}
      style={{ backgroundImage: `radial-gradient(circle at 50% 38%, ${product.color}33, transparent 68%)` }}
    >
      {product.image ? (
        <img src={product.image} alt={product.name} className="size-full object-cover" loading="lazy" />
      ) : (
        <svg viewBox="0 0 120 120" role="img" aria-label={`Kemasan ${product.name}`} className="size-full">
          <Art kind={product.art} color={product.color} accent={product.accent} />
        </svg>
      )}
    </div>
  )
}
