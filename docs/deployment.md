# Nasazení na GitHub Pages

Rychlé kroky jsou v [`README.md`](../README.md), sekce 3. Tady je vysvětlení
mechaniky za tím, pro případ, že se něco pokazí nebo bude potřeba upravit.

## Jak to funguje

`.github/workflows/deploy.yml` se spouští při každém push do `main`
(a ručně přes `workflow_dispatch`). Kroky:

1. `npm ci` — instalace ze zamčeného `package-lock.json`.
2. `npm test` — pokud selžou Vitest testy Elo kalkulačky/statistik,
   **nasazení se zastaví tady** a rozbitá appka se nedostane do produkce.
3. `npm run build` s Firebase konfigurací a PINem z **GitHub Secrets**
   (ne z `.env` — ten je jen pro lokální vývoj a není v gitu).
4. `cp dist/index.html dist/404.html` — SPA fallback (viz níže, proč).
5. `actions/upload-pages-artifact` + `actions/deploy-pages` — oficiální
   GitHub Pages Actions, žádný `gh-pages` branch ani token navíc.

## `base` path a proč je to všude potřeba

GitHub Pages servíruje statický web z `https://USERNAME.github.io/NAZEV_REPA/`
— appka tedy neběží na kořeni domény, ale v podsložce. To se musí promítnout
na třech místech, jinak se buď nenačtou assety, nebo nefunguje routing:

- **`vite.config.js`**: `base: process.env.VITE_BASE_PATH || '/dartstats/'`
  — ovlivňuje, s jakou cestou se generují odkazy na JS/CSS bundly v buildu.
- **`main.jsx`**: `<BrowserRouter basename={import.meta.env.BASE_URL}>` —
  Vite automaticky naplní `BASE_URL` hodnotou z `base` výše, není potřeba to
  duplikovat ručně. Díky tomu React Router ví, že `/history` ve skutečnosti
  znamená `/dartstats/history`.
- **`.github/workflows/deploy.yml`**: `VITE_BASE_PATH: /dartstats/` v env
  buildovacího kroku.

**Pokud se repozitář nejmenuje `dartstats`**, uprav tenhle řádek ve workflow
souboru na `/NÁZEV_REPOZITÁŘE/`. Lokální `npm run dev` na tohle nastavení
nereaguje (Vite dev server `base` pro lokální servírování ignoruje), takže
se to neprojeví, dokud neuděláš produkční build.

## SPA fallback (`404.html`)

GitHub Pages neumí server-side rewrite pro SPA routing — obnovení stránky na
`/dartstats/history` by bez tohohle kroku vrátilo `404`. Trik: zkopírovat
`index.html` jako `404.html` do buildu. GitHub Pages při neznámé cestě
servíruje `404.html`, což se u SPA chová jako fallback na `index.html` —
prohlížeč dostane appku, ta se nastartuje a React Router si podle URL sám
zobrazí správnou routu.

Tenhle krok je záměrně přímo ve workflow (`cp dist/index.html dist/404.html`),
ne skrytý v `npm run build` jako `postbuild` skript — ať je vidět v CI logu
a není potřeba prohledávat `package.json`, aby ses dozvěděl, že se něco děje.

## Ruční kroky (nejdou automatizovat)

1. **Settings → Pages → Build and deployment → Source** → `GitHub Actions`.
2. **Settings → Secrets and variables → Actions** — secrets musí přesně
   odpovídat proměnným použitým ve workflow (`VITE_APP_PIN`,
   `VITE_FIREBASE_*`, volitelně `VITE_EMAILJS_*`).
3. **Firebase → Authentication → Settings → Authorized domains** → přidat
   `USERNAME.github.io`. Bez tohohle kroku přihlašování (anonymní i admin)
   z nasazené appky spadne na doménovou/CORS chybu, i když lokálně vše
   funguje — Firebase Auth kontroluje, ze které domény request přichází.
