// app.js - Point d'entrée de l'application

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./config/db');
const route = require('./routes/index');
const routeAuth = require('./routes/auth'); // Correction du nom de variable
const routeNewMeeting = require('./routes/new_meeting');
const routeMeetings = require('./routes/meetings');


// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration du moteur de templates EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Chemine pour les routes
app.use('/', route);
app.use('/auth', routeAuth); // Toutes les routes dans routeAuth seront préfixées par /auth
app.use('/new_meeting', routeNewMeeting); // Toutes les routes dans routeNewMeeting seront préfixées par /new_meeting
app.use('/meetings', routeMeetings); // Toutes les routes dans routeMeetings seront préfixées par /meetings

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).render('pages/404', { title: 'Page non trouvée', user: null });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;