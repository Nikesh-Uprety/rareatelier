import Stripe from "stripe";
import { logger } from "../logger";

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!secretKey) {
  logger.warn("STRIPE_SECRET_KEY is not set. Stripe integration will not work.");
}

if (!publishableKey) {
  logger.warn("STRIPE_PUBLISHABLE_KEY is not set.");
}

if (!webhookSecret) {
  logger.warn("STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail.");
}

export const stripe = new Stripe(secretKey || "sk_test_placeholder", {
  typescript: true,
});

export function getStripePublishableKey(): string {
  return publishableKey || "";
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function createCheckoutSession(params: {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: params.customerEmail,
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: `Order #${params.orderId}`,
            description: `Payment for order ${params.orderId.slice(0, 8)}...`,
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      orderId: params.orderId,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 min expiry
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL");
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
  };
}
