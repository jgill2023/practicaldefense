/**
 * Store Routes - Handles merch store API endpoints
 * Products from Printify AND local database, checkout via Stripe, discount codes
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  merchDiscountCodes, 
  merchOrders, 
  merchOrderItems,
  insertMerchOrderSchema,
  insertMerchOrderItemSchema,
  type CartItem 
} from '@shared/schema';
import { printifyService, type NormalizedProduct } from '../printify/service';
import { eq, and, sql, gt, or, isNull, lte } from 'drizzle-orm';
import { storage } from '../storage';
import Stripe from 'stripe';
import { getStripeClient } from '../stripeClient';
import { markRecoveryCompleted } from '../services/abandonedCartService';

const router = Router();

// Initialize Stripe using Replit connector
let stripe: Stripe | null = null;
let stripeInitialized = false;

async function ensureStripeInitialized(): Promise<Stripe | null> {
  if (!stripeInitialized) {
    try {
      stripe = await getStripeClient();
      stripeInitialized = true;
    } catch (error) {
      console.warn('Store: Stripe not configured');
      stripe = null;
    }
  }
  return stripe;
}

ensureStripeInitialized();

// Simple in-memory cache for products (5 minute TTL)
let productCache: { data: NormalizedProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/store/shops
 * Debug endpoint to list Printify shops (helps find correct shop ID)
 */
router.get('/shops', async (req: Request, res: Response) => {
  try {
    const shops = await printifyService.getShops();
    res.json(shops);
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ message: 'Failed to fetch shops', error: String(error) });
  }
});

/**
 * GET /api/store/products
 * Fetch all products from Printify AND local database
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    // Fetch Printify products (with cache)
    let printifyProducts: NormalizedProduct[] = [];
    if (productCache && Date.now() - productCache.timestamp < CACHE_TTL) {
      printifyProducts = productCache.data;
    } else {
      try {
        printifyProducts = await printifyService.getProducts();
        productCache = { data: printifyProducts, timestamp: Date.now() };
      } catch (printifyError) {
        console.warn('Could not fetch Printify products:', printifyError);
      }
    }

    // Fetch local products from database
    const localProducts = await storage.getProducts();
    
    // Helper to generate deterministic numeric ID from string
    const hashStringToNumber = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    // Normalize local products to match Printify structure
    const normalizedLocalProducts: NormalizedProduct[] = localProducts
      .filter(p => p.status === 'active')
      .map(product => ({
        id: `local_${product.id}`,
        title: product.name,
        description: product.description || '',
        images: product.primaryImageUrl 
          ? [{ src: product.primaryImageUrl, variantIds: [], isDefault: true }]
          : [],
        variants: product.variants && product.variants.length > 0
          ? product.variants.map(v => ({
              id: hashStringToNumber(v.id),
              title: v.name,
              price: Number(v.price),
              isAvailable: v.stock === null || v.stock > 0,
              isEnabled: true,
              sku: v.sku || '',
              localVariantId: v.id,
            }))
          : [{
              id: hashStringToNumber(`default_${product.id}`),
              title: 'Default',
              price: Number(product.price),
              isAvailable: true,
              isEnabled: true,
              sku: product.sku || '',
              localVariantId: undefined,
            }],
        options: [],
        tags: [
          ...(product.tags || []),
          product.category?.name || '',
          product.productType || '',
        ].filter(Boolean),
        isLocal: true,
        localProductId: product.id,
        categoryName: product.category?.name,
        productType: product.productType,
        // Sale pricing fields
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        saleEnabled: product.saleEnabled || false,
        saleStartDate: product.saleStartDate,
        saleEndDate: product.saleEndDate,
      }));

    // Combine both product sources
    const allProducts = [...printifyProducts, ...normalizedLocalProducts];
    
    res.json(allProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

/**
 * GET /api/store/products/:id
 * Fetch a single product by ID
 */
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check cache first
    if (productCache && Date.now() - productCache.timestamp < CACHE_TTL) {
      const cachedProduct = productCache.data.find(p => p.id === id);
      if (cachedProduct) {
        return res.json(cachedProduct);
      }
    }

    const product = await printifyService.getProductById(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
});

