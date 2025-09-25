import { Layout } from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import type { CartItemWithDetails } from "@shared/schema";

export default function CartPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;

  const handleQuantityChange = (item: CartItemWithDetails, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItemMutation.mutate(item.id);
    } else {
      updateQuantityMutation.mutate({ id: item.id, quantity: newQuantity });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6" data-testid="cart-page">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold" data-testid="page-title">Shopping Cart</h1>
          {cartItems.length > 0 && (
            <Button
              variant="outline"
              onClick={() => clearCartMutation.mutate()}
              disabled={clearCartMutation.isPending}
              data-testid="button-clear-cart"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-4">
              Add some products to get started
            </p>
            <Button onClick={() => setLocation('/store')} data-testid="button-continue-shopping">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: CartItemWithDetails) => (
                <Card key={item.id} data-testid={`cart-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {item.product.primaryImageUrl ? (
                          <img 
                            src={item.product.primaryImageUrl} 
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded-lg"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full flex items-center justify-center ${item.product.primaryImageUrl ? 'hidden' : ''}`}>
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium line-clamp-2" data-testid={`cart-item-name-${item.id}`}>
                          {item.product.name}
                        </h4>
                        {item.variant && (
                          <p className="text-sm text-muted-foreground">
                            {item.variant.name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.product.sku}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="font-medium" data-testid={`cart-item-price-${item.id}`}>
                            ${item.priceAtTime.toFixed(2)}
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
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Item Total */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <span className="text-sm text-muted-foreground">
                        {item.quantity} × ${item.priceAtTime.toFixed(2)}
                      </span>
                      <span className="font-medium" data-testid={`cart-item-total-${item.id}`}>
                        ${(item.priceAtTime * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="cart-subtotal">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8%)</span>
                    <span data-testid="cart-tax">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span data-testid="cart-total">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setLocation('/checkout')}
                    data-testid="button-proceed-checkout"
                  >
                    Proceed to Checkout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/store')}
                    data-testid="button-continue-shopping-summary"
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}