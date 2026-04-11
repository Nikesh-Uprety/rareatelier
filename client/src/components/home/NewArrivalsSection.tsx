import { NewArrivalCard } from "@/components/home/NewArrivalCard";

interface NewArrivalsSectionProps {
  newArrivals: any[];
  isNewArrivalsSuccess: boolean;
  config?: Record<string, any>;
}

export default function NewArrivalsSection({
  newArrivals,
  isNewArrivalsSuccess,
  config,
}: NewArrivalsSectionProps) {
  void isNewArrivalsSuccess;
  const resolvedConfig = config ?? {};
  const eyebrow =
    typeof resolvedConfig.eyebrow === "string" && resolvedConfig.eyebrow.trim()
      ? resolvedConfig.eyebrow.trim()
      : "Latest Drops";
  const title =
    typeof resolvedConfig.title === "string" && resolvedConfig.title.trim()
      ? resolvedConfig.title.trim()
      : "New Arrivals";
  const text =
    typeof resolvedConfig.text === "string" && resolvedConfig.text.trim()
      ? resolvedConfig.text.trim()
      : "Curated originals from Rare Atelier, crafted to elevate everyday wear.";
  const isDarkEdit =
    resolvedConfig.variant === "arrivals-spotlight" || resolvedConfig.variant === "rare-dark-luxury";

  return (
    <section className={isDarkEdit ? "bg-[#090a0d] py-10 sm:py-12 lg:py-14" : "py-7 sm:py-10 lg:py-12"}>
      <div className="w-full px-2 sm:px-3 lg:px-4 xl:px-6">
        <h2 className="mb-1.5 text-left text-[10px] font-bold uppercase tracking-[0.34em] text-zinc-500 dark:text-zinc-400 sm:mb-2">
          {eyebrow}
        </h2>
        <h3 className="mb-2 text-left text-3xl font-black uppercase tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 sm:text-4xl md:mb-3 md:text-5xl">
          {title}
        </h3>
        <p className="mb-6 max-w-2xl text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 sm:text-[11px] md:mb-8 lg:mb-9">
          {text}
        </p>
        <div className="grid grid-cols-2 items-start content-start justify-items-start gap-x-3 gap-y-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-7 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
          {newArrivals.map((product) => (
            <div key={product.id} className="w-full">
              <NewArrivalCard product={product} imageAspectClass="aspect-[3/4]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
