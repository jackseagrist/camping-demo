-- Add summary column to facilities table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS summary TEXT;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS facilities_summary_idx ON facilities(summary);

-- Comment explaining the purpose of this column
COMMENT ON COLUMN facilities.summary IS 'One-sentence AI-generated summary of the facility description'; 