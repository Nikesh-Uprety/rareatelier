import { Ruler, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";

import type {
  ProductMeasurementOverlay,
  ProductMeasurementOverlayPoint,
  ProductSizeChart,
  ProductSizeMeasurement,
} from "@/lib/api";

interface SizeFitGuideProps {
  open: boolean;
  onClose: () => void;
  productName?: string;
  sizeChart?: ProductSizeChart | null;
  productImage?: string | null;
  selectedSize?: string | null;
}

const DEFAULT_SIZE_CHART: ProductSizeChart = {
  image: "/images/sizecharts/shirt.svg",
  units: "cm",
  measurements: [
    { size: "XS", length: 70, shoulder: 50, chest: 60, sleeve: 62 },
    { size: "S", length: 72, shoulder: 52, chest: 62, sleeve: 63 },
    { size: "M", length: 74, shoulder: 54, chest: 64, sleeve: 64 },
    { size: "L", length: 76, shoulder: 56, chest: 66, sleeve: 65 },
    { size: "XL", length: 78, shoulder: 58, chest: 68, sleeve: 66 },
    { size: "XXL", length: 80, shoulder: 60, chest: 70, sleeve: 67 },
  ],
};

const PREFERRED_COLUMN_ORDER = ["length", "shoulder", "chest", "sleeve", "waist", "inseam", "outseam", "hip"];

const MEASUREMENT_GUIDE: Record<string, string> = {
  length: "Distance from top shoulder (near collar) to bottom hem.",
  shoulder: "Width from left shoulder seam to right shoulder seam.",
  chest: "Measured across chest (pit to pit).",
  sleeve: "Distance from shoulder seam to sleeve end.",
  waist: "Measured straight across waistband.",
  inseam: "Distance from crotch seam down to hem.",
  outseam: "Distance from top waist to hem along outer seam.",
  hip: "Measured across the widest hip point.",
};

type ChartVisualKind = "hoodie" | "shirt" | "pants" | "generic";

const DEFAULT_MEASURE_OVERLAY_BY_KIND: Record<ChartVisualKind, ProductMeasurementOverlay> = {
  hoodie: {
    shoulder: { top: "10%", left: "20%", width: "60%" },
    chest: { top: "45%", left: "25%", width: "50%" },
    length: { top: "15%", left: "80%", height: "65%" },
    sleeve: { top: "30%", left: "10%", height: "50%", rotate: "-25deg" },
  },
  shirt: {
    shoulder: { top: "11%", left: "20%", width: "60%" },
    chest: { top: "40%", left: "25%", width: "50%" },
    length: { top: "12%", left: "80%", height: "70%" },
    sleeve: { top: "28%", left: "13%", height: "48%", rotate: "-20deg" },
  },
  pants: {
    waist: { top: "24%", left: "30%", width: "40%" },
    hip: { top: "36%", left: "26%", width: "48%" },
    inseam: { top: "44%", left: "52%", height: "42%" },
    outseam: { top: "24%", left: "68%", height: "62%" },
  },
  generic: {
    shoulder: { top: "24%", left: "28%", width: "44%" },
    chest: { top: "42%", left: "23%", width: "54%" },
    length: { top: "14%", left: "17%", height: "70%" },
    sleeve: { top: "26%", left: "72%", height: "38%" },
  },
};

const MEASUREMENT_OVERLAY_CSS = `
.measure-container {
  position: relative;
}

.measure-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.measure-overlay-item {
  position: absolute;
}

.measure-overlay-line {
  position: relative;
  color: rgba(255, 255, 255, 0.92);
  background: currentColor;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.28), 0 0 12px rgba(0, 0, 0, 0.22);
  transform: rotate(var(--measure-rotate, 0deg));
  transform-origin: top left;
}

.measure-overlay-line::before,
.measure-overlay-line::after {
  content: "";
  position: absolute;
  background: currentColor;
}

.measure-overlay-line.is-horizontal::before,
.measure-overlay-line.is-horizontal::after {
  width: 1px;
  height: 8px;
  top: 50%;
  transform: translateY(-50%);
}

.measure-overlay-line.is-horizontal::before {
  left: 0;
}

.measure-overlay-line.is-horizontal::after {
  right: 0;
}

.measure-overlay-line.is-vertical::before,
.measure-overlay-line.is-vertical::after {
  width: 8px;
  height: 1px;
  left: 50%;
  transform: translateX(-50%);
}

.measure-overlay-line.is-vertical::before {
  top: 0;
}

.measure-overlay-line.is-vertical::after {
  bottom: 0;
}

.measure-overlay-label {
  position: absolute;
  white-space: nowrap;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  padding: 1px 8px;
  line-height: 1.3;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.measure-overlay-label.is-horizontal {
  top: -1.2rem;
  left: 50%;
  transform: translateX(-50%);
}

.measure-overlay-label.is-vertical {
  top: 50%;
  left: calc(100% + 0.45rem);
  transform: translateY(-50%);
}
`;

function titleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDisplayValue(value: string | number | undefined, units: string, isSizeCell: boolean): string {
  if (value === undefined || value === null || value === "") return "-";
  if (isSizeCell) return String(value).toUpperCase();
  if (typeof value === "number") return `${value}${units}`;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return `${numericValue}${units}`;
  return String(value);
}

// Reusable chart renderer: updates dynamic image, dynamic columns, and table rows.
function renderSizeChart(incomingChart?: ProductSizeChart | null): {
  image: string;
  units: string;
  columnKeys: string[];
  columnLabels: string[];
  measurementKeys: string[];
  rows: ProductSizeMeasurement[];
  explanationItems: Array<{ title: string; description: string }>;
} {
  const chart = incomingChart?.measurements?.length ? incomingChart : DEFAULT_SIZE_CHART;
  const units = chart.units || "cm";
  const rows = chart.measurements;

  // Build column keys from the union of all row keys so sparse first rows don't hide later data.
  const keyUnion = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "size") keyUnion.add(key);
    });
  });

  const measurementKeys = Array.from(keyUnion);
  const orderedKeys = [
    ...PREFERRED_COLUMN_ORDER.filter((key) => measurementKeys.includes(key)),
    ...measurementKeys.filter((key) => !PREFERRED_COLUMN_ORDER.includes(key)),
  ];
  const columnKeys = ["size", ...orderedKeys];
  const columnLabels = columnKeys.map((key) => (key === "size" ? "Size" : titleCase(key)));

  const explanationItems = orderedKeys.map((key) => ({
    title: titleCase(key),
    description: MEASUREMENT_GUIDE[key] || `Measured in ${units} for the ${titleCase(key)} area.`,
  }));

  return {
    image: chart.image,
    units,
    columnKeys,
    columnLabels,
    measurementKeys: orderedKeys,
    rows,
    explanationItems,
  };
}

