-- On-Call Tracker Database Schema
-- PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_start TIMESTAMP NOT NULL,
    incident_end TIMESTAMP,
    on_call_engineer VARCHAR(255) NOT NULL,
    incident_type VARCHAR(100) NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 4), -- 1=Critical, 2=High, 3=Medium, 4=Low
    description TEXT NOT NULL,
    resolution TEXT,
    manager_reviewed BOOLEAN DEFAULT FALSE,
    manager_reviewed_at TIMESTAMP,
    manager_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX idx_incidents_on_call_engineer ON incidents(on_call_engineer);
CREATE INDEX idx_incidents_manager_reviewed ON incidents(manager_reviewed);
CREATE INDEX idx_incidents_incident_start ON incidents(incident_start);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_incident_type ON incidents(incident_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Audit log table (bonus feature)
CREATE TABLE incident_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'REVIEW'
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    old_values JSONB,
    new_values JSONB
);

CREATE INDEX idx_audit_log_incident_id ON incident_audit_log(incident_id);
CREATE INDEX idx_audit_log_changed_at ON incident_audit_log(changed_at);

-- Optional: Users table for authentication (simplified)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('engineer', 'manager', 'admin')),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Sample data for testing (optional)
-- INSERT INTO users (username, email, role) VALUES
-- ('engineer1', 'engineer1@company.com', 'engineer'),
-- ('manager1', 'manager1@company.com', 'manager'),
-- ('admin1', 'admin1@company.com', 'admin');

