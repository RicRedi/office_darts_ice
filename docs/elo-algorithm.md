# Elo algoritmus

Celá implementace je v [`src/hooks/useEloCalculator.js`](../src/hooks/useEloCalculator.js)
jako čisté funkce (žádné volání Firebase uvnitř) — unit testy v
`useEloCalculator.test.js`.

## `calculateMultiplayerElo(players)`

```js
calculateMultiplayerElo(players: [{ id, elo, gamesPlayed, isGuest, rank }])
  => [{ id, eloChange }]
```

Párový (pairwise) výpočet: každý hráč se porovná se všemi ostatními v zápase,
změna Elo je průměr přes `N-1` soupeřů.

- **Očekávaný výsledek** mezi dvěma hráči: standardní Elo vzorec
  `1 / (1 + 10^((eloB - eloA) / 400))`.
- **Skutečný výsledek** mezi dvěma hráči: `1` pokud má hráč lepší (nižší)
  `rank`, `0` pokud horší, `0.5` při shodném ranku (remíza).
- **K-faktor** (`getKFactor`): `40` pokud hráč odehrál < 10 zápasů, jinak
  `32`. Počítá se **zvlášť pro každého hráče** podle jeho vlastního
  `gamesPlayed` — v jednom zápase může mít nováček K=40 a veterán K=32.
- **Guest koeficient**: pokud je hráč `isGuest: true`, jeho **vlastní**
  výsledná změna se vynásobí `0.3` (méně volatilní Elo pro hráče bez
  dlouhodobé historie). Změny ostatních hráčů v zápase se počítají normálně
  — koeficient tlumí jen hostovu vlastní změnu, ne dopad na soupeře.
- **N=1** (zápis zápasu jen s jedním hráčem, viz `RankOnlyForm.jsx` a
  potvrzovací modál "Uložit i tak"): `eloChange` je `0`, žádné dělení nulou.
- Výsledek je vždy zaokrouhlený na celé číslo (`Math.round`).

## `recalculateAllElo(players, matches)`

```js
recalculateAllElo(players, matches) => { updatedPlayers, updatedMatches }
```

Kompletní přepočet od nuly, ne kaskádová oprava:

1. Všichni hráči se v paměti nastaví na `elo: 1000, gamesPlayed: 0, currentWinStreak: 0`.
2. Projedou se všechny **multiplayer** zápasy s `is_invalidated: false`,
   chronologicky podle `timestamp`.
3. Pro každý zápas se zavolá `calculateMultiplayerElo` (stejná funkce jako
   při živém zápisu) a přepíšou se `elo_before`/`elo_change` přímo v datech
   zápasu, ať historie zůstane auditovatelná.
4. Training zápasy se přeskakují úplně — nikdy neovlivňovaly Elo.

**Je to idempotentní** — druhé spuštění na stejných datech dá stejný
výsledek (test na to existuje). Volající (services/komponenta) až poté
provede samotný zápis do Firebase jedním multi-path `update()`.

### Kdy se `recalculateAllElo` spouští

| Situace | Kde v kódu | Poznámka |
|---|---|---|
| Smazání zápasu **do 10 minut** od zápisu | `matchesService.js: deleteRecentMatch` | **Ne** plný přepočet — jen prostý revert (`elo -= elo_change`, `games_played -= 1`) v jedné `runTransaction`. Levnější a pro tohle časové okno dostatečně přesné. |
| Schválení žádosti o smazání staršího zápasu | `matchesService.js: approveDeletionRequest` | Nastaví `is_invalidated: true`, pak plný přepočet. |
| Tvrdé smazání zápasu z rozšířené historie (Admin) | `matchesService.js: hardDeleteMatch` | Zápas se fyzicky odstraní z `/matches`, pak plný přepočet. |
| Ruční tlačítko "Přepočítat Elo" v Adminu | `matchesService.js: manualRecalculateElo` | Bez invalidace čehokoliv — jen pro klid v duši, díky idempotenci neškodí spustit kdykoliv. |

### Známé zjednodušení

Self-service revert (10minutové okno) neřeší situaci, kdy by stejní hráči
odehráli druhý zápas mezi sebou uvnitř téhož okna — jednoduché odečtení
`elo_change` by pak nemuselo být 100% přesné. U kancelářského provozu (jeden
zápas po druhém) je riziko zanedbatelné. Pokud by to vadilo, řešení je
přepnout `deleteRecentMatch` na `recalculateAllElo` i pro tenhle případ —
cena je jen o něco pomalejší mazání, žádná změna datového modelu.

## Trénink a Elo

Trénink (`mode: "training"`) Elo **vůbec neovlivňuje** — `saveTrainingMatch`
v `services/matchesService.js` nejde přes `runTransaction` na `/players`,
jen zapíše zápas a aktualizuje `last_played_timestamp`. `getTrainingStats()`
v `useStats.js` počítá jen z `darts_to_close`, nezávisle na Elo systému.
