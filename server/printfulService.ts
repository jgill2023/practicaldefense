import { z } from 'zod';

// Printful API Types
export interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
}

export interface PrintfulSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  main_category_id: number;
  warehouse_product_variant_id: number;
  retail_price: string;
  currency: string;
  is_ignored: boolean;
  sku: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    id: number;
    type: string;
    hash: string;
    url: string;
    filename: string;
    mime_type: string;
    size: number;
    width: number;
    height: number;
    dpi: number;
    status: string;
    created: number;
    thumbnail_url: string;
    preview_url: string;
    visible: boolean;
  }>;
  options: Array<{
    id: string;
    value: string;
  }>;
  is_discontinued: boolean;
  avg_fulfillment_time: number;
}

export interface PrintfulOrderRequest {
  external_id: string;
  shipping: 'standard' | 'express';
  recipient: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email: string;
  };
  items: Array<{
    sync_variant_id?: number;
    external_variant_id?: string;
    quantity: number;
    retail_price?: string;
  }>;
  retail_costs?: {
    currency: string;
    subtotal?: string;
    discount?: string;
    shipping?: string;
    tax?: string;
  };
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
  shipping: string;
  created: number;
  updated: number;
  recipient: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
    phone?: string;
    email: string;
  };
  items: Array<{
    id: number;
    external_id?: string;
    sync_variant_id?: number;
    external_variant_id?: string;
    warehouse_product_variant_id?: number;
    quantity: number;
    price: string;
    retail_price?: string;
    name: string;
    product: {
      variant_id: number;
      product_id: number;
      image: string;
      name: string;
    };
  }>;
  incomplete_items: Array<{
    name: string;
    quantity: number;
    sync_variant_id?: number;
    external_variant_id?: string;
  }>;
  costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    digitization: string;
    additional_fee: string;
    fulfillment_fee: string;
    retail_delivery_fee: string;
    tax: string;
    vat: string;
    total: string;
  };
  retail_costs: {
    currency: string;
    subtotal?: string;
    discount?: string;
    shipping?: string;
    tax?: string;
    total?: string;
  };
  shipments: Array<{
    id: number;
    carrier: string;
    service: string;
    tracking_number: string;
    tracking_url: string;
    created: number;
    ship_date: string;
    shipped_at: number;
    reshipment: boolean;
    items: Array<{
      item_id: number;
      quantity: number;
    }>;
  }>;
}

// Printful API Error
export class PrintfulError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PrintfulError';
  }
}

