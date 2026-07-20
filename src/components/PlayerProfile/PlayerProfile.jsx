import { useParams } from 'react-router-dom';
import { usePlayers, useMatches, useGameTypes, toEntries } from '../../hooks/useFirebaseData.js';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { getNemesis, getTrainingStats } from '../../hooks/useStats.js';
import { getHighestBadge } from '../../utils/badges.js';
import { promoteGuestToRegular } from '../../services/playersService.js';
import Avatar from '../Common/Avatar.jsx';
import HeadToHead from './HeadToHead.jsx';

export default function PlayerProfile() {
  const { id } = useParams();
  const { db } = useFirebase();
  const { data: playersData } = usePlayers();
  const { data: matchesData } = useMatches();
  const { data: gameTypesData } = useGameTypes();

  const player = playersData[id];
  const players = toEntries(playersData);
  const gameTypes = toEntries(gameTypesData);

  if (!player) {
    return <div className="max-w-2xl mx-auto p-4">Hráč nenalezen.</div>;
  }

  const badge = getHighestBadge(player.games_played || 0);
  const nemesis = getNemesis(matchesData, id);

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar player={{ ...player, id }} size="lg" />
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {player.name}
            {player.is_archived && (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Archivovaný hráč</span>
            )}
          </h1>
          <p className="text-gray-500 text-sm">
            Elo {Math.round(player.elo ?? 1000)} · {player.games_played ?? 0} zápasů
            {badge && (
              <>
                {' '}
                · {badge.icon} {badge.label} — {badge.threshold}+ odehraných zápasů
              </>
            )}
          </p>
        </div>
      </div>

      {player.is_guest && (
        <button
          type="button"
          onClick={() => promoteGuestToRegular(db, id)}
          className="self-start text-sm text-purple-700 border border-purple-300 rounded-lg px-3 py-1.5"
        >
          Povýšit na stálého hráče
        </button>
      )}

      <HeadToHead matches={matchesData} players={players} playerId={id} />

      {nemesis && (
        <div className="border rounded-2xl p-4">
          <h2 className="font-semibold text-lg mb-1">Nemesis</h2>
          <p className="text-sm">
            {playersData[nemesis.opponentId]?.name ?? '(smazaný hráč)'} ({nemesis.wins} výher, {nemesis.losses}{' '}
            proher)
          </p>
        </div>
      )}

      <div className="border rounded-2xl p-4 flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Trénink</h2>
        {gameTypes
          .filter((gt) => gt.supports_training)
          .map((gt) => {
            const stats = getTrainingStats(matchesData, id, gt.id);
            if (stats.best === null) return null;
            return (
              <div key={gt.id} className="text-sm flex justify-between">
                <span>{gt.name}</span>
                <span>
                  Nejlepší trénink: <strong>{stats.best}</strong> · Průměr posledních 10:{' '}
                  <strong>{stats.average}</strong>
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
