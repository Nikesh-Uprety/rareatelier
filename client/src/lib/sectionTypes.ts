export type SectionCategory =
  | "hero"
  | "products"
  | "content"
  | "media"
  | "interactive"
  | "utility";

export type SectionBadge = "new" | "popular" | "pro";

export type SectionType =
  | "hero-slider"
  | "hero-video"
  | "hero-split"
  | "hero-lookbook"
  | "hero-poster"
  | "hero-capsule"
  | "hero-monogram"
  | "featured-products"
  | "new-arrivals"
  | "category-grid"
  | "featured-editorial"
  | "featured-spotlight"
  | "featured-merch-wall"
  | "category-showcase"
  | "arrivals-compact"
  | "arrivals-spotlight"
  | "fresh-drop-highlight"
  | "testimonial"
  | "testimonial-cards"
  | "testimonial-marquee"
  | "faq"
  | "cta-banner"
  | "gallery"
  | "video"
  | "newsletter"
  | "countdown"
  | "map"
  | "ticker"
  | "quote"
  | "divider"
  | "text-block"
  | "campaign-banner"
  | "faq-minimal"
  | "faq-detailed"
  | "cta-pill"
  | "cta-split"
  | "campaign-sale"
  | "campaign-poster"
  | "gallery-masonry"
  | "gallery-collage"
  | "gallery-lookbook"
  | "video-spotlight"
  | "video-story"
  | "countdown-launch"
  | "countdown-promo"
  | "map-showroom"
  | "map-appointment"
  | "ticker-sale"
  | "ticker-shipping"
  | "divider-line"
  | "divider-monogram"
  | "text-editorial"
  | "text-columns"
  | "services"
  | "fresh-release"
  | "services-pillars"
  | "services-dark"
  | "contact"
  | "contact-editorial"
  | "back-to-top"
  | "back-to-top-minimal";

export interface SectionTypeDefinition {
  type: SectionType;
  apiType: string;
  label: string;
  category: SectionCategory;
  description: string;
  defaultConfig: Record<string, unknown>;
  badge?: SectionBadge;
  unique?: boolean;
  variant?: string;
  supportsRendering?: boolean;
}

export const SECTION_CATEGORY_META: Array<{
  id: "all" | SectionCategory;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "hero", label: "Hero" },
  { id: "products", label: "Products" },
  { id: "content", label: "Content" },
  { id: "media", label: "Media" },
  { id: "interactive", label: "Interactive" },
  { id: "utility", label: "Utility" },
];

