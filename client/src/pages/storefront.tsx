import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCartComponent, useCart } from "@/components/shopping-cart";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { Search, Filter, Package, Star, ShoppingCart, Eye } from "lucide-react";
import type { ProductWithDetails, ProductCategoryWithProducts } from "@shared/schema";

export default function Storefront() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [selectedProduct, setSelectedProduct] = useState<ProductWithDetails | null>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const { addToCart, isAddingToCart } = useCart();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/product-categories'],
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product: ProductWithDetails) => {
      // Only show active products
      if (product.status !== 'active') return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = `${product.name} ${product.description || ''} ${product.shortDescription || ''} ${product.tags?.join(' ') || ''}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }
      
      // Filter by category
      if (selectedCategory && selectedCategory !== 'all') {
        if (product.categoryId !== selectedCategory) return false;
      }
      
      return true;
    });

    // Sort products
    filtered.sort((a: ProductWithDetails, b: ProductWithDetails) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const handleAddToCart = (product: ProductWithDetails, variant?: any) => {
    addToCart({
      productId: product.id,
      variantId: variant?.id,
      quantity: 1,
      priceAtTime: Number(variant?.price || product.price || 0),
    });
    
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const handleProductClick = (product: ProductWithDetails) => {
    setSelectedProduct(product);
    setProductDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6" data-testid="storefront-page">
      {/* Header with Cart */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">ProTrain Store</h1>
          <p className="text-muted-foreground">Professional training gear and merchandise</p>
        </div>
        <ShoppingCartComponent />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: ProductCategoryWithProducts) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} ({category.products?.length || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="price-low">Price (Low to High)</SelectItem>
                <SelectItem value="price-high">Price (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Products {filteredProducts.length > 0 && (
              <span className="text-muted-foreground font-normal">
                ({filteredProducts.length} items)
              </span>
            )}
          </h2>
        </div>

        {productsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== 'all' 
                    ? "Try adjusting your filters to see more products."
                    : "Check back soon for new products!"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product: ProductWithDetails) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="aspect-square bg-muted rounded-t-lg relative overflow-hidden">
                    {product.primaryImageUrl && !failedImages.has(product.id) ? (
                      <img 
                        src={product.primaryImageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width="300"
                        height="300"
                        onError={() => {
                          setFailedImages(prev => new Set(prev).add(product.id));
                        }}
                      />
                    ) : (
                      /* Fallback placeholder */
                      <div className="w-full h-full bg-muted rounded-t-lg flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {product.featured && (
                      <Badge className="absolute top-2 left-2" variant="secondary">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    
                    {/* Overlay with Quick Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleProductClick(product)}
                        data-testid={`button-view-product-${product.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(product)}
                        disabled={isAddingToCart}
                        data-testid={`button-add-to-cart-${product.id}`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="space-y-2">
                      <h3 
                        className="font-medium line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleProductClick(product)}
                        data-testid={`product-name-${product.id}`}
                      >
                        {product.name}
                      </h3>
                      {product.shortDescription && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.shortDescription}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold" data-testid={`product-price-${product.id}`}>
                          ${Number(product.price || 0).toFixed(2)}
                        </span>
                      </div>
                      

                      {/* Add to Cart Button */}
                      <Button
                        className="w-full mt-4"
                        onClick={() => handleAddToCart(product)}
                        disabled={isAddingToCart}
                        data-testid={`button-add-to-cart-full-${product.id}`}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-detail-dialog">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>
                  {selectedProduct.category?.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  {selectedProduct.primaryImageUrl ? (
                    <img 
                      src={selectedProduct.primaryImageUrl} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Show fallback if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${selectedProduct.primaryImageUrl ? 'hidden' : ''}`}>
                    <Package className="w-24 h-24 text-muted-foreground" />
                  </div>
                </div>
                
                {/* Product Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">${Number(selectedProduct.price || 0).toFixed(2)}</h3>
                    <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  </div>
                  
                  {selectedProduct.shortDescription && (
                    <p className="text-muted-foreground">{selectedProduct.shortDescription}</p>
                  )}
                  
                  {selectedProduct.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}
                  
                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Variants */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Available Options</h4>
                      <div className="space-y-2">
                        {selectedProduct.variants.map((variant) => (
                          <Button
                            key={variant.id}
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => handleAddToCart(selectedProduct, variant)}
                            disabled={isAddingToCart}
                            data-testid={`button-add-variant-${variant.id}`}
                          >
                            <span>{variant.name}</span>
                            <span>${(variant.price || selectedProduct.price).toFixed(2)}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Add to Cart */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleAddToCart(selectedProduct)}
                    disabled={isAddingToCart}
                    data-testid="button-add-to-cart-dialog"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart - ${Number(selectedProduct.price || 0).toFixed(2)}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}