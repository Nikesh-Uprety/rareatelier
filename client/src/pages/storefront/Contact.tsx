import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
  
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

  const [expanded, setExpanded] = useState<number | null>(null);

  const milestones = [
    {
      year: "2021",
      title: "Founded in Kathmandu",
      desc: "Rare Atelier began in Kathmandu, crafting garments that merge Nepali heritage with contemporary streetwear.",
      image: "https://picsum.photos/seed/kathmandu1/800/600",
    },
    {
      year: "2022",
      title: "Debut Collection",
      desc: "Launched our first collection focusing on durable fabrics and industrial aesthetics rooted in local craftsmanship.",
      image: "https://picsum.photos/seed/kathmandu2/800/600",
    },
    {
      year: "2023",
      title: "Online Store",
      desc: "Opened our online store to bring Rare Atelier beyond Kathmandu, while keeping production local and ethical.",
      image: "https://picsum.photos/seed/kathmandu3/800/600",
    },
    {
      year: "2024",
      title: "Community & Future",
      desc: "Expanding collaborations with local artisans and exploring sustainable materials for future drops.",
      image: "https://picsum.photos/seed/kathmandu4/800/600",
    },
  ];

  const statsTargets = {
    customers: 12450,
    instagram: 8230,
    orders: 21450,
  };

  function AnimatedStat({ target, label }: { target: number; label: string }) {
    const [value, setValue] = useState(0);
    useEffect(() => {
      let start: number | null = null;
      const duration = 1200;
      let raf = 0;
      function tick(ts: number) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const current = Math.floor(progress * target);
        setValue(current);
        if (progress < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [target]);

    return (
      <div className="min-w-[110px]">
        <div className="text-2xl md:text-3xl font-extrabold">{value.toLocaleString()}</div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* About Us Section (Interactive Hero: timeline + story) */}
      <section className="py-24 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Timeline (left) */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold mb-4">Our Journey</p>
              <ul className="space-y-4">
                {milestones.map((m, idx) => (
                  <li key={idx} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[var(--accent)] mt-2" />
                        <div className="w-px bg-[var(--border)] flex-1 mt-2" />
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === idx ? null : idx)}
                          className="w-full text-left p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:shadow-md transition"
                          aria-expanded={expanded === idx}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">{m.year}</p>
                              <h3 className="text-lg font-bold mt-1">{m.title}</h3>
                            </div>
                            <div className="text-xl text-muted-foreground font-bold">{expanded === idx ? "—" : "+"}</div>
                          </div>
                          <div className={`mt-3 text-sm text-muted-foreground transition-all overflow-hidden ${expanded === idx ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                            {m.desc}
                          </div>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Story / CTA (right) */}
            <div className="space-y-6">
              {expanded !== null ? (
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm">
                  <img src={milestones[expanded].image} alt={milestones[expanded].title} className="w-full h-64 object-cover transition-opacity duration-300" />
                  <div className="p-4 bg-[var(--bg-card)]">
                    <h3 className="text-lg font-bold">{milestones[expanded].title} <span className="text-sm text-muted-foreground">({milestones[expanded].year})</span></h3>
                    <p className="text-sm text-muted-foreground mt-2">{milestones[expanded].desc}</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">About Rare Atelier</p>
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight">Crafting the Future of Nepali Streetwear</h2>

                  <div className="flex gap-6 items-center">
                    <AnimatedStat target={statsTargets.customers} label="Customers" />
                    <AnimatedStat target={statsTargets.instagram} label="Instagram" />
                    <AnimatedStat target={statsTargets.orders} label="Orders" />
                  </div>

                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-mono">
                    We blend Nepali resilience and industrial aesthetics to produce garments that are
                    durable, thoughtfully made, and unapologetically expressive. Each piece reflects
                    local craft and modern design — curated for those who value authenticity.
                  </p>
                  <div className="flex gap-4">
                    <a href="https://www.google.com/maps/search/?api=1&query=Khusibu+Kathmandu+Nepal" target="_blank" rel="noopener noreferrer" className="inline-block px-5 py-3 bg-black text-white rounded-xl font-bold hover:opacity-90 transition">Visit Atelier</a>
                    <a href="https://www.instagram.com/rare.np/" target="_blank" rel="noreferrer" className="inline-block px-5 py-3 border border-[var(--border)] rounded-xl font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition">Follow on Instagram</a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Info */}
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Get in Touch</h2>
                <p className="text-muted-foreground text-sm font-mono">
                  Have a question about an order or just want to say hi? 
                  Our team is here to help.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Email Us</p>
                    <p className="text-sm font-mono leading-relaxed">rarenepal999@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Our Atelier</p>
                    <p className="text-sm font-mono leading-relaxed">
                      Khusibu, Nayabazar<br />
                      Kathmandu, Nepal
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Call Us</p>
                    <p className="text-sm font-mono leading-relaxed">(+977)-9705208960</p>
                    
                    {/* Social Links */}
                    <div className="flex gap-4 mt-4">
                      <a href="https://www.facebook.com/rarenp" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Facebook className="w-4 h-4" />
                      </a>
                      <a href="https://www.instagram.com/rare.np/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a href="https://www.tiktok.com/@rare.np" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full border border-[var(--border)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <Music2 className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed */}
                <div className="mt-8 rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm h-[250px]">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3531.8123!2d85.3094!3d27.7214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb18fc!2sKhusibu%2C%20Kathmandu!5e0!3m2!1sen!2snp!4v1710100000000!5m2!1sen!2snp"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    title="Rare Atelier Location"
                  ></iframe>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] p-8 md:p-10 rounded-2xl shadow-sm">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Name</label>
                    <Input 
                      {...form.register("name")}
                      placeholder="Your Name"
                      className="bg-background/50 border-[var(--border)] rounded-xl h-12"
                    />
                    {form.formState.errors.name && (
                      <p className="text-[10px] text-red-500 uppercase">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Email</label>
                    <Input 
                      {...form.register("email")}
                      placeholder="Your Email"
                      className="bg-background/50 border-[var(--border)] rounded-xl h-12"
                    />
                    {form.formState.errors.email && (
                      <p className="text-[10px] text-red-500 uppercase">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Subject</label>
                  <Input 
                    {...form.register("subject")}
                    placeholder="How can we help?"
                    className="bg-background/50 border-[var(--border)] rounded-xl h-12"
                  />
                  {form.formState.errors.subject && (
                    <p className="text-[10px] text-red-500 uppercase">{form.formState.errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Message</label>
                  <Textarea 
                    {...form.register("message")}
                    placeholder="Tell us more..."
                    className="bg-background/50 border-[var(--border)] rounded-xl min-h-[150px] resize-none"
                  />
                  {form.formState.errors.message && (
                    <p className="text-[10px] text-red-500 uppercase">{form.formState.errors.message.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="w-full h-14 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl uppercase tracking-[0.3em] font-bold transition-all disabled:opacity-50"
                >
                  {mutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
