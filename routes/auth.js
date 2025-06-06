/**
 * Gestion de l'authentification des utilisateurs
 * 
 * Ce module gère l'ensemble des routes liées à l'authentification:
 * connexion, inscription et déconnexion des utilisateurs.
 * 
 * @module routes/auth
 */

const express = require('express');
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const router = express.Router();

/**
 * Affiche la page de connexion
 * 
 * Si l'utilisateur est déjà connecté, il est redirigé vers la page appropriée.
 * Conserve les informations de redirection pour après la connexion si nécessaire.
 * 
 * @route GET /auth/login
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/login', (req, res) => {
  
  // Si l'utilisateur est déjà connecté et tente d'accéder à la page de connexion
  if (req.session && req.session.user) {
    // S'il y a une redirection vers /respond, vérifier d'abord si l'utilisateur est autorisé
    if (req.session.redirectTo && req.session.redirectTo.includes('/respond')) {
      // Laisser la redirection se faire via la route respond
      return res.redirect(req.session.redirectTo);
    }
    // Sinon, rediriger vers la page des réunions
    return res.redirect('/meetings');
  }
  
  // Afficher la page de connexion normale
  res.render('pages/login', { 
    title: 'Connexion', 
    user: null,
    redirectTo: req.session ? req.session.redirectTo : null 
  });
});

/**
 * Affiche la page d'inscription
 * 
 * @route GET /auth/register
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Inscription', user: null });
});

/**
 * Traite les demandes de connexion
 * 
 * Vérifie les identifiants de l'utilisateur et crée une session si valides.
 * Redirige vers la page de destination après connexion réussie.
 * 
 * @route POST /auth/login
 * @param {Request} req - Requête Express contenant email et password
 * @param {Response} res - Réponse Express
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'utilisateur', err);
      return res.status(500).send('Erreur serveur');
    }

    if (result.rows.length === 0) {
      return res.render('pages/login', {
        title: 'Connexion',
        user: null,
        error: 'Identifiants invalides'
      });
    }

    const user = result.rows[0];

    bcrypt.compare(password, user.password_hash, (err, valide) => {
      if (err) {
        console.error('Erreur lors de la comparaison des mots de passe', err);
        return res.status(500).send('Erreur serveur');
      }

      if (!valide) {
        return res.render('pages/login', {
          title: 'Connexion',
          user: null,
          error: 'Identifiants invalides'
        });
      }

      req.session.user = { uid: user.uid, name: user.name, email: user.email };
      
      // Check if there's a redirectTo path in the session
      const redirectTo = req.session.redirectTo || '/meetings';
      delete req.session.redirectTo; // Clean up
      
      res.redirect(redirectTo);
    });
  });
});

/**
 * Traite les demandes d'inscription
 * 
 * Vérifie si l'email n'est pas déjà utilisé et si les mots de passe correspondent.
 * Enregistre le nouvel utilisateur dans la base de données avec mot de passe hashé.
 * 
 * @route POST /auth/register
 * @param {Request} req - Requête Express contenant informations d'inscription
 * @param {Response} res - Réponse Express
 */
router.post('/register', (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('pages/register', {
      title: 'Inscription',
      user: null,
      error: 'Les mots de passe ne correspondent pas'
    });
  }

  const name = `${firstName} ${lastName}`;

  pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'utilisateur', err);
      return res.status(500).send('Erreur serveur');
    }

    if (result.rows.length > 0) {
      return res.render('pages/register', {
        title: 'Inscription',
        user: null,
        error: 'Cette adresse email est déjà utilisée'
      });
    }

    bcrypt.hash(password, 10, (err, passwordHash) => {
      if (err) {
        console.error('Erreur lors du hachage du mot de passe', err);
        return res.status(500).send('Erreur serveur');
      }

      pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
        [name, email, passwordHash], (err) => {
          if (err) {
            console.error('Erreur lors de l\'inscription', err);
            return res.status(500).send('Erreur serveur');
          }

          res.redirect('/auth/login');
        });
    });
  });
});

/**
 * Déconnecte l'utilisateur en détruisant sa session
 * 
 * @route GET /auth/logout
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;