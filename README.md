# Dynasty Edge — Tanks and Skanks

A polished mobile-friendly fantasy football dashboard for Sleeper league **1312156686517030912**.

## Public league app

Everyone in the league can use the same GitHub Pages URL. There is no login and no Sleeper password/token stored in the browser. Each manager chooses their team from **View As**; that selection is saved locally on their device.

## Live Sleeper data

The site reads the public Sleeper endpoints for:
- league information and settings
- league managers
- rosters
- traded draft picks
- NFL player metadata
- weekly matchups and scoring

## Weekly scoring

Use **Weekly** → choose Week 1–18. During the regular season, Sleeper matchup points are shown for every matchup plus the selected manager's result.

## GitHub Pages

Upload `index.html`, `style.css`, `app.js`, and `README.md` to the root of the repository and enable GitHub Pages from the `main` branch / root folder.


### Weekly Awards
The Weekly tab now includes league-wide awards calculated from Sleeper scoring: Team of the Week, Blowout Boss, Nail-Biter Winner, Player of the Week, and position awards for QB/RB/WR/TE. Awards update when the selected week's Sleeper matchup/player scoring data is available.
