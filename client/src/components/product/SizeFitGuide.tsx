import { useState } from 'react'
import { X } from 'lucide-react'

interface SizeFitGuideProps {
  open: boolean
  onClose: () => void
}

const SIZE_DATA = [
  { size: 'M', chest: 42, length: 26.5, shoulder: 18.5, chestPct: 60, lengthPct: 55, shoulderPct: 52 },
  { size: 'L', chest: 44, length: 27.5, shoulder: 20.5, chestPct: 72, lengthPct: 66, shoulderPct: 64 },
  { size: 'XL', chest: 46, length: 28.5, shoulder: 22.5, chestPct: 84, lengthPct: 77, shoulderPct: 76 },
]

const MODELS = {
  male: {
    height: "5'11\"",
    weight: '72 kg',
    size: 'XL',
    svgHeight: 170,
    svgWidth: 90,
  },
  female: {
    height: "5'3\"",
    weight: '54 kg',
    size: 'M',
    svgHeight: 158,
    svgWidth: 80,
  },
}

function MaleModelSVG() {
  return (
    <svg width="90" height="170" viewBox="0 0 90 170" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="18" r="11"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M20,45 L15,42 L10,50 L12,85 L20,88 L20,150 L70,150
               L70,88 L78,85 L80,50 L75,42 L70,45 L62,38 L55,35
               L45,34 L35,35 L28,38 Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M30,34 Q32,20 45,18 Q58,20 60,34 Q55,30 45,29
               Q35,30 30,34Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <line x1="45" y1="38" x2="45" y2="90"
        className="stroke-border" strokeWidth="0.8" strokeDasharray="3 2"/>
      <rect x="28" y="95" width="14" height="10" rx="2"
        fill="none" className="stroke-border" strokeWidth="0.6"/>
      <rect x="48" y="95" width="14" height="10" rx="2"
        fill="none" className="stroke-border" strokeWidth="0.6"/>
      <path d="M20,45 L10,50 L12,85 L20,88"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M70,45 L80,50 L78,85 L70,88"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M20,150 L18,170 L40,170 L45,155 L50,170 L72,170 L70,150Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <line x1="6" y1="7" x2="6" y2="170"
        className="stroke-border" strokeWidth="0.5" strokeDasharray="2 2"/>
      <line x1="3" y1="7" x2="9" y2="7"
        className="stroke-border" strokeWidth="0.8"/>
      <line x1="3" y1="170" x2="9" y2="170"
        className="stroke-border" strokeWidth="0.8"/>
      <text x="45" y="72" textAnchor="middle" fontSize="6"
        className="fill-muted-foreground" letterSpacing="2"
        fontFamily="system-ui">RARE</text>
    </svg>
  )
}

function FemaleModelSVG() {
  return (
    <svg width="80" height="158" viewBox="0 0 80 158" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="16" r="11"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M48,10 Q58,8 56,18"
        className="stroke-border" strokeWidth="1.2"
        fill="none" strokeLinecap="round"/>
      <path d="M18,40 L14,38 L9,46 L11,78 L18,80 L18,138 L62,138
               L62,80 L69,78 L71,46 L66,38 L62,40 L56,34 L50,31
               L40,30 L30,31 L24,34 Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M27,31 Q29,18 40,16 Q51,18 53,31 Q48,27 40,26
               Q32,27 27,31Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <line x1="40" y1="34" x2="40" y2="80"
        className="stroke-border" strokeWidth="0.8" strokeDasharray="3 2"/>
      <rect x="25" y="85" width="12" height="9" rx="2"
        fill="none" className="stroke-border" strokeWidth="0.6"/>
      <rect x="43" y="85" width="12" height="9" rx="2"
        fill="none" className="stroke-border" strokeWidth="0.6"/>
      <path d="M18,40 L9,46 L11,78 L18,80"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M62,40 L71,46 L69,78 L62,80"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <path d="M18,138 L16,158 L35,158 L40,145 L45,158 L64,158 L62,138Z"
        className="fill-muted stroke-border" strokeWidth="0.8"/>
      <line x1="5" y1="5" x2="5" y2="158"
        className="stroke-border" strokeWidth="0.5" strokeDasharray="2 2"/>
      <line x1="2" y1="5" x2="8" y2="5"
        className="stroke-border" strokeWidth="0.8"/>
      <line x1="2" y1="158" x2="8" y2="158"
        className="stroke-border" strokeWidth="0.8"/>
      <text x="40" y="64" textAnchor="middle" fontSize="6"
        className="fill-muted-foreground" letterSpacing="2"
        fontFamily="system-ui">RARE</text>
    </svg>
  )
}

