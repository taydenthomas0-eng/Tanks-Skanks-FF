const LEAGUE_ID = "1312156686517030912";
const API = "https://api.sleeper.app/v1";
const CURRENT_SEASON = 2026;
const MAX_WEEK = 18;

let state = { league:null, users:[], rosters:[], tradedPicks:[], players:null, matchups:[], selectedWeek:1, selectedRosterId:null };

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const initials = s => String(s||"?").split(/\s+/).map(x => x[0]).join("").slice(0,2).toUpperCase();
const money = n => n == null ? "—" : Number(n).toLocaleString();
const fmt = n => Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

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
    state.players = await get(`/players/nfl`);
    state.selectedRosterId = Number(localStorage.getItem(`de-roster-${LEAGUE_ID}`)) || state.rosters[0]?.roster_id || null;
    state.selectedWeek = Number(localStorage.getItem(`de-week-${LEAGUE_ID}`)) || 1;
    await loadWeek(state.selectedWeek);
    render();
    $("loading").classList.add("hidden"); $("dashboard").classList.remove("hidden");
  }catch(e){
    $("loading").classList.add("hidden"); $("error").classList.remove("hidden");
    $("errorText").textContent = `${e.message}. Check that the league is active and the Sleeper API is reachable.`;
  }
}

async function loadWeek(week){
  state.selectedWeek = Math.min(MAX_WEEK, Math.max(1, Number(week)||1));
  localStorage.setItem(`de-week-${LEAGUE_ID}`, state.selectedWeek);
  try { state.matchups = await get(`/league/${LEAGUE_ID}/matchups/${state.selectedWeek}`); }
  catch { state.matchups = []; }
  if($("weekSelect")) $("weekSelect").value = String(state.selectedWeek);
  renderWeekly();
}

function userForRoster(r){ return state.users.find(u=>u.user_id===r?.owner_id) || {}; }
function rosterForUserId(uid){ return state.rosters.find(r=>r.owner_id===uid); }
function selectedRoster(){ return state.rosters.find(r=>r.roster_id===Number(state.selectedRosterId)) || state.rosters[0]; }
function playerInfo(id){ return state.players?.[id] || {}; }
function playerName(id){ const p=playerInfo(id); return p ? `${p.first_name||""} ${p.last_name||""}`.trim() || `Player ${id}` : `Player ${id}`; }

function rosterValue(r){
  if(!r) return 0;
  let v=0;
  (r.players||[]).forEach(id=>{
    const p=playerInfo(id), pos=p.position, age=Number(p.age)||26;
    const base={QB:75,RB:55,WR:72,TE:50,K:10,DEF:10}[pos]||20;
    v += base + Math.max(0,31-age)*2;
  });
  return Math.round(v);
}
function pickValue(p){
  const y=Number(p.season)||CURRENT_SEASON, r=Number(p.round)||4, years=Math.max(0,y-CURRENT_SEASON);
  return Math.max(1,(4.5-r)*2.2-years*.45);
}
function draftCapital(r){
  const own=(state.tradedPicks||[]).filter(p=>p.owner_id===r?.owner_id);
  return own.reduce((a,p)=>a+pickValue(p),0);
}
function teamName(r){ const u=userForRoster(r); return u.display_name || u.username || `Team ${r?.roster_id ?? ""}`; }
function matchupForRoster(rosterId){ return state.matchups.find(m=>Number(m.roster_id)===Number(rosterId)); }
function matchupOpponent(rosterId){
  const mine=matchupForRoster(rosterId); if(!mine || mine.matchup_id==null) return null;
  return state.matchups.find(m=>m.matchup_id===mine.matchup_id && Number(m.roster_id)!==Number(rosterId));
}

function render(){
  $("leagueName").textContent=state.league.name || "Dynasty League";
  $("leagueMeta").textContent=`${state.league.total_rosters||state.rosters.length} teams · ${state.league.status||"active"} · Sleeper live data`;
  populateTeamSelect();
  renderSelectedTeam();
  const ranked=[...state.rosters].sort((a,b)=>rosterValue(b)-rosterValue(a));
  renderRankings(ranked); renderTeams(ranked); renderPicks(); renderSettings(); renderWeekly();
}

function populateTeamSelect(){
  const select=$("teamSelect");
  select.innerHTML=state.rosters.map(r=>`<option value="${r.roster_id}">${esc(teamName(r))}</option>`).join("");
  select.value=String(state.selectedRosterId);
}

