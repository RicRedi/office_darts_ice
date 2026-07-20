import { Link } from 'react-router-dom';
import Avatar from '../Common/Avatar.jsx';
import { getForm30Days } from '../../hooks/useStats.js';
import { getHighestBadge } from '../../utils/badges.js';

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function sortByElo(list) {
  return [...list].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));
}

function PlayerRow({ player, index, matches }) {
  const badge = getHighestBadge(player.games_played || 0);
  const form = getForm30Days(matches, player.id);

  return (
    <li className="flex items-center gap-3 py-2 border-b last:border-0">
      <span className="w-6 text-center text-gray-400 font-mono">{index + 1}</span>
      <Avatar player={player} size="sm" />
      <Link to={`/players/${player.id}`} className="flex-1 hover:underline flex items-center gap-1.5">
        <span>{player.name}</span>
        {badge && <span title={badge.label}>{badge.icon}</span>}
        {(player.current_win_streak ?? 0) >= 3 && (
          <span className="text-xs text-orange-500">🔥 {player.current_win_streak}</span>
        )}
      </Link>
      {form !== 0 && (
        <span className={`text-xs ${form > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {form > 0 ? '▲' : '▼'} {Math.abs(form)}
        </span>
      )}
      <span className="font-mono w-14 text-right">{Math.round(player.elo ?? 1000)}</span>
    </li>
  );
}

export default function Leaderboard({ players, matches }) {
  const visible = players.filter((p) => !p.is_archived);
  const now = Date.now();
  const active = visible.filter((p) => p.last_played_timestamp && now - p.last_played_timestamp <= ACTIVE_WINDOW_MS);
  const inactive = visible.filter((p) => !active.includes(p));

  return (
    <div className="border rounded-2xl p-4 flex flex-col gap-2">
      <h2 className="font-semibold text-lg">Žebříček</h2>
      {active.length === 0 && <p className="text-gray-400 text-sm">Zatím žádní aktivní hráči.</p>}
      <ul>
        {sortByElo(active).map((player, index) => (
          <PlayerRow key={player.id} player={player} index={index} matches={matches} />
        ))}
      </ul>
      {inactive.length > 0 && (
        <details className="mt-2">
          <summary className="text-sm text-gray-400 cursor-pointer">
            Neaktivní / Zasloužilí hráči ({inactive.length})
          </summary>
          <ul>
            {sortByElo(inactive).map((player, index) => (
              <PlayerRow key={player.id} player={player} index={index} matches={matches} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
