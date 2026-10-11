-- Cup options: minimum qualified participants per standings group (division / category / tag)
-- and an optional whitelist of categories included in By Category output.
ALTER TABLE cups ADD COLUMN IF NOT EXISTS minimum_participants INT CHECK (minimum_participants IS NULL OR minimum_participants >= 1);
ALTER TABLE cups ADD COLUMN IF NOT EXISTS selected_categories TEXT[];
