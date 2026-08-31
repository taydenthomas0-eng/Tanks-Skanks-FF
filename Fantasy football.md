# Sunday Side Piece League Website

GitHub/Vercel-ready static website for the SSPL.

## Upload
Upload every file/folder in this package to the root of your GitHub repository:
- index.html
- standings.html
- managers.html
- manager.html
- records.html
- sssn.html
- awards.html
- draft-combine.html
- rules.html
- vercel.json
- assets/
- data/

Commit to `main`. Your connected Vercel project should deploy automatically.

## The file you will edit most
`data/site-data.js`

That file contains:
- 2016-2025 champions
- 2024 and 2025 combine results
- SSSN weekly show structure
- weekly award definitions
- year-end award definitions
- news stories
- future award archives
- optional manager notes

Add/edit a story in the `news` array, commit the change in GitHub, and Vercel will publish it.

## Live Sleeper data
League ID: 1373345963090939904

The site uses a Vercel rewrite at `/api/sleeper/*` to request the official Sleeper read-only API. It loads:
- current league
- current standings
- managers
- weekly matchups for the top ticker
- current NFL week
- linked historical Sleeper leagues
- historical drafts and draft picks
- scoring and roster settings

The Record Book only calculates seasons that Sleeper links through `previous_league_id`. Your complete 2016-2025 championship history is stored manually regardless of Sleeper availability.

## Main pages
Home
Standings
Managers / Manager Profiles
Record Book
SSSN
Awards
Draft + Combine
Rules
