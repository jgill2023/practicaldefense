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
import { ShoppingCart, Plus, Minus, Trash2, X, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import type { CartItem } from "@shared/schema";

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
  }[];
  options: { name: string; values: { id: number; title: string }[] }[];
  tags: string[];
}

function ProductCard({ 
  product, 
  onAddToCart 
}: { 
  product: Product; 
  onAddToCart: (item: CartItem) => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const defaultImage = product.images.find(img => img.isDefault)?.src || product.images[0]?.src;
  const availableVariants = product.variants.filter(v => v.isAvailable && v.isEnabled);
  const selectedVariant = availableVariants.find(v => v.id === selectedVariantId) || availableVariants[0];

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    const variantImage = product.images.find(img => img.variantIds.includes(selectedVariant.id))?.src || defaultImage;
    
    onAddToCart({
      printifyProductId: product.id,
      printifyVariantId: String(selectedVariant.id),
      productTitle: product.title,
      variantTitle: selectedVariant.title,
      quantity: 1,
      unitPrice: selectedVariant.price,
      imageUrl: variantImage,
    });
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
          <span className="text-lg font-bold text-primary">
            ${lowestPrice.toFixed(2)}
            {availableVariants.length > 1 && <span className="text-sm font-normal text-muted-foreground">+</span>}
          </span>
          <Button size="sm" data-testid={`add-to-cart-${product.id}`}>
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
                <div className="text-2xl font-bold text-primary mb-4">
                  ${selectedVariant?.price.toFixed(2) || lowestPrice.toFixed(2)}
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
  cart: CartItem[];
  onUpdateQuantity: (printifyVariantId: string, quantity: number) => void;
  onRemoveItem: (printifyVariantId: string) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
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
              {cart.map((item) => (
                <div key={item.printifyVariantId} className="flex gap-4" data-testid={`cart-item-${item.printifyVariantId}`}>
                  <div className="w-20 h-20 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{item.productTitle}</h4>
                    <p className="text-xs text-muted-foreground">{item.variantTitle}</p>
                    <p className="text-sm font-medium mt-1">${item.unitPrice.toFixed(2)}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.printifyVariantId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        data-testid={`decrease-qty-${item.printifyVariantId}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.printifyVariantId, item.quantity + 1)}
                        data-testid={`increase-qty-${item.printifyVariantId}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive ml-auto"
                        onClick={() => onRemoveItem(item.printifyVariantId)}
                        data-testid={`remove-item-${item.printifyVariantId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('merch-cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
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

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('merch-cart', JSON.stringify(cart));
  }, [cart]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/store/products'],
  });

  const validateDiscountMutation = useMutation({
    mutationFn: async (code: string) => {
      const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const response = await apiRequest('/api/store/validate-discount', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
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

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/store/create-payment-intent', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
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

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.printifyVariantId === item.printifyVariantId);
      if (existing) {
        return prev.map(i => 
          i.printifyVariantId === item.printifyVariantId 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, item];
    });
    toast({ title: "Added to cart", description: `${item.productTitle} - ${item.variantTitle}` });
  };

  const updateQuantity = (printifyVariantId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(i => 
      i.printifyVariantId === printifyVariantId ? { ...i, quantity } : i
    ));
  };

  const removeItem = (printifyVariantId: string) => {
    setCart(prev => prev.filter(i => i.printifyVariantId !== printifyVariantId));
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
    setCart([]);
    setCheckoutOpen(false);
    setClientSecret(null);
    setOrderId(null);
    setOrderDetails(null);
    setAppliedDiscount(null);
    setDiscountCode('');
    localStorage.removeItem('merch-cart');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Store</h1>
            <p className="text-muted-foreground mt-1">Official merchandise and gear</p>
          </div>
          <CartSheet 
            cart={cart} 
            onUpdateQuantity={updateQuantity} 
            onRemoveItem={removeItem}
            onCheckout={handleCheckout}
            isCheckingOut={createPaymentMutation.isPending}
          />
        </div>

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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
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
