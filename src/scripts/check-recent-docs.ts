import { connectDatabase, disconnectDatabase } from '../config/database';
import { Document } from '../models/index';

async function main() {
  await connectDatabase();
  const docs = await Document.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log(JSON.stringify(docs.map((d: any) => ({
    _id: d._id, titre: d.titre, urlPdf: d.urlPdf, pages: d.pages, tailleMb: d.tailleMb, createdAt: d.createdAt,
  })), null, 2));
  await disconnectDatabase();
  process.exit(0);
}

main();
