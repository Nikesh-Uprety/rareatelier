-- Migration: Add performance indexes for production scalability
-- Created: 2026-03-25
-- Purpose: Optimize query performance for high-traffic production deployment

-- Orders table indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_verified ON orders(payment_verified) WHERE payment_verified IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at DESC);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_home_featured ON products(home_featured) WHERE home_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_ranking ON products(ranking);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock) WHERE stock > 0;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);

-- Composite index for product search with category
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, isActive) WHERE isActive = true;

-- Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Bills table indexes (POS operations)
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_processed_by ON bills(processed_by);
CREATE INDEX IF NOT EXISTS idx_bills_order_id ON bills(order_id) WHERE order_id IS NOT NULL;

-- Composite index for daily sales reports
CREATE INDEX IF NOT EXISTS idx_bills_created_at_status ON bills(created_at, status);

-- OTP tokens indexes (2FA performance)
CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_id ON otp_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires ON otp_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_used ON otp_tokens(used) WHERE used = 0;

-- Composite index for finding valid unused OTPs
CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_valid ON otp_tokens(user_id, used, expires_at) WHERE used = 0 AND expires_at > NOW();

-- Newsletter subscribers
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- Contact messages (customer inquiries)
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Media assets (image library)
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_assets_provider ON media_assets(provider);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);

-- Composite for category+provider queries
CREATE INDEX IF NOT EXISTS idx_media_assets_category_provider ON media_assets(category, provider);

-- Security logs (audit trail)
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_threat ON security_logs(threat) WHERE threat IS NOT NULL;

-- Admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- Promo codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires_at ON promo_codes(expires_at) WHERE expires_at IS NOT NULL;

-- Sessions (for cleanup)
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON session(expire);

-- Users (for admin lookups)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
