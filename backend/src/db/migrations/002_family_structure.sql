-- Add family relationship fields to contacts table
-- This enables linking parents/guardians to students

ALTER TABLE contacts
ADD COLUMN student_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
ADD COLUMN relationship_type TEXT CHECK (relationship_type IN ('student', 'papa', 'mama', 'tutor', 'otro')),
ADD COLUMN priority INTEGER DEFAULT 0;

-- student_id: if not null, this contact is a parent/guardian of that student
-- relationship_type: role of this contact (papa, mama, tutor, etc.) or 'student' if they are the student
-- priority: higher = more likely to receive message first (0=default, 1=primary)

-- Index for family queries
CREATE INDEX IF NOT EXISTS idx_contacts_student_id ON contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(relationship_type);
CREATE INDEX IF NOT EXISTS idx_contacts_student_relationship ON contacts(student_id, relationship_type);
