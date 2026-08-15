import { connectDatabase, disconnectDatabase } from '../config/database';
import { User } from '../models/index';

async function main() {
  await connectDatabase();
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: tsx src/scripts/promote-admin.ts <email>');
    process.exit(1);
  }
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  if (!user) {
    console.error(`Aucun utilisateur trouvé pour ${email}`);
  } else {
    console.log(`✓ ${user.email} est maintenant admin (role=${user.role})`);
  }
  await disconnectDatabase();
  process.exit(0);
}

main();