function renderSelectedTeam(){
  const mine=selectedRoster();
  if(!mine) return;
  state.selectedRosterId=mine.roster_id;
  localStorage.setItem(`de-roster-${LEAGUE_ID}`,mine.roster_id);
  const me=userForRoster(mine);
  $("myTeam").textContent=teamName(mine);
  $("myRecord").textContent=`${mine.settings?.wins||0}-${mine.settings?.losses||0}${mine.settings?.ties?`-${mine.settings.ties}`:""}`;
  const ranked=[...state.rosters].sort((a,b)=>rosterValue(b)-rosterValue(a));
  const rank=ranked.findIndex(r=>r.roster_id===mine.roster_id)+1;
  $("myRank").textContent=rank?`#${rank}`:"—";
  $("myValue").textContent=money(rosterValue(mine));
  $("myCapital").textContent=draftCapital(mine).toFixed(1);
  $("managerHandle").textContent=me.username ? `@${me.username}` : "";
  renderMyRoster(mine); renderAdvice(mine);
}

function renderRankings(ranked){
  $("rankings").innerHTML=ranked.map((r,i)=>{
    const u=userForRoster(r);
    return `<div class="rank-row"><div class="rank">${i+1}</div><div class="avatar">${initials(teamName(r))}</div><div class="rank-name"><b>${esc(teamName(r))}</b><small>${r.settings?.wins||0}-${r.settings?.losses||0} · ${r.players?.length||0} players</small></div><div class="score">${rosterValue(r)}</div></div>`;
  }).join("");
}

function renderMyRoster(r){
  const byPos={QB:[],RB:[],WR:[],TE:[],K:[],DEF:[]};
  (r.players||[]).forEach(id=>{const p=playerInfo(id); (byPos[p.position] ||= []).push(id);});
  const order=["QB","RB","WR","TE","K","DEF"];
  $("myRoster").innerHTML=order.flatMap(pos=>(byPos[pos]||[]).slice(0,8).map(id=>{
    const p=playerInfo(id); return `<div class="player-row"><div class="player-pos">${esc(pos)}</div><div class="rank-name"><b>${esc(playerName(id))}</b><small>${p.team||"FA"}${p.age?` · age ${p.age}`:""}</small></div></div>`;
  })).join("") || `<p class="muted">No players returned.</p>`;
}

function renderTeams(ranked){
  $("teamCount").textContent=`${ranked.length} managers`;
  $("teamsList").innerHTML=ranked.map((r,i)=>{
    const u=userForRoster(r);
    const selected=Number(r.roster_id)===Number(state.selectedRosterId);
    return `<button class="team-card ${selected?"selected":""}" data-roster="${r.roster_id}"><div class="team-top"><div class="avatar">${initials(teamName(r))}</div><div><h4>${esc(teamName(r))}</h4><p>@${esc(u.username||"")}</p></div></div><div class="team-score"><span>Power #${i+1}</span><b>${rosterValue(r)}</b></div></button>`;
  }).join("");
  document.querySelectorAll("[data-roster]").forEach(b=>b.addEventListener("click",()=>selectTeam(Number(b.dataset.roster))));
}

function renderPicks(){
  const picks=state.tradedPicks||[];
  if(!picks.length){$("picksList").innerHTML=`<p class="muted">No traded future picks have been returned by Sleeper.</p>`;return;}
  $("picksList").innerHTML=picks.map(p=>{
    const owner=state.rosters.find(r=>r.roster_id===p.owner_id), u=userForRoster(owner||{});
    const orig=state.rosters.find(r=>r.roster_id===p.roster_id), ou=userForRoster(orig||{});
    return `<div class="pick-row"><div class="rank-name"><b>${esc(p.season)} Round ${esc(p.round)}</b><small>Current: ${esc(u.display_name||u.username||"Unknown")} · Originally: ${esc(ou.display_name||ou.username||"Unknown")}</small></div><div class="score">${pickValue(p).toFixed(1)}</div></div>`;
  }).join("");
}

