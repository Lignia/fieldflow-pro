import { type LucideIcon } from "lucide-react";
import { type ComponentType, type SVGProps } from "react";
import { cn } from "@/lib/utils";

type TradeIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const sizeMap = {
  xs: { icon: 14, container: "h-6 w-6" },
  sm: { icon: 16, container: "h-8 w-8" },
  md: { icon: 20, container: "h-10 w-10" },
  lg: { icon: 24, container: "h-12 w-12" },
  xl: { icon: 28, container: "h-14 w-14" },
} as const;

const colorMap = {
  default: "text-foreground",
  muted: "text-muted-foreground",
  primary: "text-primary",
  accent: "text-accent",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
} as const;

const bgMap = {
  default: "bg-muted/60",
  primary: "bg-primary/10",
  accent: "bg-accent/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  info: "bg-info/10",
  destructive: "bg-destructive/10",
} as const;

const animationMap = {
  none: "",
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  "hover-rotate": "transition-transform duration-300 group-hover:rotate-12",
  "hover-scale": "transition-transform duration-200 group-hover:scale-110",
  "hover-shake": "transition-transform duration-200 group-hover:animate-[shake_0.4s_ease-in-out]",
} as const;

export interface IconProps {
  /** Lucide icon or custom trade icon */
  icon: LucideIcon | TradeIcon;
  /** Preset size */
  size?: keyof typeof sizeMap;
  /** Semantic color */
  color?: keyof typeof colorMap;
  /** Show rounded background container */
  contained?: boolean;
  /** Background color when contained */
  bg?: keyof typeof bgMap;
  /** Animation preset */
  animation?: keyof typeof animationMap;
  /** Additional className */
  className?: string;
  /** Additional container className */
  containerClassName?: string;
}

export function Icon({
  icon: IconComponent,
  size = "md",
  color = "default",
  contained = false,
  bg = "default",
  animation = "none",
  className,
  containerClassName,
}: IconProps) {
  const { icon: iconSize, container } = sizeMap[size];

  const iconElement = (
    <IconComponent
      size={iconSize}
      className={cn(colorMap[color], animationMap[animation], className)}
    />
  );

  if (!contained) return iconElement;

  return (
    <div
      className={cn(
        "group inline-flex items-center justify-center rounded-xl",
        container,
        bgMap[bg],
        containerClassName
      )}
    >
      {iconElement}
    </div>
  );
}
