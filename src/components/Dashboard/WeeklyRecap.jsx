import { getWeeklyRecap } from '../../hooks/useStats.js';

export default function WeeklyRecap({ matches, players }) {
  const recap = getWeeklyRecap(matches, players);

  return (
    <div className="border rounded-2xl p-4">
      <h2 className="font-semibold text-lg mb-2">Tento týden</h2>
      {recap.totalMatches === 0 ? (
        <p className="text-gray-400 text-sm">Tento týden se ještě nehrálo.</p>
      ) : (
        <ul className="text-sm flex flex-col gap-1">
          <li>
            Odehráno zápasů: <strong>{recap.totalMatches}</strong>
          </li>
          {recap.mostWins && (
            <li>
              Nejvíc výher: <strong>{players[recap.mostWins.playerId]?.name}</strong> ({recap.mostWins.count})
            </li>
          )}
          {recap.bestForm && (
            <li>
              Největší forma: <strong>{players[recap.bestForm.playerId]?.name}</strong> (
              {recap.bestForm.eloGain > 0 ? '+' : ''}
              {recap.bestForm.eloGain})
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