function highlightSelectedSize(rowSize: string | number | undefined, selectedSize?: string | null): boolean {
  if (!selectedSize || rowSize === undefined || rowSize === null) return false;
  return String(rowSize).trim().toUpperCase() === selectedSize.trim().toUpperCase();
}

function resolveChartVisualKind(measurementKeys: string[], chartImage?: string, productName?: string): ChartVisualKind {
  const keySet = new Set(measurementKeys);
  const hintSignature = `${chartImage ?? ""} ${productName ?? ""}`.toLowerCase();
  const hasPantsKeys = keySet.has("waist") || keySet.has("inseam") || keySet.has("outseam");
  const hasTopKeys = keySet.has("shoulder") || keySet.has("chest") || keySet.has("sleeve");
  if (hasPantsKeys && !hasTopKeys) return "pants";
  if (/(hoodie|sweatshirt|pullover|fleece)/.test(hintSignature)) return "hoodie";
  if (hasTopKeys) return "shirt";
  return "generic";
}

function getProductImageCropStyle(kind: ChartVisualKind): CSSProperties {
  if (kind === "pants") {
    return {
      objectFit: "cover",
      objectPosition: "center 52%",
      transform: "scale(1.14)",
      transformOrigin: "center center",
    };
  }
  if (kind === "hoodie") {
    return {
      objectFit: "cover",
      objectPosition: "center 28%",
      transform: "scale(1.3)",
      transformOrigin: "center center",
    };
  }
  if (kind === "shirt") {
    return {
      objectFit: "cover",
      objectPosition: "center 32%",
      transform: "scale(1.22)",
      transformOrigin: "center center",
    };
  }
  return {
    objectFit: "cover",
    objectPosition: "center 38%",
    transform: "scale(1.12)",
    transformOrigin: "center center",
  };
}

interface OverlayRenderProduct {
  name?: string;
  sizeChart: ProductSizeChart;
  measurementKeys: string[];
}

function resolveMeasureOverlay(product: OverlayRenderProduct): ProductMeasurementOverlay {
  const customOverlay = product.sizeChart.measureOverlay;
  const hasCustomOverlay = customOverlay && Object.keys(customOverlay).length > 0;
  if (hasCustomOverlay) return customOverlay;

  const kind = resolveChartVisualKind(product.measurementKeys, product.sizeChart.image, product.name);
  return DEFAULT_MEASURE_OVERLAY_BY_KIND[kind];
}

