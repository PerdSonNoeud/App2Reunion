const express = require('express');
const router = express.Router();
const notificationService = require('./notificationService');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Récupérer toutes les notifications
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.session.user.uid);
    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.post('/:id/read', isAuthenticated, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.session.user.uid;
  
  try {
    await notificationService.markAsRead(notificationId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors du marquage de la notification comme lue', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;