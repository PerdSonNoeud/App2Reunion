/**
 * Script principal de l'interface utilisateur
 *
 * Ce module gère les interactions utilisateur pour les notifications,
 * la création de réunions et l'affichage du calendrier.
 *
 * @module public/js/main
 */
document.addEventListener("DOMContentLoaded", function() {
  /**
   * Gestion des importations de fichiers ICal
   *
   * Cette section gère l'importation de fichiers ICal pour importer des horaires et des réunions.
   */
  const importBtn = document.getElementById("import-ical");
  if (importBtn) {
    importBtn.addEventListener("change", async function() {
      const file = this.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('calendar', file);

      try {
        const res = await fetch('/import_meeting', {
          method: 'POST',
          body: formData
        });

        const result = await res.text();
        window.location.href = result; // Redirige vers la page des réunions
      } catch (err) {
        console.error('Erreur lors de l’envoi du fichier :', err);
      }
    });
  }

  /**
   * Gestion des notifications
   *
   * Cette section gère l'affichage et le marquage des notifications comme lues.
   */

  const notificationsToggle = document.querySelector(".notifications-toggle");
  const notificationsWrapper = document.querySelector(".notifications-wrapper");
  const markReadButtons = document.querySelectorAll(".mark-read-btn");

  // Affichage/masquage du menu des notifications
  if (notificationsToggle) {
    notificationsToggle.addEventListener("click", function() {
      notificationsWrapper.classList.toggle("active");
    });

    // Fermeture du menu des notifications en cliquant ailleurs
    document.addEventListener("click", function(event) {
      if (
        notificationsWrapper &&
        !notificationsWrapper.contains(event.target)
      ) {
        notificationsWrapper.classList.remove("active");
      }
    });
  }

  /**
   * Gestion du marquage des notifications comme lues
   * Envoie une requête au serveur et met à jour l'interface utilisateur
   */
  if (markReadButtons.length > 0) {
    markReadButtons.forEach((button) => {
      button.addEventListener("click", async function(e) {
        e.preventDefault();
        const notificationId = this.getAttribute("data-nid");

        try {
          // Marquer la notification comme lue sur le serveur
          const response = await fetch(
            `/notifications/${notificationId}/read`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          if (response.ok) {
            // Supprimer la notification de l'interface
            const notificationItem = document.querySelector(
              `.notification-item[data-nid="${notificationId}"]`,
            );
            if (notificationItem) {
              notificationItem.remove();
            }

            // Mise à jour du compteur de notifications
            const badge = document.querySelector(".notification-badge");
            if (badge) {
              const count = parseInt(badge.textContent) - 1;
              if (count <= 0) {
                badge.remove();
              } else {
                badge.textContent = count;
              }
            }

            // Afficher un message s'il n'y a plus de notifications
            const notificationList =
              document.querySelector(".notification-list");
            if (notificationList && notificationList.children.length === 0) {
              const noNotifications = document.createElement("p");
              noNotifications.className = "no-notifications";
              noNotifications.textContent =
                "Vous n'avez pas de nouvelles notifications";
              notificationList.parentNode.replaceChild(
                noNotifications,
                notificationList,
              );
            }
          }
        } catch (error) {
          console.error(
            "Erreur lors du marquage de la notification comme lue",
            error,
          );
        }
      });
    });
  }

  /**
   * Gestion des formulaires de création de réunion
   *
   * Cette section gère l'ajout dynamique de créneaux horaires et de participants
   * lors de la création d'une nouvelle réunion.
   */

  // Ajout dynamique de créneaux horaires
  const addTimeSlotBtn = document.getElementById("addTimeSlot");
  if (addTimeSlotBtn) {
    addTimeSlotBtn.addEventListener("click", function() {
      const timeSlots = document.getElementById("timeSlots");
      const newSlot = document.createElement("div");
      newSlot.className = "time-slot";
      newSlot.innerHTML = `
        <div class="form-group">
          <label>Date et heure de début</label>
          <input type="datetime-local" name="startTime[]" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Date et heure de fin</label>
          <input type="datetime-local" name="endTime[]" class="form-control" required>
        </div>
      `;
      timeSlots.appendChild(newSlot);
    });
  }
  const input = document.querySelector('input[name="participantEmail[]"]');
  if (input) {
    new Tagify(input);

    const form = document.getElementById('createMeetingForm');
    const errorDiv = document.getElementById('error');

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    form.addEventListener('submit', function (e) {
      const data = Object.fromEntries(new FormData(e.target).entries());
      const tags = JSON.parse(data['participantEmail[]']);
      const invalidEmails = tags.filter(tag => !isValidEmail(tag.value));

      if (invalidEmails.length > 0) {
        e.preventDefault(); // prevent form submission
        errorDiv.textContent = "Invalid emails: " + invalidEmails.map(t => t.value).join(', ');
      } else {
        // convert array into JSON string before submitting (optional for backend parsing)
        errorDiv.textContent = ""; // clear previous error
      }
    });
  }

  /**
   * Gestion des réponses directes aux créneaux
   * 
   * Met à jour l'interface utilisateur lorsqu'un utilisateur répond directement
   * à un créneau depuis la page de détail
   */
  const directResponseForms = document.querySelectorAll('.direct-response-form');
  if (directResponseForms.length > 0) {
    directResponseForms.forEach(form => {
      const submitButton = form.querySelector('button');
      if (!submitButton) return;

      submitButton.addEventListener('click', function() {
        // Récupérer l'ID du créneau et la disponibilité
        const tid = form.querySelector('input[name="tid"]').value;
        const availability = form.querySelector('input[name="availability"]').value;
        
        // Trouver l'item de créneau parent
        const timeSlotItem = this.closest('.time-slot-item');
        if (timeSlotItem) {
          // Supprimer toutes les classes de sélection précédentes
          timeSlotItem.classList.remove('selected-available', 'selected-maybe', 'selected-unavailable');
          // Ajouter la nouvelle classe de sélection
          timeSlotItem.classList.add('selected-' + availability);
          
          // Activer uniquement le bouton sélectionné dans ce groupe
          const allButtons = timeSlotItem.querySelectorAll('.emoji-btn');
          allButtons.forEach(btn => {
            btn.classList.remove('selected');
          });
          this.classList.add('selected');
        }
      });
    });
  }

  /**
   * Gestion de l'affichage du calendrier
   *
   * Cette section gère le basculement entre la vue liste et la vue calendrier,
   * ainsi que la navigation et le rendu du calendrier.
   */

  const listBtn = document.getElementById("liste");
  const listView = document.getElementById("list-view");
  const calendarBtn = document.getElementById("calendar");
  const calendarView = document.getElementById("calendar-view");

  // Date sélectionnée pour l'affichage du calendrier (mois courant par défaut)
  let selectedDate = new Date();

  // Gestion du basculement entre vue liste et vue calendrier
  if (listBtn && calendarBtn) {
    listBtn.addEventListener("click", function() {
      listBtn.classList.add("active");
      calendarBtn.classList.remove("active");
      if (listView) listView.style.display = "block";
      if (calendarView) calendarView.style.display = "none";
    });

    calendarBtn.addEventListener("click", function() {
      calendarBtn.classList.add("active");
      listBtn.classList.remove("active");
      if (calendarView) calendarView.style.display = "block";
      if (listView) listView.style.display = "none";
      renderCalendar();
    });

    // Navigation entre les mois du calendrier
    const prevBtn = document.getElementById("prev-month");
    if (prevBtn) {
      prevBtn.addEventListener("click", function() {
        selectedDate.setMonth(selectedDate.getMonth() - 1);
        renderCalendar();
      });
    }
    const nextBtn = document.getElementById("next-month");
    if (nextBtn) {
      nextBtn.addEventListener("click", function() {
        selectedDate.setMonth(selectedDate.getMonth() + 1);
        renderCalendar();
      });
    }
  }

  /**
   * Génère et affiche le calendrier pour le mois sélectionné
   *
   * Cette fonction crée une grille de calendrier avec les jours du mois
   * et affiche les réunions programmées aux dates correspondantes.
   */
  function renderCalendar() {
    const calendarEl = document.getElementById("calendar-container");
    if (!calendarEl) return;

    // Récupération des données de réunions depuis l'attribut data-meetings
    const meetingsData = JSON.parse(calendarEl.getAttribute("data-meetings"));

    const selectedMonth = selectedDate.getMonth();
    const selectedYear = selectedDate.getFullYear();

    // Mise à jour de l'en-tête du calendrier (mois et année)
    const monthYearElement = document.getElementById("month-year");
    if (monthYearElement) {
      const options = { month: "long", year: "numeric" };
      monthYearElement.textContent = selectedDate.toLocaleDateString(
        "fr-FR",
        options,
      );
    }

    // Calcul des informations du mois (premier jour, dernier jour, etc.)
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() || 7; // Convertit 0 (dimanche) en 7 pour le format européen

    const calendarGrid = document.getElementById("calendar-grid");
    if (!calendarGrid) return;

    calendarGrid.innerHTML = "";

    // Ajout des en-têtes de jours de la semaine
    const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
    weekDays.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "calendar-day-header";
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    // Ajout des jours vides pour compléter la première semaine
    for (let i = 1; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day empty";
      calendarGrid.appendChild(emptyDay);
    }

    // Création des cellules pour chaque jour du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement("div");
      dayCell.className = "calendar-day";

      // Ajout du numéro du jour
      const dateNumber = document.createElement("div");
      dateNumber.className = "date-number";
      dateNumber.textContent = day;
      dayCell.appendChild(dateNumber);

      // Filtrage des réunions pour ce jour
      const currentDate = new Date(selectedYear, selectedMonth, day);
      const dayEvents = meetingsData.filter((meeting) => {
        const meetingDate = new Date(meeting.start_time);
        return (
          meetingDate.getDate() === day &&
          meetingDate.getMonth() === selectedMonth &&
          meetingDate.getFullYear() === selectedYear
        );
      });

      // Ajout des événements du jour dans la cellule
      dayEvents.forEach((event) => {
        const eventEl = document.createElement("div");
        eventEl.className = "calendar-event";

        const eventTime = new Date(event.start_time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        eventEl.innerHTML = `<a href="/meetings/${event.mid}">${eventTime} - ${event.title}</a>`;

        dayCell.appendChild(eventEl);
      });

      // Mise en évidence du jour actuel
      const today = new Date();
      if (
        day === today.getDate() &&
        selectedMonth === today.getMonth() &&
        selectedYear === today.getFullYear()
      ) {
        dayCell.classList.add("today");
      }

      calendarGrid.appendChild(dayCell);
    }
  }


  /**
   * Gestion de la sélection dans les formulaires de réponse
   * 
   * Met à jour visuellement les time-slots en fonction des choix de l'utilisateur
   */
  const responseRadios = document.querySelectorAll('.response-option input[type="radio"]');
  if (responseRadios.length > 0) {
    responseRadios.forEach(radio => {
      // Initialisation des classes sur chargement de la page
      if (radio.checked) {
        const timeSlot = radio.closest('.time-slot');
        if (timeSlot) {
          updateTimeSlotClass(timeSlot, radio.value);
        }
      }
      
      radio.addEventListener('change', function() {
        const timeSlot = this.closest('.time-slot');
        if (timeSlot) {
          updateTimeSlotClass(timeSlot, this.value);
        }
      });
    });
  }
  
  /**
   * Gestion de la sélection dans les formulaires de réponse
   * 
   * Met à jour visuellement les time-slots en fonction des choix de l'utilisateur
   */
  const responseRadios1 = document.querySelectorAll('.response-option input[type="radio"]');
  if (responseRadios1.length > 0) {
    responseRadios1.forEach(radio => {
      // Initialisation des classes sur chargement de la page
      if (radio.checked) {
        const timeSlot = radio.closest('.time-slot');
        if (timeSlot) {
          updateTimeSlotClass(timeSlot, radio.value);
        }
      }
      
      radio.addEventListener('change', function() {
        const timeSlot = this.closest('.time-slot');
        if (timeSlot) {
          updateTimeSlotClass(timeSlot, this.value);
        }
      });
    });
  }
  
  /**
   * Met à jour la classe du time-slot en fonction de la réponse choisie
   * 
   * @param {HTMLElement} timeSlot - L'élément time-slot à mettre à jour
   * @param {string} availability - La disponibilité choisie (available, maybe, unavailable)
   */
  function updateTimeSlotClass(timeSlot, availability) {
    timeSlot.classList.remove('has-response-available', 'has-response-maybe', 'has-response-unavailable');
    timeSlot.classList.add('has-response-' + availability);
  }
});
