-- Add nutrition and ingredients to dishes for Recipe Book / Food Library
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS nutrition jsonb;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS ingredients jsonb;

COMMENT ON COLUMN dishes.nutrition IS 'Estimated nutrition e.g. { calories, protein, carbs, fat, sugar } from AI.';
COMMENT ON COLUMN dishes.ingredients IS 'Array of ingredient strings from AI.';
