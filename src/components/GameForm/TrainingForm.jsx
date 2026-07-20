import { useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { usePlayers } from '../../hooks/useFirebaseData.js';
import { usePlayerCreation } from '../../hooks/usePlayerCreation.js';
import { saveTrainingMatch } from '../../services/matchesService.js';
import PlayerSearchSelect from '../Common/PlayerSearchSelect.jsx';
import ConfirmModal from '../Common/ConfirmModal.jsx';

export default function TrainingForm({ gameType, onDone, initialPlayerId = null, initialDarts = null }) {
  const { db } = useFirebase();
  const { data: playersData } = usePlayers();
  const allPlayers = Object.entries(playersData).map(([id, p]) => ({ id, ...p }));
  const activePlayers = allPlayers.filter((p) => !p.is_archived);

  const [playerId, setPlayerId] = useState(initialPlayerId);
  const [darts, setDarts] = useState(initialDarts != null ? String(initialDarts) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { pending, requestCreate, confirmCreateAnyway, confirmUseExisting, cancel } =
    usePlayerCreation(allPlayers);

  async function handleCreate(name, isGuest) {
    const player = await requestCreate(name, isGuest);
    if (player) setPlayerId(player.id);
  }

  async function handleSave() {
    const dartsToClose = parseInt(darts, 10);
    if (!playerId || !dartsToClose || dartsToClose <= 0) return;
    setSaving(true);
    setError('');
    try {
      await saveTrainingMatch(db, { gameTypeId: gameType.id, playerId, dartsToClose });
      onDone();
    } catch {
      setError('Uložení se nezdařilo, zkuste to prosím znovu.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">Trénink — {gameType.name}</h3>

      <PlayerSearchSelect
        players={activePlayers}
        value={playerId}
        onChange={setPlayerId}
        onCreateRegular={(name) => handleCreate(name, false)}
        onCreateGuest={(name) => handleCreate(name, true)}
      />

      <div>
        <label className="text-sm text-gray-500 block mb-1">Počet odházených šipek na zavření</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={darts}
          onChange={(e) => setDarts(e.target.value)}
          className="w-full border rounded-lg px-3 py-4 text-3xl text-center"
          placeholder="0"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={!playerId || !darts || saving}
        onClick={handleSave}
        className="bg-purple-600 text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        {saving ? 'Ukládám…' : 'Uložit trénink'}
      </button>

      <ConfirmModal
        open={!!pending}
        title="Podobný hráč už existuje"
        message={
          pending
            ? `Podobný hráč už existuje: ${pending.similarPlayer.name}. Opravdu chcete založit nového, nebo jste chtěli vybrat existujícího?`
            : ''
        }
        actions={[
          { label: 'Vybrat existujícího', variant: 'primary', onClick: confirmUseExisting },
          { label: 'Založit i tak', variant: 'neutral', onClick: confirmCreateAnyway },
          { label: 'Zrušit', variant: 'neutral', onClick: cancel },
        ]}
      />
    </div>
  );
}
