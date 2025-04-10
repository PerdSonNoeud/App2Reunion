DROP DATABASE IF EXISTS reunion;
CREATE DATABASE reunion;
\c reunion;

DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP USER IF EXISTS admin;

CREATE TABLE users (
    uid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE meetings (
    mid SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    uid INT REFERENCES users(uid)
);

CREATE TABLE participants (
    mid INT,
    uid INT,
    PRIMARY KEY(mid, uid),
    FOREIGN KEY(mid) REFERENCES meetings(mid),
    FOREIGN KEY(uid) REFERENCES users(uid)
);

INSERT INTO users (name, email, password_hash) VALUES
('User User', 'user@gmail.com', '$2b$10$sc7QWqesIIAjzUV8Ttvu.uORgqwwgW/sk8mr8tsJ0i8khi5Trb2aS'), --template correspond à "password"
('Christophe Jin', 'christophejin2004@gmail.com', '$2b$10$457XRPAywfVQ4NMkq.nDSOPhXoq/SP7nhk.8jdrXkCOpBYDGN4tlq'); -- template correspond à "1234"

INSERT INTO meetings (title, description, start_time, end_time, uid) VALUES
('Project Kickoff', 'Initial meeting to discuss project scope', '2025-05-15 10:00:00', '2024-05-15 11:30:00', 1),
('Weekly Standup', 'Weekly team standup meeting', '2025-05-15 09:00:00', '2024-05-15 09:30:00', 1);

INSERT INTO participants (mid, uid) VALUES
(1, 1),
(2, 1),
(1, 2);

CREATE TABLE IF NOT EXISTS user_sessions (
    sid varchar NOT NULL COLLATE "default",
    sess json NOT NULL,
    expire timestamp(6) NOT NULL
);

ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");


CREATE USER admin WITH PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE reunion TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO postgres;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO admin;