// Helper to get all products (Printify + local) for validation
async function getAllProductsForValidation(): Promise<NormalizedProduct[]> {
  // Get Printify products from cache or fetch
  let printifyProducts: NormalizedProduct[] = [];
  if (productCache && Date.now() - productCache.timestamp < CACHE_TTL) {
    printifyProducts = productCache.data;
  } else {
    try {
      printifyProducts = await printifyService.getProducts();
      productCache = { data: printifyProducts, timestamp: Date.now() };
    } catch (error) {
      console.warn('Could not fetch Printify products for validation:', error);
    }
  }
  
  // Get local products
  const localProducts = await storage.getProducts();
  
  // Helper to generate deterministic numeric ID from string
  const hashStringToNumber = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  };
  
  const normalizedLocalProducts: NormalizedProduct[] = localProducts
    .filter(p => p.status === 'active')
    .map(product => ({
      id: `local_${product.id}`,
      title: product.name,
      description: product.description || '',
      images: product.primaryImageUrl 
        ? [{ src: product.primaryImageUrl, variantIds: [], isDefault: true }]
        : [],
      variants: product.variants && product.variants.length > 0
        ? product.variants.map(v => ({
            id: hashStringToNumber(v.id),
            title: v.name,
            price: Number(v.price),
            isAvailable: v.stock === null || v.stock > 0,
            isEnabled: true,
            sku: v.sku || '',
            localVariantId: v.id,
          }))
        : [{
            id: hashStringToNumber(`default_${product.id}`),
            title: 'Default',
            price: Number(product.price),
            isAvailable: true,
            isEnabled: true,
            sku: product.sku || '',
            localVariantId: undefined,
          }],
      options: [],
      tags: (product.tags || []).filter(Boolean),
      isLocal: true,
      localProductId: product.id,
      categoryName: product.category?.name,
      productType: product.productType,
    }));
  
  return [...printifyProducts, ...normalizedLocalProducts];
}

/**
 * POST /api/store/validate-cart
 * Validate cart items and return current prices
 */
router.post('/validate-cart', async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: CartItem[] };
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Fetch all products (Printify + local) to validate prices
    const products = await getAllProductsForValidation();
    
    const validatedItems: CartItem[] = [];
    let subtotal = 0;

    for (const item of items) {
      // Handle local products (productId present, no printifyProductId)
      if (item.productId && !item.printifyProductId) {
        // This is a local product - validate using local product lookup
        const localProduct = products.find(p => p.localProductId === item.productId);
        if (!localProduct) {
          return res.status(400).json({ 
            message: `Local product ${item.productId} not found` 
          });
        }
        
        // Find the variant by localVariantId (canonical UUID)
        let variant;
        if (item.variantId) {
          // Match by localVariantId (canonical identifier)
          variant = localProduct.variants.find(v => v.localVariantId === item.variantId);
          
          // For single-variant products without localVariantId (synthesized defaults), 
          // allow matching by hashed ID as the variant is authoritative
          if (!variant && localProduct.variants.length === 1) {
            const onlyVariant = localProduct.variants[0];
            if (!onlyVariant.localVariantId) {
              // This is a synthesized default variant - accept if hash matches
              if (onlyVariant.id === Number(item.variantId)) {
                variant = onlyVariant;
              }
            }
          }
          
          if (!variant) {
            return res.status(400).json({ 
              message: `Selected variant for ${localProduct.title} is no longer available. Please reselect.` 
            });
          }
        } else if (localProduct.variants.length === 1) {
          // Single-variant product - use the only variant
          variant = localProduct.variants[0];
        } else {
          // Multi-variant product without variant selection - error
          return res.status(400).json({ 
            message: `Please select a variant for ${localProduct.title}` 
          });
        }
        
        if (!variant.isAvailable) {
          return res.status(400).json({ 
            message: `${localProduct.title} - ${variant.title} is currently unavailable` 
          });
        }
        
        const validatedItem: CartItem = {
          ...item,
          variantId: variant.localVariantId || item.variantId,
          unitPrice: variant.price,
          productTitle: localProduct.title,
          variantTitle: variant.title !== 'Default' ? variant.title : undefined,
        };
        
        validatedItems.push(validatedItem);
        subtotal += variant.price * item.quantity;
        continue;
      }
      
      // Handle Printify products
      const product = products.find(p => p.id === item.printifyProductId);
      if (!product) {
        return res.status(400).json({ 
          message: `Product ${item.printifyProductId} not found` 
        });
      }

      const variant = product.variants.find(v => v.id === Number(item.printifyVariantId));
      if (!variant) {
        return res.status(400).json({ 
          message: `Variant ${item.printifyVariantId} not found for product ${product.title}` 
        });
      }

      if (!variant.isAvailable) {
        return res.status(400).json({ 
          message: `${product.title} - ${variant.title} is currently unavailable` 
        });
      }

      // Use server-side price
      const validatedItem: CartItem = {
        ...item,
        unitPrice: variant.price,
        productTitle: product.title,
        variantTitle: variant.title,
      };

      validatedItems.push(validatedItem);
      subtotal += variant.price * item.quantity;
    }

    res.json({ items: validatedItems, subtotal });
  } catch (error) {
    console.error('Error validating cart:', error);
    res.status(500).json({ message: 'Failed to validate cart' });
  }
});

