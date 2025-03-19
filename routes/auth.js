const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('pages/login', { title: 'Connexion', user: null });
});

router.get('/register', (req, res) => {
  res.render('pages/register', { title: 'Inscription', user: null });
});

router.post('/login', (req, res) => {
  res.send('Traitement de la connexion');
});

router.post('/register', (req, res) => {
  res.send('Traitement de l\'inscription');
});

module.exports = router;