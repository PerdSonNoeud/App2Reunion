const { Pool } = require('pg');

// Configuration de la connexion à la base de données PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'reunion',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

// Vérification de la connexion à la base de données
pool.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données', err.stack);
    } else {
        console.log('Connecté à la base de données');
    }
});

module.exports = { pool };
