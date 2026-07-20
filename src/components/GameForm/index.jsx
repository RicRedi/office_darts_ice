import { useState } from 'react';
import { useGameTypes } from '../../hooks/useFirebaseData.js';
import RankOnlyForm from './RankOnlyForm.jsx';
import TrainingForm from './TrainingForm.jsx';

export default function GameForm() {
  const { data: gameTypesData } = useGameTypes();
  const gameTypes = Object.entries(gameTypesData).map(([id, gt]) => ({ id, ...gt }));

  const [gameTypeId, setGameTypeId] = useState('');
  const [mode, setMode] = useState(null); // 'multiplayer' | 'training' | null

  const selectedGameType = gameTypes.find((gt) => gt.id === gameTypeId);

  function handleSelectGameType(id) {
    setGameTypeId(id);
    const gt = gameTypes.find((g) => g.id === id);
    setMode(gt && !gt.supports_training ? 'multiplayer' : null);
  }

  function reset() {
    setGameTypeId('');
    setMode(null);
  }

  return (
    <div className="border rounded-2xl p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Nový zápas</h2>

      <div className="flex flex-wrap gap-2">
        {gameTypes.map((gt) => (
          <button
            key={gt.id}
            type="button"
            onClick={() => handleSelectGameType(gt.id)}
            className={`px-4 py-2 rounded-lg border font-medium ${
              gameTypeId === gt.id ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-300'
            }`}
          >
            {gt.name}
          </button>
        ))}
        {gameTypes.length === 0 && (
          <p className="text-sm text-gray-400">Zatím nejsou nastavené žádné typy her (viz Admin).</p>
        )}
      </div>

      {selectedGameType && selectedGameType.supports_training && mode === null && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMode('multiplayer')}
            className="flex-1 py-6 rounded-xl border-2 border-purple-300 text-lg font-semibold"
          >
            🎯 Zápas
          </button>
          <button
            type="button"
            onClick={() => setMode('training')}
            className="flex-1 py-6 rounded-xl border-2 border-gray-300 text-lg font-semibold"
          >
            🏋️ Trénink
          </button>
        </div>
      )}

      {mode === 'multiplayer' && selectedGameType && (
        <RankOnlyForm
          gameType={selectedGameType}
          onDone={reset}
          onSwitchToTraining={selectedGameType.supports_training ? () => setMode('training') : null}
        />
      )}
      {mode === 'training' && selectedGameType && <TrainingForm gameType={selectedGameType} onDone={reset} />}
    </div>
  );
}
