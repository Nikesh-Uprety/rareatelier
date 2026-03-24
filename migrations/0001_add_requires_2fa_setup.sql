ALTER TABLE users
ADD COLUMN IF NOT EXISTS requires_2fa_setup boolean NOT NULL DEFAULT false;
