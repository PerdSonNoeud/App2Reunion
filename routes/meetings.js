const express = require('express');
const { pool } = require('../config/db');
const router = express.Router();

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

router.get('/', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  
  pool.query(
    'SELECT * FROM meetings WHERE user_id = $1 ORDER BY start_time DESC',
    [userId],
    (err, result) => {
      if (err) {
        console.error('Erreur lors de la récupération des réunions', err);
        return res.status(500).send('Erreur serveur');
      }
      
      res.render('meetings/all_meetings', { 
        title: 'Mes réunions', 
        user: req.session.user,
        meetings: result.rows 
      });
    }
  );
});

router.get('/:id', isAuthenticated, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.session.user.id;
  
  pool.query(
    'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
    [meetingId, userId],
    (err, result) => {
      if (err || result.rows.length === 0) {
        return res.status(404).render('pages/404', { 
          title: 'Réunion non trouvée',
          user: req.session.user 
        });
      }
      
      res.render('meetings/detail_meeting', { 
        title: result.rows[0].title,
        user: req.session.user,
        meeting: result.rows[0]
      });
    }
  );
});

router.post('/:id/delete', isAuthenticated, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.session.user.id;

  pool.query(
    'DELETE FROM meetings WHERE id = $1 AND user_id = $2',
    [meetingId, userId],
    (err, result) => {
      if (err) {
        console.error('Erreur lors de la suppression de la réunion', err);
        return res.status(500).send('Erreur serveur');
      }
      res.redirect('/meetings');
    }
  );
});

module.exports = router;