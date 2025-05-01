/**
 * Gestion des réunions et des réponses des participants
 * 
 * Ce module gère les routes pour afficher, créer, répondre et gérer les réunions.
 * Il inclut des fonctionnalités pour les utilisateurs enregistrés et les invités externes.
 * 
 * @module routes/meetings
 */

const express = require('express')
const { pool } = require('../config/db')
const router = express.Router()
const notificationService = require('./notificationService')

/**
 * Vérifie si tous les participants ont décliné la réunion
 * 
 * Cette fonction compte les participants enregistrés et invités, 
 * vérifie leurs statuts et notifie l'organisateur si tous ont refusé.
 * 
 * @async
 * @param {number} meetingId - Identifiant de la réunion à vérifier
 * @returns {Promise<void>}
 */
async function checkAllParticipantsDeclined (meetingId) {
  try {
    // Compter les participants
    const participantsResult = await pool.query(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined
       FROM participants WHERE mid = $1 AND uid != (SELECT uid FROM meetings WHERE mid = $1)`,
      [meetingId]
    )

    // Compter les invités
    const guestsResult = await pool.query(
      `SELECT COUNT(*) as total,
       SUM(CASE WHEN status = 'declined' THEN 1 ELSE 0 END) as declined
       FROM guest_participants WHERE mid = $1`,
      [meetingId]
    )

    const totalParticipants =
      parseInt(participantsResult.rows[0].total) +
      parseInt(guestsResult.rows[0].total)
    const totalDeclined =
      parseInt(participantsResult.rows[0].declined) +
      parseInt(guestsResult.rows[0].declined)

    // Si tous les participants ont décliné et qu'il y a au moins un participant
    if (totalParticipants > 0 && totalParticipants === totalDeclined) {
      // Récupérer l'organisateur
      const meetingResult = await pool.query(
        'SELECT m.title, u.uid FROM meetings m JOIN users u ON m.uid = u.uid WHERE m.mid = $1',
        [meetingId]
      )

      if (meetingResult.rows.length > 0) {
        const meeting = meetingResult.rows[0]
        const organizerUid = meeting.uid

        // Notifier l'organisateur que tous les participants ont décliné
        await notificationService.createNotification(
          organizerUid,
          meetingId,
          `Tous les participants ont décliné la réunion "${meeting.title}"`,
          'all_declined'
        )
      }
    }
  } catch (error) {
    console.error('Erreur lors de la vérification des participants', error)
  }
}

/**
 * Middleware pour vérifier si l'utilisateur est authentifié
 * 
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    next()
  } else {
    res.redirect('/auth/login')
  }
};

/**
 * Affiche le formulaire de réponse pour un invité externe
 * 
 * @route GET /meetings/guest/:token
 * @param {Request} req - Requête Express contenant le token d'identification
 * @param {Response} res - Réponse Express
 */
router.get('/guest/:token', async (req, res) => {
  const token = req.params.token;
  
  try {
    // Récupérer l'invité correspondant au token
    const guestResult = await pool.query(
      'SELECT gp.*, m.* FROM guest_participants gp JOIN meetings m ON gp.mid = m.mid WHERE gp.token = $1',
      [token]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).render('pages/404', {
        title: 'Invitation non trouvée',
        user: null
      });
    }

    const guest = guestResult.rows[0];
    const meetingId = guest.mid;

    // Récupérer les créneaux horaires
    const timeSlotsResult = await pool.query(
      'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
      [meetingId]
    );

    const timeSlots = timeSlotsResult.rows;

    // Récupérer les réponses existantes de l'invité
    const guestResponsesResult = await pool.query(
      'SELECT tid, availability FROM guest_responses WHERE gid = $1',
      [guest.gid]
    );

    const guestResponses = {};
    guestResponsesResult.rows.forEach(row => {
      guestResponses[row.tid] = row.availability;
    });

    res.render('meetings/respond_guest', {
      title: 'Répondre à la réunion',
      user: null, // Pas de compte utilisateur
      meeting: guest,
      timeSlots,
      guestResponses,
      token
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du formulaire de réponse invité', error);
    return res.status(500).send('Erreur serveur');
  }
});

/**
 * Route pour confirmer le créneau choisi par l'organisateur
 * 
 * @route POST /meetings/:mid/confirm
 * @param {Request} req - Requête Express contenant le token d'identification
 * @param {Response} res - Réponse Express
 */
router.post('/:mid/confirm', async (req, res) => {
  const { mid } = req.params;
  const { tid } = req.body;
  const user = req.session.user;

  // Vérifie que l'utilisateur est bien l'organisateur
  const meetingResult = await pool.query('SELECT * FROM meetings WHERE mid = $1', [mid]);
  const meeting = meetingResult.rows[0];
  if (!meeting || meeting.uid !== user.uid) {
      return res.status(403).render('pages/error', { title: 'Accès refusé', user });
  }

  // Récupère le créneau choisi
  const slotResult = await pool.query('SELECT * FROM time_slots WHERE tid = $1 AND mid = $2', [tid, mid]);
  const slot = slotResult.rows[0];
  if (!slot) {
      return res.status(400).render('pages/error', { title: 'Créneau invalide', user });
  }

  // Met à jour la réunion avec le créneau confirmé
  await pool.query(
    'UPDATE meetings SET start_time = $1, end_time = $2, status = $3 WHERE mid = $4',
    [slot.start_time, slot.end_time, 'confirmed', mid]
  );

  //Notifier les participants 

  const participantsResult = await pool.query(
    'SELECT u.uid FROM participants p JOIN users u ON p.uid = u.uid WHERE p.mid = $1',
    [mid]
  );

  const participants = participantsResult.rows;

  for (const participant of participants) {
    await notificationService.createNotification(
      participant.uid,
      mid,
      `Le créneau "${slot.start_time} - ${slot.end_time}" a été confirmé pour la réunion "${meeting.title}"`,
      'confirm'
    );
  }

  res.redirect(`/meetings/${mid}`);
});

/**
 * Traite les réponses des invités externes
 * 
 * @route POST /meetings/guest/:token/respond
 * @param {Request} req - Requête Express contenant le token et les réponses
 * @param {Response} res - Réponse Express
 */
router.post('/guest/:token/respond', async (req, res) => {
  const token = req.params.token
  const { responses } = req.body

  try {
    // Récupérer l'invité correspondant au token
    const guestResult = await pool.query(
      'SELECT * FROM guest_participants WHERE token = $1',
      [token]
    )

    if (guestResult.rows.length === 0) {
      return res.status(404).render('pages/404', {
        title: 'Invitation non trouvée',
        user: null
      })
    }

    const guest = guestResult.rows[0]
    const meetingId = guest.mid

    // Ajout pour débuguer
    console.log("Réponses reçues:", responses);
    console.log("Type de responses:", typeof responses);

    // Démarrer une transaction
    await pool.query('BEGIN')

    let allUnavailable = true;

    // Récupérer tous les créneaux de cette réunion
    const timeSlotsResult = await pool.query(
      'SELECT * FROM time_slots WHERE mid = $1',
      [meetingId]
    );
    
    const timeSlots = timeSlotsResult.rows;
    
    // On vérifie si le format de responses est un tableau ou un objet 
    if (Array.isArray(responses)) {
      console.log("Format de réponse détecté: tableau");
      
      // Parcourir les créneaux et associer les réponses par position
      for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        const availability = responses[i] || 'unavailable'; // Valeur par défaut si manquante
        
        console.log(`Créneau ${timeSlot.tid}, disponibilité: ${availability}`);
        
        // Insérer ou mettre à jour la réponse
        await pool.query(
          `INSERT INTO guest_responses (tid, gid, availability) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (gid, tid) DO UPDATE SET availability = $3`,
          [timeSlot.tid, guest.gid, availability]
        );
        
        // Vérifier la disponibilité
        if (availability === 'available' || availability === 'maybe') {
          allUnavailable = false;
          console.log("L'utilisateur est disponible pour au moins un créneau");
        }
      }
    } else {
      // Format d'origine 
      for (const [timeSlotId, availability] of Object.entries(responses)) {
        
        // Vérifier que le créneau appartient à cette réunion
        const timeSlotResult = await pool.query(
          'SELECT * FROM time_slots WHERE tid = $1 AND mid = $2',
          [timeSlotId, meetingId]
        )

        if (timeSlotResult.rows.length === 0) continue

        // Insérer ou mettre à jour la réponse
        await pool.query(
          `INSERT INTO guest_responses (tid, gid, availability) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (gid, tid) DO UPDATE SET availability = $3`,
          [timeSlotId, guest.gid, availability]
        )

        // Vérifier la disponibilité
        if (availability === 'available' || availability === 'maybe') {
          allUnavailable = false;
        }
      }
    }

    if (allUnavailable) {
      await pool.query(
        'UPDATE guest_participants SET status = $1 WHERE gid = $2',
        ['declined', guest.gid]
      );

      // Notifier l'organisateur
      const meetingResult = await pool.query(
        'SELECT m.title, u.uid FROM meetings m JOIN users u ON m.uid = u.uid WHERE m.mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length > 0) {
        const meeting = meetingResult.rows[0]
        const organizerUid = meeting.uid

        await notificationService.createNotification(
          organizerUid,
          meetingId,
          `${guest.name || guest.email} a décliné tous les créneaux pour "${meeting.title}"`,
          'decline'
        )
      }
    } else {
      await pool.query(
        'UPDATE guest_participants SET status = $1 WHERE gid = $2',
        ['confirmed', guest.gid]
      );
      
      // Ajouter une notification pour confirmer
      const meetingResult = await pool.query(
        'SELECT m.title, u.uid FROM meetings m JOIN users u ON m.uid = u.uid WHERE m.mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length > 0) {
        const meeting = meetingResult.rows[0]
        const organizerUid = meeting.uid

        await notificationService.createNotification(
          organizerUid,
          meetingId,
          `${guest.name || guest.email} a confirmé sa disponibilité pour "${meeting.title}"`,
          'confirm'
        )
      }
    }

    // Valider la transaction
    await pool.query('COMMIT')

    checkAllParticipantsDeclined(meetingId) // Vérifier si tous les participants ont décliné

    res.render('meetings/response_success', {
      title: 'Réponse enregistrée',
      user: null
    })
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await pool.query('ROLLBACK')
    console.error(
      "Erreur lors de l'enregistrement des réponses de l'invité",
      error
    )
    return res.status(500).send('Erreur serveur')
  }
})

/**
 * Affiche le formulaire de réponse pour un utilisateur enregistré
 * 
 * @route GET /meetings/:id/respond
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/:id/respond', async (req, res) => {
  const meetingId = req.params.id;
  
  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!req.session || !req.session.user) {
    // Stocker l'URL de redirection dans la session
    req.session = req.session || {};
    req.session.redirectTo = `/meetings/${meetingId}/respond`;
    return res.redirect('/auth/login');
  }
  
  const userId = req.session.user.uid;

  try {
    // D'abord, vérifier si l'utilisateur est l'organisateur de cette réunion
    const organizerResult = await pool.query(
      'SELECT uid FROM meetings WHERE mid = $1',
      [meetingId]
    );
    
    if (organizerResult.rows.length === 0) {
      return res.status(404).render('pages/404', {
        title: 'Réunion non trouvée',
        user: req.session.user
      });
    }
    
    const organizerId = organizerResult.rows[0].uid;
    
    // Si l'utilisateur connecté est l'organisateur, l'informer qu'il ne peut pas répondre
    if (userId === organizerId) {
      return res.render('pages/error', {
        title: 'Action non autorisée',
        user: req.session.user,
        message: "En tant qu'organisateur, vous ne pouvez pas répondre à votre propre réunion."
      });
    }
    
    // Ensuite, vérifier que l'utilisateur est bien un participant de cette réunion
    const participantResult = await pool.query(
      'SELECT * FROM participants WHERE mid = $1 AND uid = $2',
      [meetingId, userId]
    );

    if (participantResult.rows.length === 0) {
      // L'utilisateur est connecté mais n'est pas invité à cette réunion
      return res.render('pages/error', {
        title: 'Accès refusé',
        user: req.session.user,
        message: "Vous n'êtes pas autorisé à répondre à cette réunion. Veuillez vous connecter avec le compte qui a été invité."
      });
    }

    // Récupérer les infos de la réunion
    const meetingResult = await pool.query(
      'SELECT * FROM meetings WHERE mid = $1',
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).render('pages/404', {
        title: 'Réunion non trouvée',
        user: req.session.user
      });
    }

    const meeting = meetingResult.rows[0];

    // Récupérer les créneaux horaires
    const timeSlotsResult = await pool.query(
      'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
      [meetingId]
    );

    const timeSlots = timeSlotsResult.rows;

    // Récupérer les réponses existantes de l'utilisateur
    const userResponsesResult = await pool.query(
      'SELECT tid, availability FROM responses WHERE uid = $1 AND tid IN (SELECT tid FROM time_slots WHERE mid = $2)',
      [userId, meetingId]
    );

    const userResponses = {};
    userResponsesResult.rows.forEach(row => {
      userResponses[row.tid] = row.availability;
    });

    res.render('meetings/respond', {
      title: 'Répondre à la réunion',
      user: req.session.user,
      meeting,
      timeSlots,
      userResponses
    });
  } catch (error) {
    console.error(
      'Erreur lors de la récupération du formulaire de réponse',
      error
    );
    return res.status(500).send('Erreur serveur');
  }
});

/**
 * Traite les réponses des utilisateurs enregistrés
 * 
 * @route POST /meetings/:id/respond
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.post('/:id/respond', isAuthenticated, async (req, res) => {
  const meetingId = req.params.id
  const userId = req.session.user.uid
  const { responses } = req.body

  try {
    // Vérifier que l'utilisateur est participant
    const participantResult = await pool.query(
      'SELECT * FROM participants WHERE mid = $1 AND uid = $2',
      [meetingId, userId]
    )

    if (participantResult.rows.length === 0) {
      return res.status(403).render('pages/error', {
        title: 'Accès refusé',
        user: req.session.user,
        message: "Vous n'êtes pas autorisé à répondre à cette réunion"
      })
    }

    // Démarrer une transaction
    await pool.query('BEGIN')

    let allUnavailable = true

    const timeSlotsResult = await pool.query(
      'SELECT * FROM time_slots WHERE mid = $1',
      [meetingId]
    );

    const timeSlots = timeSlotsResult.rows;

    // On vérifie si le format de responses est un tableau ou un objet
    if (Array.isArray(responses)) {
      console.log("Format de réponse détecté: tableau");
      
      // Parcourir les créneaux et associer les réponses par position
      for (let i = 0; i < timeSlots.length; i++) {
        const timeSlot = timeSlots[i];
        const availability = responses[i] || 'unavailable';
        
        
        await pool.query(
          `INSERT INTO responses (tid, uid, availability) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (uid, tid) DO UPDATE SET availability = $3`,
          [timeSlot.tid, userId, availability]
        );
        
        // Vérifier la disponibilité
        if (availability === 'available' || availability === 'maybe') {
          allUnavailable = false;
        }
      }
    } else {
      // Format d'origine (objet avec des clés pour chaque créneau)
      for (const [timeSlotId, availability] of Object.entries(responses)) {
        
        // Vérifier que le créneau appartient à cette réunion
        const timeSlotResult = await pool.query(
          'SELECT * FROM time_slots WHERE tid = $1 AND mid = $2',
          [timeSlotId, meetingId]
        )

        if (timeSlotResult.rows.length === 0) continue

        const existingResponse = await pool.query(
          'SELECT rid FROM responses WHERE tid = $1 AND uid = $2',
          [timeSlotId, userId]
        );
        
        if (existingResponse.rows.length > 0) {
          // Mise à jour si la réponse existe
          await pool.query(
            'UPDATE responses SET availability = $1 WHERE tid = $2 AND uid = $3',
            [availability, timeSlotId, userId]
          );
        } else {
          // Insertion sinon
          await pool.query(
            'INSERT INTO responses (tid, uid, availability) VALUES ($1, $2, $3)',
            [timeSlotId, userId, availability]
          );
        }

        // Vérifier la disponibilité
        if (availability === 'available' || availability === 'maybe') {
          allUnavailable = false;
        }
      }
    }

    if (allUnavailable) {
      await pool.query(
        'UPDATE participants SET status = $1 WHERE mid = $2 AND uid = $3',
        ['declined', meetingId, userId]
      );
      
      // Notifier l'organisateur
      const meetingResult = await pool.query(
        'SELECT m.title, u.uid FROM meetings m JOIN users u ON m.uid = u.uid WHERE m.mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length > 0) {
        const meeting = meetingResult.rows[0];
        const organizerUid = meeting.uid;
        const userName = req.session.user.name;

        await notificationService.createNotification(
          organizerUid,
          meetingId,
          `${userName} a décliné tous les créneaux pour "${meeting.title}"`,
          'decline'
        );
      }
    } else {
      await pool.query(
        'UPDATE participants SET status = $1 WHERE mid = $2 AND uid = $3',
        ['confirmed', meetingId, userId]
      );
      
      // Notifier l'organisateur
      const meetingResult = await pool.query(
        'SELECT m.title, u.uid FROM meetings m JOIN users u ON m.uid = u.uid WHERE m.mid = $1',
        [meetingId]
      );

      if (meetingResult.rows.length > 0) {
        const meeting = meetingResult.rows[0];
        const organizerUid = meeting.uid;
        const userName = req.session.user.name;

        await notificationService.createNotification(
          organizerUid,
          meetingId,
          `${userName} a confirmé sa disponibilité pour "${meeting.title}"`,
          'confirm'
        );
      }
    }

    // Valider la transaction
    await pool.query('COMMIT');
    
    // Vérifier si tous les participants ont décliné
    checkAllParticipantsDeclined(meetingId);
    
    // Rediriger vers la page de détails de la réunion
    res.redirect(`/meetings/${meetingId}`);
  } catch (error) {
    // Annuler la transaction en cas d'erreur
    await pool.query('ROLLBACK')
    console.error("Erreur lors de l'enregistrement des réponses", error)
    return res.status(500).send('Erreur serveur')
  }
})

/**
 * Envoie des rappels aux participants qui n'ont pas répondu
 * 
 * @route POST /meetings/:id/remind
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.post('/:id/remind', isAuthenticated, async (req, res) => {
  const meetingId = req.params.id
  const userId = req.session.user.uid

  try {
    // Vérifier que l'utilisateur est l'organisateur
    const meetingResult = await pool.query(
      'SELECT * FROM meetings WHERE mid = $1 AND uid = $2',
      [meetingId, userId]
    )

    if (meetingResult.rows.length === 0) {
      return res.status(403).render('pages/error', {
        title: 'Accès refusé',
        user: req.session.user,
        message:
          "Vous n'êtes pas autorisé à envoyer des rappels pour cette réunion"
      })
    }

    // Récupérer les participants qui n'ont pas répondu
    const noResponseParticipantsResult = await pool.query(
      `SELECT u.uid, u.email FROM users u 
       JOIN participants p ON u.uid = p.uid 
       WHERE p.mid = $1 
       AND NOT EXISTS (
         SELECT 1 FROM responses r 
         JOIN time_slots ts ON r.tid = ts.tid 
         WHERE ts.mid = $1 AND r.uid = u.uid
       )`,
      [meetingId]
    )

    // Récupérer les invités qui n'ont pas répondu
    const noResponseGuestsResult = await pool.query(
      `SELECT gp.gid, gp.email FROM guest_participants gp 
       WHERE gp.mid = $1 
       AND NOT EXISTS (
         SELECT 1 FROM guest_responses gr 
         JOIN time_slots ts ON gr.tid = ts.tid 
         WHERE ts.mid = $1 AND gr.gid = gp.gid
       )`,
      [meetingId]
    )

    // Envoyer des rappels aux participants enregistrés
    for (const participant of noResponseParticipantsResult.rows) {
      await notificationService.sendReminder(
        meetingId,
        participant.email,
        false
      )
    }

    // Envoyer des rappels aux invités
    for (const guest of noResponseGuestsResult.rows) {
      await notificationService.sendReminder(meetingId, guest.email, true)
    }

    res.redirect(`/meetings/${meetingId}`)
  } catch (error) {
    console.error("Erreur lors de l'envoi des rappels", error)
    return res.status(500).send('Erreur serveur')
  }
})

/**
 * Supprime une réunion
 * 
 * @route POST /meetings/:id/delete
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.post('/:id/delete', isAuthenticated, (req, res) => {
  const meetingId = req.params.id
  const userId = req.session.user.uid

  pool.query('DELETE FROM participants WHERE mid = $1', [meetingId], err => {
    if (err) {
      console.error('Erreur lors de la suppression de la réunion', err)
      return res.status(500).send('Erreur serveur')
    }
  })

  pool.query(
    'DELETE FROM meetings WHERE mid = $1 AND uid = $2',
    [meetingId, userId],
    err => {
      if (err) {
        console.error('Erreur lors de la suppression de la réunion', err)
        return res.status(500).send('Erreur serveur')
      }
      res.redirect('/meetings')
    }
  )
})

/**
 * Affiche les détails d'une réunion
 * 
 * @route GET /meetings/:id
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  const meetingId = req.params.id
  const userId = req.session.user.uid

  try {
    // Récupérer les infos de la réunion
    const meetingResult = await pool.query(
      'SELECT m.* FROM meetings m JOIN participants p ON m.mid = p.mid WHERE m.mid = $1 AND p.uid = $2',
      [meetingId, userId]
    )

    if (meetingResult.rows.length === 0) {
      return res.status(404).render('pages/404', {
        title: 'Réunion non trouvée',
        user: req.session.user
      })
    }

    const meeting = meetingResult.rows[0]

    // Récupérer l'organisateur
    const organizerResult = await pool.query(
      'SELECT u.* FROM users u JOIN meetings m ON u.uid = m.uid WHERE m.mid = $1',
      [meetingId]
    )

    const organizer = organizerResult.rows[0]

    // Récupérer les participants
    const participantsResult = await pool.query(
      'SELECT u.uid, u.name, u.email, p.status FROM users u JOIN participants p ON u.uid = p.uid WHERE p.mid = $1',
      [meetingId]
    )

    const participants = participantsResult.rows

    // Récupérer les invités (participants sans compte)
    const guestsResult = await pool.query(
      'SELECT * FROM guest_participants WHERE mid = $1',
      [meetingId]
    )

    const guests = guestsResult.rows

    // Récupérer les créneaux horaires
    const timeSlotsResult = await pool.query(
      'SELECT * FROM time_slots WHERE mid = $1 ORDER BY start_time',
      [meetingId]
    )

    const timeSlots = timeSlotsResult.rows

    // Récupérer les réponses des utilisateurs
    const responsesResult = await pool.query(
      `SELECT ts.tid, r.uid, u.name, r.availability 
       FROM time_slots ts 
       LEFT JOIN responses r ON ts.tid = r.tid 
       LEFT JOIN users u ON r.uid = u.uid 
       WHERE ts.mid = $1`,
      [meetingId]
    )

    // Récupérer les réponses des invités
    const guestResponsesResult = await pool.query(
      `SELECT ts.tid, gr.gid, gp.name, gp.email, gr.availability 
       FROM time_slots ts 
       LEFT JOIN guest_responses gr ON ts.tid = gr.tid 
       LEFT JOIN guest_participants gp ON gr.gid = gp.gid 
       WHERE ts.mid = $1`,
      [meetingId]
    )

    // Organiser les réponses
    const responses = {}

    // Réponses des utilisateurs
    responsesResult.rows.forEach(row => {
      if (!responses[row.tid]) {
        responses[row.tid] = []
      }

      if (row.uid) {
        responses[row.tid].push({
          id: row.uid,
          name: row.name,
          availability: row.availability,
          isGuest: false
        })
      }
    })

    // Réponses des invités
    guestResponsesResult.rows.forEach(row => {
      if (!responses[row.tid]) {
        responses[row.tid] = []
      }

      if (row.gid) {
        responses[row.tid].push({
          id: row.gid,
          name: row.name || row.email,
          availability: row.availability,
          isGuest: true
        })
      }
    })

    // Récupérer les réponses de l'utilisateur connecté
    const userResponsesResult = await pool.query(
      'SELECT tid, availability FROM responses WHERE uid = $1 AND tid IN (SELECT tid FROM time_slots WHERE mid = $2)',
      [userId, meetingId]
    )

    const userResponses = {}
    userResponsesResult.rows.forEach(row => {
      userResponses[row.tid] = row.availability
    })

    res.render('meetings/detail_meeting', {
      title: meeting.title,
      user: req.session.user,
      meeting,
      organizer,
      participants,
      guests,
      timeSlots,
      responses,
      userResponses
    })
  } catch (error) {
    console.error(
      'Erreur lors de la récupération des détails de la réunion',
      error
    )
    return res.status(500).send('Erreur serveur')
  }
})

/**
 * Affiche la liste des réunions de l'utilisateur
 * 
 * @route GET /meetings
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/', isAuthenticated, (req, res) => {
  const userId = req.session.user.uid;
  const valid = req.query.valid || null;
  
  pool.query(
    `SELECT m.*, 
     CASE WHEN m.uid = $1 THEN 'organizer' ELSE p.status END as status
     FROM meetings m 
     LEFT JOIN participants p ON m.mid = p.mid AND p.uid = $1
     WHERE (m.uid = $1) 
     OR (p.uid = $1 AND (p.status = 'confirmed' OR p.status = 'pending')) 
     ORDER BY m.start_time DESC`,
    [userId],
    (err, result) => {
      if (err) {
        console.error('Erreur lors de la récupération des réunions', err);
        return res.status(500).send('Erreur serveur');
      }
      
      res.render('meetings/all_meetings', { 
        title: 'Mes réunions', 
        user: req.session.user,
        meetings: result.rows,
        valid: valid
      });
    }
  );
});

module.exports = router;