import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type StorefrontBreadcrumbItem = {
  label: string;
  href?: string;
};

interface StorefrontBreadcrumbsProps {
  items: StorefrontBreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
}

export function StorefrontBreadcrumbs({
  items,
  backHref,
  backLabel = "Back to shop",
}: StorefrontBreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Breadcrumb>
        <BreadcrumbList className="text-xs uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
          {items.map((item, index) => {
            const isCurrent = index === items.length - 1;

            return (
              <BreadcrumbItem key={`${item.label}-${index}`}>
                {index > 0 ? (
                  <BreadcrumbSeparator className="text-neutral-300 dark:text-neutral-700">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </BreadcrumbSeparator>
                ) : null}

                {item.href && !isCurrent ? (
                  <BreadcrumbLink asChild className="font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
                    <Link href={item.href} className="inline-flex items-center gap-1.5">
                      {index === 0 ? <Home className="h-3.5 w-3.5" /> : null}
                      <span>{item.label}</span>
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 self-start rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700 transition-all hover:-translate-y-0.5 hover:border-neutral-900 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:border-neutral-100 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{backLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}