export class PrintfulService {
  private readonly baseUrl = 'https://api.printful.com';
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.PRINTFUL_API_KEY;
    if (!apiKey) {
      throw new Error('PRINTFUL_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body } = options;
    
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new PrintfulError(
          data.error?.message || `HTTP ${response.status}`,
          response.status,
          data.error?.code,
          data.error
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof PrintfulError) {
        throw error;
      }
      throw new PrintfulError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  // Store Information
  async getStoreInfo() {
    return this.makeRequest('/store');
  }

  // Product Catalog
  async getProducts(options: {
    offset?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    
    const query = params.toString() ? `?${params}` : '';
    return this.makeRequest<PrintfulProduct[]>(`/store/products${query}`);
  }

  async getProduct(id: number | string) {
    return this.makeRequest<PrintfulProduct>(`/store/products/${id}`);
  }

  async deleteProduct(id: number | string) {
    return this.makeRequest(`/store/products/${id}`, { method: 'DELETE' });
  }

  // Sync Variants
  async getSyncVariants(productId: number | string) {
    return this.makeRequest<PrintfulSyncVariant[]>(`/store/products/${productId}/variants`);
  }

  async getSyncVariant(id: number | string) {
    return this.makeRequest<PrintfulSyncVariant>(`/store/variants/${id}`);
  }

  async createSyncVariant(
    productId: number | string,
    variant: {
      external_id: string;
      variant_id: number;
      retail_price?: string;
      sku?: string;
      files?: Array<{
        type: string;
        url: string;
      }>;
      options?: Array<{
        id: string;
        value: string;
      }>;
    }
  ) {
    return this.makeRequest<PrintfulSyncVariant>(`/store/products/${productId}/variants`, {
      method: 'POST',
      body: variant,
    });
  }

  async updateSyncVariant(
    id: number | string,
    variant: {
      external_id?: string;
      retail_price?: string;
      sku?: string;
      files?: Array<{
        type: string;
        url: string;
      }>;
      options?: Array<{
        id: string;
        value: string;
      }>;
    }
  ) {
    return this.makeRequest<PrintfulSyncVariant>(`/store/variants/${id}`, {
      method: 'PUT',
      body: variant,
    });
  }

  async deleteSyncVariant(id: number | string) {
    return this.makeRequest(`/store/variants/${id}`, { method: 'DELETE' });
  }

  // Orders
  async getOrders(options: {
    status?: 'draft' | 'pending' | 'failed' | 'canceled' | 'onhold' | 'inprocess' | 'partial' | 'fulfilled';
    offset?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    
    const query = params.toString() ? `?${params}` : '';
    return this.makeRequest<PrintfulOrder[]>(`/orders${query}`);
  }

  async getOrder(id: number | string) {
    return this.makeRequest<PrintfulOrder>(`/orders/${id}`);
  }

  async createOrder(order: PrintfulOrderRequest) {
    return this.makeRequest<PrintfulOrder>('/orders', {
      method: 'POST',
      body: order,
    });
  }

  async updateOrder(id: number | string, order: Partial<PrintfulOrderRequest>) {
    return this.makeRequest<PrintfulOrder>(`/orders/${id}`, {
      method: 'PUT',
      body: order,
    });
  }

  async confirmOrder(id: number | string) {
    return this.makeRequest<PrintfulOrder>(`/orders/${id}/confirm`, {
      method: 'POST',
    });
  }

  async cancelOrder(id: number | string) {
    return this.makeRequest<PrintfulOrder>(`/orders/${id}`, {
      method: 'DELETE',
    });
  }

  // Shipping rates
  async getShippingRates(order: {
    recipient: {
      country_code: string;
      state_code?: string;
      city?: string;
      zip?: string;
    };
    items: Array<{
      sync_variant_id?: number;
      external_variant_id?: string;
      quantity: number;
    }>;
    currency?: string;
    locale?: string;
  }) {
    return this.makeRequest('/shipping/rates', {
      method: 'POST',
      body: order,
    });
  }

  // Product templates (for browsing available products)
  async getProductTemplates(options: {
    offset?: number;
    limit?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    
    const query = params.toString() ? `?${params}` : '';
    return this.makeRequest(`/products${query}`);
  }

  async getProductTemplate(id: number) {
    return this.makeRequest(`/products/${id}`);
  }

  // Webhooks
  async getWebhooks() {
    return this.makeRequest('/webhooks');
  }

  async createWebhook(webhook: {
    url: string;
    types: string[];
    params?: {
      secret?: string;
    };
  }) {
    return this.makeRequest('/webhooks', {
      method: 'POST',
      body: webhook,
    });
  }

  async deleteWebhook(id: number) {
    return this.makeRequest(`/webhooks/${id}`, { method: 'DELETE' });
  }

  // Helper methods for common operations
  async syncProductToPrintful(product: {
    external_id: string;
    name: string;
    thumbnail: string;
    is_ignored?: boolean;
  }) {
    return this.makeRequest<PrintfulProduct>('/store/products', {
      method: 'POST',
      body: product,
    });
  }

  async estimateOrderCosts(order: PrintfulOrderRequest) {
    return this.makeRequest('/orders/estimate-costs', {
      method: 'POST',
      body: order,
    });
  }

  // Inventory management
  async getInventory() {
    return this.makeRequest('/inventory');
  }

  async updateInventory(items: Array<{
    sync_variant_id: number;
    quantity: number;
  }>) {
    return this.makeRequest('/inventory', {
      method: 'PUT',
      body: { items },
    });
  }
}

// Export singleton instance
export const printfulService = new PrintfulService();