export default function SizeFitGuide({ open, onClose }: SizeFitGuideProps) {
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [heightFt, setHeightFt] = useState('')
  const [weight, setWeight] = useState('')
  const [recommended, setRecommended] = useState<string | null>(null)
  const [animating, setAnimating] = useState(false)

  const model = MODELS[gender]

  function switchGender(g: 'male' | 'female') {
    if (g === gender) return
    setAnimating(true)
    setTimeout(() => {
      setGender(g)
      setAnimating(false)
    }, 200)
  }

  function getRecommendation() {
    const w = parseFloat(weight)
    if (!w) return
    let size = 'M'
    if (w < 55) size = 'S'
    else if (w <= 65) size = 'M'
    else if (w <= 80) size = 'L'
    else size = 'XL'
    setRecommended(size)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm
                      bg-background border-l border-border z-50
                      overflow-y-auto shadow-xl
                      animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold tracking-tight">
            Size &amp; Fit Guide
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       bg-muted hover:bg-muted/80 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Model section */}
        <div className="bg-muted/30 border-b border-border px-5 py-5">

          {/* Gender toggle */}
          <div className="flex border border-border rounded-lg
                          overflow-hidden mb-5">
            {(['male', 'female'] as const).map(g => (
              <button
                key={g}
                onClick={() => switchGender(g)}
                className={`flex-1 py-2 text-xs font-medium transition-all
                            duration-200 capitalize tracking-wide
                            ${gender === g
                              ? 'bg-foreground text-background'
                              : 'bg-transparent text-muted-foreground hover:bg-muted'
                            }`}
              >
                {g} model
              </button>
            ))}
          </div>

          {/* Model figure */}
          <div className={`flex flex-col items-center gap-4 overflow-visible
                           transition-opacity duration-200
                           ${animating ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative flex items-center justify-center
                            min-h-[200px] px-20 py-8 overflow-visible">

              {/* Floating height tag */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2
                              bg-background border border-border
                              rounded-md px-2 py-1 text-xs font-semibold
                              z-10 whitespace-nowrap
                              animate-[float_3s_ease-in-out_infinite]">
                {model.height}
              </div>

              {/* Floating weight tag */}
              <div className="absolute top-1/2 right-3 -translate-y-1/2
                              bg-background border border-border
                              rounded-md px-2 py-1 text-xs font-medium
                              whitespace-nowrap z-10
                              animate-[float_3s_ease-in-out_infinite_0.8s]">
                {model.weight}
              </div>

              {/* Floating size tag */}
              <div className="absolute top-1/2 left-3 -translate-y-1/2
                              bg-background border border-border
                              rounded-md px-2 py-1 text-xs font-medium
                              whitespace-nowrap z-10
                              animate-[float_3s_ease-in-out_infinite_1.6s]">
                Wears {model.size}
              </div>

              {gender === 'male' ? <MaleModelSVG /> : <FemaleModelSVG />}
            </div>

            <p className="text-xs text-muted-foreground text-center
                          leading-relaxed">
              <span className="font-medium text-foreground">
                {model.height}
              </span> height &nbsp;·&nbsp;
              <span className="font-medium text-foreground">
                {model.weight}
              </span> weight &nbsp;·&nbsp; wears size&nbsp;
              <span className="font-medium text-foreground">
                {model.size}
              </span>
            </p>
          </div>
        </div>

        {/* Size Recommender */}
        <div className="px-5 py-5 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-widest
                        text-foreground mb-3">
            Get size recommendation
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Height (ft)
              </label>
              <input
                type="number"
                value={heightFt}
                onChange={e => setHeightFt(e.target.value)}
                placeholder="5"
                min={4} max={7}
                className="w-full px-3 py-2 text-sm rounded-md border
                           border-border bg-background text-foreground
                           focus:outline-none focus:ring-1
                           focus:ring-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="72"
                min={30} max={200}
                className="w-full px-3 py-2 text-sm rounded-md border
                           border-border bg-background text-foreground
                           focus:outline-none focus:ring-1
                           focus:ring-foreground"
              />
            </div>
          </div>

          <button
            onClick={getRecommendation}
            className="w-full py-2.5 text-sm font-medium bg-foreground
                       text-background rounded-md hover:opacity-85
                       transition-opacity tracking-wide"
          >
            Get my size
          </button>

          {recommended && (
            <div className="mt-3 p-3 bg-muted rounded-md border
                            border-border">
              <p className="text-xs text-muted-foreground mb-1">
                Recommended size
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {recommended}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on your weight — fits well for this product
              </p>
            </div>
          )}
        </div>

        {/* Size chart */}
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest
                        text-foreground mb-4">
            Size chart — measurements in inches
          </p>

          {/* Header row */}
          <div className="grid grid-cols-4 mb-1">
            {['Size', 'Chest', 'Length', 'Shoulder'].map(h => (
              <div key={h}
                className="text-[10px] uppercase tracking-widest
                           text-muted-foreground py-1.5 px-2">
                {h}
              </div>
            ))}
          </div>

          {SIZE_DATA.map(row => (
            <div
              key={row.size}
              className={`grid grid-cols-4 rounded-sm transition-colors
                          duration-200 mb-0.5
                          ${recommended === row.size
                            ? 'bg-muted'
                            : 'hover:bg-muted/50'}`}
            >
              {/* Size label */}
              <div className="py-2.5 px-2 text-sm font-semibold
                              text-foreground border-b border-border">
                {row.size}
              </div>

              {/* Chest bar */}
              <div className="py-2.5 px-2 border-b border-border
                              flex items-center gap-2">
                <div className="flex-1 h-0.5 bg-border rounded-full
                                overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full
                               transition-all duration-700"
                    style={{ width: `${row.chestPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground
                                 min-w-[28px]">
                  {row.chest}"
                </span>
              </div>

              {/* Length bar */}
              <div className="py-2.5 px-2 border-b border-border
                              flex items-center gap-2">
                <div className="flex-1 h-0.5 bg-border rounded-full
                                overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full
                               transition-all duration-700"
                    style={{ width: `${row.lengthPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground
                                 min-w-[28px]">
                  {row.length}"
                </span>
              </div>

              {/* Shoulder bar */}
              <div className="py-2.5 px-2 border-b border-border
                              flex items-center gap-2">
                <div className="flex-1 h-0.5 bg-border rounded-full
                                overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full
                               transition-all duration-700"
                    style={{ width: `${row.shoulderPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground
                                 min-w-[28px]">
                  {row.shoulder}"
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Add float animation to global CSS if not present */}
      </div>
    </>
  )
}
