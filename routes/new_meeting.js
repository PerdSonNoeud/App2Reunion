const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('meetings/new', { title: 'Nouvelle réunion', user: null });
});

router.post('/', (req, res) => {
  res.send('Traitement de la création de la réunion');
});

module.exports = router;