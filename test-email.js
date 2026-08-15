require('dotenv').config();
const sgMail = require('@sendgrid/mail');

console.log('=== Test de configuration SendGrid ===\n');

// Vérification de la clé API
if (!process.env.SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY n\'est pas définie dans les variables d\'environnement');
  console.log('Veuillez vérifier votre fichier .env');
  process.exit(1);
}

console.log('✅ SENDGRID_API_KEY est définie');
console.log(`Clé API ( premiers caractères): ${process.env.SENDGRID_API_KEY.substring(0, 10)}...`);

// Configuration de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email de test
const testEmail = {
  to: process.env.TEST_EMAIL || 'test@example.com',
  from: 'noreply@nextlearn.cm',
  subject: 'Test SendGrid - NextLearn',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Test Email NextLearn</h2>
      <p>Ceci est un email de test pour vérifier la configuration SendGrid.</p>
      <p>Si vous recevez cet email, la configuration est correcte !</p>
      <p style="color: #666; font-size: 12px;">Envoyé depuis le script de test NextLearn</p>
    </div>
  `,
};

console.log(`\n📧 Tentative d'envoi d'email de test à: ${testEmail.to}`);
console.log(`De: ${testEmail.from}`);

sgMail.send(testEmail)
  .then(() => {
    console.log('\n✅ Email envoyé avec succès !');
    console.log('Vérifiez votre boîte de réception (et le dossier spam)');
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de l\'envoi de l\'email:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Response body:', JSON.stringify(error.response.body, null, 2));
    }
    console.error('\n--- Diagnostic ---');
    console.error('Vérifiez:');
    console.error('1. L\'adresse noreply@nextlearn.cm est-elle vérifiée dans votre compte SendGrid ?');
    console.error('2. Votre clé API a-t-elle les permissions "Mail Send" ?');
    console.error('3. Votre compte est-il en mode Sandbox ?');
    process.exit(1);
  });
