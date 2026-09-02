# Sacks in the City

Vercel/GitHub-ready fantasy football dynasty dashboard using live Sleeper data.

## League
Sleeper league ID: `1312156686517030912`

## Deploy
1. Upload the contents of this folder to the root of your GitHub repository.
2. Push to `main`.
3. Import/connect that GitHub repository in Vercel.
4. No environment variables are required for the read-only Sleeper API proxy.

## Live data
The app calls Sleeper through `/api/sleeper/*` and refreshes the dashboard every 60 seconds.

Included:
- Sacks in the City branding/theme
- Live league status and managers
- Weekly matchups
- Latest 10 transactions
- Standings
- Managers
- Rivalries
- Playoff race
- Draft picks grouped by year/round
- Weekly team + individual award framework
- Rules/settings
- Post-draft grade framework
- Manager selector so each manager can view the site as their team

Note: Sleeper's public API does not expose a complete historical individual fantasy-stat feed in the same simple endpoint used for league data, so the individual award cards are designed to populate when the required player scoring data is available.
