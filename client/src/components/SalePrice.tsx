import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";

interface SalePriceProps {
  originalPrice: number | string;
  salePrice?: number | string | null;
  saleEnabled?: boolean;
  saleStartDate?: Date | string | null;
  saleEndDate?: Date | string | null;
  showBadge?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function isSaleActive(
  saleEnabled?: boolean,
  saleStartDate?: Date | string | null,
  saleEndDate?: Date | string | null
): boolean {
  if (!saleEnabled) return false;
  
  const now = new Date();
  
  if (saleStartDate) {
    const startDate = new Date(saleStartDate);
    if (now < startDate) return false;
  }
  
  if (saleEndDate) {
    const endDate = new Date(saleEndDate);
    if (now > endDate) return false;
  }
  
  return true;
}

export function getEffectivePrice(
  originalPrice: number | string,
  salePrice?: number | string | null,
  saleEnabled?: boolean,
  saleStartDate?: Date | string | null,
  saleEndDate?: Date | string | null
): number {
  const original = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
  
  if (!salePrice || !isSaleActive(saleEnabled, saleStartDate, saleEndDate)) {
    return original;
  }
  
  const sale = typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice;
  return sale;
}

export function SalePrice({
  originalPrice,
  salePrice,
  saleEnabled,
  saleStartDate,
  saleEndDate,
  showBadge = true,
  size = "md",
  className = "",
}: SalePriceProps) {
  const original = typeof originalPrice === 'string' ? parseFloat(originalPrice) : originalPrice;
  const sale = salePrice ? (typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice) : null;
  
  const isOnSale = sale !== null && sale > 0 && isSaleActive(saleEnabled, saleStartDate, saleEndDate);
  
  const sizeClasses = {
    sm: {
      original: "text-sm",
      sale: "text-base font-bold",
      badge: "text-xs",
    },
    md: {
      original: "text-base",
      sale: "text-xl font-bold",
      badge: "text-xs",
    },
    lg: {
      original: "text-lg",
      sale: "text-2xl font-bold",
      badge: "text-sm",
    },
  };
  
  const classes = sizeClasses[size];
  
  if (!isOnSale) {
    return (
      <span className={`${classes.sale} text-primary ${className}`} data-testid="price-display">
        ${original.toFixed(2)}
      </span>
    );
  }
  
  // Guard against division by zero for free items
  const discountPercent = original > 0 ? Math.round((1 - sale! / original) * 100) : 0;
  
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} data-testid="sale-price-display">
      {showBadge && (
        <Badge variant="destructive" className={`${classes.badge} flex items-center gap-1`} data-testid="sale-badge">
          <Tag className="h-3 w-3" />
          SALE
        </Badge>
      )}
      <div className="flex items-center gap-2">
        <span 
          className={`${classes.original} text-muted-foreground line-through`}
          data-testid="original-price"
        >
          ${original.toFixed(2)}
        </span>
        <span 
          className={`${classes.sale} text-red-600 dark:text-red-500`}
          data-testid="sale-price"
        >
          ${sale!.toFixed(2)}
        </span>
        <span 
          className="text-xs text-green-600 dark:text-green-500 font-medium"
          data-testid="discount-percent"
        >
          ({discountPercent}% off)
        </span>
      </div>
    </div>
  );
}

export function SalePriceBadge({
  saleEnabled,
  saleStartDate,
  saleEndDate,
  className = "",
}: {
  saleEnabled?: boolean;
  saleStartDate?: Date | string | null;
  saleEndDate?: Date | string | null;
  className?: string;
}) {
  if (!isSaleActive(saleEnabled, saleStartDate, saleEndDate)) {
    return null;
  }
  
  return (
    <Badge 
      variant="destructive" 
      className={`flex items-center gap-1 ${className}`}
      data-testid="sale-badge-standalone"
    >
      <Tag className="h-3 w-3" />
      SALE
    </Badge>
  );
}
