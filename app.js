const LEAGUE_ID = "1312156686517030912";
const MY_USERNAME = "CopsAndRodgers12";
const API = "https://api.sleeper.app/v1";

let state = {league:null, users:[], rosters:[], tradedPicks:[], players:null, matchups:[]};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const initials = s => String(s||"?").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
const money = n => n == null ? "—" : Number(n).toLocaleString();

async function get(path){
  const r = await fetch(`${API}${path}`, {cache:"no-store"});
  if(!r.ok) throw new Error(`Sleeper API returned ${r.status}`);
  return r.json();
}
async function load(){
  $("loading").classList.remove("hidden"); $("dashboard").classList.add("hidden"); $("error").classList.add("hidden");
  try{
    state.league = await get(`/league/${LEAGUE_ID}`);
    state.users = await get(`/league/${LEAGUE_ID}/users`);
    state.rosters = await get(`/league/${LEAGUE_ID}/rosters`);
    state.tradedPicks = await get(`/league/${LEAGUE_ID}/traded_picks`);
    try { state.matchups = await get(`/league/${LEAGUE_ID}/matchups/${state.league.settings?.leg || 1}`); } catch {}
    state.players = await get(`/players/nfl`);
    render();
    $("loading").classList.add("hidden"); $("dashboard").classList.remove("hidden");
  }catch(e){
    $("loading").classList.add("hidden"); $("error").classList.remove("hidden");
    $("errorText").textContent = `${e.message}. If GitHub Pages blocks the request, use a small serverless proxy; the app is already structured so one can be added without changing the dashboard.`;
  }
}
function userForRoster(r){ return state.users.find(u=>u.user_id===r.owner_id) || {}; }
function myRoster(){
  const u = state.users.find(u => (u.display_name||"").toLowerCase()===MY_USERNAME.toLowerCase() || (u.username||"").toLowerCase()===MY_USERNAME.toLowerCase());
  return state.rosters.find(r=>r.owner_id===u?.user_id);
}
function playerName(id){
  const p=state.players?.[id];
  return p ? `${p.first_name||""} ${p.last_name||""}`.trim() : `Player ${id}`;
}
function playerInfo(id){ return state.players?.[id] || {}; }
function rosterValue(r){
  if(!r) return 0;
  let v=0;
  (r.players||[]).forEach(id=>{
    const p=playerInfo(id), pos=p.position;
    const age=Number(p.age)||26;
    const base={QB:75,RB:55,WR:72,TE:50,K:10,DEF:10}[pos]||20;
    const youth=Math.max(0,31-age)*2;
    v += base+youth;
  });
  return Math.round(v);
}
function pickValue(p){
  const y=Number(p.season)||2026, r=Number(p.round)||4;
  const years=Math.max(0,y-2026);
  return Math.max(1, (4.5-r)*2.2 - years*.45);
}
function draftCapital(r){
  const own = (state.tradedPicks||[]).filter(p=>p.owner_id===r?.owner_id);
  return (r?.settings?.wins||0) + own.reduce((a,p)=>a+pickValue(p),0);
}
function render(){
  $("leagueName").textContent=state.league.name || "Dynasty League";
  const s=state.league.settings||{};
  $("leagueMeta").textContent=`${state.league.total_rosters||state.rosters.length} teams · ${state.league.status||"active"} · ${state.league.scoring_settings?.rec_te? "PPR": "Custom scoring"}`;
  const mine=myRoster(), me=userForRoster(mine||{});
  $("myTeam").textContent=me.display_name || MY_USERNAME;
  $("myRecord").textContent=`${mine?.settings?.wins||0}-${mine?.settings?.losses||0}${mine?.settings?.ties?`-${mine.settings.ties}`:""}`;
  const ranked=[...state.rosters].sort((a,b)=>rosterValue(b)-rosterValue(a));
  const rank=mine ? ranked.findIndex(r=>r.roster_id===mine.roster_id)+1 : null;
  $("myRank").textContent=rank?`#${rank}`:"—";
  $("myValue").textContent=mine?money(rosterValue(mine)):"—";
  $("myCapital").textContent=mine?draftCapital(mine).toFixed(1):"—";
  renderRankings(ranked); renderMyRoster(mine); renderTeams(ranked); renderPicks(mine); renderSettings(); renderAdvice(mine,ranked);
}
function renderRankings(ranked){
  $("rankings").innerHTML=ranked.map((r,i)=>{
    const u=userForRoster(r);
    return `<div class="rank-row"><div class="rank">${i+1}</div><div class="avatar">${initials(u.display_name||u.username)}</div><div class="rank-name"><b>${esc(u.display_name||u.username||"Manager")}</b><small>${r.settings?.wins||0}-${r.settings?.losses||0} · ${r.players?.length||0} players</small></div><div class="score">${rosterValue(r)}</div></div>`;
  }).join("");
}
function renderMyRoster(r){
  if(!r){$("myRoster").innerHTML=`<p class="error">Couldn't match ${esc(MY_USERNAME)} to a Sleeper manager.</p>`;return;}
  const byPos={QB:[],RB:[],WR:[],TE:[],K:[],DEF:[]};
  (r.players||[]).forEach(id=>{const p=playerInfo(id); (byPos[p.position] ||= []).push(id)});
  const order=["QB","RB","WR","TE","K","DEF"];
  $("myRoster").innerHTML=order.flatMap(pos=>(byPos[pos]||[]).slice(0,8).map(id=>{
    const p=playerInfo(id); return `<div class="player-row"><div class="player-pos">${esc(pos)}</div><div class="rank-name"><b>${esc(playerName(id))}</b><small>${p.team||"FA"}${p.age?` · age ${p.age}`:""}</small></div></div>`;
  })).join("") || `<p class="muted">No players returned.</p>`;
}
function renderTeams(ranked){
  $("teamCount").textContent=`${ranked.length} managers`;
  $("teamsList").innerHTML=ranked.map((r,i)=>{
    const u=userForRoster(r);
    return `<div class="team-card"><div class="team-top"><div class="avatar">${initials(u.display_name||u.username)}</div><div><h4>${esc(u.display_name||u.username||"Manager")}</h4><p>@${esc(u.username||"")}</p></div></div><div class="team-score"><span>Power #${i+1}</span><b>${rosterValue(r)}</b></div></div>`;
  }).join("");
}
function renderPicks(mine){
  const picks=state.tradedPicks||[];
  if(!picks.length){$("picksList").innerHTML=`<p class="muted">Sleeper returned no traded future picks.</p>`;return;}
  const rows=picks.map(p=>{
    const owner=state.rosters.find(r=>r.roster_id===p.owner_id), u=userForRoster(owner||{});
    const orig=state.rosters.find(r=>r.roster_id===p.roster_id), ou=userForRoster(orig||{});
    return `<div class="pick-row"><div class="rank-name"><b>${esc(p.season)} Round ${esc(p.round)}</b><small>Current: ${esc(u.display_name||"Unknown")} · Originally: ${esc(ou.display_name||"Unknown")}</small></div><div class="score">${pickValue(p).toFixed(1)}</div></div>`;
  });
  $("picksList").innerHTML=rows.join("");
}
function renderSettings(){
  const s=state.league.settings||{}, roster=state.league.roster_positions||[];
  const items=[
    ["League type", state.league.settings?.type===2?"Dynasty":"Dynasty / keeper"],
    ["Teams", state.league.total_rosters||state.rosters.length],
    ["Waivers", state.league.settings?.waiver_type===2?"FAAB":"Standard"],
    ["FAAB budget", state.league.settings?.waiver_budget ?? 1000],
    ["Trade deadline", state.league.settings?.trade_deadline || "Week 12"],
    ["IR slots", state.league.settings?.reserve_slots ?? "—"],
    ["Roster spots", roster.length || "—"],
    ["Status", state.league.status || "—"]
  ];
  $("settingsGrid").innerHTML=items.map(x=>`<div class="setting"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
}
function renderAdvice(mine,ranked){
  if(!mine){$("draftAdvice").innerHTML=`<div class="advice-card"><b>Connect your team</b><p>Set MY_USERNAME in app.js to your exact Sleeper username.</p></div>`;return;}
  const counts={QB:0,RB:0,WR:0,TE:0};
  (mine.players||[]).forEach(id=>{const pos=playerInfo(id).position;if(counts[pos]!=null)counts[pos]++});
  const needs=Object.entries(counts).sort((a,b)=>a[1]-b[1]);
  const first=needs[0][0], second=needs[1][0];
  const pickRounds=(state.tradedPicks||[]).filter(p=>p.owner_id===mine.owner_id).map(p=>`${p.season} R${p.round}`);
  $("draftAdvice").innerHTML=`
    <div class="advice-card"><b>Priority #1: ${first}</b><p>You have ${counts[first]} ${first}s on the current roster. Until player-level projections are added, the dashboard flags ${first} as your thinnest position.</p></div>
    <div class="advice-card"><b>Priority #2: ${second}</b><p>You have ${counts[second]} ${second}s. Use the highest-value player available rather than forcing a position if the board gives you a clear tier drop.</p></div>
    <div class="advice-card"><b>Draft capital detected</b><p>${pickRounds.length?esc(pickRounds.join(" · ")):"No traded picks returned; your owned picks remain visible through Sleeper's draft endpoint when available."}</p></div>`;
}

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));
  $(btn.dataset.tab).classList.remove("hidden");
}));
$("refreshBtn").onclick=load; $("retryBtn").onclick=load;
load();