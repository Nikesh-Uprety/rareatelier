import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
  fullScreen?: boolean;
  className?: string;
}

export function BrandedLoader({ fullScreen = false, className }: BrandedLoaderProps) {
  const brandName = "RARE ATELIER";
  
  return (
    <div className={cn(
      fullScreen 
        ? "fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-4" 
        : "w-full py-16 flex flex-col items-center justify-center p-4",
      className
    )}>
      <div className="flex justify-center mb-6 overflow-hidden h-8">
        {brandName.split("").map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ 
              duration: 0.5, 
              delay: i * 0.04,
              repeat: Infinity,
              repeatDelay: 1.5,
              repeatType: "reverse",
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="text-lg md:text-xl font-bold tracking-[0.3em] uppercase font-serif inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </div>
      
      <div className="loader-bar-container w-40 md:w-48 h-[1px] bg-muted/20 overflow-hidden relative">
        <motion.div
          initial={{ left: "-100%" }}
          animate={{ left: "100%" }}
          transition={{ 
            duration: 1.8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-0 h-full w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      </div>
      
      <div className="mt-5 flex items-center justify-center overflow-hidden">
        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50 font-light font-sans">
          Curating
        </span>
      </div>
    </div>
  );
}
