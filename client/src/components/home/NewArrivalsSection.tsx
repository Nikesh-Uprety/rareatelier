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
  void config;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.34em] text-zinc-500 dark:text-zinc-400 sm:mb-3">
          Latest Drops
        </h2>
        <h3 className="mb-3 text-center text-3xl font-black uppercase tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 sm:text-4xl md:mb-4 md:text-5xl">
          New Arrivals
        </h3>
        <p className="mx-auto mb-8 max-w-2xl text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 sm:text-[11px] md:mb-12 lg:mb-14">
          Curated originals from Rare Atelier, crafted to elevate everyday wear.
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-7 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
          {newArrivals.map((product) => (
            <div key={product.id}>
              <NewArrivalCard product={product} imageAspectClass="aspect-[3/4]" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
