/**
 * Point d'entrée principal de l'application
 * 
 * Ce fichier configure l'application Express, initialise les middlewares,
 * gère les sessions utilisateur et définit les routes principales.
 * Il configure également la gestion des erreurs et le serveur HTTP.
 * 
 * @module app
 * @requires dotenv
 * @requires express
 * @requires path
 * @requires body-parser
 * @requires express-session
 * @requires connect-pg-simple
 * @requires ./config/db
 * @requires ./routes/*
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./config/db');

const route = require('./routes/index');
const routeAuth = require('./routes/auth');
const routeNewMeeting = require('./routes/new_meeting');
const routeMeetings = require('./routes/meetings');
const notificationService = require('./routes/notificationService');
const routeNotifications = require('./routes/notifications');
const routeImportMeeting = require('./routes/import_meeting');


// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Configuration du moteur de templates EJS
 * Définit le dossier des vues et le moteur de rendu
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Configuration des middlewares de base
 * - Fichiers statiques
 * - Parsing du corps des requêtes
 */
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * Configuration des sessions utilisateur
 * Utilise PostgreSQL comme stockage de session via connect-pg-simple
 */
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions'
  }),
  secret: process.env.SESSION_SECRET || 'secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 jours
}));

/**
 * Middleware pour ajouter les données utilisateur et les notifications
 * aux variables locales de tous les templates
 * 
 * @async
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 */
app.use(async (req, res, next) => {
  // Rendre l'utilisateur disponible dans tous les templates
  res.locals.user = req.session.user || null;
  
  // Si l'utilisateur est connecté, récupérer ses notifications
  if (req.session.user) {
    try {
      const notifications = await notificationService.getUnreadNotifications(req.session.user.uid);
      res.locals.unreadNotifications = notifications;
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications', error);
      res.locals.unreadNotifications = [];
    }
  }
  
  next();
});

/**
 * Configuration des routes principales de l'application
 * Chaque module gère un ensemble spécifique de fonctionnalités
 */
app.use('/', route);
app.use('/auth', routeAuth);
app.use('/new_meeting', routeNewMeeting);
app.use('/meetings', routeMeetings);
app.use('/notifications', routeNotifications);
app.use('/import_meeting', routeImportMeeting);

/**
 * Middleware de gestion des erreurs 404
 * Intercepte toutes les requêtes vers des routes non définies
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
app.use((req, res) => {
  res.status(404).render('pages/404', { 
    title: 'Page non trouvée',
    user: req.session.user
  });
});

/**
 * Démarrage du serveur HTTP
 * Écoute les connexions sur le port spécifié
 */
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;