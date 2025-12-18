/**
 * Printify API Service
 * Handles all interactions with the Printify API for product fetching and order creation
 */

const PRINTIFY_API_URL = 'https://api.printify.com/v1';

interface PrintifyImage {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
}

interface PrintifyVariant {
  id: number;
  sku: string;
  cost: number;
  price: number;
  title: string;
  grams: number;
  is_enabled: boolean;
  is_default: boolean;
  is_available: boolean;
  options: number[];
}

interface PrintifyOption {
  name: string;
  type: string;
  values: { id: number; title: string }[];
}

interface PrintifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  options: PrintifyOption[];
  variants: PrintifyVariant[];
  images: PrintifyImage[];
  created_at: string;
  updated_at: string;
  visible: boolean;
  is_locked: boolean;
  blueprint_id: number;
  user_id: number;
  shop_id: number;
  print_provider_id: number;
  print_areas: any[];
  sales_channel_properties: any[];
}

interface PrintifyProductList {
  current_page: number;
  data: PrintifyProduct[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface NormalizedProduct {
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
}

export interface PrintifyOrderAddress {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string;
  region: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
}

export interface PrintifyOrderLineItem {
  product_id: string;
  variant_id: number;
  quantity: number;
}

export interface PrintifyOrderData {
  external_id: string;
  label?: string;
  line_items: PrintifyOrderLineItem[];
  shipping_method: number;
  send_shipping_notification: boolean;
  address_to: PrintifyOrderAddress;
}

class PrintifyService {
  private apiKey: string;
  private storeId: string;

  constructor() {
    this.apiKey = process.env.PRINTIFY_API_KEY || '';
    this.storeId = process.env.PRINTIFY_STORE_ID || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${PRINTIFY_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Printify API Error: ${response.status} - ${errorText}`);
      throw new Error(`Printify API Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all shops associated with this Printify account
   */
  async getShops(): Promise<{ id: number; title: string; sales_channel: string }[]> {
    try {
      const response = await this.request<{ id: number; title: string; sales_channel: string }[]>(
        `/shops.json`
      );
      return response;
    } catch (error) {
      console.error('Error fetching Printify shops:', error);
      throw error;
    }
  }

  /**
   * Get all published products from the Printify store (handles pagination)
   */
  async getProducts(): Promise<NormalizedProduct[]> {
    try {
      const allProducts: PrintifyProduct[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Fetch all pages
      while (hasMore) {
        const response = await this.request<PrintifyProductList>(
          `/shops/${this.storeId}/products.json?page=${currentPage}`
        );
        
        allProducts.push(...response.data);
        
        // Check if there are more pages
        if (response.current_page >= response.last_page || !response.next_page_url) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Filter visible products, exclude "Copy of" duplicates, and normalize
      return allProducts
        .filter(product => product.visible)
        .filter(product => !product.title.startsWith('Copy of'))
        .map(product => this.normalizeProduct(product));
    } catch (error) {
      console.error('Error fetching Printify products:', error);
      throw error;
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(productId: string): Promise<NormalizedProduct | null> {
    try {
      const product = await this.request<PrintifyProduct>(
        `/shops/${this.storeId}/products/${productId}.json`
      );

      if (!product.visible) {
        return null;
      }

      return this.normalizeProduct(product);
    } catch (error) {
      console.error(`Error fetching Printify product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Create an order in Printify
   */
  async createOrder(orderData: PrintifyOrderData): Promise<{ id: string }> {
    try {
      const response = await this.request<{ id: string }>(
        `/shops/${this.storeId}/orders.json`,
        {
          method: 'POST',
          body: JSON.stringify(orderData),
        }
      );

      return response;
    } catch (error) {
      console.error('Error creating Printify order:', error);
      throw error;
    }
  }

  /**
   * Submit an order for production (after payment confirmation)
   */
  async submitOrderToProduction(orderId: string): Promise<void> {
    try {
      await this.request(
        `/shops/${this.storeId}/orders/${orderId}/send_to_production.json`,
        {
          method: 'POST',
        }
      );
    } catch (error) {
      console.error(`Error submitting order ${orderId} to production:`, error);
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      return await this.request(`/shops/${this.storeId}/orders/${orderId}.json`);
    } catch (error) {
      console.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get available shipping methods
   */
  async getShippingMethods(): Promise<any[]> {
    // Printify uses predefined shipping methods
    // 1 = Standard shipping
    // 2 = Express shipping
    return [
      { id: 1, name: 'Standard Shipping', description: '5-8 business days' },
      { id: 2, name: 'Express Shipping', description: '2-4 business days' },
    ];
  }

  /**
   * Calculate shipping cost for items
   * Note: Printify calculates shipping at order creation time
   */
  async calculateShipping(
    address: PrintifyOrderAddress,
    lineItems: PrintifyOrderLineItem[]
  ): Promise<{ standard: number; express: number }> {
    try {
      const response = await this.request<any>(
        `/shops/${this.storeId}/orders/shipping.json`,
        {
          method: 'POST',
          body: JSON.stringify({
            line_items: lineItems,
            address_to: address,
          }),
        }
      );

      return {
        standard: response.standard || 0,
        express: response.express || 0,
      };
    } catch (error) {
      console.error('Error calculating shipping:', error);
      // Return default estimates if API fails
      return { standard: 5.99, express: 12.99 };
    }
  }

  /**
   * Normalize a Printify product to a consistent format
   */
  private normalizeProduct(product: PrintifyProduct): NormalizedProduct {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      images: product.images.map(img => ({
        src: img.src,
        variantIds: img.variant_ids,
        isDefault: img.is_default,
      })),
      variants: product.variants
        .filter(v => v.is_enabled)
        .map(v => ({
          id: v.id,
          title: v.title,
          price: v.price / 100, // Convert cents to dollars
          isAvailable: v.is_available,
          isEnabled: v.is_enabled,
          sku: v.sku,
        })),
      options: product.options.map(opt => ({
        name: opt.name,
        values: opt.values,
      })),
      tags: product.tags,
    };
  }
}

// Export a singleton instance
export const printifyService = new PrintifyService();
