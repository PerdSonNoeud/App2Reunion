/**
 * Configuration de la connexion à la base de données PostgreSQL
 * 
 * Ce module configure et exporte une instance de Pool PostgreSQL qui gère
 * les connexions à la base de données utilisée par l'application.
 * 
 * @module config/db
 */

const { Pool } = require('pg');

/**
 * Instance de Pool PostgreSQL configurée avec les paramètres de connexion
 * Les paramètres sont récupérés depuis les variables d'environnement avec des valeurs par défaut
 * 
 * @type {Pool}
 */
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',     // Hôte de la base de données
    database: process.env.DB_NAME || 'reunion',   // Nom de la base de données
    user: process.env.DB_USER || 'admin',         // Nom d'utilisateur
    password: process.env.DB_PASSWORD || 'admin', // Mot de passe
    port: process.env.DB_PORT || 5432,            // Port de connexion
});

// Vérification de la connexion à la base de données au démarrage
pool.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données', err.stack);
    } else {
        console.log('Connecté à la base de données');
    }
});

module.exports = { pool };