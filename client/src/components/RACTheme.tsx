import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useRef, useState } from "react";

interface ComicPanelProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  variant?: "default" | "dark" | "accent" | "ghost";
  shadow?: "sm" | "md" | "lg";
  noBorder?: boolean;
  id?: string;
  onClick?: () => void;
  "data-testid"?: string;
}

export function ComicPanel({
  children,
  className,
  header,
  variant = "default",
  shadow = "md",
  noBorder = false,
  id,
  onClick,
  "data-testid": testId,
}: ComicPanelProps) {
  const variantStyles = {
    default: "bg-card border-black",
    dark: "bg-[hsl(204,27%,16%)] text-white border-black",
    accent: "bg-gradient-to-br from-[hsl(209,90%,38%)] to-[hsl(190,65%,47%)] text-white border-black",
    ghost: "bg-transparent border-[hsl(204,27%,16%,0.08)]",
  };

  const shadowOffsets = {
    sm: "translate-x-1 -translate-y-1",
    md: "translate-x-2 -translate-y-2",
    lg: "translate-x-2 -translate-y-2",
  };

  const hasHeightClass = className?.includes('h-full') || className?.includes('flex-1');
  
  return (
    <div
      id={id}
      onClick={onClick}
      className={cn("relative group break-inside-avoid", hasHeightClass && "h-full flex flex-col")}
    >
      {/* Background Shadow Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A5DB8] to-[#2BB0C7] rounded-lg transition-all duration-200 translate-x-2 -translate-y-2 rotate-2 group-hover:from-[#FD66C5] group-hover:to-[#FBA3F0] pl-[84px] pr-[84px]" />
      {/* Card Layer */}
      <div
        className={cn(
          "relative rounded-lg transition-all duration-200",
          !noBorder && "border-2",
          variantStyles[variant],
          hasHeightClass && "flex-1 flex flex-col",
          className
        )}
        data-testid={testId || "comic-panel"}
      >
        {header && (
          <div className="border-b border-inherit px-5 py-3 font-heading text-lg uppercase tracking-wide">
            {header}
          </div>
        )}
        <div className={cn("p-5", hasHeightClass && "flex-1")}>{children}</div>
      </div>
    </div>
  );
}

interface TitleCardProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
  variant?: "default" | "accent" | "light";
  underline?: boolean;
  animate?: boolean;
}

export function TitleCard({
  children,
  className,
  as: Component = "h2",
  variant = "default",
  underline = true,
  animate = true,
}: TitleCardProps) {
  const [isVisible, setIsVisible] = useState(!animate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [animate]);

  const variantStyles = {
    default: "text-foreground",
    accent: "text-[hsl(209,90%,38%)]",
    light: "text-white",
  };

  const underlineStyles = {
    default: "bg-[hsl(209,90%,38%)]",
    accent: "bg-[hsl(44,89%,61%)]",
    light: "bg-white",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative inline-block",
        animate && !isVisible && "opacity-0",
        animate && isVisible && "animate-slide-in-left"
      )}
      data-testid="title-card"
    >
      <Component
        className="font-heading uppercase tracking-wide font-bold text-3xl text-center mt-[4px] mb-[4px] text-[#0b60b8]"
      >
        {children}
      </Component>
    </div>
  );
}

interface DiagonalSeparatorProps {
  className?: string;
  direction?: "down" | "up";
  variant?: "primary" | "dark" | "light" | "gradient";
  height?: number;
  flip?: boolean;
}

export function DiagonalSeparator({
  className,
  direction = "down",
  variant = "primary",
  height = 80,
  flip = false,
}: DiagonalSeparatorProps) {
  const variantColors = {
    primary: "fill-[hsl(209,90%,38%)]",
    dark: "fill-[hsl(204,27%,16%)]",
    light: "fill-white",
    gradient: "fill-[url(#diagonalGradient)]",
  };

  const clipPath = direction === "down" 
    ? "polygon(0 0, 100% 0, 100% 100%, 0 60%)"
    : "polygon(0 40%, 100% 0, 100% 100%, 0 100%)";

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ height: `${height}px` }}
      data-testid="diagonal-separator"
    >
      {variant === "gradient" ? (
        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <defs>
            <linearGradient id="diagonalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(209, 90%, 38%)" />
              <stop offset="100%" stopColor="hsl(190, 65%, 47%)" />
            </linearGradient>
          </defs>
          <polygon
            points={direction === "down" 
              ? "0,0 100,0 100,100 0,60"
              : "0,40 100,0 100,100 0,100"}
            fill="url(#diagonalGradient)"
          />
        </svg>
      ) : (
        <div
          className={cn("absolute inset-0", variantColors[variant])}
          style={{
            clipPath,
            backgroundColor: variant === "primary" 
              ? "hsl(209, 90%, 38%)" 
              : variant === "dark" 
                ? "hsl(204, 27%, 16%)" 
                : "white",
          }}
        />
      )}
    </div>
  );
}

interface RACReviewPanelProps {
  quote: string;
  author: string;
  authorImage?: string;
  rating: number;
  className?: string;
}

export function RACReviewPanel({
  quote,
  author,
  authorImage,
  rating,
  className,
}: RACReviewPanelProps) {
  return (
    <ComicPanel
      className={cn("relative overflow-hidden", className)}
      variant="default"
      shadow="md"
    >
      <div className="absolute top-4 left-4 text-6xl font-serif text-[hsl(209,90%,38%)] opacity-20 leading-none select-none">
        "
      </div>
      
      <div className="relative z-10 pt-6">
        <div className="flex mb-3">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={cn(
                "w-5 h-5",
                i < rating ? "text-[hsl(44,89%,61%)]" : "text-gray-300"
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        <p className="text-foreground text-lg leading-relaxed mb-4 italic">
          "{quote}"
        </p>

        <div className="flex items-center gap-3 pt-3 border-t border-border">
          {authorImage ? (
            <img
              src={authorImage}
              alt={author}
              className="w-12 h-12 rounded-lg object-cover border-2 border-[hsl(209,90%,38%,0.2)]"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[hsl(209,90%,38%)] flex items-center justify-center text-white font-heading text-lg">
              {author.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-heading text-sm uppercase tracking-wide text-[hsl(209,90%,38%)]">
              RAC Review
            </p>
            <p className="font-medium text-foreground">{author}</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 text-6xl font-serif text-[hsl(209,90%,38%)] opacity-20 leading-none rotate-180 select-none">
        "
      </div>
    </ComicPanel>
  );
}

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  children?: ReactNode;
  className?: string;
  overlay?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  backgroundImage,
  children,
  className,
  overlay = true,
}: HeroSectionProps) {
  return (
    <section
      className={cn(
        "relative min-h-[60vh] flex items-center justify-center overflow-hidden grain-texture",
        className
      )}
      data-testid="hero-section"
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(204,27%,16%,0.9)] via-[hsl(209,90%,38%,0.7)] to-[hsl(190,65%,47%,0.6)]" />
      )}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="font-display md:text-7xl lg:text-8xl text-white uppercase tracking-wider mb-4 animate-slide-up text-[90px]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl md:text-2xl text-white/90 font-light max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {subtitle}
          </p>
        )}
        {children && (
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
}: FeatureCardProps) {
  return (
    <ComicPanel className={cn("hover-lift", className)} variant="default" shadow="sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[hsl(209,90%,38%)] flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h3 className="font-heading text-lg uppercase tracking-wide text-foreground mb-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </ComicPanel>
  );
}


