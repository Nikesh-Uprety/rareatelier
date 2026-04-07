import { Helmet } from "react-helmet-async";

type StorefrontSeoProps = {
  title: string;
  description?: string;
  image?: string | null;
  canonicalPath?: string;
  type?: "website" | "product" | "article";
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Record<string, unknown>[] | null;
};

function toAbsoluteUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === "undefined") return value;

  try {
    return new URL(value, window.location.origin).toString();
  } catch {
    return value;
  }
}

export function StorefrontSeo({
  title,
  description,
  image,
  canonicalPath,
  type = "website",
  noIndex = false,
  structuredData,
}: StorefrontSeoProps) {
  const canonicalUrl =
    typeof window !== "undefined"
      ? toAbsoluteUrl(canonicalPath || window.location.pathname + window.location.search)
      : canonicalPath;
  const absoluteImage = toAbsoluteUrl(image);

  return (
    <Helmet>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      <meta property="og:type" content={type} />
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {absoluteImage ? <meta property="og:image" content={absoluteImage} /> : null}
      <meta name="twitter:card" content={absoluteImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={title} />
      {description ? <meta name="twitter:description" content={description} /> : null}
      {absoluteImage ? <meta name="twitter:image" content={absoluteImage} /> : null}
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large"}
      />
      {structuredData ? (
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      ) : null}
    </Helmet>
  );
}
