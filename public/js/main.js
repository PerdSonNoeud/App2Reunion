/**
 * Script principal de l'interface utilisateur
 * 
 * Ce module gère les interactions utilisateur pour les notifications,
 * la création de réunions et l'affichage du calendrier.
 * 
 * @module public/js/main
 */

document.addEventListener("DOMContentLoaded", function () {

  /**
   * Gestion des notifications
   * 
   * Cette section gère l'affichage et le marquage des notifications comme lues.
   */

  const notificationsToggle = document.querySelector('.notifications-toggle');
  const notificationsWrapper = document.querySelector('.notifications-wrapper');
  const markReadButtons = document.querySelectorAll('.mark-read-btn');

  // Affichage/masquage du menu des notifications
  if (notificationsToggle) {
    notificationsToggle.addEventListener('click', function () {
      notificationsWrapper.classList.toggle('active');
    });

    // Fermeture du menu des notifications en cliquant ailleurs
    document.addEventListener('click', function (event) {
      if (notificationsWrapper && !notificationsWrapper.contains(event.target)) {
        notificationsWrapper.classList.remove('active');
      }
    });
  }

  /**
   * Gestion du marquage des notifications comme lues
   * Envoie une requête au serveur et met à jour l'interface utilisateur
   */
  if (markReadButtons.length > 0) {
    markReadButtons.forEach(button => {
      button.addEventListener('click', async function (e) {
        e.preventDefault();
        const notificationId = this.getAttribute('data-nid');

        try {
          // Marquer la notification comme lue sur le serveur
          const response = await fetch(`/notifications/${notificationId}/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            // Supprimer la notification de l'interface
            const notificationItem = document.querySelector(`.notification-item[data-nid="${notificationId}"]`);
            if (notificationItem) {
              notificationItem.remove();
            }

            // Mise à jour du compteur de notifications
            const badge = document.querySelector('.notification-badge');
            if (badge) {
              const count = parseInt(badge.textContent) - 1;
              if (count <= 0) {
                badge.remove();
              } else {
                badge.textContent = count;
              }
            }

            // Afficher un message s'il n'y a plus de notifications
            const notificationList = document.querySelector('.notification-list');
            if (notificationList && notificationList.children.length === 0) {
              const noNotifications = document.createElement('p');
              noNotifications.className = 'no-notifications';
              noNotifications.textContent = 'Vous n\'avez pas de nouvelles notifications';
              notificationList.parentNode.replaceChild(noNotifications, notificationList);
            }
          }
        } catch (error) {
          console.error('Erreur lors du marquage de la notification comme lue', error);
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
    addTimeSlotBtn.addEventListener("click", function () {
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

  // Ajout dynamique de participants
  const addParticipantBtn = document.getElementById("addParticipant");
  if (addParticipantBtn) {
    addParticipantBtn.addEventListener("click", function () {
      const participants = document.getElementById("participants");
      const newParticipant = document.createElement("div");
      newParticipant.className = "participant";
      newParticipant.innerHTML = `
        <div class="form-group">
          <label>Email du participant</label>
          <input type="email" name="participantEmail[]" class="form-control" required>
        </div>
      `;
      participants.appendChild(newParticipant);
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
    listBtn.addEventListener("click", function () {
      listBtn.classList.add("active");
      calendarBtn.classList.remove("active");
      if (listView) listView.style.display = "block";
      if (calendarView) calendarView.style.display = "none";
    });

    calendarBtn.addEventListener("click", function () {
      calendarBtn.classList.add("active");
      listBtn.classList.remove("active");
      if (calendarView) calendarView.style.display = "block";
      if (listView) listView.style.display = "none";
      renderCalendar();
    });

    // Navigation entre les mois du calendrier
    const prevBtn = document.getElementById("prev-month");
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        selectedDate.setMonth(selectedDate.getMonth() - 1);
        renderCalendar();
      });
    }
    const nextBtn = document.getElementById("next-month");
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
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
});