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
      <div className="flex justify-center mb-6 h-10 items-center">
        <motion.span
          initial={{ opacity: 0, y: 15, letterSpacing: "0.8em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.3em", filter: "blur(0px)" }}
          transition={{
            duration: 1.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="text-lg md:text-2xl font-bold tracking-[0.3em] uppercase font-serif inline-block text-[#2C3E2D] dark:text-foreground"
        >
          {brandName}
        </motion.span>
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
        <motion.span 
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-muted-foreground/60 font-black font-sans"
        >
          Curating
        </motion.span>
      </div>
    </div>
  );
}
