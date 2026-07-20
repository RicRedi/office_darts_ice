import { useState } from 'react';
import { useFirebase } from '../../context/FirebaseContext.jsx';
import { usePlayers } from '../../hooks/useFirebaseData.js';
import { usePlayerCreation } from '../../hooks/usePlayerCreation.js';
import { saveMultiplayerMatch } from '../../services/matchesService.js';
import PlayerSearchSelect from '../Common/PlayerSearchSelect.jsx';
import ConfirmModal from '../Common/ConfirmModal.jsx';

const LAST_LINEUP_KEY = 'dartstats_last_lineup';
let rowKeySeq = 0;
function newRow() {
  rowKeySeq += 1;
  return { key: rowKeySeq, playerId: null, tieWithPrevious: false };
}

function computeEntries(filledRows) {
  const entries = [];
  filledRows.forEach((row, idx) => {
    const rank = row.tieWithPrevious && idx > 0 ? entries[idx - 1].rank : idx + 1;
    entries.push({ playerId: row.playerId, rank });
  });
  return entries;
}

export default function RankOnlyForm({ gameType, onDone, onSwitchToTraining, initialResults = null }) {
  const { db } = useFirebase();
  const { data: playersData } = usePlayers();
  const allPlayers = Object.entries(playersData).map(([id, p]) => ({ id, ...p }));
  const activePlayers = allPlayers.filter((p) => !p.is_archived);

  const [rows, setRows] = useState(() => {
    if (initialResults?.length) {
      return initialResults.map((r, idx) => ({
        ...newRow(),
        playerId: r.player_id,
        tieWithPrevious: idx > 0 && r.rank === initialResults[idx - 1].rank,
      }));
    }
    return [newRow(), newRow()];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [lineupWarning, setLineupWarning] = useState('');

  const { pending, requestCreate, confirmCreateAnyway, confirmUseExisting, cancel } =
    usePlayerCreation(allPlayers);

  const filledRows = rows.filter((r) => r.playerId);

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function moveRow(index, direction) {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function useLastLineup() {
    const raw = localStorage.getItem(LAST_LINEUP_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw);
    const skipped = [];
    const usable = ids.filter((id) => {
      const player = allPlayers.find((p) => p.id === id);
      if (!player || player.is_archived) {
        const name = player?.name ?? id;
        skipped.push(name);
        return false;
      }
      return true;
    });
    setRows(usable.map((id) => ({ ...newRow(), playerId: id })));
    setLineupWarning(skipped.length ? `Vynechán archivovaný hráč: ${skipped.join(', ')}` : '');
  }

  async function handleCreate(name, isGuest) {
    const player = await requestCreate(name, isGuest);
    return player;
  }

  async function doSave(filled) {
    setSaving(true);
    setError('');
    try {
      const entries = computeEntries(filled).map((e) => ({ playerId: e.playerId, rank: e.rank }));
      await saveMultiplayerMatch(db, { gameTypeId: gameType.id, entries });
      localStorage.setItem(LAST_LINEUP_KEY, JSON.stringify(filled.map((r) => r.playerId)));
      onDone();
    } catch {
      setError('Uložení se nezdařilo, zkuste to prosím znovu.');
    } finally {
      setSaving(false);
    }
  }

  function handleSaveClick() {
    if (filledRows.length === 0) return;
    if (filledRows.length === 1) {
      setShowSingleModal(true);
      return;
    }
    doSave(filledRows);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Pořadí zápasu — {gameType.name}</h3>
        <button type="button" onClick={useLastLineup} className="text-sm text-purple-700">
          Stejná sestava jako minule
        </button>
      </div>

      {lineupWarning && <p className="text-xs text-amber-600">{lineupWarning}</p>}

      <div className="flex flex-col gap-2">
        {rows.map((row, idx) => (
          <div key={row.key} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm text-gray-400 font-mono">
              {row.playerId ? computeEntries(filledRows).find((e) => e.playerId === row.playerId)?.rank ?? '' : ''}
            </span>
            <div className="flex-1">
              <PlayerSearchSelect
                players={activePlayers}
                value={row.playerId}
                onChange={(id) => updateRow(row.key, { playerId: id })}
                excludeIds={rows.filter((r) => r.key !== row.key).map((r) => r.playerId).filter(Boolean)}
                onCreateRegular={(name) => handleCreate(name, false).then((p) => p && updateRow(row.key, { playerId: p.id }))}
                onCreateGuest={(name) => handleCreate(name, true).then((p) => p && updateRow(row.key, { playerId: p.id }))}
              />
            </div>
            {idx > 0 && (
              <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={row.tieWithPrevious}
                  onChange={(e) => updateRow(row.key, { tieWithPrevious: e.target.checked })}
                />
                remíza
              </label>
            )}
            <button type="button" onClick={() => moveRow(idx, -1)} disabled={idx === 0} className="text-gray-400 disabled:opacity-20">
              ↑
            </button>
            <button type="button" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1} className="text-gray-400 disabled:opacity-20">
              ↓
            </button>
            <button type="button" onClick={() => removeRow(row.key)} className="text-red-400">
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="self-start text-sm text-purple-700">
        + Přidat hráče
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={filledRows.length === 0 || saving}
        onClick={handleSaveClick}
        className="bg-purple-600 text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        {saving ? 'Ukládám…' : 'Uložit zápas'}
      </button>

      <ConfirmModal
        open={showSingleModal}
        title="Zadáváte zápas jen s jedním hráčem"
        message="Pokud jde o trénink, přepněte na mód Trénink pro sledování osobních statistik."
        actions={[
          ...(onSwitchToTraining
            ? [
                {
                  label: 'Přepnout na Trénink',
                  variant: 'primary',
                  onClick: () => {
                    setShowSingleModal(false);
                    onSwitchToTraining();
                  },
                },
              ]
            : []),
          {
            label: 'Uložit i tak',
            variant: 'neutral',
            onClick: () => {
              setShowSingleModal(false);
              doSave(filledRows);
            },
          },
          { label: 'Zrušit', variant: 'neutral', onClick: () => setShowSingleModal(false) },
        ]}
      />

      <ConfirmModal
        open={!!pending}
        title="Podobný hráč už existuje"
        message={pending ? `Podobný hráč už existuje: ${pending.similarPlayer.name}. Opravdu chcete založit nového, nebo jste chtěli vybrat existujícího?` : ''}
        actions={[
          { label: 'Vybrat existujícího', variant: 'primary', onClick: confirmUseExisting },
          { label: 'Založit i tak', variant: 'neutral', onClick: confirmCreateAnyway },
          { label: 'Zrušit', variant: 'neutral', onClick: cancel },
        ]}
      />
    </div>
  );
}