function renderMeasurementOverlay(product: OverlayRenderProduct) {
  const overlayConfig = resolveMeasureOverlay(product);
  const measurementSet = new Set(product.measurementKeys.map((key) => key.toLowerCase()));

  const overlayEntries = Object.entries(overlayConfig).filter(([key, value]) => {
    if (!value) return false;
    if (measurementSet.size === 0) return true;
    return measurementSet.has(key.toLowerCase());
  });

  return overlayEntries.map(([key, point]) => {
    const config = point as ProductMeasurementOverlayPoint;
    const isVertical = Boolean(config.height) && !config.width;
    const isHorizontal = Boolean(config.width) && !config.height;
    const orientationClass = isVertical ? "is-vertical" : "is-horizontal";

    const computedWidth = config.width ?? (isVertical ? "2px" : "40%");
    const computedHeight = config.height ?? (isHorizontal ? "2px" : "2px");
    const lineStyle: CSSProperties = {
      width: computedWidth,
      height: computedHeight,
      ["--measure-rotate" as string]: config.rotate ?? "0deg",
    };

    return (
      <div key={`overlay-${key}`} className="measure-overlay-item" style={{ top: config.top, left: config.left }}>
        <div className={`measure-overlay-line ${orientationClass}`} style={lineStyle} />
        <span className={`measure-overlay-label ${orientationClass}`}>
          {config.label || titleCase(key)}
        </span>
      </div>
    );
  });
}

export default function SizeFitGuide({ open, onClose, productName, sizeChart, productImage, selectedSize }: SizeFitGuideProps) {
  if (!open) return null;

  const chart = renderSizeChart(sizeChart);
  const visualImage = productImage?.trim() ? productImage : chart.image;
  const isUsingProductVisual = Boolean(productImage?.trim());
  const visualKind = resolveChartVisualKind(chart.measurementKeys, chart.image, productName);
  const resolvedSizeChart: ProductSizeChart = {
    image: chart.image,
    units: chart.units,
    measurements: chart.rows,
    measureOverlay: sizeChart?.measureOverlay,
  };
  const overlayNodes = renderMeasurementOverlay({
    name: productName,
    sizeChart: resolvedSizeChart,
    measurementKeys: chart.measurementKeys,
  });

  return (
    <>
      <style>{MEASUREMENT_OVERLAY_CSS}</style>
      <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[3px] transition-opacity duration-300" onClick={onClose} />

      <aside className="fixed right-0 top-0 z-[121] h-full w-full max-w-3xl overflow-y-auto border-l border-white/20 bg-background/95 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl animate-in slide-in-from-right duration-300">
        <header className="sticky top-0 z-10 border-b border-border/70 bg-background/95 px-5 py-4 sm:px-7 sm:py-5 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Size Guide
              </p>
              <h2 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">Find Your Best Fit</h2>
              <p className="text-sm text-muted-foreground">
                {productName ? `${productName} · Measurements in ${chart.units}` : `Measurements in ${chart.units}`}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background transition-all duration-200 hover:bg-muted"
              aria-label="Close size chart"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <section className="space-y-6 px-5 py-5 sm:space-y-8 sm:px-7 sm:py-7">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-muted/20 to-muted/5 p-4 sm:p-6">
            <div
              className={`measure-container relative mx-auto flex items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/5 dark:bg-black/25 ${
                isUsingProductVisual
                  ? visualKind === "pants"
                    ? "aspect-[3/4] w-full max-w-[290px] p-0 sm:max-w-[340px]"
                    : "aspect-[4/5] w-full max-w-[270px] p-0 sm:max-w-[320px]"
                  : "w-full max-w-[760px] p-2"
              }`}
            >
              <img
                id="sizeChartImg"
                src={visualImage}
                alt={`${productName || "Product"} measurement diagram`}
                className={
                  isUsingProductVisual
                    ? "h-full w-full"
                    : "h-auto max-h-[520px] w-full max-w-[760px] object-contain"
                }
                style={isUsingProductVisual ? getProductImageCropStyle(visualKind) : undefined}
                loading="lazy"
              />
              {overlayNodes.length > 0 ? <div className="measure-overlay">{overlayNodes}</div> : null}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/75 shadow-sm">
            <table className="size-table min-w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  {chart.columnLabels.map((label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody id="sizeTableBody">
                {chart.rows.map((row) => {
                  const isSelectedRow = highlightSelectedSize(row.size, selectedSize);
                  return (
                    <tr
                      key={String(row.size)}
                      className={`border-t border-border/70 transition-colors duration-200 ${
                        isSelectedRow ? "bg-black text-white dark:bg-white dark:text-black" : "bg-background hover:bg-muted/25"
                      }`}
                    >
                      {chart.columnKeys.map((key) => (
                        <td
                          key={`${row.size}-${key}`}
                          className={`whitespace-nowrap px-4 py-3.5 text-[14px] ${
                            isSelectedRow ? "font-semibold text-inherit" : "text-foreground"
                          }`}
                        >
                          {toDisplayValue(row[key], chart.units, key === "size")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {chart.explanationItems.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-border/70 bg-muted/10 p-4 transition-colors duration-200 hover:bg-muted/20"
              >
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
                  <Ruler className="h-3.5 w-3.5" />
                  {item.title}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </aside>
    </>
  );
}
