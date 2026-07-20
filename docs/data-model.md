# Datový model (Firebase Realtime Database)

Zdroj pravdy pro rozhodnutí za jednotlivými poli je
[`implementation_plan.md`](../implementation_plan.md), sekce 3. Tady je
aktuální stav schématu tak, jak ho appka skutečně čte a zapisuje.

## `/players/{id}`

```json
{
  "name": "Richard Ředina",
  "is_guest": false,
  "is_archived": false,
  "elo": 1000,
  "games_played": 0,
  "current_win_streak": 0,
  "last_played_timestamp": null,
  "created_at": 1784549083539
}
```

- `elo` — jedno globální číslo napříč všemi typy her (vědomé rozhodnutí, ne
  přehlédnutí — viz commit/diskuze k v1 scope, pokud budete chtít Elo
  per typ hry, je to změna datového modelu i `useEloCalculator.js`).
- `is_archived` — hráč zmizí z leaderboardu a našeptávačů, ale zůstává
  dohledatelný přes historii/profil. Žádné tvrdé mazání hráčů (viz
  `services/playersService.js: setPlayerArchived`).
- `last_played_timestamp` — aktualizuje se u multiplayer **i** training
  zápasu, používá se pro rozdělení leaderboardu na aktivní/neaktivní
  (`components/Dashboard/Leaderboard.jsx`, okno 30 dní).
- Odznáčky (bronz/stříbro/zlato) a avatar se **nikde neukládají** — počítají
  se za běhu (`utils/badges.js`, `utils/identicon.js`).

## `/game_types/{id}`

```json
{ "name": "501", "category": "X01", "supports_training": true }
```

`supports_training` řídí, jestli se v `GameForm` nabídne přepínač Zápas/Trénink
(`components/GameForm/index.jsx`). `category` je jen informativní.

## `/matches/{id}`

Dvě podoby podle `mode`:

**`mode: "multiplayer"`**
```json
{
  "timestamp": 1784549083539,
  "editable_until": 1784549683539,
  "game_type_id": "gt_501",
  "mode": "multiplayer",
  "is_invalidated": false,
  "results": [
    { "player_id": "player_uid_001", "rank": 1, "elo_before": 1015, "elo_change": 12 }
  ]
}
```

**`mode: "training"`**
```json
{
  "timestamp": 1784549083539,
  "editable_until": 1784549683539,
  "game_type_id": "gt_501",
  "mode": "training",
  "is_invalidated": false,
  "results": [{ "player_id": "player_uid_001", "darts_to_close": 27 }]
}
```

- `editable_until = timestamp + 600000` (10 minut), počítá se na klientovi
  při zápisu (`services/matchesService.js`) a řídí self-service
  editaci/mazání i Security Rules (viz [`firebase-setup.md`](firebase-setup.md)).
- `is_invalidated` — nastaví admin při schválení žádosti o smazání staršího
  zápasu; zápas zůstává v DB pro auditovatelnost, jen se přestane počítat do
  Elo/statistik. Training zápasy se místo toho mažou natvrdo (nikdy
  neovlivňovaly Elo).
- `results[].rank` — nižší číslo = lepší umístění, shodná hodnota = remíza.
  Není nutně 1..N bez mezer (viz `RankOnlyForm.jsx` — remízy vytvoří mezery,
  Elo algoritmu to nevadí, počítá jen `<`/`>`/`==`).

## `/deletion_requests/{id}`

```json
{ "match_id": "match_uid_999", "requested_at": 1784549083539, "status": "pending" }
```

`status`: `pending` → `approved`/`rejected` (viz
`components/Admin/DeletionRequestsManagement.jsx`).

## `/admins/{firebase_auth_uid}`

```json
{ "hewFd0WFoHSzeF0fpFzNAzQ1PfH2": true }
```

Klíč je **Firebase Auth UID** admina (z Authentication → Users), ne ID hráče
v `/players`. Appka do tohohle uzlu nikdy nezapisuje (`.write: false` v
Security Rules) — přidává se ručně v konzoli, viz
[`firebase-setup.md`](firebase-setup.md).

## `/app_meta`

```json
{ "last_seed_version": 1 }
```

Zabraňuje `scripts/seed.js` znovu založit stejné hráče při opětovném spuštění.
