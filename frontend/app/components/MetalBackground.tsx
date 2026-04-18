'use client'

// Paper-surface corner ornaments — subtle ink details on canvas
// The grid background-image is applied via globals.css on <body>
export default function MetalBackground() {
  return (
    <>
      {/* Top-left corner ornament */}
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, width: 72, height: 72,
          zIndex: 0, pointerEvents: 'none', opacity: 0.22,
        }}
        viewBox="0 0 72 72"
        fill="none"
      >
        <line x1="0" y1="1.5" x2="72" y2="1.5" stroke="#1A1A1A" strokeWidth="1.5" />
        <line x1="1.5" y1="0" x2="1.5" y2="72" stroke="#1A1A1A" strokeWidth="1.5" />
        <line x1="14" y1="0" x2="0" y2="14" stroke="#1A1A1A" strokeWidth="0.4" />
        <line x1="28" y1="0" x2="0" y2="28" stroke="#1A1A1A" strokeWidth="0.4" />
        <circle cx="8" cy="8" r="2.5" stroke="#1A1A1A" strokeWidth="0.8" />
      </svg>

      {/* Bottom-right corner ornament */}
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed', bottom: 0, right: 0, width: 72, height: 72,
          zIndex: 0, pointerEvents: 'none', opacity: 0.22,
          transform: 'rotate(180deg)',
        }}
        viewBox="0 0 72 72"
        fill="none"
      >
        <line x1="0" y1="1.5" x2="72" y2="1.5" stroke="#1A1A1A" strokeWidth="1.5" />
        <line x1="1.5" y1="0" x2="1.5" y2="72" stroke="#1A1A1A" strokeWidth="1.5" />
        <line x1="14" y1="0" x2="0" y2="14" stroke="#1A1A1A" strokeWidth="0.4" />
        <line x1="28" y1="0" x2="0" y2="28" stroke="#1A1A1A" strokeWidth="0.4" />
        <circle cx="8" cy="8" r="2.5" stroke="#1A1A1A" strokeWidth="0.8" />
      </svg>
    </>
  )
}
