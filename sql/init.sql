DROP DATABASE IF EXISTS reunion;
CREATE DATABASE reunion;
\c reunion;

DROP TABLE IF EXISTS guest_responses CASCADE;
DROP TABLE IF EXISTS guest_participants CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

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
    location VARCHAR(255),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    uid INT REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE time_slots (
    tid SERIAL PRIMARY KEY,
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL
);

CREATE TABLE responses (
    rid SERIAL PRIMARY KEY,
    tid INT REFERENCES time_slots(tid) ON DELETE CASCADE,
    uid INT REFERENCES users(uid) ON DELETE CASCADE,
    availability VARCHAR(20) NOT NULL CHECK (availability IN ('available', 'unavailable', 'maybe')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guest_participants (
    gid SERIAL PRIMARY KEY,
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guest_responses (
    gid INT REFERENCES guest_participants(gid) ON DELETE CASCADE,
    tid INT REFERENCES time_slots(tid) ON DELETE CASCADE,
    availability VARCHAR(20) NOT NULL CHECK (availability IN ('available', 'unavailable', 'maybe')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (gid, tid)
);

CREATE TABLE participants (
    mid INT,
    uid INT,
    PRIMARY KEY(mid, uid),
    FOREIGN KEY(mid) REFERENCES meetings(mid) ON DELETE CASCADE,
    FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE TABLE notifications (
    nid SERIAL PRIMARY KEY,
    uid INT REFERENCES users(uid) ON DELETE CASCADE,
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

INSERT INTO users (name, email, password_hash) VALUES
('User User', 'user@gmail.com', '$2b$10$sc7QWqesIIAjzUV8Ttvu.uORgqwwgW/sk8mr8tsJ0i8khi5Trb2aS'), --template correspond à "password"
('Christophe Jin', 'christophejin2004@gmail.com', '$2b$10$457XRPAywfVQ4NMkq.nDSOPhXoq/SP7nhk.8jdrXkCOpBYDGN4tlq'); -- template correspond à "1234"

INSERT INTO meetings (title, description, start_time, end_time, uid) VALUES
('Project Kickoff', 'Initial meeting to discuss project scope', '2025-05-15 10:00:00', '2025-05-15 11:30:00', 1),
('Weekly Standup', 'Weekly team standup meeting', '2025-05-15 09:00:00', '2025-05-15 09:30:00', 1);

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


ALTER TABLE participants ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE guest_participants ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE responses ADD CONSTRAINT unique_user_timeslot UNIQUE (uid, tid);

CREATE USER admin WITH PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE reunion TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO postgres;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO admin;