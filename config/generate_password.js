const bcrypt = require('bcrypt');

// Fonction pour générer un hash à partir d'un mot de passe
// Utilise bcrypt pour le hachage sécurisé
async function generateHash(password) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password} est haché en Hash: ${hash}`);
}

generateHash('password');
generateHash('1234');