import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useSEO, seoConfigs } from "@/hooks/use-seo";
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { SalePrice, isSaleActive, getEffectivePrice } from "@/components/SalePrice";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { useCart, type AddToCartItem } from "@/components/shopping-cart";
import type { CartItem, CartItemWithDetails } from "@shared/schema";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

interface Product {
  id: string;
  title: string;
  description: string;
  images: { src: string; variantIds: number[]; isDefault: boolean }[];
  variants: {
    id: number;
    title: string;
    price: number;
    isAvailable: boolean;
    isEnabled: boolean;
    sku: string;
    localVariantId?: string;
  }[];
  options: { name: string; values: { id: number; title: string }[] }[];
  tags: string[];
  isLocal?: boolean;
  localProductId?: string;
  categoryName?: string;
  productType?: string;
  // Sale pricing fields for local products
  salePrice?: number | null;
  saleEnabled?: boolean;
  saleStartDate?: string | null;
  saleEndDate?: string | null;
}

function ProductCard({ 
  product, 
  onAddToCart,
  isAddingToCart
}: { 
  product: Product; 
  onAddToCart: (item: AddToCartItem) => void;
  isAddingToCart?: boolean;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const defaultImage = product.images.find(img => img.isDefault)?.src || product.images[0]?.src;
  const availableVariants = product.variants.filter(v => v.isAvailable && v.isEnabled);
  const selectedVariant = availableVariants.find(v => v.id === selectedVariantId) || availableVariants[0];

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    const variantImage = product.images.find(img => img.variantIds.includes(selectedVariant.id))?.src || defaultImage;
    
    // Use effective price (sale price if active) for local products
    const effectivePrice = product.isLocal 
      ? getEffectivePrice(
          selectedVariant.price,
          product.salePrice,
          product.saleEnabled,
          product.saleStartDate,
          product.saleEndDate
        )
      : selectedVariant.price;
    
    if (product.isLocal && product.localProductId) {
      onAddToCart({
        productId: product.localProductId,
        variantId: selectedVariant.localVariantId || String(selectedVariant.id),
        productTitle: product.title,
        variantTitle: selectedVariant.title !== 'Default' ? selectedVariant.title : undefined,
        quantity: 1,
        priceAtTime: effectivePrice,
        imageUrl: variantImage,
        itemType: 'local',
      });
    } else {
      onAddToCart({
        printifyProductId: product.id,
        printifyVariantId: String(selectedVariant.id),
        productTitle: product.title,
        variantTitle: selectedVariant.title,
        quantity: 1,
        priceAtTime: effectivePrice,
        imageUrl: variantImage,
        itemType: 'printify',
      });
    }
    setIsDialogOpen(false);
  };

  const lowestPrice = Math.min(...availableVariants.map(v => v.price));

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setIsDialogOpen(true)} data-testid={`product-card-${product.id}`}>
        <div className="aspect-square overflow-hidden bg-gray-100">
          {defaultImage ? (
            <img 
              src={defaultImage} 
              alt={product.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No image
            </div>
          )}
        </div>
        <CardHeader className="p-4">
          <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
        </CardHeader>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-1">
            {product.isLocal && product.saleEnabled ? (
              <SalePrice
                originalPrice={lowestPrice}
                salePrice={product.salePrice}
                saleEnabled={product.saleEnabled}
                saleStartDate={product.saleStartDate}
                saleEndDate={product.saleEndDate}
                size="sm"
              />
            ) : (
              <span className="text-lg font-bold text-primary">
                ${lowestPrice.toFixed(2)}
              </span>
            )}
            {availableVariants.length > 1 && <span className="text-sm font-normal text-muted-foreground">+</span>}
          </div>
          <Button size="sm" className="bg-[#5170FF] hover:bg-[#FD66C5] text-white" data-testid={`add-to-cart-${product.id}`}>
            View Options
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product.title}</DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              {defaultImage ? (
                <img 
                  src={defaultImage} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div 
                className="text-sm text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              
              {availableVariants.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Option</Label>
                  <Select
                    value={String(selectedVariant?.id || '')}
                    onValueChange={(v) => setSelectedVariantId(Number(v))}
                  >
                    <SelectTrigger data-testid="variant-selector">
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariants.map((variant) => (
                        <SelectItem key={variant.id} value={String(variant.id)}>
                          {variant.title} - ${variant.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="pt-4">
                <div className="mb-4">
                  {product.isLocal && product.saleEnabled ? (
                    <SalePrice
                      originalPrice={selectedVariant?.price || lowestPrice}
                      salePrice={product.salePrice}
                      saleEnabled={product.saleEnabled}
                      saleStartDate={product.saleStartDate}
                      saleEndDate={product.saleEndDate}
                      size="lg"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-primary">
                      ${selectedVariant?.price.toFixed(2) || lowestPrice.toFixed(2)}
                    </div>
                  )}
                </div>
                
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.isAvailable}
                  data-testid="add-to-cart-confirm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CartSheet({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  isCheckingOut 
}: { 
  cart: CartItemWithDetails[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
}) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.priceAtTime) * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative" data-testid="cart-button">
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Shopping Cart ({itemCount} items)</SheetTitle>
        </SheetHeader>
        
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-4" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {cart.map((item) => {
                // Get display info - prefer stored display fields, fall back to product relation
                const displayTitle = item.productTitle || item.product?.name || 'Product';
                const displayVariant = item.variantTitle || item.variant?.name;
                const displayImage = item.imageUrl || item.product?.primaryImageUrl;
                const displayPrice = Number(item.priceAtTime);
                
                return (
                  <div key={item.id} className="flex gap-4" data-testid={`cart-item-${item.id}`}>
                    <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {displayImage ? (
                        <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{displayTitle}</h4>
                      {displayVariant && <p className="text-xs text-muted-foreground">{displayVariant}</p>}
                      <p className="text-sm font-medium mt-1">${displayPrice.toFixed(2)}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          data-testid={`decrease-qty-${item.id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          data-testid={`increase-qty-${item.id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive ml-auto"
                          onClick={() => onRemoveItem(item.id)}
                          data-testid={`remove-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Separator />
            
            <div className="py-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping calculated at checkout</p>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={onCheckout}
                disabled={isCheckingOut}
                data-testid="checkout-button"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Checkout'
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CheckoutForm({ 
  clientSecret, 
  orderId,
  orderDetails,
  onSuccess,
  onCancel
}: { 
  clientSecret: string;
  orderId: string;
  orderDetails: {
    subtotal: number;
    discountAmount: number;
    shippingCost: number;
    taxAmount: number;
    total: number;
  };
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setIsProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/store?success=true&orderId=' + orderId,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        await apiRequest('/api/store/confirm-order', {
          method: 'POST',
          body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
        });
        toast({ title: "Order placed successfully!", description: "You will receive an email confirmation shortly." });
        onSuccess();
      } catch (err) {
        console.error('Error confirming order:', err);
        toast({ title: "Payment received", description: "Your order is being processed.", variant: "default" });
        onSuccess();
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>${orderDetails.subtotal.toFixed(2)}</span>
        </div>
        {orderDetails.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-${orderDetails.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span>${orderDetails.shippingCost.toFixed(2)}</span>
        </div>
        {orderDetails.taxAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>${orderDetails.taxAmount.toFixed(2)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>${orderDetails.total.toFixed(2)}</span>
        </div>
      </div>

      <PaymentElement />
      
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
          {error}
        </div>
      )}
      
      <div className="flex gap-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={!stripe || isProcessing} data-testid="pay-button">
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay $${orderDetails.total.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}

export default function Store() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  useSEO(seoConfigs.store);
  
  // Use the unified cart hook
  const { 
    printifyItems: cart, 
    addToCart, 
    isAddingToCart, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart();
  
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/store/products'],
  });

  // Extract all unique categories from product tags
  const allCategories = Array.from(
    new Set(products.flatMap(p => p.tags))
  ).filter(tag => tag && tag.trim()).sort();

  // Category mapping - filter value to actual Printify tags AND title keywords
  const categoryConfig: Record<string, { tags: string[], titleKeywords: string[], categoryNames?: string[], productTypes?: string[] }> = {
    'Men': { 
      tags: ["Men's Clothing", "Hoodies", "Sportswear", "AOP", "All Over Print"],
      titleKeywords: ["Hoodie", "Tee", "T-Shirt", "Sun Hoodie", "Adult", "Hat", "Dad Hat"]
    },
    'Women': { 
      tags: ["Women's Clothing"],
      titleKeywords: ["Ladies", "Women", "Racerback", "Tank"]
    },
    'Kids': { 
      tags: ["Kids", "Kids' Clothing", "Youth"],
      titleKeywords: ["Kids"]
    },
    'Accessories': { 
      tags: ["Accessories", "Card", "Games", "Paper", "Sports & Games"],
      titleKeywords: ["Can Cooler", "Can Holder", "Mug", "Mat", "Playing Cards", "Range Rag", "Hat"]
    },
    'Home & Living': { 
      tags: ["Indoor", "Outdoor", "Home & Living", "Home"],
      titleKeywords: ["Mug", "Mat", "Desk"]
    },
    'RACC Packages': {
      tags: ["Digital", "Digital Products", "digital", "RACC", "RACC Packages"],
      titleKeywords: ["RACC"],
      categoryNames: ["Digital Products", "Digital", "RACC Packages"],
      productTypes: ["digital"]
    },
    'Training Materials': {
      tags: ["Training", "Training Materials", "Education"],
      titleKeywords: ["Guide", "Manual", "Course"],
      categoryNames: ["Training Materials", "Training"],
      productTypes: ["service"]
    },
  };

  // Helper to check if product matches category by tags, title, category name, or product type
  const productMatchesCategory = (product: Product, category: string) => {
    if (category === 'all') return true;
    const config = categoryConfig[category];
    if (!config) return false;
    
    // Check local product category name
    if (product.isLocal && product.categoryName && config.categoryNames) {
      const categoryMatch = config.categoryNames.some(name => 
        product.categoryName?.toLowerCase().includes(name.toLowerCase())
      );
      if (categoryMatch) return true;
    }
    
    // Check local product type
    if (product.isLocal && product.productType && config.productTypes) {
      const typeMatch = config.productTypes.some(type => 
        product.productType?.toLowerCase() === type.toLowerCase()
      );
      if (typeMatch) return true;
    }
    
    // Check tags
    const tagMatch = product.tags.some(tag => 
      config.tags.some(matchTag => 
        tag.toLowerCase().includes(matchTag.toLowerCase())
      )
    );
    if (tagMatch) return true;
    
    // Fall back to title keyword matching for products without tags
    if (product.tags.length === 0 || config.titleKeywords.length > 0) {
      const titleLower = product.title.toLowerCase();
      const titleMatch = config.titleKeywords.some(keyword => 
        titleLower.includes(keyword.toLowerCase())
      );
      if (titleMatch) return true;
    }
    
    return false;
  };

  // Helper to check if product is a RACC digital product (not apparel)
  const isRaccDigitalProduct = (product: Product) => {
    // Check if it's a local product with RACC/Digital category
    if (product.isLocal && product.categoryName) {
      const categoryLower = product.categoryName.toLowerCase();
      if (categoryLower.includes('digital') || categoryLower.includes('racc packages')) {
        return true;
      }
    }
    // Check tags for digital RACC products
    const hasRaccTag = product.tags.some(tag => 
      tag.toLowerCase().includes('racc') && 
      (tag.toLowerCase().includes('digital') || tag.toLowerCase().includes('package'))
    );
    if (hasRaccTag) return true;
    
    // Check for Digital Products category
    if (product.tags.some(tag => tag.toLowerCase() === 'digital' || tag.toLowerCase() === 'digital products')) {
      return true;
    }
    
    return false;
  };

  // Filter and sort products (excluding RACC digital products)
  const filteredAndSortedProducts = [...products]
    .filter(product => !isRaccDigitalProduct(product)) // Exclude RACC digital products
    .filter(product => productMatchesCategory(product, selectedCategory))
    .sort((a, b) => {
      const aPrice = Math.min(...a.variants.filter(v => v.isAvailable && v.isEnabled).map(v => v.price));
      const bPrice = Math.min(...b.variants.filter(v => v.isAvailable && v.isEnabled).map(v => v.price));
      
      switch (sortBy) {
        case 'price-asc':
          return aPrice - bPrice;
        case 'price-desc':
          return bPrice - aPrice;
        case 'name-desc':
          return b.title.localeCompare(a.title);
        case 'name-asc':
        default:
          return a.title.localeCompare(b.title);
      }
    });

  // Calculate subtotal for validation
  const cartSubtotal = cart.reduce((sum, item) => sum + Number(item.priceAtTime) * item.quantity, 0);

  const validateDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('/api/store/validate-discount', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal: cartSubtotal }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setAppliedDiscount(data.discountCode);
      toast({ title: "Discount applied!", description: `${data.discountCode.code} - $${data.discountCode.discountAmount} off` });
    },
    onError: (error: any) => {
      toast({ title: "Invalid code", description: error.message || "Discount code not valid", variant: "destructive" });
    },
  });

  // Convert cart items to format expected by Printify checkout
  const cartForCheckout = cart.map(item => ({
    printifyProductId: item.printifyProductId,
    printifyVariantId: item.printifyVariantId,
    productTitle: item.productTitle,
    variantTitle: item.variantTitle,
    quantity: item.quantity,
    unitPrice: Number(item.priceAtTime),
    imageUrl: item.imageUrl,
  }));

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/store/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          items: cartForCheckout,
          discountCode: appliedDiscount?.code,
          shippingAddress: {
            address1: shippingInfo.address1,
            address2: shippingInfo.address2,
            city: shippingInfo.city,
            state: shippingInfo.state,
            zip: shippingInfo.zip,
            country: shippingInfo.country,
          },
          customerEmail: shippingInfo.email,
          customerFirstName: shippingInfo.firstName,
          customerLastName: shippingInfo.lastName,
          customerPhone: shippingInfo.phone,
        }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setOrderDetails({
        subtotal: data.subtotal,
        discountAmount: data.discountAmount,
        shippingCost: data.shippingCost,
        taxAmount: data.taxAmount,
        total: data.total,
      });
    },
    onError: (error: any) => {
      toast({ title: "Checkout failed", description: error.message || "Unable to process checkout", variant: "destructive" });
    },
  });

  // Handler to add item to cart via unified API
  const handleAddToCart = (item: AddToCartItem) => {
    addToCart(item);
    toast({ title: "Added to cart", description: `${item.productTitle} - ${item.variantTitle}` });
  };

  // Handler to update quantity via unified API
  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    updateQuantity({ id, quantity });
  };

  // Handler to remove item via unified API
  const handleRemoveItem = (id: string) => {
    removeItem(id);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setCheckoutOpen(true);
  };

  const handleProceedToPayment = () => {
    if (!shippingInfo.firstName || !shippingInfo.lastName || !shippingInfo.email || 
        !shippingInfo.address1 || !shippingInfo.city || !shippingInfo.state || !shippingInfo.zip) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createPaymentMutation.mutate();
  };

  const handlePaymentSuccess = () => {
    // Clear only printify items from cart (use the unified clearCart for now)
    clearCart();
    setCheckoutOpen(false);
    setClientSecret(null);
    setOrderId(null);
    setOrderDetails(null);
    setAppliedDiscount(null);
    setDiscountCode('');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 pl-[48px] pr-[48px]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Apache Solutions Merch Store</h1>
            <p className="text-muted-foreground mt-1">Official merchandise and gear</p>
          </div>
          <CartSheet 
            cart={cart} 
            onUpdateQuantity={handleUpdateQuantity} 
            onRemoveItem={handleRemoveItem}
            onCheckout={handleCheckout}
            isCheckingOut={createPaymentMutation.isPending}
          />
        </div>

        {/* Category Filter Buttons */}
        {products.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-1 border-b border-border">
              {[
                { value: 'all', label: 'All products' },
                { value: 'Men', label: 'Men' },
                { value: 'Accessories', label: 'Accessories' },
                { value: 'Kids', label: 'Kids' },
                { value: 'Women', label: 'Women' },
                { value: 'Home & Living', label: 'Home & Living' },
              ].map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    selectedCategory === category.value
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`category-${category.value}`}
                >
                  {category.label}
                  {selectedCategory === category.value && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredAndSortedProducts.length} {filteredAndSortedProducts.length === 1 ? 'product' : 'products'}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort-by" className="text-sm font-medium whitespace-nowrap">Sort by:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]" data-testid="sort-by">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                    <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No products available</h2>
            <p className="text-muted-foreground">Check back soon for new merchandise!</p>
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-muted-foreground">Try changing your filter or check back soon!</p>
            {selectedCategory !== 'all' && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSelectedCategory('all')}
                data-testid="clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAndSortedProducts.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} isAddingToCart={isAddingToCart} />
            ))}
          </div>
        )}

        <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{clientSecret ? 'Payment' : 'Checkout'}</DialogTitle>
              <DialogDescription>
                {clientSecret ? 'Complete your payment' : 'Enter your shipping details'}
              </DialogDescription>
            </DialogHeader>

            {!clientSecret ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input 
                      id="firstName" 
                      value={shippingInfo.firstName}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      data-testid="input-firstName"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input 
                      id="lastName" 
                      value={shippingInfo.lastName}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, lastName: e.target.value }))}
                      data-testid="input-lastName"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, phone: e.target.value }))}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address1">Address *</Label>
                  <Input 
                    id="address1" 
                    value={shippingInfo.address1}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, address1: e.target.value }))}
                    data-testid="input-address1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address2">Address Line 2</Label>
                  <Input 
                    id="address2" 
                    value={shippingInfo.address2}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, address2: e.target.value }))}
                    data-testid="input-address2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input 
                      id="city" 
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, city: e.target.value }))}
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input 
                      id="state" 
                      value={shippingInfo.state}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, state: e.target.value }))}
                      data-testid="input-state"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input 
                    id="zip" 
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo(prev => ({ ...prev, zip: e.target.value }))}
                    data-testid="input-zip"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="discountCode">Discount Code</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="discountCode" 
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      disabled={!!appliedDiscount}
                      data-testid="input-discountCode"
                    />
                    {appliedDiscount ? (
                      <Button 
                        variant="outline" 
                        onClick={() => { setAppliedDiscount(null); setDiscountCode(''); }}
                        data-testid="remove-discount"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => validateDiscountMutation.mutate(discountCode)}
                        disabled={!discountCode || validateDiscountMutation.isPending}
                        data-testid="apply-discount"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                  {appliedDiscount && (
                    <p className="text-sm text-green-600">
                      {appliedDiscount.code} applied - ${appliedDiscount.discountAmount} off
                    </p>
                  )}
                </div>

                <DialogFooter>
                  <Button 
                    className="w-full" 
                    onClick={handleProceedToPayment}
                    disabled={createPaymentMutation.isPending}
                    data-testid="proceed-to-payment"
                  >
                    {createPaymentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Proceed to Payment'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm 
                  clientSecret={clientSecret}
                  orderId={orderId!}
                  orderDetails={orderDetails}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => { setClientSecret(null); setOrderId(null); }}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
