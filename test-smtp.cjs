require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== Test de configuration SMTP Gmail ===\n');

// Vérification des variables d'environnement
if (!process.env.SMTP_USER) {
  console.error('❌ SMTP_USER n\'est pas définie dans les variables d\'environnement');
  process.exit(1);
}

if (!process.env.SMTP_PASS) {
  console.error('❌ SMTP_PASS n\'est pas définie dans les variables d\'environnement');
  process.exit(1);
}

console.log('✅ Configuration SMTP détectée');
console.log(`User: ${process.env.SMTP_USER}`);
console.log(`Pass: ${process.env.SMTP_PASS ? 'défini' : 'non défini'}`);
console.log(`Port: ${process.env.SMTP_PORT || 587}`);

// Configuration du transporteur
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('\n📧 Test de connexion au serveur SMTP...');

transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Erreur de connexion SMTP:', error);
    console.error('\n--- Diagnostic ---');
    console.error('Vérifiez:');
    console.error('1. Avez-vous activé la vérification en 2 étapes sur votre compte Google ?');
    console.error('2. Avez-vous créé un "mot de passe d\'application" pour Gmail ?');
    console.error('3. Le mot de passe d\'application est-il correct ?');
    console.error('4. Gmail a-t-il bloqué la connexion (vérifiez votre boîte mail Google) ?');
    process.exit(1);
  } else {
    console.log('✅ Connexion SMTP réussie !');
    
    // Test d'envoi d'email
    const testEmail = {
      from: process.env.SMTP_USER,
      to: process.env.TEST_EMAIL || process.env.SMTP_USER,
      subject: 'Test SMTP - NextLearn',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Test Email SMTP</h2>
          <p>Ceci est un email de test pour vérifier la configuration SMTP Gmail.</p>
          <p>Si vous recevez cet email, la configuration est correcte !</p>
          <p style="color: #666; font-size: 12px;">Envoyé depuis le script de test NextLearn</p>
        </div>
      `,
    };

    console.log(`\n📧 Tentative d'envoi d'email de test à: ${testEmail.to}`);
    
    transporter.sendMail(testEmail)
      .then((info) => {
        console.log('✅ Email envoyé avec succès !');
        console.log('Message ID:', info.messageId);
        console.log('Vérifiez votre boîte de réception (et le dossier spam)');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
        process.exit(1);
      });
  }
});
