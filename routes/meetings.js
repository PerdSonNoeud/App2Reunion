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
  const userId = req.session.user.uid;
  
  pool.query(
    'SELECT m.* FROM meetings m JOIN participants p ON m.mid = p.mid WHERE p.uid = $1 ORDER BY m.start_time DESC',
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
  const userId = req.session.user.uid;
  var organisateur = null;

  pool.query(
    'SELECT u.* FROM users u JOIN meetings m ON m.mid = $1 WHERE m.uid = u.uid',
    [meetingId],
    (err, result) => {
      if (err || result.rows.length === 0) {
        return res.status(404).render('pages/404', {
          title: 'Réunion non trouvée',
          user: req.session.user
        });
      }
      organisateur = result.rows[0];
    }
  );
  
  pool.query(
    'SELECT m.* FROM meetings m JOIN participants p ON m.mid = p.mid WHERE m.mid = $1 AND p.uid = $2',
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
        meeting: result.rows[0],
        orga: organisateur
      });
    }
  );
});

router.post('/:id/delete', isAuthenticated, (req, res) => {
  const meetingId = req.params.id;
  const userId = req.session.user.uid;

  pool.query(
    'DELETE FROM participants WHERE mid = $1',
    [meetingId],
    (err) => {
      if (err) {
        console.error('Erreur lors de la suppression de la réunion', err);
        return res.status(500).send('Erreur serveur');
      }
    }
  );

  pool.query(
    'DELETE FROM meetings WHERE mid = $1 AND uid = $2',
    [meetingId, userId],
    (err) => {
      if (err) {
        console.error('Erreur lors de la suppression de la réunion', err);
        return res.status(500).send('Erreur serveur');
      }
      res.redirect('/meetings');
    }
  );
});

module.exports = router;
