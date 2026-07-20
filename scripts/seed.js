import 'dotenv/config';
import admin from 'firebase-admin';

const SEED_VERSION = 1;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error(
      'Chybí proměnná prostředí FIREBASE_SERVICE_ACCOUNT_KEY (servisní účet Firebase Admin SDK jako JSON). ' +
        'Nastav ji v .env (jen lokálně, nikdy necommitovat) a spusť znovu.',
    );
    process.exit(1);
  }
  return JSON.parse(raw);
}

async function main() {
  const serviceAccount = loadServiceAccount();
  const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    console.error('Chybí proměnná prostředí VITE_FIREBASE_DATABASE_URL.');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL,
  });

  const db = admin.database();
  const metaSnapshot = await db.ref('app_meta/last_seed_version').get();
  const currentVersion = metaSnapshot.val() || 0;

  if (currentVersion >= SEED_VERSION) {
    console.log(`Seed už proběhl (last_seed_version = ${currentVersion}), nic se nedělá.`);
    process.exit(0);
  }

  const now = Date.now();
  const player = (name) => ({
    name,
    is_guest: false,
    is_archived: false,
    elo: 1000,
    games_played: 0,
    current_win_streak: 0,
    last_played_timestamp: null,
    created_at: now,
  });

  await db.ref().update({
    players: {
      player_richard_redina: player('Richard Ředina'),
      player_jakub_hejc: player('Jakub Hejč'),
      player_martin_matych: player('Martin Mátych'),
    },
    game_types: {
      gt_301: { name: '301', category: 'X01', supports_training: true },
      gt_501: { name: '501', category: 'X01', supports_training: true },
      gt_cricket: { name: 'Cricket', category: 'Cricket', supports_training: true },
    },
    app_meta: { last_seed_version: SEED_VERSION },
  });

  console.log('Seed dokončen: 3 hráči + 3 typy her.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed selhal:', err);
  process.exit(1);
});
