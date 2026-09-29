# Tredzi — split version

## How to use
1. Copy the `src/` folder into your Vite project (replace your old single file).
2. Make sure `index.html` loads `/src/main.jsx` (see the included one) and `vite.config.js` uses `@vitejs/plugin-react`.
3. `npm i` (needs: react, react-dom, recharts, lucide-react) then `npm run dev`.

## Layout
- `main.jsx` – entry, mounts the app (was the self-mount block at the bottom of the old file)
- `App.jsx` – the shell: all state/effects/handlers, login + onboarding gate, nav, layout
- `tabs/` – one file per tab (Risk/Challenge, PropFirm, Convert, Curve, Insights, Journal, Notepad, Sessions, Community). Each is lazy-loaded.
- `components/` – shared UI (`ui.jsx`) and onboarding pieces
- `lib/` – theme, formatting, constants, analytics/computations, notes, playbook, sessions, calendar, images, share card
- `data/` – prop-firm data, currencies, onboarding/tour content
- `api/community.js` – `communityApi` + community storage keys
- `setup/storageShim.js` – the `window.storage` localStorage shim
- `animations.css` – the new subtle motion layer

## What changed in behavior
Nothing on purpose. State still lives in `App.jsx` and is passed to each tab as props, so switching tabs keeps drafts, open chats, etc. exactly like before.
New: tabs load on demand (and are pre-warmed when the browser is idle), tab content fades up in sequence, buttons brighten on mouse hover, and everything respects "reduce motion".

## Next steps (optional, do gradually)
Move state that only one tab uses out of `App.jsx` into that tab file. Do it one tab at a time and test each, because tab-local state resets when you leave the tab.

## Putting it on GitHub (no-bundler repo -> Vite repo)
1. Unzip. In your repo, upload everything from the zip (package.json, vite.config.js, index.html, src/, public/, .github/, .gitignore). Replace old index.html.
2. Move icon.png, manifest.json, sw.js into public/.
3. Delete the old TredziApp.jsx from the repo root (the code now lives in src/).
4. Copy your old index.html's manifest / icon / theme-color / service-worker lines into the new index.html <head>.
5. Repo Settings > Pages > Source: choose "GitHub Actions".
6. Commit to main. The Actions tab builds and publishes automatically.
