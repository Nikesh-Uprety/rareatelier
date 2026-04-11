import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactInfoProps {
  showMap?: boolean;
  config?: Record<string, any>;
}

export default function ContactInfo({ showMap = true, config }: ContactInfoProps) {
  const { toast } = useToast();
  const variant = typeof config?.variant === "string" ? config.variant : "";
  const isEditorial = variant === "contact-editorial";
  const eyebrow =
    typeof config?.eyebrow === "string" && config.eyebrow.trim()
      ? config.eyebrow.trim()
      : "Contact";
  const title =
    typeof config?.title === "string" && config.title.trim()
      ? config.title.trim()
      : "Get in Touch";
  const intro =
    typeof config?.text === "string" && config.text.trim()
      ? config.text.trim()
      : "Have a question about an order or just want to say hi? Our team is here to help.";
  const emailAddress =
    typeof config?.email === "string" && config.email.trim()
      ? config.email.trim()
      : "rarenepal999@gmail.com";
  const phoneNumber =
    typeof config?.phone === "string" && config.phone.trim()
      ? config.phone.trim()
      : "(+977)-9705208960";
  const addressLines = Array.isArray(config?.addressLines)
    ? config.addressLines
        .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
        .map((line) => line.trim())
    : ["Khusibu, Nayabazar", "Kathmandu, Nepal"];
  const facebookUrl =
    typeof config?.facebookUrl === "string" && config.facebookUrl.trim()
      ? config.facebookUrl.trim()
      : "https://www.facebook.com/rarenp";
  const instagramUrl =
    typeof config?.instagramUrl === "string" && config.instagramUrl.trim()
      ? config.instagramUrl.trim()
      : "https://www.instagram.com/rareofficial.au/";
  const tiktokUrl =
    typeof config?.tiktokUrl === "string" && config.tiktokUrl.trim()
      ? config.tiktokUrl.trim()
      : "https://www.tiktok.com/@rare.np";
  const shouldShowMap =
    typeof config?.showMap === "boolean" ? config.showMap : showMap;
  const shellClassName = isEditorial ? "bg-[#050505] text-white" : "bg-background";
  const eyebrowClassName = isEditorial
    ? "text-[10px] uppercase tracking-[0.35em] text-[#c9a84c] font-semibold mb-4"
    : "text-[10px] uppercase tracking-[0.35em] text-muted-foreground font-semibold mb-4";
  const titleClassName = isEditorial
    ? "text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white"
    : "text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight";
  const dividerClassName = isEditorial ? "mt-6 w-16 h-0.5 bg-[#c9a84c]/40 mx-auto rounded-full" : "mt-6 w-16 h-0.5 bg-muted-foreground/30 mx-auto rounded-full";
  const infoCardClassName = isEditorial
    ? "bg-white/[0.04] border border-white/10 p-8 md:p-10 rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.45)] self-start backdrop-blur-sm"
    : "bg-card border border-border p-8 md:p-10 rounded-2xl shadow-sm self-start";
  const iconWrapClassName = isEditorial
    ? "w-10 h-10 rounded-full bg-[#c9a84c]/12 border border-[#c9a84c]/25 flex items-center justify-center text-[#f4d38d] shrink-0"
    : "w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] shrink-0";
  const socialLinkClassName = isEditorial
    ? "p-2 rounded-full border border-white/12 hover:bg-white/[0.06] transition-colors"
    : "p-2 rounded-full border border-border hover:bg-muted transition-colors";
  const inputClassName = isEditorial
    ? "bg-white/[0.03] border-white/10 rounded-xl h-12 text-white placeholder:text-white/40"
    : "bg-background border-border rounded-xl h-12";
  const textareaClassName = isEditorial
    ? "bg-white/[0.03] border-white/10 rounded-xl min-h-[150px] resize-none text-white placeholder:text-white/40"
    : "bg-background border-border rounded-xl min-h-[150px] resize-none";
  const submitClassName = isEditorial
    ? "w-full h-14 bg-white text-black hover:bg-white/90 rounded-xl uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50"
    : "w-full h-14 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50";

  const mutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Thank you for reaching out. We'll get back to you soon.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    mutation.mutate(data);
  };

  return (
    <div className={shellClassName}>
      <div className="container mx-auto px-4 max-w-6xl py-24 md:py-32">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <p className={eyebrowClassName}>{eyebrow}</p>
          <h2 className={titleClassName}>{title}</h2>
          <div className={dividerClassName} />
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20">
          {/* Contact Information */}
          <div className="space-y-10">
            <p className={isEditorial ? "text-white/66 text-sm leading-relaxed" : "text-muted-foreground text-sm leading-relaxed"}>
              {intro}
            </p>

            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className={iconWrapClassName}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1"}>
                    Email Us
                  </p>
                  <p className="text-sm leading-relaxed">{emailAddress}</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-4">
                <div className={iconWrapClassName}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1"}>
                    Our Atelier
                  </p>
                  <p className="text-sm leading-relaxed">
                    {addressLines.map((line, index) => (
                      <span key={`${line}-${index}`}>
                        {line}
                        {index < addressLines.length - 1 ? <br /> : null}
                      </span>
                    ))}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className={iconWrapClassName}>
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1"}>
                    Call Us
                  </p>
                  <p className="text-sm leading-relaxed">{phoneNumber}</p>

                  <div className="flex gap-3 mt-4">
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={socialLinkClassName}
                      aria-label="Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={socialLinkClassName}
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                    <a
                      href={tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={socialLinkClassName}
                      aria-label="TikTok"
                    >
                      <Music2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Map */}
            {shouldShowMap && (
              <div className={isEditorial ? "rounded-[28px] overflow-hidden border border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.35)] h-[220px] w-full" : "rounded-2xl overflow-hidden border border-border shadow-sm h-[220px] w-full"}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3531.8123!2d85.3094!3d27.7214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb18fc!2sKhusibu%2C%20Kathmandu!5e0!3m2!1sen!2snp!4v1710100000000!5m2!1sen!2snp"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Rare Atelier Location"
                />
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className={infoCardClassName}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground"}>
                    Name
                  </label>
                  <Input
                    {...form.register("name")}
                    placeholder="Your Name"
                    className={inputClassName}
                  />
                  {form.formState.errors.name && (
                    <p className="text-[10px] text-red-500 uppercase">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground"}>
                    Email
                  </label>
                  <Input
                    {...form.register("email")}
                    placeholder="Your Email"
                    className={inputClassName}
                  />
                  {form.formState.errors.email && (
                    <p className="text-[10px] text-red-500 uppercase">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground"}>
                  Subject
                </label>
                <Input
                  {...form.register("subject")}
                  placeholder="How can we help?"
                  className={inputClassName}
                />
                {form.formState.errors.subject && (
                  <p className="text-[10px] text-red-500 uppercase">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={isEditorial ? "text-[10px] uppercase tracking-widest font-bold text-white/45" : "text-[10px] uppercase tracking-widest font-bold text-muted-foreground"}>
                  Message
                </label>
                <Textarea
                  {...form.register("message")}
                  placeholder="Tell us more..."
                  className={textareaClassName}
                />
                {form.formState.errors.message && (
                  <p className="text-[10px] text-red-500 uppercase">
                    {form.formState.errors.message.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className={submitClassName}
              >
                {mutation.isPending ? "Sending..." : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </div>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
