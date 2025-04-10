document.addEventListener('DOMContentLoaded', function () {
  const addTimeSlotBtn = document.getElementById('addTimeSlot');
  if (addTimeSlotBtn) {
    addTimeSlotBtn.addEventListener('click', function () {
      const timeSlots = document.getElementById('timeSlots');
      const newSlot = document.createElement('div');
      newSlot.className = 'time-slot';
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

  
  const listBtn = document.getElementById('liste');
  const calendarBtn = document.getElementById('calendar');
  const calendarView = document.getElementById('calendar-view');
  const listView = document.getElementById('list-view');

  if (listBtn && calendarBtn) {
    listBtn.addEventListener('click', function () {
      listBtn.classList.add('active');
      calendarBtn.classList.remove('active');
      if (listView) listView.style.display = 'block';
      if (calendarView) calendarView.style.display = 'none';
    });

    calendarBtn.addEventListener('click', function () {
      calendarBtn.classList.add('active');
      listBtn.classList.remove('active');
      if (calendarView) calendarView.style.display = 'block';
      if (listView) listView.style.display = 'none';
      renderCalendar();
    });
  }

  const addParticipantBtn = document.getElementById('addParticipant');
  if (addParticipantBtn) {
    addParticipantBtn.addEventListener('click', function () {
      const participants = document.getElementById('participants');
      const newParticipant = document.createElement('div');
      newParticipant.className = 'participant';
      newParticipant.innerHTML = `
        <div class="form-group">
          <label>Email du participant</label>
          <input type="email" name="participantEmail[]" class="form-control" required>
        </div>
      `;
      participants.appendChild(newParticipant);
    });
  }

  
  function renderCalendar() {
    const calendarEl = document.getElementById('calendar-container');
    if (!calendarEl) return;

    const meetingsData = JSON.parse(calendarEl.getAttribute('data-meetings'));
    
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    
    const monthYearElement = document.getElementById('month-year');
    if (monthYearElement) {
      const options = { month: 'long', year: 'numeric' };
      monthYearElement.textContent = today.toLocaleDateString('fr-FR', options);
    }

    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() || 7; 

    
    const calendarGrid = document.getElementById('calendar-grid');
    if (!calendarGrid) return;

    calendarGrid.innerHTML = '';

    
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    weekDays.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    for (let i = 1; i < startingDay; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';

      const dateNumber = document.createElement('div');
      dateNumber.className = 'date-number';
      dateNumber.textContent = day;
      dayCell.appendChild(dateNumber);

      const currentDate = new Date(currentYear, currentMonth, day);
      const dayEvents = meetingsData.filter(meeting => {
        const meetingDate = new Date(meeting.start_time);
        return meetingDate.getDate() === day &&
          meetingDate.getMonth() === currentMonth &&
          meetingDate.getFullYear() === currentYear;
      });

      dayEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = 'calendar-event';

        const eventTime = new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventEl.innerHTML = `<a href="/meetings/${event.mid}">${eventTime} - ${event.title}</a>`;

        dayCell.appendChild(eventEl);
      });

      if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
        dayCell.classList.add('today');
      }

      calendarGrid.appendChild(dayCell);
    }
  }

});