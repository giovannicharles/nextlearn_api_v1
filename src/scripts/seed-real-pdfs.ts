import PDFDocument from 'pdfkit';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { Document, Matiere, Enseignant } from '../models/index';
import { CloudinaryStorageService } from '../infrastructure/storage/cloudinary.storage.impl';

const storage = new CloudinaryStorageService();

function generatePdf(titre: string, description: string, matiereNom: string, pages: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    for (let p = 0; p < Math.max(1, pages); p++) {
      if (p > 0) doc.addPage();
      doc.fontSize(10).fillColor('#888888').text(matiereNom, { align: 'right' });
      doc.moveDown(0.5);
      doc.fontSize(20).fillColor('#111111').text(titre, { align: 'left' });
      doc.moveDown();
      doc.fontSize(12).fillColor('#333333').text(description);
      doc.moveDown();
      doc.fontSize(11).fillColor('#444444').text(
        `Page ${p + 1} sur ${Math.max(1, pages)}.\n\n` +
        'Contenu de démonstration NextLearn — ce document a été généré ' +
        'automatiquement pour permettre de tester la lecture et le ' +
        "téléchargement dans l'application. Il ne s'agit pas du contenu " +
        'académique réel.\n\n' +
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
        'nisi ut aliquip ex ea commodo consequat.'
      );
      doc.fontSize(9).fillColor('#aaaaaa').text(`${p + 1}`, 0, doc.page.height - 40, { align: 'center' });
    }

    doc.end();
  });
}

async function main() {
  await connectDatabase();

  const docs = await Document.find({ urlPdf: { $regex: '^https://example.com/pdfs/placeholder' } });
  console.log(`${docs.length} document(s) à régénérer avec un vrai PDF.`);

  for (const d of docs) {
    const matiere = await Matiere.findById(d.matiereId).lean();
    const pdfBuffer = await generatePdf(d.titre, d.description, matiere?.nom || 'NextLearn', d.pages || 3);

    const uploadResult = await storage.uploadFile(pdfBuffer, 'nextlearn/documents');
    const meta = await storage.extractPdfMetadata(pdfBuffer);

    d.urlPdf = uploadResult.url;
    d.pages = meta.pages;
    d.tailleMb = meta.size / (1024 * 1024);
    await d.save();

    console.log(`✓ ${d.titre} → ${uploadResult.url}`);
  }

  console.log('\n🌱 PDF de démonstration générés et publiés avec succès !');
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
