-- =============================================================================
-- Script d'initialisation de la base de données
-- =============================================================================
-- 
-- Ce script crée et configure la base de données PostgreSQL utilisée par
-- l'application de gestion de réunions. Il définit toutes les tables, relations,
-- contraintes et insère des données de test initiales.
-- 
-- Les tables principales sont:
--   * users: utilisateurs enregistrés du système
--   * meetings: réunions planifiées
--   * time_slots: créneaux horaires proposés pour les réunions
--   * participants: utilisateurs invités à une réunion
--   * guest_participants: participants invités par email (sans compte)
--   * responses: réponses des utilisateurs enregistrés aux invitations
--   * guest_responses: réponses des invités sans compte aux invitations
--   * notifications: messages et alertes pour les utilisateurs
--   * user_sessions: stockage des sessions utilisateurs
-- 

-- Suppression de la base de données si elle existe déjà
DROP DATABASE IF EXISTS reunion;

-- Création d'une nouvelle base de données propre
CREATE DATABASE reunion;

-- Connexion à la base de données nouvellement créée
\c reunion;

-- =============================================================================
-- Suppression des tables existantes (nettoyage préalable)
-- =============================================================================
-- L'ordre de suppression est important pour respecter les contraintes de clé étrangère
DROP TABLE IF EXISTS guest_responses CASCADE;
DROP TABLE IF EXISTS guest_participants CASCADE;
DROP TABLE IF EXISTS responses CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Suppression de l'utilisateur admin s'il existe déjà
DROP USER IF EXISTS admin;

-- =============================================================================
-- Création des tables pour les entités principales
-- =============================================================================

-- Table des utilisateurs enregistrés
CREATE TABLE users (
    uid SERIAL PRIMARY KEY,                  -- Identifiant unique auto-incrémenté
    name VARCHAR(100) NOT NULL,              -- Nom complet de l'utilisateur
    email VARCHAR(100) UNIQUE NOT NULL,      -- Email utilisé comme identifiant unique de connexion
    password_hash VARCHAR(255) NOT NULL      -- Hash bcrypt du mot de passe
);

-- Table des réunions
CREATE TABLE meetings (
    mid SERIAL PRIMARY KEY,                  -- Identifiant unique de la réunion
    title VARCHAR(100) NOT NULL,             -- Titre de la réunion
    description TEXT,                        -- Description détaillée (optionnelle)
    location VARCHAR(255),                   -- Lieu de la réunion (optionnel)
    start_time TIMESTAMP NOT NULL,           -- Date et heure de début (du créneau choisi)
    end_time TIMESTAMP NOT NULL,             -- Date et heure de fin (du créneau choisi)
    uid INT REFERENCES users(uid) ON DELETE CASCADE -- Organisateur (suppression en cascade)
);

-- Table des créneaux horaires proposés
CREATE TABLE time_slots (
    tid SERIAL PRIMARY KEY,                  -- Identifiant unique du créneau
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE, -- Réunion associée
    start_time TIMESTAMP NOT NULL,           -- Date et heure de début du créneau
    end_time TIMESTAMP NOT NULL              -- Date et heure de fin du créneau
);

-- Table des réponses aux créneaux (utilisateurs enregistrés)
CREATE TABLE responses (
    rid SERIAL PRIMARY KEY,                  -- Identifiant unique de la réponse
    tid INT REFERENCES time_slots(tid) ON DELETE CASCADE, -- Créneau concerné
    uid INT REFERENCES users(uid) ON DELETE CASCADE,      -- Utilisateur qui répond
    availability VARCHAR(20) NOT NULL CHECK (availability IN ('available', 'unavailable', 'maybe')), -- Disponibilité
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP        -- Date de création de la réponse
);

-- Table des participants invités sans compte
CREATE TABLE guest_participants (
    gid SERIAL PRIMARY KEY,                  -- Identifiant unique du participant invité
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE, -- Réunion associée
    email VARCHAR(100) NOT NULL,             -- Email de l'invité
    name VARCHAR(100),                       -- Nom de l'invité (optionnel)
    token VARCHAR(255) UNIQUE NOT NULL,      -- Token unique pour l'accès sans authentification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Date d'invitation
);

