const express = require('express');
const router = express.Router();

// Correction: '/' au lieu de '/new_meeting'
router.get('/', (req, res) => {
  res.render('meetings/new', { title: 'Nouvelle réunion', user: null });
});

// Correction: '/' au lieu de '/new_meeting'
router.post('/', (req, res) => {
  res.send('Traitement de la création de la réunion');
});

module.exports = router;