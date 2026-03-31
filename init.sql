-- FitPro PostgreSQL Schema

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    objective VARCHAR(100) NOT NULL,
    trainer VARCHAR(100) DEFAULT 'any',
    payment VARCHAR(50) DEFAULT 'card',
    status VARCHAR(50) DEFAULT 'pending', -- pending, contacted, closed, paid
    telegram_sent BOOLEAN DEFAULT FALSE,
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead Magnet Captures
CREATE TABLE IF NOT EXISTS magnet_leads (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    clicked BOOLEAN DEFAULT FALSE,
    downloaded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers to auto-update 'updated_at'
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_modtime
BEFORE UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Seed Default Admin
-- Password is 'admin123' (hashed via bcrypt offline: $2b$10$XQzB5m1qHnOz9U9mY8a4wOMH4B3K7h.yGg4DkVXm8/75N7p32Zq8S )
INSERT INTO admins (username, hashed_password) 
VALUES ('admin', '$2b$10$XQzB5m1qHnOz9U9mY8a4wOMH4B3K7h.yGg4DkVXm8/75N7p32Zq8S')
ON CONFLICT (username) DO NOTHING;
