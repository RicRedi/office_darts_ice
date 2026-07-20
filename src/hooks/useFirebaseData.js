import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { useFirebase } from '../context/FirebaseContext.jsx';

function useFirebaseList(path) {
  const { db } = useFirebase();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dbRef = ref(db, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      setData(snapshot.val() || {});
      setLoading(false);
    });
    return unsubscribe;
  }, [db, path]);

  return { data, loading };
}

export const usePlayers = () => useFirebaseList('players');
export const useMatches = () => useFirebaseList('matches');
export const useGameTypes = () => useFirebaseList('game_types');
export const useDeletionRequests = () => useFirebaseList('deletion_requests');

export function toEntries(obj) {
  return Object.entries(obj || {}).map(([id, value]) => ({ id, ...value }));
}
