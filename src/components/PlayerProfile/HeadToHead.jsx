import { useState } from 'react';
import { getHeadToHead } from '../../hooks/useStats.js';

export default function HeadToHead({ matches, players, playerId }) {
  const others = players.filter((p) => p.id !== playerId);
  const [opponentId, setOpponentId] = useState(others[0]?.id ?? '');

  if (others.length === 0) return null;

  const { wins, losses, draws } = getHeadToHead(matches, playerId, opponentId);

  return (
    <div className="border rounded-2xl p-4 flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Vzájemné zápasy</h2>
      <select
        value={opponentId}
        onChange={(e) => setOpponentId(e.target.value)}
        className="border rounded-lg px-3 py-2"
      >
        {others.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <p className="text-sm">
        Výhry: <strong>{wins}</strong> · Prohry: <strong>{losses}</strong> · Remízy: <strong>{draws}</strong>
      </p>
    </div>
  );
}