export const SECTION_TYPES: SectionTypeDefinition[] = [
  {
    type: "hero-slider",
    apiType: "hero",
    label: "Hero Slider",
    category: "hero",
    description: "Cinematic hero with layered slides and a gold CTA.",
    badge: "popular",
    unique: true,
    variant: "slider",
    supportsRendering: true,
    defaultConfig: {
      variant: "slider",
      eyebrow: "Rare Atelier",
      title: "A dark editorial entrance for your storefront.",
      text: "Lead with a cinematic first impression and layered storytelling.",
      ctaLabel: "Explore Collection",
      ctaHref: "/products",
    },
  },
  {
    type: "hero-video",
    apiType: "hero",
    label: "Hero with Video",
    category: "hero",
    description: "Immersive opening block with motion-first storytelling.",
    unique: true,
    variant: "video",
    supportsRendering: true,
    defaultConfig: {
      variant: "video",
      eyebrow: "Motion Story",
      title: "Use motion to frame your latest campaign.",
      text: "Pair atmospheric footage with a restrained luxury layout.",
      ctaLabel: "Watch Story",
      ctaHref: "/products",
    },
  },
  {
    type: "hero-split",
    apiType: "hero",
    label: "Hero Split",
    category: "hero",
    description: "Balanced editorial hero with copy on one side and media on the other.",
    unique: true,
    variant: "split",
    supportsRendering: true,
    defaultConfig: {
      variant: "split",
      eyebrow: "Editorial Layout",
      title: "Present a campaign with image and copy in tandem.",
      text: "A composed split layout for launches, capsules, and brand stories.",
      ctaLabel: "Discover More",
      ctaHref: "/products",
    },
  },
  {
    type: "featured-products",
    apiType: "featured",
    label: "Featured Products",
    category: "products",
    description: "Curated merchandise grid with premium product cards.",
    supportsRendering: true,
    defaultConfig: {
      title: "Featured Products",
      text: "Spotlight your hero assortment with a premium edit.",
    },
  },
  {
    type: "new-arrivals",
    apiType: "arrivals",
    label: "New Arrivals",
    category: "products",
    description: "Fresh releases arranged in a clean release grid.",
    badge: "new",
    supportsRendering: true,
    defaultConfig: {
      title: "New Arrivals",
      text: "Show the latest additions to the collection.",
    },
  },
  {
    type: "category-grid",
    apiType: "featured",
    label: "Category Grid",
    category: "products",
    description: "Browse-by-category layout with editorial tiles.",
    variant: "category-grid",
    supportsRendering: true,
    defaultConfig: {
      variant: "category-grid",
      title: "Shop by Category",
      text: "Guide shoppers into your core collections and product families.",
    },
  },
  {
    type: "testimonial",
    apiType: "testimonial",
    label: "Testimonials",
    category: "content",
    description: "Social proof carousel with refined quote styling.",
    badge: "new",
    unique: true,
    supportsRendering: true,
    defaultConfig: {
      title: "What Clients Say",
      items: [],
    },
  },
  {
    type: "faq",
    apiType: "faq",
    label: "FAQ Accordion",
    category: "content",
    description: "Accordion section for delivery, returns, and customer questions.",
    unique: true,
    supportsRendering: true,
    defaultConfig: {
      title: "Frequently Asked Questions",
      items: [],
    },
  },
  {
    type: "cta-banner",
    apiType: "campaign",
    label: "CTA Banner",
    category: "content",
    description: "Full-width call-to-action block for campaigns and promotions.",
    variant: "cta-banner",
    supportsRendering: true,
    defaultConfig: {
      variant: "cta-banner",
      title: "Invite your audience into the next drop.",
      text: "A bold banner for campaign launches and seasonal pushes.",
      ctaLabel: "Shop Now",
      ctaHref: "/products",
    },
  },
  {
    type: "gallery",
    apiType: "gallery",
    label: "Photo Gallery",
    category: "media",
    description: "Masonry-inspired image showcase for editorial storytelling.",
    supportsRendering: true,
    defaultConfig: {
      title: "Gallery",
      images: [],
    },
  },
  {
    type: "video",
    apiType: "video",
    label: "Video Embed",
    category: "media",
    description: "Embedded campaign film or lookbook video module.",
    supportsRendering: true,
    defaultConfig: {
      title: "Campaign Film",
      url: "",
    },
  },
  {
    type: "newsletter",
    apiType: "contact",
    label: "Newsletter Signup",
    category: "interactive",
    description: "Email capture block styled for luxury storefronts.",
    variant: "newsletter",
    unique: true,
    supportsRendering: true,
    defaultConfig: {
      variant: "newsletter",
      title: "Join the Rare List",
      text: "Get launch alerts, private previews, and atelier notes.",
    },
  },
  {
    type: "countdown",
    apiType: "countdown",
    label: "Countdown Timer",
    category: "interactive",
    description: "Launch countdown for timed releases and private drops.",
    supportsRendering: true,
    defaultConfig: {
      title: "Next Drop",
      targetDate: "",
    },
  },
  {
    type: "map",
    apiType: "map",
    label: "Store Map",
    category: "interactive",
    description: "Location block for showroom visits or appointment-based stores.",
    supportsRendering: true,
    defaultConfig: {
      title: "Visit the Store",
      address: "",
    },
  },
  {
    type: "ticker",
    apiType: "ticker",
    label: "Announcement Bar",
    category: "utility",
    description: "Scrolling gold ticker for shipping, launches, and promos.",
    unique: true,
    supportsRendering: true,
    defaultConfig: {
      items: ["Worldwide shipping", "New capsule live now", "Private appointments available"],
    },
  },
  {
    type: "quote",
    apiType: "quote",
    label: "Quote Block",
    category: "utility",
    description: "Editorial statement, manifesto, or founder quote.",
    supportsRendering: true,
    defaultConfig: {
      text: "Crafted slowly. Worn often. Remembered always.",
      attribution: "Rare Atelier",
    },
  },
  {
    type: "divider",
    apiType: "campaign",
    label: "Divider",
    category: "utility",
    description: "Elegant visual break with a label and line detail.",
    variant: "divider",
    supportsRendering: true,
    defaultConfig: {
      variant: "divider",
      title: "Collection Break",
      text: "A refined visual pause between sections.",
    },
  },
  {
    type: "text-block",
    apiType: "text-block",
    label: "Rich Text Block",
    category: "utility",
    description: "Flexible copy section for editorial notes and brand storytelling.",
    supportsRendering: true,
    defaultConfig: {
      title: "Editorial Copy",
      content: "",
    },
  },
  {
    type: "campaign-banner",
    apiType: "campaign",
    label: "Campaign Banner",
    category: "content",
    description: "Existing campaign banner used by the current storefront renderer.",
    supportsRendering: true,
    defaultConfig: {
      title: "Campaign Banner",
      text: "Use a striking image and compact CTA to punctuate the page.",
    },
  },
  {
    type: "services",
    apiType: "services",
    label: "Services",
    category: "utility",
    description: "Current services section for delivery, tailoring, or support highlights.",
    supportsRendering: true,
    defaultConfig: {
      title: "Services",
      items: [],
    },
  },
  {
    type: "fresh-release",
    apiType: "fresh-release",
    label: "Fresh Release",
    category: "products",
    description: "Current release layout used by the existing storefront canvas.",
    supportsRendering: true,
    defaultConfig: {
      title: "Fresh Release",
      text: "Spotlight a newly launched drop with concise copy.",
    },
  },
  {
    type: "contact",
    apiType: "contact",
    label: "Contact",
    category: "interactive",
    description: "Current contact/newsletter-style footer section.",
    unique: true,
    supportsRendering: true,
    defaultConfig: {},
  },
  {
    type: "back-to-top",
    apiType: "back-to-top",
    label: "Back To Top",
    category: "utility",
    description: "Current utility footer section with a visual return-to-top affordance.",
    unique: true,
    supportsRendering: true,
    defaultConfig: {},
  },
];

