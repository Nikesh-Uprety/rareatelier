import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, MapPin, Phone, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject is too short"),
  message: z.string().min(10, "Message is too short"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function Contact() {
  const { toast } = useToast();
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
    console.log("Contact form submission:", data);
    toast({
      title: "Message Sent",
      description: "Thank you for reaching out. We'll get back to you soon.",
    });
    form.reset();
  };

  return (
    <div className="flex-1">
      {/* About Us Section */}
      <section className="py-24 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
                About Rare Atelier
              </p>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Crafting the Future of Nepali Streetwear
              </h1>
            </div>
            
            <div className="space-y-6 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto font-mono">
              <p>
                Rare Atelier (RARE.NP) is a premium streetwear label born in the heart of Kathmandu. 
                We blend traditional Nepali resilience with modern industrial aesthetics to create 
                garments that stand at the intersection of heritage and high-fashion.
              </p>
              <p>
                Every piece is a testament to our commitment to quality, durability, and the 
                unique spirit of the urban Himalayan lifestyle. We don't just make clothes; 
                we curate an identity for those who dare to be rare.
              </p>
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
                    <p className="text-sm font-mono">hello@rare.np</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Our Atelier</p>
                    <p className="text-sm font-mono leading-relaxed">
                      Kathmandu, Nepal<br />
                      Urban District 44600
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Call Us</p>
                    <p className="text-sm font-mono">+977 (01) 456-7890</p>
                  </div>
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
                  className="w-full h-14 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl uppercase tracking-[0.3em] font-bold transition-all"
                >
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