/**
 * POST /api/store/validate-discount
 * Validate a discount code and return discount details
 */
router.post('/validate-discount', async (req: Request, res: Response) => {
  try {
    const { code, subtotal } = req.body as { code: string; subtotal: number };
    
    if (!code) {
      return res.status(400).json({ message: 'Discount code is required' });
    }

    const now = new Date();
    
    // Find active discount code
    const [discountCode] = await db
      .select()
      .from(merchDiscountCodes)
      .where(
        and(
          eq(merchDiscountCodes.code, code.toUpperCase()),
          eq(merchDiscountCodes.isActive, true),
          or(
            isNull(merchDiscountCodes.expiresAt),
            gt(merchDiscountCodes.expiresAt, now)
          ),
          or(
            isNull(merchDiscountCodes.maxUsageCount),
            sql`${merchDiscountCodes.currentUsageCount} < ${merchDiscountCodes.maxUsageCount}`
          )
        )
      );

    if (!discountCode) {
      return res.status(404).json({ message: 'Invalid or expired discount code' });
    }

    // Check minimum order amount
    if (discountCode.minOrderAmount && subtotal < Number(discountCode.minOrderAmount)) {
      return res.status(400).json({ 
        message: `Minimum order amount of $${discountCode.minOrderAmount} required for this code` 
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.discountType === 'percentage') {
      discountAmount = (subtotal * Number(discountCode.discountValue)) / 100;
    } else if (discountCode.discountType === 'fixed_amount') {
      discountAmount = Math.min(Number(discountCode.discountValue), subtotal);
    }
    // free_shipping is handled separately

    res.json({
      valid: true,
      discountCode: {
        id: discountCode.id,
        code: discountCode.code,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
        discountAmount: discountAmount.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Error validating discount:', error);
    res.status(500).json({ message: 'Failed to validate discount code' });
  }
});

/**
 * POST /api/store/create-payment-intent
 * Create a Stripe payment intent for checkout
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const { 
      items, 
      discountCode,
      shippingAddress,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    if (!stripe) {
      return res.status(503).json({ message: 'Payment processing is not configured' });
    }

    // Validate cart server-side
    const products = productCache?.data || await printifyService.getProducts();
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.printifyProductId);
      if (!product) {
        return res.status(400).json({ message: `Product not found` });
      }

      const variant = product.variants.find(v => v.id === Number(item.printifyVariantId));
      if (!variant || !variant.isAvailable) {
        return res.status(400).json({ message: `Product variant unavailable` });
      }

      subtotal += variant.price * item.quantity;
      validatedItems.push({
        ...item,
        unitPrice: variant.price,
        productTitle: product.title,
        variantTitle: variant.title,
      });
    }

    // Apply discount if provided
    let discountAmount = 0;
    let discountCodeRecord = null;

    if (discountCode) {
      const now = new Date();
      const [foundCode] = await db
        .select()
        .from(merchDiscountCodes)
        .where(
          and(
            eq(merchDiscountCodes.code, discountCode.toUpperCase()),
            eq(merchDiscountCodes.isActive, true),
            or(
              isNull(merchDiscountCodes.expiresAt),
              gt(merchDiscountCodes.expiresAt, now)
            )
          )
        );

      if (foundCode) {
        discountCodeRecord = foundCode;
        if (foundCode.discountType === 'percentage') {
          discountAmount = (subtotal * Number(foundCode.discountValue)) / 100;
        } else if (foundCode.discountType === 'fixed_amount') {
          discountAmount = Math.min(Number(foundCode.discountValue), subtotal);
        }
      }
    }

    // Calculate shipping (flat rate for now)
    const shippingCost = 5.99;

    // Calculate tax (if applicable - using 0 for now as Printify handles tax)
    const taxAmount = 0;

    // Calculate total
    const total = Math.max(0, subtotal - discountAmount + shippingCost + taxAmount);
    const totalCents = Math.round(total * 100);

    // Create order record first (pending status)
    const [order] = await db.insert(merchOrders).values({
      userId: (req as any).user?.id || null,
      customerEmail,
      customerFirstName,
      customerLastName,
      customerPhone,
      shippingAddress1: shippingAddress.address1,
      shippingAddress2: shippingAddress.address2 || null,
      shippingCity: shippingAddress.city,
      shippingState: shippingAddress.state,
      shippingZip: shippingAddress.zip,
      shippingCountry: shippingAddress.country || 'US',
      status: 'pending',
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      discountCodeId: discountCodeRecord?.id || null,
      discountCodeUsed: discountCodeRecord?.code || null,
    }).returning();

    // Create order items
    for (const item of validatedItems) {
      await db.insert(merchOrderItems).values({
        orderId: order.id,
        printifyProductId: item.printifyProductId,
        printifyVariantId: String(item.printifyVariantId),
        productTitle: item.productTitle,
        variantTitle: item.variantTitle,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        totalPrice: (item.unitPrice * item.quantity).toFixed(2),
        imageUrl: item.imageUrl,
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      metadata: {
        orderId: order.id,
        orderType: 'merch',
      },
      receipt_email: customerEmail,
    });

    // Update order with payment intent ID
    await db.update(merchOrders)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(merchOrders.id, order.id));

    res.json({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      subtotal,
      discountAmount,
      shippingCost,
      taxAmount,
      total,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Failed to create payment' });
  }
});

/**
 * POST /api/store/confirm-order
 * Called after successful payment to create Printify order
 */
router.post('/confirm-order', async (req: Request, res: Response) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    // Get order details
    const [order] = await db
      .select()
      .from(merchOrders)
      .where(eq(merchOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!stripe) {
      return res.status(503).json({ message: 'Payment processing is not configured' });
    }

    // Verify payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Mark abandoned cart recovery as completed if applicable
    await markRecoveryCompleted(paymentIntentId);

    // Get order items
    const orderItems = await db
      .select()
      .from(merchOrderItems)
      .where(eq(merchOrderItems.orderId, orderId));

    // Create Printify order
    const printifyOrder = await printifyService.createOrder({
      external_id: orderId,
      line_items: orderItems.map(item => ({
        product_id: item.printifyProductId,
        variant_id: Number(item.printifyVariantId),
        quantity: item.quantity,
      })),
      shipping_method: 1, // Standard shipping
      send_shipping_notification: true,
      address_to: {
        first_name: order.customerFirstName,
        last_name: order.customerLastName,
        email: order.customerEmail,
        phone: order.customerPhone || undefined,
        country: order.shippingCountry,
        region: order.shippingState,
        address1: order.shippingAddress1,
        address2: order.shippingAddress2 || undefined,
        city: order.shippingCity,
        zip: order.shippingZip,
      },
    });

    // Update order with Printify order ID
    await db.update(merchOrders)
      .set({ 
        status: 'paid',
        printifyOrderId: printifyOrder.id,
        printifyStatus: 'created',
        stripePaymentStatus: 'succeeded',
        paidAt: new Date(),
      })
      .where(eq(merchOrders.id, orderId));

    // Increment discount code usage if applicable
    if (order.discountCodeId) {
      await db.update(merchDiscountCodes)
        .set({ 
          currentUsageCount: sql`${merchDiscountCodes.currentUsageCount} + 1` 
        })
        .where(eq(merchDiscountCodes.id, order.discountCodeId));
    }

    res.json({ 
      success: true, 
      orderId,
      printifyOrderId: printifyOrder.id,
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ message: 'Failed to confirm order' });
  }
});

/**
 * GET /api/store/orders/:id
 * Get order details (for order confirmation page)
 */
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [order] = await db
      .select()
      .from(merchOrders)
      .where(eq(merchOrders.id, id));

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const items = await db
      .select()
      .from(merchOrderItems)
      .where(eq(merchOrderItems.orderId, id));

    res.json({ ...order, items });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
});

export default router;
