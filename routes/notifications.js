/**
 * Gestion des routes de notifications
 * 
 * Ce module gère les routes pour récupérer et marquer comme lues
 * les notifications des utilisateurs.
 * 
 * @module routes/notifications
 */

const express = require('express');
const router = express.Router();
const notificationService = require('./notificationService');

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

/**
 * Récupère les notifications non lues de l'utilisateur connecté
 * 
 * @route GET /notifications
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.session.user.uid);
    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Marque une notification comme lue
 * 
 * @route POST /notifications/:id/read
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
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