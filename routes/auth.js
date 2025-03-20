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

  pool.query('SELECT * FROM users WHERE name = $1 AND password_hash = $2', [username, password], (err, result) => {
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
    pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, email, password], (err) => {
        if (err) {
          console.error('Erreur lors de l\'inscription', err);
          return res.status(500).send('Erreur serveur');
        }

        res.redirect('/auth/login');
      });
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;