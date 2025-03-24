DROP DATABASE IF EXISTS reunion;
CREATE DATABASE reunion;
\c reunion;

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS users;


DROP USER IF EXISTS admin;



CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    user_id INT REFERENCES users(id)
);

INSERT INTO users (name, email, password_hash) VALUES
('John Doe', 'doe@example.com', 'lala');

INSERT INTO meetings (title, description, start_time, end_time, user_id) VALUES
('Project Kickoff', 'Initial meeting to discuss project scope', '2024-05-15 10:00:00', '2024-05-15 11:30:00', 1),
('Weekly Standup', 'Weekly team standup meeting', '2024-05-15 09:00:00', '2024-05-15 09:30:00', 1);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");


CREATE USER admin WITH PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE reunion TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO postgres;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO admin;