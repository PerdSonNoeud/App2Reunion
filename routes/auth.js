const express = require('express');
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Connexion', user: null });
});

router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Inscription', user: null });
});

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

      req.session.user = { uid: user.uid, name: user.name };
      res.redirect('/meetings');
    });
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

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;