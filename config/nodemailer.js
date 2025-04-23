const nodemailer = require('nodemailer');

// configurer le transporteur Nodemailer
const tranport = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',  
  auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
  }
});

// pour gen un lien unique pour chaque utilisateur
const inviteRegisteredUserTemplate = (meeting, timeSlots, responseUrl, userEmail) => {
  const timeSlotsHtml = timeSlots.map(slot => {
      return `<li>${new Date(slot.start_time).toLocaleString('fr-FR')} - ${new Date(slot.end_time).toLocaleString('fr-FR')}</li>`;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #333; text-align: center;">Invitation à une réunion</h1>
      <p>Vous avez été invité(e) à participer à la réunion : <strong>${meeting.title}</strong></p>
      <p><strong>Description:</strong> ${meeting.description || 'Aucune description fournie'}</p>
      
      <h2 style="color: #555;">Créneaux proposés:</h2>
      <ul style="padding-left: 20px;">
        ${timeSlotsHtml}
      </ul>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${responseUrl}" style="background-color: #f6a0a0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Indiquer mes disponibilités</a>
      </div>
      
      <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
        <strong>Note importante :</strong> Vous devrez vous connecter avec l'adresse email <strong>${userEmail}</strong> pour répondre à cette invitation.
      </p>
    </div>
  `;
};

// pour les invités sans compte
const inviteGuest = (meeting, timeSlots, responseUrl) => {
  const timeSlotsHtml = timeSlots.map(slot => {
      return `<li>${new Date(slot.start_time).toLocaleString('fr-FR')} - ${new Date(slot.end_time).toLocaleString('fr-FR')}</li>`;
  }).join('');

  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <h1 style="color: #333; text-align: center;">Invitation à une réunion</h1>
    <p>Vous avez été invité(e) à participer à la réunion : <strong>${meeting.title}</strong></p>
    <p><strong>Description:</strong> ${meeting.description || 'Aucune description fournie'}</p>
    
    <h2 style="color: #555;">Créneaux proposés:</h2>
    <ul style="padding-left: 20px;">
      ${timeSlotsHtml}
    </ul>
    
    <div style="text-align: center; margin-top: 30px;">
      <a href="${responseUrl}" style="background-color: #f6a0a0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Indiquer mes disponibilités</a>
    </div>
  </div>
`;
};

// notif pour reppeler l'invité de répondre à l'invitation
const reminderTemplate = (meeting, timeSlots, responseUrl) => {
  const timeSlotsHtml = timeSlots.map(slot => {
      return `<li>${new Date(slot.start_time).toLocaleString('fr-FR')} - ${new Date(slot.end_time).toLocaleString('fr-FR')}</li>`;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h1 style="color: #333; text-align: center;">Rappel: Répondre à l'invitation</h1>
      <p>Nous n'avons pas encore reçu votre réponse concernant la réunion : <strong>${meeting.title}</strong></p>
      <p><strong>Description:</strong> ${meeting.description || 'Aucune description fournie'}</p>
      
      <h2 style="color: #555;">Créneaux proposés:</h2>
      <ul style="padding-left: 20px;">
        ${timeSlotsHtml}
      </ul>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="${responseUrl}" style="background-color: #f6a0a0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Indiquer mes disponibilités</a>
      </div>
    </div>
  `;
};


// fonction pour envoyer l'email
const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    };

    try {
        await tranport.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = {
    sendEmail,
    inviteRegisteredUserTemplate,
    inviteGuest,
    reminderTemplate
};