const express = require("express");
const fileUpload = require("express-fileupload");
const ical = require("node-ical");
const { pool } = require("../config/db");
const router = express.Router();

// Option par défaut pour express-fileupload
router.use(fileUpload());

router.get("/", async (req, res) => {
  res.render("meetings/import_meeting", {
    title: "Import Meeting",
    user: req.session.user,
  });
});

router.post("/", async (req, res) => {
  let data = null;
  let string = "Fichier importé avec succès.";
  let mid;

  if (!req.files || Object.keys(req.files).length === 0) {
    result = "Aucun fichier importé.";
  } else {
    data = ical.parseICS(req.files.calendar.data.toString("utf8"));
    console.log(data);
    // Vérification du type de fichier
    const events = Object.values(data).filter(
      (item) => item.type === "VEVENT",
    );
    // Vérification de la présence d'événements
    events.forEach((event) => {
      const startTime = new Date(event.start);
      const endTime = new Date(event.end);
      
      // Insertion de la réunion dans la base de données
      pool.query(
        "INSERT INTO meetings (title, description, location, start_time, end_time, uid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING mid",
        [event.summary, event.description, event.location, startTime, endTime, req.session.user.uid],
        (error, result) => {
          if (error) {
            console.error("Erreur lors de l'insertion de la réunion", error);
            string = "Erreur lors de l'insertion de la réunion.";
          }
          console.log(result.rows[0].mid);
          mid = result.rows[0].mid;

          // Insertion des participants dans la base de données
          pool.query(
            "INSERT INTO participants (mid, uid) VALUES ($1, $2)",
            [mid, req.session.user.uid],
            (error, result) => {
              if (error) {
                console.error("Erreur lors de l'insertion du participant", error);
                string = "Erreur lors de l'insertion du participant.";
              }
            },
          );
        },
      );
    });
  }

  res.redirect("/meetings/?valid=" + string);
});

module.exports = router;
