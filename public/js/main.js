document.addEventListener('DOMContentLoaded', function() {
    // Add time slot button functionality
    const addTimeSlotBtn = document.getElementById('addTimeSlot');
    if (addTimeSlotBtn) {
      addTimeSlotBtn.addEventListener('click', function() {
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
  
    // Add participant button functionality
    const addParticipantBtn = document.getElementById('addParticipant');
    if (addParticipantBtn) {
      addParticipantBtn.addEventListener('click', function() {
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
  });