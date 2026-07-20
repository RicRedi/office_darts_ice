import { getMatchOfTheMonth } from '../../hooks/useStats.js';
import { formatDate, formatEloChange } from '../../utils/formatters.js';

export default function MatchOfTheMonth({ matches, players }) {
  const best = getMatchOfTheMonth(matches);

  if (!best) {
    return (
      <div className="border rounded-2xl p-4">
        <h2 className="font-semibold text-lg mb-2">Zápas měsíce</h2>
        <p className="text-gray-400 text-sm">Tento měsíc se ještě neodehrál žádný zápas.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-2xl p-4">
      <h2 className="font-semibold text-lg mb-2">🏆 Zápas měsíce</h2>
      <p className="text-sm text-gray-500 mb-2">{formatDate(best.match.timestamp)}</p>
      <ul className="flex flex-col gap-1">
        {best.match.results.map((r) => (
          <li key={r.player_id} className="flex justify-between text-sm">
            <span>
              {r.rank}. {players[r.player_id]?.name ?? '(smazaný hráč)'}
            </span>
            <span>{formatEloChange(r.elo_change)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
