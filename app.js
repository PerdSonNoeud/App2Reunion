// app.js - Point d'entrée de l'application
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

// Configuration des sessions
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

// Middleware pour ajouter les notifications
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

// Routes
app.use('/', route);
app.use('/auth', routeAuth);
app.use('/new_meeting', routeNewMeeting);
app.use('/meetings', routeMeetings);
app.use('/notifications', routeNotifications);

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).render('pages/404', { 
    title: 'Page non trouvée',
    user: req.session.user
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;