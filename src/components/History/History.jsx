import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { usePlayers, useMatches, useGameTypes, toEntries } from '../../hooks/useFirebaseData.js';
import { deleteRecentMatch, requestDeletion } from '../../services/matchesService.js';
import { sendDeletionRequestEmail } from '../../services/emailService.js';
import { formatDate, formatEloChange, formatMinutesRemaining } from '../../utils/formatters.js';
import ConfirmModal from '../Common/ConfirmModal.jsx';
import RankOnlyForm from '../GameForm/RankOnlyForm.jsx';
import TrainingForm from '../GameForm/TrainingForm.jsx';

export default function History() {
  const { db, isAdmin } = useFirebase();
  const { data: matchesData } = useMatches();
  const { data: playersData } = usePlayers();
  const { data: gameTypesData } = useGameTypes();

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [deletingMatch, setDeletingMatch] = useState(null);
  const [requestingMatch, setRequestingMatch] = useState(null);

  const matches = toEntries(matchesData).sort((a, b) => b.timestamp - a.timestamp);

  function playerName(id) {
    return playersData[id]?.name ?? '(smazaný hráč)';
  }

  function gameTypeName(id) {
    return gameTypesData[id]?.name ?? id;
  }

  async function handleDelete(match) {
    await deleteRecentMatch(db, match);
    setDeletingMatch(null);
  }

  async function handleRequestDeletion(match) {
    await requestDeletion(db, match.id);
    try {
      await sendDeletionRequestEmail({
        matchId: match.id,
        matchDescription: `${gameTypeName(match.game_type_id)} — ${formatDate(match.timestamp)}`,
      });
    } catch {
      // e-mail selhání nemá blokovat zaevidování žádosti v DB
    }
    setRequestingMatch(null);
  }

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Historie zápasů</h1>

      {matches.length === 0 && <p className="text-gray-400">Zatím žádné zápasy.</p>}

      {matches.map((match) => {
        const editable = match.editable_until > Date.now();
        const isEditing = editingMatchId === match.id;
        const gameType = gameTypesData[match.game_type_id];

        return (
          <div key={match.id} className="border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{formatDate(match.timestamp)}</span>
              <span className="font-medium text-gray-700">{gameTypeName(match.game_type_id)}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  match.mode === 'training' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                }`}
              >
                {match.mode === 'training' ? 'Trénink' : 'Zápas'}
              </span>
            </div>

            {match.is_invalidated && (
              <p className="text-xs text-red-500">Tento zápas byl zneplatněn (smazán administrátorem).</p>
            )}

            {isEditing ? (
              match.mode === 'training' ? (
                <TrainingForm
                  gameType={gameType ?? { id: match.game_type_id, name: gameTypeName(match.game_type_id) }}
                  initialPlayerId={match.results[0].player_id}
                  initialDarts={match.results[0].darts_to_close}
                  onDone={async () => {
                    await deleteRecentMatch(db, match);
                    setEditingMatchId(null);
                  }}
                />
              ) : (
                <RankOnlyForm
                  gameType={gameType ?? { id: match.game_type_id, name: gameTypeName(match.game_type_id) }}
                  initialResults={match.results}
                  onDone={async () => {
                    await deleteRecentMatch(db, match);
                    setEditingMatchId(null);
                  }}
                />
              )
            ) : (
              <ol className="flex flex-col gap-1">
                {match.results.map((r) => (
                  <li key={r.player_id} className="flex items-center justify-between text-sm">
                    <Link to={`/players/${r.player_id}`} className="hover:underline">
                      {match.mode === 'training' ? '' : `${r.rank}. `}
                      {playerName(r.player_id)}
                    </Link>
                    <span className="text-gray-500">
                      {match.mode === 'training'
                        ? `${r.darts_to_close} šipek`
                        : formatEloChange(r.elo_change)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {!isEditing && (
              <div className="flex items-center gap-3 text-sm">
                {editable ? (
                  <>
                    <span className="text-gray-400 text-xs">{formatMinutesRemaining(match.editable_until)}</span>
                    <button type="button" onClick={() => setEditingMatchId(match.id)} className="text-purple-700">
                      Upravit
                    </button>
                    <button type="button" onClick={() => setDeletingMatch(match)} className="text-red-500">
                      Smazat
                    </button>
                  </>
                ) : (
                  !match.is_invalidated && (
                    <button
                      type="button"
                      onClick={() => setRequestingMatch(match)}
                      className="text-gray-400 hover:text-red-500"
                      title="Požádat o smazání"
                    >
                      🗑️ Požádat o smazání
                    </button>
                  )
                )}
                {isAdmin && <span className="ml-auto text-xs text-gray-300">Admin: viz sekce Admin → Historie</span>}
              </div>
            )}

            {isEditing && (
              <button type="button" onClick={() => setEditingMatchId(null)} className="text-xs text-gray-400 self-start">
                Zrušit úpravu
              </button>
            )}
          </div>
        );
      })}

      <ConfirmModal
        open={!!deletingMatch}
        title="Smazat zápas?"
        message="Tato akce je nevratná a upraví Elo dotčených hráčů."
        actions={[
          { label: 'Smazat', variant: 'danger', onClick: () => handleDelete(deletingMatch) },
          { label: 'Zrušit', variant: 'neutral', onClick: () => setDeletingMatch(null) },
        ]}
      />

      <ConfirmModal
        open={!!requestingMatch}
        title="Požádat o smazání staršího zápasu"
        message="Zápas je starší 10 minut, o jeho smazání musí rozhodnout administrátor. Pošleme mu e-mailovou žádost."
        actions={[
          { label: 'Odeslat žádost', variant: 'danger', onClick: () => handleRequestDeletion(requestingMatch) },
          { label: 'Zrušit', variant: 'neutral', onClick: () => setRequestingMatch(null) },
        ]}
      />
    </div>
  );
}
