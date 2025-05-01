/**
 * Utilitaire de génération de hash de mot de passe
 * 
 * Ce module permet de générer des hash bcrypt à partir de mots de passe en clair.
 * Utile pour créer des comptes de test ou générer des mots de passe pour le développement.
 * 
 * @module config/generate_password
 */

const bcrypt = require('bcrypt');

/**
 * Génère un hash bcrypt à partir d'un mot de passe en clair
 * 
 * @async
 * @param {string} password - Mot de passe en clair à hasher
 * @returns {Promise<void>} - Affiche le mot de passe et son hash dans la console
 */
async function generateHash(password) {
    // Utilise 10 rounds de salage pour un bon équilibre entre sécurité et performances
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password} est haché en Hash: ${hash}`);
}

// Génère des hash pour les mots de passe couramment utilisés en développement
generateHash('password');
generateHash('1234');