function renderSettings(){
  const s=state.league.settings||{}, roster=state.league.roster_positions||[];
  const items=[
    ["League type", "Dynasty"],["Teams", state.league.total_rosters||state.rosters.length],
    ["Waivers", s.waiver_type===2?"FAAB":"Standard"],["FAAB budget", s.waiver_budget ?? 1000],
    ["Trade deadline", s.trade_deadline ?? "Week 12"],["IR slots", s.reserve_slots ?? "—"],
    ["Roster spots", roster.length || "—"],["Status", state.league.status || "—"]
  ];
  $("settingsGrid").innerHTML=items.map(x=>`<div class="setting"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("");
}

function renderAdvice(mine){
  if(!mine) return;
  const counts={QB:0,RB:0,WR:0,TE:0};
  (mine.players||[]).forEach(id=>{const pos=playerInfo(id).position;if(counts[pos]!=null)counts[pos]++;});
  const needs=Object.entries(counts).sort((a,b)=>a[1]-b[1]);
  const picks=(state.tradedPicks||[]).filter(p=>p.owner_id===mine.owner_id).map(p=>`${p.season} R${p.round}`);
  $("draftAdvice").innerHTML=`<div class="advice-card"><b>Thin spot: ${needs[0][0]}</b><p>You currently have ${counts[needs[0][0]]} ${needs[0][0]} players. Use tiers rather than forcing a position.</p></div><div class="advice-card"><b>Next thin spot: ${needs[1][0]}</b><p>${counts[needs[1][0]]} ${needs[1][0]} players on the roster.</p></div><div class="advice-card"><b>Future picks</b><p>${picks.length?esc(picks.join(" · ")):"No traded picks currently shown."}</p></div>`;
}

function renderWeekly(){
  if(!$("matchupsList")) return;
  $("weekLabel").textContent=`Week ${state.selectedWeek}`;
  const mine=selectedRoster();
  const myMatch=matchupForRoster(mine?.roster_id);
  const myOpp=matchupOpponent(mine?.roster_id);
  if(!state.matchups.length){
    $("matchupSummary").innerHTML=`<div class="empty"><b>No matchup data yet.</b><span>Sleeper has not returned Week ${state.selectedWeek} scoring for this league. During the regular season this section will show live points and results.</span></div>`;
    $("weeklyAwards").innerHTML="";
    $("matchupsList").innerHTML="";
    return;
  }
  if(myMatch){
    const myPts=Number(myMatch.points||0), oppPts=Number(myOpp?.points||0);
    const result=myOpp?(myPts>oppPts?"WIN":myPts<oppPts?"LOSS":"TIE"):"BYE";
    $("matchupSummary").innerHTML=`<div class="matchup-hero"><div><span>Your matchup</span><h3>${esc(teamName(mine))} <strong>${fmt(myPts)}</strong></h3><p>${myOpp?`vs ${esc(teamName(state.rosters.find(r=>r.roster_id===myOpp.roster_id)))} · ${fmt(oppPts)}`:"Bye"}</p></div><b class="result">${result}</b></div>`;
  } else $("matchupSummary").innerHTML=`<div class="empty">No matchup assigned for your selected team in Week ${state.selectedWeek}.</div>`;

  renderWeeklyAwards();
  const seen=new Set(); const games=[];
  state.matchups.forEach(m=>{
    if(seen.has(m.matchup_id)) return;
    seen.add(m.matchup_id);
    const a=m, b=state.matchups.find(x=>x.matchup_id===m.matchup_id && Number(x.roster_id)!==Number(m.roster_id));
    if(!b){ games.push(gameCard(a,null)); return; }
    games.push(gameCard(a,b));
  });
  $("matchupsList").innerHTML=games.join("");
}

function renderWeeklyAwards(){
  const box=$("weeklyAwards");
  if(!box) return;
  const games=[]; const seen=new Set();
  state.matchups.forEach(m=>{
    if(m.matchup_id==null || seen.has(m.matchup_id)) return;
    seen.add(m.matchup_id);
    const b=state.matchups.find(x=>x.matchup_id===m.matchup_id && Number(x.roster_id)!==Number(m.roster_id));
    if(b) games.push({a:m,b,ar:state.rosters.find(r=>r.roster_id===m.roster_id),br:state.rosters.find(r=>r.roster_id===b.roster_id)});
  });
  const validGames=games.filter(g=>g.ar&&g.br);
  if(!validGames.length){
    box.innerHTML=`<div class="empty"><b>Weekly awards will appear here.</b><span>Awards are calculated from Sleeper's matchup and player scoring data once games are underway.</span></div>`;
    return;
  }

  const teams=[];
  validGames.forEach(g=>{
    const ap=Number(g.a.points||0), bp=Number(g.b.points||0);
    teams.push({roster:g.ar,points:ap,opponent:g.br,oppPoints:bp,margin:Math.abs(ap-bp)});
    teams.push({roster:g.br,points:bp,opponent:g.ar,oppPoints:ap,margin:Math.abs(ap-bp)});
  });
  const highest=teams.reduce((x,y)=>!x||y.points>x.points?y:x,null);
  const blowout=teams.reduce((x,y)=>!x||y.margin>x.margin?y:x,null);
  const closest=teams.filter(t=>t.points>t.oppPoints).reduce((x,y)=>!x||y.margin<x.margin?y:x,null);

  const individual=[];
  state.matchups.forEach(m=>{
    const r=state.rosters.find(x=>Number(x.roster_id)===Number(m.roster_id));
    const pp=m.players_points||{};
    Object.entries(pp).forEach(([id,pts])=>{
      const p=playerInfo(id);
      const points=Number(pts);
      if(!Number.isFinite(points)) return;
      individual.push({id,points,player:p,roster:r});
    });
  });
  const best=(filter)=>individual.filter(filter).sort((a,b)=>b.points-a.points)[0];
  const awards=[
    {icon:'🏆',label:'Team of the Week',item:highest,detail:highest?`${teamName(highest.roster)} · ${fmt(highest.points)} points`:null},
    {icon:'💥',label:'Blowout Boss',item:blowout,detail:blowout?`${teamName(blowout.roster)} · won by ${fmt(blowout.margin)}`:null},
    {icon:'⚡',label:'Nail-Biter Winner',item:closest,detail:closest?`${teamName(closest.roster)} · won by ${fmt(closest.margin)}`:null}
  ];
  const posLabels={QB:'QB of the Week',RB:'RB of the Week',WR:'WR of the Week',TE:'TE of the Week'};
  const posIcons={QB:'🎯',RB:'🏃',WR:'🚀',TE:'🧤'};
  const mvp=best(()=>true);
  if(mvp) awards.splice(1,0,{icon:'👑',label:'Player of the Week',item:mvp,detail:`${playerName(mvp.id)} · ${fmt(mvp.points)} points · ${teamName(mvp.roster)}`});
  Object.entries(posLabels).forEach(([pos,label])=>{
    const winner=best(x=>x.player?.position===pos);
    if(winner) awards.push({icon:posIcons[pos],label,item:winner,detail:`${playerName(winner.id)} · ${fmt(winner.points)} points · ${teamName(winner.roster)}`});
  });

  box.innerHTML=`<div class="awards-head"><div><h3>🏅 Week ${state.selectedWeek} Awards</h3><span class="muted">League-wide weekly honors</span></div><span class="award-note">Live from Sleeper</span></div><div class="awards-grid">${awards.map(a=>`<div class="award-card"><div class="award-icon">${a.icon}</div><div><span>${esc(a.label)}</span><b>${esc(a.detail||'—')}</b></div></div>`).join('')}</div>`;
}

