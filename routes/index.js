/**
 * Gestion des routes principales de l'application
 * 
 * Ce module définit la route d'accueil de l'application
 * et sert de point d'entrée pour les utilisateurs.
 * 
 * @module routes/index
 */

const express = require('express');
const router = express.Router();

/**
 * Affiche la page d'accueil de l'application
 * 
 * @route GET /
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 */
router.get('/', (req, res) => {
  res.render('pages/index', { title: 'Accueil', user: req.session.user });
});

module.exports = router;