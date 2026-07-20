import { ref, push, set, update } from 'firebase/database';

export async function createGameType(db, { name, category, supportsTraining }) {
  const newRef = push(ref(db, 'game_types'));
  await set(newRef, { name, category, supports_training: !!supportsTraining });
  return newRef.key;
}

export async function updateGameType(db, id, patch) {
  await update(ref(db, `game_types/${id}`), patch);
}
