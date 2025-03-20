const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

router.get('/', isAuthenticated, (req, res) => {
  res.render('meetings/new', { title: 'Nouvelle réunion', user: req.session.user });
});

router.post('/', isAuthenticated, (req, res) => {
  const { title, description, location, startTime, endTime, participantEmail } = req.body;
  const userId = req.session.user.id;

  pool.query(
    'INSERT INTO meetings (title, description, start_time, end_time, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [title, description, startTime[0], endTime[0], userId],
    (err, result) => {
      if (err) {
        console.error('Erreur lors de la création de la réunion', err);
        return res.status(500).send('Erreur serveur');
      }

      res.redirect('/meetings');
    }
  );
});

module.exports = router;