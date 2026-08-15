import { connectDatabase, disconnectDatabase } from '../config/database';
import {
  User,
  Document,
  Favorite,
  DocumentRating,
  LectureProgress,
  StudySession,
  OfflineDownload,
  QuizResult,
  RefreshToken,
  OtpCode,
  Notification,
  SupportTicket,
} from '../models/index';

/**
 * Purge destructive : supprime TOUS les documents (collection Document) et
 * TOUS les utilisateurs sauf ceux ayant role === 'admin'.
 * Cascade : supprime aussi les enregistrements qui référencent les
 * utilisateurs/documents supprimés, pour ne pas laisser d'orphelins
 * (Favorite, DocumentRating, LectureProgress, StudySession, OfflineDownload,
 * QuizResult, RefreshToken, OtpCode, Notification, SupportTicket).
 *
 * Usage : npx tsx src/scripts/purge-data.ts --confirm
 */
async function main() {
  const confirmed = process.argv.includes('--confirm');
  if (!confirmed) {
    console.error(
      'Opération destructive. Relance avec --confirm pour exécuter :\n' +
        '  npx tsx src/scripts/purge-data.ts --confirm'
    );
    process.exit(1);
  }

  await connectDatabase();

  const nonAdminUsers = await User.find({ role: { $ne: 'admin' } }, { _id: 1 });
  const nonAdminIds = nonAdminUsers.map((u) => String(u._id));

  console.log(`Utilisateurs non-admin à supprimer : ${nonAdminIds.length}`);

  const docResult = await Document.deleteMany({});
  console.log(`Documents supprimés : ${docResult.deletedCount}`);

  // Toute trace de lecture/interaction porte sur des documents désormais
  // inexistants : on purge ces collections dans leur intégralité.
  const [favRes, ratingRes, progressRes, sessionRes, downloadRes] = await Promise.all([
    Favorite.deleteMany({}),
    DocumentRating.deleteMany({}),
    LectureProgress.deleteMany({}),
    StudySession.deleteMany({}),
    OfflineDownload.deleteMany({}),
  ]);
  console.log(
    `Favorites: ${favRes.deletedCount}, DocumentRatings: ${ratingRes.deletedCount}, ` +
      `LectureProgress: ${progressRes.deletedCount}, StudySessions: ${sessionRes.deletedCount}, ` +
      `OfflineDownloads: ${downloadRes.deletedCount}`
  );

  if (nonAdminIds.length > 0) {
    const [quizRes, tokenRes, otpRes, notifRes, ticketRes] = await Promise.all([
      QuizResult.deleteMany({ userId: { $in: nonAdminIds } }),
      RefreshToken.deleteMany({ userId: { $in: nonAdminIds } }),
      OtpCode.deleteMany({ userId: { $in: nonAdminIds } }),
      Notification.deleteMany({ userId: { $in: nonAdminIds } }),
      SupportTicket.deleteMany({ userId: { $in: nonAdminIds } }),
    ]);
    console.log(
      `QuizResults: ${quizRes.deletedCount}, RefreshTokens: ${tokenRes.deletedCount}, ` +
        `OtpCodes: ${otpRes.deletedCount}, Notifications: ${notifRes.deletedCount}, ` +
        `SupportTickets: ${ticketRes.deletedCount}`
    );

    const userRes = await User.deleteMany({ _id: { $in: nonAdminIds } });
    console.log(`Utilisateurs supprimés : ${userRes.deletedCount}`);
  } else {
    console.log('Aucun utilisateur non-admin à supprimer.');
  }

  console.log('✓ Purge terminée.');
  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Erreur pendant la purge :', err);
  await disconnectDatabase();
  process.exit(1);
});
