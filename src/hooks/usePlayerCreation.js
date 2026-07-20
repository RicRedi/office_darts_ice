import { useState } from 'react';
import { findSimilarPlayer } from '../utils/similarity.js';
import { createPlayer } from '../services/playersService.js';
import { useFirebase } from '../context/FirebaseContext.jsx';

/**
 * Shared "create a new player" flow with duplicate-name protection (section 6.11).
 * requestCreate() resolves to the created player, the matched existing player,
 * or null if the user cancels.
 */
export function usePlayerCreation(allPlayers) {
  const { db } = useFirebase();
  const [pending, setPending] = useState(null); // { name, isGuest, similarPlayer, resolve }

  function requestCreate(name, isGuest) {
    return new Promise((resolve) => {
      const similar = findSimilarPlayer(name, allPlayers);
      if (similar) {
        setPending({ name, isGuest, similarPlayer: similar, resolve });
      } else {
        createPlayer(db, { name, isGuest }).then(resolve);
      }
    });
  }

  async function confirmCreateAnyway() {
    const { name, isGuest, resolve } = pending;
    setPending(null);
    resolve(await createPlayer(db, { name, isGuest }));
  }

  function confirmUseExisting() {
    const { similarPlayer, resolve } = pending;
    setPending(null);
    resolve(similarPlayer);
  }

  function cancel() {
    const { resolve } = pending;
    setPending(null);
    resolve(null);
  }

  return { pending, requestCreate, confirmCreateAnyway, confirmUseExisting, cancel };
}
