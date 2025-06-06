/**
 * Service de gestion des notifications
 * 
 * Ce module fournit des fonctions pour créer, gérer et envoyer des notifications
 * aux utilisateurs concernant les réunions et les invitations.
 * 
 * @module routes/notificationService
 */

const { pool } = require('../config/db');
const { sendEmail, inviteRegisteredUserTemplate, inviteGuest, reminderTemplate } = require('../config/nodemailer');
const crypto = require('crypto');

/**
 * Service de notifications avec diverses fonctionnalités
 * pour gérer les notifications et invitations
 * 
 * @namespace notificationService
 */
const notificationService = {
  /**
   * Crée une notification pour un utilisateur
   * 
   * @async
   * @function createNotification
   * @param {number} uid - ID de l'utilisateur destinataire
   * @param {number} mid - ID de la réunion concernée
   * @param {string} message - Contenu du message de notification
   * @param {string} type - Type de notification (invitation, reminder, confirm, decline, etc.)
   * @returns {Promise<Object>} - La notification créée
   */
  createNotification: async (uid, mid, message, type) => {
    try {
      const result = await pool.query(
        'INSERT INTO notifications (uid, mid, message, type) VALUES ($1, $2, $3, $4) RETURNING nid',
        [uid, mid, message, type]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
      throw error;
    }
  },

  /**
   * Marque une notification comme lue
   * 
   * @async
   * @function markAsRead
   * @param {number} nid - ID de la notification
   * @param {number} uid - ID de l'utilisateur propriétaire
   * @returns {Promise<boolean>} - Succès de l'opération
   */
  markAsRead: async (nid, uid) => {
    try {
      await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE nid = $1 AND uid = $2',
        [nid, uid]
      );
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la notification:', error);
      throw error;
    }
  },

  /**
   * Récupère les notifications non lues d'un utilisateur
   * 
   * @async
   * @function getUnreadNotifications
   * @param {number} uid - ID de l'utilisateur
   * @returns {Promise<Array>} - Liste des notifications non lues
   */
  getUnreadNotifications: async (uid) => {
    try {
      const result = await pool.query(
        'SELECT n.*, m.title as meeting_title FROM notifications n JOIN meetings m ON n.mid = m.mid WHERE n.uid = $1 AND is_read = FALSE ORDER BY created_at DESC',
        [uid]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      throw error;
    }
  },

  /**
   * Invite un utilisateur enregistré à une réunion
   * 
   * @async
   * @function inviteRegisteredUser
   * @param {number} meetingId - ID de la réunion
   * @param {string} userEmail - Email de l'utilisateur à inviter
   * @param {string} organizerName - Nom de l'organisateur
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  inviteRegisteredUser: async (meetingId, userEmail, organizerName) => {
    try {
      // Vérifier si l'utilisateur existe
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [userEmail]
      );

      if (userResult.rows.length === 0) {
        return { success: false, message: 'Utilisateur non trouvé' };
      }

      const user = userResult.rows[0];

      // Récupérer les infos de la réunion
      const meetingResult = await pool.query(
        'SELECT * FROM meetings WHERE mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length === 0) {
        return { success: false, message: 'Réunion non trouvée' };
      }

      const meeting = meetingResult.rows[0];

      // Récupérer les créneaux horaires
      const timeSlotsResult = await pool.query(
        'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
        [meetingId]
      );

      const timeSlots = timeSlotsResult.rows;

      // Ajouter l'utilisateur comme participant s'il ne l'est pas déjà
      await pool.query(
        'INSERT INTO participants (mid, uid) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [meetingId, user.uid]
      );

      // Créer une notification
      await notificationService.createNotification(
        user.uid,
        meetingId,
        `${organizerName} vous a invité à la réunion "${meeting.title}"`,
        'invitation'
      );

      // Envoyer un email
      const responseUrl = `${process.env.BASE_URL}/meetings/${meetingId}/respond`;
      const emailContent = inviteRegisteredUserTemplate(meeting, timeSlots, responseUrl, userEmail);
      
      await sendEmail(
        userEmail,
        `Invitation à la réunion: ${meeting.title}`,
        emailContent
      );

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'invitation de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Invite un utilisateur non-enregistré (invité) à une réunion
   * 
   * @async
   * @function inviteGuestUser
   * @param {number} meetingId - ID de la réunion
   * @param {string} guestEmail - Email de l'invité
   * @param {string} guestName - Nom de l'invité (optionnel)
   * @param {string} organizerName - Nom de l'organisateur
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  inviteGuestUser: async (meetingId, guestEmail, guestName, organizerName) => {
    try {
      // Récupérer les infos de la réunion
      const meetingResult = await pool.query(
        'SELECT * FROM meetings WHERE mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length === 0) {
        return { success: false, message: 'Réunion non trouvée' };
      }

      const meeting = meetingResult.rows[0];

      // Récupérer les créneaux horaires
      const timeSlotsResult = await pool.query(
        'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
        [meetingId]
      );

      const timeSlots = timeSlotsResult.rows;

      // Vérifier si cet invité existe déjà
      const existingGuestResult = await pool.query(
        'SELECT * FROM guest_participants WHERE mid = $1 AND email = $2',
        [meetingId, guestEmail]
      );

      let token;
      let guestId;

      if (existingGuestResult.rows.length > 0) {
        // L'invité existe déjà, utiliser son token existant
        token = existingGuestResult.rows[0].token;
        guestId = existingGuestResult.rows[0].gid;
      } else {
        // Créer un nouveau token unique
        token = crypto.randomBytes(32).toString('hex');
        
        // Ajouter l'invité
        const guestResult = await pool.query(
          'INSERT INTO guest_participants (mid, email, name, token) VALUES ($1, $2, $3, $4) RETURNING gid',
          [meetingId, guestEmail, guestName, token]
        );
        
        guestId = guestResult.rows[0].gid;
      }

      // Envoyer un email
      const responseUrl = `${process.env.BASE_URL}/meetings/guest/${token}`;
      const emailContent = inviteGuest(meeting, timeSlots, responseUrl);
      
      await sendEmail(
        guestEmail,
        `Invitation à la réunion: ${meeting.title}`,
        emailContent
      );

      return { success: true, guestId };
    } catch (error) {
      console.error('Erreur lors de l\'invitation de l\'utilisateur invité:', error);
      throw error;
    }
  },

  /**
   * Envoie un rappel à un utilisateur qui n'a pas répondu
   * 
   * @async
   * @function sendReminder
   * @param {number} meetingId - ID de la réunion
   * @param {string} userEmail - Email de l'utilisateur
   * @param {boolean} isGuest - Indique si l'utilisateur est un invité sans compte
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  sendReminder: async (meetingId, userEmail, isGuest = false) => {
    try {
      // Récupérer les infos de la réunion
      const meetingResult = await pool.query(
        'SELECT * FROM meetings WHERE mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length === 0) {
        return { success: false, message: 'Réunion non trouvée' };
      }

      const meeting = meetingResult.rows[0];

      // Récupérer les créneaux horaires
      const timeSlotsResult = await pool.query(
        'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
        [meetingId]
      );

      const timeSlots = timeSlotsResult.rows;

      let responseUrl;

      if (isGuest) {
        // Pour un invité, récupérer son token
        const guestResult = await pool.query(
          'SELECT * FROM guest_participants WHERE mid = $1 AND email = $2',
          [meetingId, userEmail]
        );

        if (guestResult.rows.length === 0) {
          return { success: false, message: 'Invité non trouvé' };
        }

        const token = guestResult.rows[0].token;
        responseUrl = `${process.env.BASE_URL}/meetings/guest/${token}`;
      } else {
        // Pour un utilisateur enregistré
        const userResult = await pool.query(
          'SELECT * FROM users WHERE email = $1',
          [userEmail]
        );

        if (userResult.rows.length === 0) {
          return { success: false, message: 'Utilisateur non trouvé' };
        }

        const user = userResult.rows[0];

        // Créer une notification
        await notificationService.createNotification(
          user.uid,
          meetingId,
          `Rappel: Vous êtes invités pour : "${meeting.title}"`,
          'reminder'
        );

        responseUrl = `${process.env.BASE_URL}/meetings/${meetingId}/respond`;
      }

      // Envoyer un email
      const emailContent = reminderTemplate(meeting, timeSlots, responseUrl, userEmail);
      
      await sendEmail(
        userEmail,
        `Rappel: Réunion "${meeting.title}" en attente de réponse`,
        emailContent
      );

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'envoi du rappel:', error);
      throw error;
    }
  }
};

module.exports = notificationService;