-- Table des réponses des invités sans compte
CREATE TABLE guest_responses (
    gid INT REFERENCES guest_participants(gid) ON DELETE CASCADE, -- Invité qui répond
    tid INT REFERENCES time_slots(tid) ON DELETE CASCADE,         -- Créneau concerné
    availability VARCHAR(20) NOT NULL CHECK (availability IN ('available', 'unavailable', 'maybe')), -- Disponibilité
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,              -- Date de création de la réponse
    PRIMARY KEY (gid, tid)                   -- Clé primaire composite, un invité ne peut répondre qu'une fois par créneau
);

-- Table d'association entre réunions et participants enregistrés
CREATE TABLE participants (
    mid INT,                                 -- ID de la réunion
    uid INT,                                 -- ID de l'utilisateur
    PRIMARY KEY(mid, uid),                   -- Clé primaire composite
    FOREIGN KEY(mid) REFERENCES meetings(mid) ON DELETE CASCADE, -- Suppression en cascade si la réunion est supprimée
    FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE     -- Suppression en cascade si l'utilisateur est supprimé
);

-- Table des notifications système
CREATE TABLE notifications (
    nid SERIAL PRIMARY KEY,                  -- Identifiant unique de la notification
    uid INT REFERENCES users(uid) ON DELETE CASCADE,       -- Destinataire
    mid INT REFERENCES meetings(mid) ON DELETE CASCADE,    -- Réunion concernée
    message TEXT NOT NULL,                   -- Contenu du message
    type VARCHAR(50) NOT NULL,               -- Type de notification (invitation, reminder, confirm, decline, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Date de création
    is_read BOOLEAN DEFAULT FALSE            -- Indique si la notification a été lue
);

-- =============================================================================
-- Données initiales pour les tests
-- =============================================================================

-- Utilisateurs de test
INSERT INTO users (name, email, password_hash) VALUES
('User User', 'user@gmail.com', '$2b$10$sc7QWqesIIAjzUV8Ttvu.uORgqwwgW/sk8mr8tsJ0i8khi5Trb2aS'), -- Mot de passe: "password"
('Christophe Jin', 'christophejin2004@gmail.com', '$2b$10$457XRPAywfVQ4NMkq.nDSOPhXoq/SP7nhk.8jdrXkCOpBYDGN4tlq'); -- Mot de passe: "1234"

-- Réunions de test
INSERT INTO meetings (title, description, start_time, end_time, uid) VALUES
('Project Kickoff', 'Initial meeting to discuss project scope', '2025-05-15 10:00:00', '2025-05-15 11:30:00', 1),
('Weekly Standup', 'Weekly team standup meeting', '2025-05-15 09:00:00', '2025-05-15 09:30:00', 1);

-- Participants aux réunions de test
INSERT INTO participants (mid, uid) VALUES
(1, 1), -- User User participe à la réunion 1 (Project Kickoff)
(2, 1), -- User User participe à la réunion 2 (Weekly Standup)
(1, 2); -- Christophe Jin participe à la réunion 1 (Project Kickoff)

-- =============================================================================
-- Configuration de la gestion des sessions
-- =============================================================================

-- Table pour stocker les sessions utilisateurs (pour connect-pg-simple)
CREATE TABLE IF NOT EXISTS user_sessions (
    sid varchar NOT NULL COLLATE "default",  -- Identifiant de session
    sess json NOT NULL,                      -- Données de session au format JSON
    expire timestamp(6) NOT NULL             -- Date d'expiration
);

-- Ajout de la contrainte de clé primaire
ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Index pour améliorer les performances des requêtes sur l'expiration
CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");

-- =============================================================================
-- Modifications et ajouts de contraintes
-- =============================================================================

-- Ajout de la colonne status à la table participants
ALTER TABLE participants ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

-- Ajout de la colonne status à la table guest_participants
ALTER TABLE guest_participants ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

-- Contrainte d'unicité pour éviter les doublons de réponses
ALTER TABLE responses ADD CONSTRAINT unique_user_timeslot UNIQUE (uid, tid);

-- Ajouter la colonne status à la table meetings
ALTER TABLE meetings ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

-- =============================================================================
-- Configuration des utilisateurs et des permissions
-- =============================================================================

-- Création de l'utilisateur administrateur
CREATE USER admin WITH PASSWORD 'admin';

-- Attribution des privilèges à l'utilisateur admin
GRANT ALL PRIVILEGES ON DATABASE reunion TO admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO postgres;
GRANT ALL PRIVILEGES ON TABLE user_sessions TO admin;