const SECTION_LIBRARY_EXPANSION: SectionTypeDefinition[] = [
  {
    type: "hero-lookbook",
    apiType: "hero",
    label: "Hero Lookbook",
    category: "hero",
    description: "Full-bleed opening scene tuned for lookbook storytelling.",
    badge: "popular",
    variant: "editorial",
    supportsRendering: true,
    defaultConfig: {
      variant: "editorial",
      eyebrow: "Lookbook",
      title: "Frame the collection like an editorial spread.",
      text: "Lead with strong imagery and a restrained product story.",
      ctaLabel: "View Collection",
      ctaHref: "/products",
    },
  },
  {
    type: "hero-poster",
    apiType: "hero",
    label: "Hero Poster",
    category: "hero",
    description: "Poster-style campaign opening with headline-first hierarchy.",
    variant: "poster",
    supportsRendering: true,
    defaultConfig: {
      variant: "poster",
      eyebrow: "Campaign Poster",
      title: "A single bold statement for the season.",
      text: "Use one strong image, one big claim, and one clean action.",
      ctaLabel: "Shop the Drop",
      ctaHref: "/products",
    },
  },
  {
    type: "hero-capsule",
    apiType: "hero",
    label: "Hero Capsule",
    category: "hero",
    description: "Launch hero tailored for limited capsule releases.",
    variant: "capsule",
    supportsRendering: true,
    defaultConfig: {
      variant: "capsule",
      eyebrow: "Capsule Release",
      title: "Present the drop with a sharper release angle.",
      text: "Ideal for timed capsules, product edits, and new-season launches.",
      ctaLabel: "Discover the Capsule",
      ctaHref: "/products",
    },
  },
  {
    type: "hero-monogram",
    apiType: "hero",
    label: "Hero Monogram",
    category: "hero",
    description: "Luxury-first hero with logo-led mood and minimal copy.",
    variant: "monogram",
    supportsRendering: true,
    defaultConfig: {
      variant: "monogram",
      eyebrow: "Signature",
      title: "Let the brand carry the first impression.",
      text: "Keep the message brief and use the visual atmosphere to do the rest.",
      ctaLabel: "Enter Storefront",
      ctaHref: "/products",
    },
  },
  {
    type: "featured-editorial",
    apiType: "featured",
    label: "Featured Editorial",
    category: "products",
    description: "Editorial-led featured assortment for the main storefront edit.",
    supportsRendering: true,
    defaultConfig: {
      title: "The Editorial Edit",
      text: "A refined cut of the products that define the current season.",
    },
  },
  {
    type: "featured-spotlight",
    apiType: "featured",
    label: "Featured Spotlight",
    category: "products",
    description: "Hero assortment with a stronger campaign framing.",
    supportsRendering: true,
    defaultConfig: {
      title: "Spotlight Products",
      text: "Pull forward the pieces you want shoppers to notice first.",
    },
  },
  {
    type: "featured-merch-wall",
    apiType: "featured",
    label: "Featured Merch Wall",
    category: "products",
    description: "Dense featured wall for showcasing a larger assortment at once.",
    supportsRendering: true,
    defaultConfig: {
      title: "Merch Wall",
      text: "Use a product-heavy presentation when breadth matters more than story.",
    },
  },
  {
    type: "category-showcase",
    apiType: "featured",
    label: "Category Showcase",
    category: "products",
    description: "Category-led merchandising layout for broad browsing flows.",
    variant: "category-grid",
    supportsRendering: true,
    defaultConfig: {
      variant: "category-grid",
      title: "Category Showcase",
      text: "Help shoppers jump straight into the right product family.",
    },
  },
  {
    type: "arrivals-compact",
    apiType: "arrivals",
    label: "Arrivals Compact",
    category: "products",
    description: "Tighter arrivals grid for denser launch merchandising.",
    supportsRendering: true,
    defaultConfig: {
      eyebrow: "Fresh In",
      title: "Latest Pieces",
      text: "A fast-scan release grid for customers checking what just landed.",
    },
  },
  {
    type: "arrivals-spotlight",
    apiType: "arrivals",
    label: "Arrivals Spotlight",
    category: "products",
    description: "Dark arrivals section for premium drop presentations.",
    variant: "arrivals-spotlight",
    supportsRendering: true,
    defaultConfig: {
      variant: "arrivals-spotlight",
      eyebrow: "New Season",
      title: "Dark Arrival Edit",
      text: "Present incoming pieces with more atmosphere and stronger contrast.",
    },
  },
  {
    type: "fresh-drop-highlight",
    apiType: "fresh-release",
    label: "Fresh Drop Highlight",
    category: "products",
    description: "Curated release grid for high-priority launch pieces.",
    supportsRendering: true,
    defaultConfig: {
      title: "Fresh Drop Highlight",
      text: "Use this when a smaller group of launch products deserves its own block.",
    },
  },
  {
    type: "testimonial-cards",
    apiType: "testimonial",
    label: "Testimonial Cards",
    category: "content",
    description: "Luxury testimonial layout with quote cards and short roles.",
    supportsRendering: true,
    defaultConfig: {
      title: "Client Notes",
      text: "Subtle proof for premium product pages and landing flows.",
      items: [],
    },
  },
  {
    type: "testimonial-marquee",
    apiType: "testimonial",
    label: "Testimonial Marquee",
    category: "content",
    description: "More expressive social-proof section for premium brand storytelling.",
    supportsRendering: true,
    defaultConfig: {
      title: "Observed by Customers",
      text: "Use real reactions to reinforce quality and trust without clutter.",
      items: [],
    },
  },
  {
    type: "faq-minimal",
    apiType: "faq",
    label: "FAQ Minimal",
    category: "content",
    description: "Lean FAQ block for the most important purchasing questions.",
    supportsRendering: true,
    defaultConfig: {
      title: "Quick Answers",
      text: "Cover shipping, payment, and returns without taking over the page.",
      items: [],
    },
  },
  {
    type: "faq-detailed",
    apiType: "faq",
    label: "FAQ Detailed",
    category: "content",
    description: "Expanded FAQ section for delivery, exchange, and order confidence.",
    supportsRendering: true,
    defaultConfig: {
      title: "Detailed Support Answers",
      text: "Useful for pages with more customer questions before checkout.",
      items: [],
    },
  },
  {
    type: "cta-pill",
    apiType: "campaign",
    label: "CTA Pill Banner",
    category: "content",
    description: "Compact callout with rounded CTA styling for store actions.",
    variant: "cta-pill",
    supportsRendering: true,
    defaultConfig: {
      variant: "cta-pill",
      title: "Private release now live.",
      text: "Use this for focused calls to action between larger sections.",
      ctaLabel: "Shop the Edit",
      ctaHref: "/products",
    },
  },
  {
    type: "cta-split",
    apiType: "campaign",
    label: "CTA Split Banner",
    category: "content",
    description: "Split campaign callout with content on one side and media on the other.",
    variant: "cta-split",
    supportsRendering: true,
    defaultConfig: {
      variant: "cta-split",
      title: "A cleaner campaign handoff.",
      text: "Pair a single message with a strong supporting image.",
      ctaLabel: "Explore the Story",
      ctaHref: "/gallery",
    },
  },
  {
    type: "campaign-sale",
    apiType: "campaign",
    label: "Campaign Sale Banner",
    category: "content",
    description: "Promotion-first banner for discounts, launches, and limited offers.",
    badge: "new",
    variant: "campaign-sale",
    supportsRendering: true,
    defaultConfig: {
      variant: "campaign-sale",
      title: "Limited release offer.",
      text: "Use this for short sale windows, bonus offers, or event-driven pushes.",
      ctaLabel: "Claim the Offer",
      ctaHref: "/products",
    },
  },
  {
    type: "campaign-poster",
    apiType: "campaign",
    label: "Campaign Poster",
    category: "content",
    description: "Poster-like campaign block with larger art direction.",
    variant: "campaign-poster",
    supportsRendering: true,
    defaultConfig: {
      variant: "campaign-poster",
      title: "Frame a single campaign moment.",
      text: "A stronger poster composition for collection launches and campaign drops.",
      ctaLabel: "View the Campaign",
      ctaHref: "/gallery",
    },
  },
  {
    type: "gallery-masonry",
    apiType: "gallery",
    label: "Gallery Masonry",
    category: "media",
    description: "Asymmetric image wall for lookbooks and collabs.",
    supportsRendering: true,
    defaultConfig: {
      title: "Masonry Gallery",
      text: "Best for mixing campaign, studio, and product imagery in one sequence.",
      images: [],
    },
  },
  {
    type: "gallery-collage",
    apiType: "gallery",
    label: "Gallery Collage",
    category: "media",
    description: "Tighter image collage for busier editorial storytelling.",
    variant: "gallery-collage",
    supportsRendering: true,
    defaultConfig: {
      variant: "gallery-collage",
      title: "Campaign Collage",
      text: "Layer multiple visual moments without losing the overall rhythm.",
      images: [],
    },
  },
  {
    type: "gallery-lookbook",
    apiType: "gallery",
    label: "Gallery Lookbook",
    category: "media",
    description: "Lookbook-style visual sequence for apparel and studio shoots.",
    variant: "gallery-lookbook",
    supportsRendering: true,
    defaultConfig: {
      variant: "gallery-lookbook",
      title: "Lookbook Frames",
      text: "Use repeated image rhythm to build a stronger fashion-editorial pace.",
      images: [],
    },
  },
  {
    type: "video-spotlight",
    apiType: "video",
    label: "Video Spotlight",
    category: "media",
    description: "Primary video feature for brand or campaign film.",
    supportsRendering: true,
    defaultConfig: {
      title: "Video Spotlight",
      text: "Anchor the page with motion when the film is part of the story.",
      url: "",
    },
  },
  {
    type: "video-story",
    apiType: "video",
    label: "Video Story Block",
    category: "media",
    description: "Narrative video block paired with supporting copy and CTA.",
    variant: "video-story",
    supportsRendering: true,
    defaultConfig: {
      variant: "video-story",
      title: "Campaign Story",
      text: "Use motion to deepen the collection narrative, not just decorate the page.",
      url: "",
      ctaLabel: "Watch the Story",
      ctaHref: "/gallery",
    },
  },
  {
    type: "countdown-launch",
    apiType: "countdown",
    label: "Countdown Launch",
    category: "interactive",
    description: "Timed launch module for capsule drops and event releases.",
    supportsRendering: true,
    defaultConfig: {
      eyebrow: "Timed Launch",
      title: "Next capsule opens soon.",
      text: "Use a live countdown for release-driven shopping moments.",
      targetDate: "",
    },
  },
  {
    type: "countdown-promo",
    apiType: "countdown",
    label: "Countdown Promo",
    category: "interactive",
    description: "Promotional countdown for short offers or high-urgency sales.",
    supportsRendering: true,
    defaultConfig: {
      eyebrow: "Offer Window",
      title: "This offer ends shortly.",
      text: "Great for events, gift windows, and sale closings.",
      targetDate: "",
    },
  },
  {
    type: "map-showroom",
    apiType: "map",
    label: "Map Showroom",
    category: "interactive",
    description: "Showroom location section with map, address, and hours.",
    supportsRendering: true,
    defaultConfig: {
      title: "Showroom Directions",
      text: "Give customers a clear physical destination for pickups or visits.",
      address: "Khusibu, Nayabazar, Kathmandu, Nepal",
      hours: "Mon — Sat · 11:00 AM — 7:00 PM",
    },
  },
  {
    type: "map-appointment",
    apiType: "map",
    label: "Map Appointment",
    category: "interactive",
    description: "Location block positioned as an appointment or studio visit CTA.",
    supportsRendering: true,
    defaultConfig: {
      title: "Book a Studio Visit",
      text: "Use your physical space as part of the premium buying journey.",
      address: "Khusibu, Nayabazar, Kathmandu, Nepal",
      hours: "By appointment or during posted studio hours",
      ctaLabel: "Plan Your Visit",
    },
  },
  {
    type: "ticker-sale",
    apiType: "ticker",
    label: "Ticker Sale",
    category: "utility",
    description: "Scrolling sale messaging for high-urgency announcements.",
    supportsRendering: true,
    defaultConfig: {
      items: ["Limited offer live now", "Selected pieces discounted", "Ends this weekend"],
    },
  },
  {
    type: "ticker-shipping",
    apiType: "ticker",
    label: "Ticker Shipping",
    category: "utility",
    description: "Scrolling shipping and order-confidence messaging.",
    supportsRendering: true,
    defaultConfig: {
      items: ["Nationwide shipping", "Fast dispatch on active pieces", "Easy exchange support"],
    },
  },
  {
    type: "divider-line",
    apiType: "campaign",
    label: "Divider Line",
    category: "utility",
    description: "Minimal section break with label and line rhythm.",
    variant: "divider-line",
    supportsRendering: true,
    defaultConfig: {
      variant: "divider-line",
      title: "Collection Break",
    },
  },
  {
    type: "divider-monogram",
    apiType: "campaign",
    label: "Divider Monogram",
    category: "utility",
    description: "Decorative luxury divider with a stronger brand accent.",
    variant: "divider-monogram",
    supportsRendering: true,
    defaultConfig: {
      variant: "divider-monogram",
      title: "Rare Atelier",
    },
  },
  {
    type: "text-editorial",
    apiType: "text-block",
    label: "Text Editorial",
    category: "utility",
    description: "Single-column editorial copy for brand and campaign writing.",
    supportsRendering: true,
    defaultConfig: {
      title: "Editorial Statement",
      text: "Use this section for a stronger story beat between merchandising blocks.",
      content: "Rare Atelier builds each release with a more editorial eye, balancing product clarity with a deliberate luxury tone.",
    },
  },
  {
    type: "text-columns",
    apiType: "text-block",
    label: "Text Columns",
    category: "utility",
    description: "Two-column rich text section for longer brand or product copy.",
    variant: "text-columns",
    supportsRendering: true,
    defaultConfig: {
      variant: "text-columns",
      title: "Brand Depth",
      text: "Break longer storytelling into a calmer reading layout.",
      content: "Rare Atelier approaches product and presentation together.\n\nEvery page should help customers understand the collection, the offer, and the brand point of view without overwhelming them.",
    },
  },
  {
    type: "services-pillars",
    apiType: "services",
    label: "Services Pillars",
    category: "utility",
    description: "Support-focused service block emphasizing trust and operations.",
    supportsRendering: true,
    defaultConfig: {
      title: "Service Pillars",
      text: "Highlight delivery, exchange, and support in a cleaner service layout.",
    },
  },
  {
    type: "services-dark",
    apiType: "services",
    label: "Services Dark",
    category: "utility",
    description: "Dark premium services section for luxury landing pages.",
    variant: "services-dark",
    supportsRendering: true,
    defaultConfig: {
      variant: "services-dark",
      title: "Premium Service",
      text: "Present delivery and support with a stronger dark storefront mood.",
    },
  },
  {
    type: "contact-editorial",
    apiType: "contact",
    label: "Contact Editorial",
    category: "interactive",
    description: "Contact block positioned as a premium concierge or studio contact.",
    supportsRendering: true,
    defaultConfig: {
      title: "Speak With the Studio",
      text: "Frame contact as a considered service touchpoint.",
    },
  },
  {
    type: "back-to-top-minimal",
    apiType: "back-to-top",
    label: "Back To Top Minimal",
    category: "utility",
    description: "Cleaner return-to-top block with restrained visual weight.",
    supportsRendering: true,
    defaultConfig: {
      title: "Back to Top",
      text: "Finish the page with a minimal visual reset.",
    },
  },
];

SECTION_TYPES.push(...SECTION_LIBRARY_EXPANSION);

export function getSectionVariant(config: Record<string, unknown> | null | undefined) {
  return typeof config?.variant === "string" ? config.variant : null;
}

export function getSectionTypeDefinitionById(type: SectionType) {
  return SECTION_TYPES.find((entry) => entry.type === type);
}

export function resolveSectionTypeDefinition(section: {
  sectionType: string;
  config?: Record<string, unknown> | null;
}) {
  const variant = getSectionVariant(section.config);

  return (
    SECTION_TYPES.find(
      (entry) =>
        entry.apiType === section.sectionType &&
        (entry.variant ? entry.variant === variant : true),
    ) ??
    SECTION_TYPES.find((entry) => entry.apiType === section.sectionType) ??
    null
  );
}

export function getSectionLabel(section: {
  sectionType: string;
  label?: string | null;
  config?: Record<string, unknown> | null;
}) {
  return section.label || resolveSectionTypeDefinition(section)?.label || section.sectionType;
}
