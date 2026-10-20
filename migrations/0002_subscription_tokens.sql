-- Add independent high-entropy subscription tokens, separate from proxy UUIDs.
ALTER TABLE users ADD COLUMN subscription_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_subscription_token_unique ON users(subscription_token);
