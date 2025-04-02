const bcrypt = require('bcrypt');

async function generateHash(password) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password} -> Hash: ${hash}`);
}

generateHash('password');
generateHash('1234');