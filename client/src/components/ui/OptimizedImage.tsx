import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackExt?: 'png' | 'jpg' | 'jpeg';
  className?: string;
  priority?: boolean;
}

export const OptimizedImage = ({ 
  src, 
  alt, 
  fallbackExt = 'png', 
  className, 
  priority = false,
  ...props 
}: OptimizedImageProps) => {
  // Extract the base path and filename without extension
  const basePath = src.split('.').slice(0, -1).join('.');
  const webpPath = `${basePath}.webp`;

  return (
    <picture>
      <source srcSet={webpPath} type="image/webp" />
      <source srcSet={src} type={`image/${fallbackExt === 'jpg' ? 'jpeg' : fallbackExt}`} />
      <img 
        src={src} 
        alt={alt} 
        className={cn("w-full h-full object-cover", className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        {...props}
      />
    </picture>
  );
};
