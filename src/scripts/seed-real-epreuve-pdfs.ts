import PDFDocument from 'pdfkit';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Epreuve, Matiere, Universite } from '../models/index';
import { CloudinaryStorageService } from '../infrastructure/storage/cloudinary.storage.impl';

const storage = new CloudinaryStorageService();

function generatePdf(titre: string, subtitle: string, isCorrige: boolean): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(10).fillColor('#888888').text(subtitle, { align: 'right' });
    doc.moveDown(0.5);
    doc.fontSize(20).fillColor('#111111').text(titre, { align: 'left' });
    doc.moveDown();
    if (isCorrige) {
      doc.fontSize(14).fillColor('#0a7d3e').text('— CORRIGÉ —');
      doc.moveDown();
    }
    doc.fontSize(12).fillColor('#333333').text(
      'Document de démonstration NextLearn généré automatiquement pour ' +
      "permettre de tester la lecture dans l'application. Il ne s'agit pas " +
      "d'une épreuve réelle.\n\n" +
      'Exercice 1 (10 points)\n' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n' +
      'Exercice 2 (10 points)\n' +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    );

    doc.end();
  });
}

async function main() {
  await connectDatabase();

  const epreuves = await Epreuve.find({ urlPdf: { $regex: '^https://example.com/pdfs/' } });
  console.log(`${epreuves.length} épreuve(s) à régénérer avec un vrai PDF.`);

  for (const e of epreuves) {
    const [matiere, universite] = await Promise.all([
      Matiere.findById(e.matiereId).lean(),
      e.universiteId ? Universite.findById(e.universiteId).lean() : null,
    ]);
    const titre = `${matiere?.nom || 'Épreuve'} — ${e.annee}`;
    const subtitle = `${universite?.nom || ''} · ${e.niveau}`;

    const pdfBuffer = await generatePdf(titre, subtitle, false);
    const uploadResult = await storage.uploadFile(pdfBuffer, 'nextlearn/epreuves');
    e.urlPdf = uploadResult.url;

    if (e.urlCorrigePdf) {
      const corrigeBuffer = await generatePdf(titre, subtitle, true);
      const corrigeUpload = await storage.uploadFile(corrigeBuffer, 'nextlearn/epreuves');
      e.urlCorrigePdf = corrigeUpload.url;
    }

    await e.save();
    console.log(`✓ ${titre} → ${uploadResult.url}`);
  }

  console.log('\n🌱 PDF d\'épreuves générés et publiés avec succès !');
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
