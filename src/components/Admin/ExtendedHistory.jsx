import { useState } from 'react';
import { useMatches, usePlayers, useGameTypes, toEntries } from '../../hooks/useFirebaseData.js';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { hardDeleteMatch, manualRecalculateElo } from '../../services/matchesService.js';
import { formatDate } from '../../utils/formatters.js';
import ConfirmModal from '../Common/ConfirmModal.jsx';

export default function ExtendedHistory() {
  const { db } = useFirebase();
  const { data: matchesData } = useMatches();
  const { data: playersData } = usePlayers();
  const { data: gameTypesData } = useGameTypes();
  const [deletingId, setDeletingId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  const matches = toEntries(matchesData).sort((a, b) => b.timestamp - a.timestamp);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      await manualRecalculateElo(db);
    } finally {
      setRecalculating(false);
    }
  }

  async function handleHardDelete() {
    await hardDeleteMatch(db, deletingId);
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRecalculate}
          disabled={recalculating}
          className="text-sm text-purple-700 border border-purple-300 rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          {recalculating ? 'Přepočítávám…' : 'Přepočítat Elo'}
        </button>
      </div>
      <div className="border rounded-2xl p-4 flex flex-col gap-2">
        {matches.map((match) => (
          <div key={match.id} className="flex items-center justify-between border-b py-2 last:border-0 text-sm gap-2">
            <span>
              {formatDate(match.timestamp)} — {gameTypesData[match.game_type_id]?.name}{' '}
              ({match.mode === 'training' ? 'Trénink' : 'Zápas'})
              {match.is_invalidated && <span className="text-red-400"> — zneplatněno</span>}
              <br />
              <span className="text-xs text-gray-400">
                {match.results.map((r) => playersData[r.player_id]?.name ?? '(smazaný hráč)').join(', ')}
              </span>
            </span>
            <button type="button" onClick={() => setDeletingId(match.id)} className="text-red-500 shrink-0">
              Smazat natvrdo
            </button>
          </div>
        ))}
        {matches.length === 0 && <p className="text-gray-400 text-sm">Žádné zápasy.</p>}
      </div>

      <ConfirmModal
        open={!!deletingId}
        title="Trvale smazat zápas?"
        message="Provede se plný přepočet Elo všech navazujících zápasů. Tuto akci nelze vrátit zpět."
        actions={[
          { label: 'Smazat natvrdo', variant: 'danger', onClick: handleHardDelete },
          { label: 'Zrušit', variant: 'neutral', onClick: () => setDeletingId(null) },
        ]}
      />
    </div>
  );
}