function gameCard(a,b){
  const ar=state.rosters.find(r=>r.roster_id===a.roster_id), br=b&&state.rosters.find(r=>r.roster_id===b.roster_id);
  const ap=Number(a.points||0), bp=Number(b?.points||0);
  return `<div class="game-card"><div><b>${esc(teamName(ar))}</b><small>${fmt(ap)} points</small></div><div class="vs">${b?"VS":"BYE"}</div><div class="right"><b>${b?esc(teamName(br)):""}</b><small>${b?fmt(bp)+" points":""}</small></div></div>`;
}

function selectTeam(rosterId){
  state.selectedRosterId=rosterId; localStorage.setItem(`de-roster-${LEAGUE_ID}`,rosterId);
  $("teamSelect").value=String(rosterId); renderSelectedTeam(); renderRankings([...state.rosters].sort((a,b)=>rosterValue(b)-rosterValue(a))); renderTeams([...state.rosters].sort((a,b)=>rosterValue(b)-rosterValue(a))); renderWeekly();
}

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
  document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));
  $(btn.dataset.tab).classList.remove("hidden");
}));

$("teamSelect").addEventListener("change",e=>selectTeam(Number(e.target.value)));
$("weekSelect").addEventListener("change",e=>loadWeek(Number(e.target.value)));
$("refreshBtn").onclick=load; $("retryBtn").onclick=load;
load();
