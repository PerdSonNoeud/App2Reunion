/**
 * Gestion de la création de nouvelles réunions
 * 
 * Ce module gère les routes pour afficher le formulaire de création
 * de réunions et traiter les soumissions de nouvelles réunions.
 * 
 * @module routes/new_meeting
 */

const express = require('express');
const { pool } = require('../config/db');
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
 * Affiche le formulaire de création d'une nouvelle réunion
 * 
 * @route GET /new
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/', isAuthenticated, (req, res) => {
  res.render('meetings/new', { title: 'Nouvelle réunion', user: req.session.user });
});

/**
 * Traite la création d'une nouvelle réunion
 * 
 * Crée la réunion, les créneaux horaires et invite les participants
 * spécifiés dans le formulaire.
 * 
 * @route POST /new
 * @param {Request} req - Requête Express avec données du formulaire
 * @param {Response} res - Réponse Express
 */
router.post('/', isAuthenticated, async (req, res) => {
  const { title, description, location, startTime, endTime, participantEmail, participantName } = req.body;
  const userId = req.session.user.uid;
  
  // Validation de base
  if (!title || !startTime || !endTime || startTime.length === 0 || endTime.length === 0) {
    return res.status(400).send('Veuillez remplir tous les champs obligatoires');
  }
  
  try {
    // Démarrer une transaction
    await pool.query('BEGIN');
    
    // Créer la réunion
    const meetingResult = await pool.query(
      'INSERT INTO meetings (title, description, location, start_time, end_time, uid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING mid',
      [title, description, location, startTime[0], endTime[0], userId]
    );
    
    const meetingId = meetingResult.rows[0].mid;
    
    // Ajouter l'organisateur comme participant
    await pool.query(
      'INSERT INTO participants (mid, uid) VALUES ($1, $2)',
      [meetingId, userId]
    );
    
    // Ajouter tous les créneaux horaires proposés
    for (let i = 0; i < startTime.length; i++) {
      if (startTime[i] && endTime[i]) {
        await pool.query(
          'INSERT INTO time_slots (mid, start_time, end_time) VALUES ($1, $2, $3)',
          [meetingId, startTime[i], endTime[i]]
        );
      }
    }
    
    // Récupérer le nom de l'organisateur
    const organizerResult = await pool.query(
      'SELECT name FROM users WHERE uid = $1',
      [userId]
    );
    
    const organizerName = organizerResult.rows[0].name;
    
    // Inviter les participants
    if (participantEmail && Array.isArray(participantEmail)) {
      for (let i = 0; i < participantEmail.length; i++) {
        const email = participantEmail[i];
        if (!email) continue;
        
        // Vérifier si l'utilisateur est déjà enregistré
        const userResult = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );
        
        if (userResult.rows.length > 0) {
          // C'est un utilisateur enregistré
          await notificationService.inviteRegisteredUser(meetingId, email, organizerName);
        } else {
          // C'est un invité sans compte
          const name = participantName && participantName[i] ? participantName[i] : null;
          await notificationService.inviteGuestUser(meetingId, email, name, organizerName);
        }
      }
    }
    
    // Finaliser la transaction
    await pool.query('COMMIT');
    
    res.redirect('/meetings');
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await pool.query('ROLLBACK');
    console.error('Erreur lors de la création de la réunion', error);
    return res.status(500).send('Erreur serveur');
  }
});

module.exports = router;