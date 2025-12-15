import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trash2, Plus, Minus, Package } from "lucide-react";
import type { CartItemWithDetails } from "@shared/schema";

interface ShoppingCartProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ShoppingCartComponent({ trigger, isOpen, onOpenChange }: ShoppingCartProps) {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Control sheet state - use prop if provided, otherwise internal state
  const open = isOpen !== undefined ? isOpen : sheetOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setSheetOpen(newOpen);
    }
  };

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
  });

  // Update cart item quantity
  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiRequest('PUT', `/api/cart/${id}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating quantity", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Remove item from cart
  const removeItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/cart/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Item removed from cart" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error removing item", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Clear entire cart
  const clearCartMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/cart'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Cart cleared" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error clearing cart", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Calculate totals
  const subtotal = cartItems.reduce((sum: number, item: CartItemWithDetails) => 
    sum + (item.priceAtTime * item.quantity), 0
  );
  const tax = subtotal * 0.0763; // 7.63% tax rate
  const total = subtotal + tax;

  const handleQuantityChange = (item: CartItemWithDetails, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItemMutation.mutate(item.id);
    } else {
      updateQuantityMutation.mutate({ id: item.id, quantity: newQuantity });
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg" data-testid="cart-sheet">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart
            {cartItems.length > 0 && (
              <Badge variant="secondary" data-testid="cart-items-count">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your items and proceed to checkout
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full mt-6">
          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto pb-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Add some products to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item: CartItemWithDetails) => {
                  // Get display info based on item type
                  const isPrintify = item.itemType === 'printify';
                  const displayName = isPrintify ? (item.productTitle || 'Merchandise Item') : (item.product?.name || 'Product');
                  const displayVariant = isPrintify ? item.variantTitle : item.variant?.name;
                  const displayImage = isPrintify ? item.imageUrl : item.product?.primaryImageUrl;
                  const displaySku = isPrintify ? item.printifyProductId : item.product?.sku;
                  
                  return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {displayImage ? (
                            <img 
                              src={displayImage} 
                              alt={displayName}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                              onError={(e) => {
                                // Replace failed image with placeholder
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full flex items-center justify-center ${displayImage ? 'hidden' : ''}`}>
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium line-clamp-2" data-testid={`cart-item-name-${item.id}`}>
                            {displayName}
                          </h4>
                          {displayVariant && (
                            <p className="text-sm text-muted-foreground">
                              {displayVariant}
                            </p>
                          )}
                          {isPrintify && (
                            <Badge variant="outline" className="text-xs mt-1">Merchandise</Badge>
                          )}
                          {displaySku && !isPrintify && (
                            <p className="text-sm text-muted-foreground">
                              SKU: {displaySku}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <p className="font-medium" data-testid={`cart-item-price-${item.id}`}>
                              ${Number(item.priceAtTime).toFixed(2)}
                            </p>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                disabled={updateQuantityMutation.isPending}
                                data-testid={`button-decrease-quantity-${item.id}`}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  handleQuantityChange(item, newQuantity);
                                }}
                                className="w-16 text-center"
                                disabled={updateQuantityMutation.isPending}
                                data-testid={`input-quantity-${item.id}`}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                disabled={updateQuantityMutation.isPending}
                                data-testid={`button-increase-quantity-${item.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItemMutation.mutate(item.id)}
                          disabled={removeItemMutation.isPending}
                          data-testid={`button-remove-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Item Total */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">
                          {item.quantity} × ${Number(item.priceAtTime).toFixed(2)}
                        </span>
                        <span className="font-medium" data-testid={`cart-item-total-${item.id}`}>
                          ${(Number(item.priceAtTime) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary & Actions */}
          {cartItems.length > 0 && (
            <div className="border-t pt-4 pb-6 space-y-4">
              {/* Price Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span data-testid="cart-subtotal">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span data-testid="cart-tax">${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg"
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => clearCartMutation.mutate()}
                  disabled={clearCartMutation.isPending}
                  data-testid="button-clear-cart"
                >
                  Clear Cart
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Types for add to cart operations
export interface AddToCartItem {
  // For local products
  productId?: string;
  variantId?: string;
  // For Printify products
  printifyProductId?: string;
  printifyVariantId?: string;
  // Display info
  productTitle?: string;
  variantTitle?: string;
  imageUrl?: string;
  // Common
  quantity?: number;
  priceAtTime: number;
  customization?: any;
  itemType: 'local' | 'printify';
}

// Hook for managing cart state
export function useCart() {
  const { toast } = useToast();
  
  const { data: cartItems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/cart'],
  });

  const addToCartMutation = useMutation({
    mutationFn: (item: AddToCartItem) => apiRequest('POST', '/api/cart', item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding to cart",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      apiRequest('PUT', `/api/cart/${id}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/cart/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', '/api/cart'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
  });

  const itemCount = cartItems.reduce((sum: number, item: CartItemWithDetails) => 
    sum + item.quantity, 0
  );

  const subtotal = cartItems.reduce((sum: number, item: CartItemWithDetails) => 
    sum + (Number(item.priceAtTime) * item.quantity), 0
  );

  // Get only printify items for merch checkout
  const printifyItems = cartItems.filter((item: CartItemWithDetails) => item.itemType === 'printify');
  const localItems = cartItems.filter((item: CartItemWithDetails) => item.itemType === 'local' || !item.itemType);

  return {
    cartItems,
    printifyItems,
    localItems,
    isLoading,
    itemCount,
    subtotal,
    addToCart: addToCartMutation.mutate,
    addToCartAsync: addToCartMutation.mutateAsync,
    isAddingToCart: addToCartMutation.isPending,
    updateQuantity: updateQuantityMutation.mutate,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    removeItem: removeItemMutation.mutate,
    isRemovingItem: removeItemMutation.isPending,
    clearCart: clearCartMutation.mutate,
    isClearingCart: clearCartMutation.isPending,
    refetch,
  };
}