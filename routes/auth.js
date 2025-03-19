const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Connexion', user: null });
});

router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Inscription', user: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password], (err, result) => {
    if (err) {
      console.error('Erreur lors de la connexion à la base de données', err);
      return res.status(500).send('Erreur serveur');
    }

    if (result.rows.length > 0) {
      req.session.user = result.rows[0];
      res.redirect('/');
    } else {
      res.render('pages/login', { title: 'Connexion', user: null, error: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
  });
});

router.post('/register', (req, res) => {
  res.send('Traitement de l\'inscription');
});

module.exports = router;