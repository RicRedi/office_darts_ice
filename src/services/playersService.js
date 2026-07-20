import { ref, push, set, update } from 'firebase/database';

export async function createPlayer(db, { name, isGuest }) {
  const newRef = push(ref(db, 'players'));
  const player = {
    name,
    is_guest: !!isGuest,
    is_archived: false,
    elo: 1000,
    games_played: 0,
    current_win_streak: 0,
    last_played_timestamp: null,
    created_at: Date.now(),
  };
  await set(newRef, player);
  return { id: newRef.key, ...player };
}

export async function renamePlayer(db, playerId, name) {
  await update(ref(db, `players/${playerId}`), { name });
}

export async function setPlayerArchived(db, playerId, isArchived) {
  await update(ref(db, `players/${playerId}`), { is_archived: isArchived });
}

export async function promoteGuestToRegular(db, playerId) {
  await update(ref(db, `players/${playerId}`), { is_guest: false });
}
