-- Add family structure fields to contacts table
-- This enables linking parents/guardians to students and grouping by family name

ALTER TABLE contacts
ADD COLUMN student_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
ADD COLUMN relationship_type TEXT CHECK (relationship_type IN ('student', 'papa', 'mama', 'tutor', 'otro')),
ADD COLUMN priority INTEGER DEFAULT 0,
ADD COLUMN nombre_familia TEXT;

-- student_id: if not null, this contact is a parent/guardian of that student
-- relationship_type: role of this contact (papa, mama, tutor, etc.) or 'student' if they are the student
-- priority: higher = more likely to receive message first (0=default, 1=primary)
-- nombre_familia: family name/identifier (e.g. "Perez Hernandez") to group students + parents

-- Index for family queries
CREATE INDEX IF NOT EXISTS idx_contacts_student_id ON contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relationship ON contacts(relationship_type);
CREATE INDEX IF NOT EXISTS idx_contacts_student_relationship ON contacts(student_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_contacts_nombre_familia ON contacts(nombre_familia);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_familia ON contacts(tenant_id, nombre_familia);
