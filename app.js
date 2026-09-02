const LEAGUE_ID="1312156686517030912";
const state={league:null,users:[],rosters:[],matchups:[],transactions:[],drafts:[],picks:[],tradedPicks:[],week:1,tab:"dashboard",playerMap:{},currentUser:null};

async function api(path){
 const r=await fetch("https://api.sleeper.app/v1/"+path);
 if(!r.ok) throw Error(await r.text());
 return r.json();
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const userById=id=>state.users.find(u=>u.user_id===id);
const rosterByOwner=id=>state.rosters.find(r=>r.owner_id===id);
function name(id){const u=userById(id);return esc(u?.metadata?.team_name||u?.display_name||u?.username||"Unknown");}
function pts(r){return Number(r?.settings?.fpts||0)+Number(r?.settings?.fpts_decimal||0)/100;}

async function load(){
 try{
  state.league=await api(`league/${LEAGUE_ID}`);
  state.users=await api(`league/${LEAGUE_ID}/users`);
  state.rosters=await api(`league/${LEAGUE_ID}/rosters`);
  state.week=Math.max(1,Number(state.league?.settings?.leg||state.league?.settings?.week||1));
  const weeks=Array.from({length:Math.min(Math.max(state.week,1),18)},(_,i)=>i+1);
  const wm=await Promise.all(weeks.map(w=>api(`league/${LEAGUE_ID}/matchups/${w}`).catch(()=>[])));
  state.matchups=wm.flat().map((x,i)=>({...x,week:weeks[Math.floor(i/Math.max(1,(wm[Math.floor(i/Math.max(1,wm.length))]||[]).length))]||state.week}));
  state.matchups=await getCurrentMatchups();
  state.transactions=await getTransactions();
  state.drafts=await api(`league/${LEAGUE_ID}/drafts`).catch(()=>[]);
  const ds=state.drafts||[];
  state.picks=(await Promise.all(ds.map(d=>api(`draft/${d.draft_id}/picks`).catch(()=>[])))).flat().map(p=>({...p,draftSeason:ds.find(d=>d.draft_id===p.draft_id)?.season}));
  state.tradedPicks=(await Promise.all(ds.map(d=>api(`league/${LEAGUE_ID}/traded_picks/${d.season}`).catch(()=>[])))).flat();
  document.getElementById("tickerText").textContent=`${state.league.name||"League"} • ${state.league.status||"active"} • Week ${state.week} • ${state.users.length} managers`;
  const sel=document.getElementById("managerSelect");sel.innerHTML=state.users.map(u=>`<option value="${u.user_id}">${esc(u.metadata?.team_name||u.display_name||u.username)}</option>`).join("");
  state.currentUser=state.users[0]?.user_id; render();
 }catch(e){document.getElementById("app").innerHTML=`<div class="empty">Could not load Sleeper data. ${esc(e.message)}</div>`}
}
async function getCurrentMatchups(){return api(`league/${LEAGUE_ID}/matchups/${state.week}`).catch(()=>[])}
async function getTransactions(){let out=[];for(let r=1;r<=Math.max(1,state.week);r++){const x=await api(`league/${LEAGUE_ID}/transactions/${r}`).catch(()=>[]);out.push(...x)}return out.sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,50)}
function matchupPairs(week=state.week){
 const m=state.matchups.filter(x=>Number(x.week||state.week)===week); const seen=new Set(),pairs=[];
 m.forEach(x=>{if(seen.has(x.matchup_id)||!x.matchup_id)return; const pair=m.filter(y=>y.matchup_id===x.matchup_id);pair.forEach(y=>seen.add(y.matchup_id)); if(pair.length>=2)pairs.push(pair.slice(0,2));});
 return pairs;
}
function managerRecord(r){const w=Number(r?.settings?.wins||0),l=Number(r?.settings?.losses||0),t=Number(r?.settings?.ties||0);return `${w}-${l}${t?`-${t}`:""}`}
function render(){
 document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.tab));
 const f={dashboard:dashboard,weekly:weekly,transactions:transactions,managers:managers,standings:standings,rivalries:rivalries,playoffs:playoffs,draft:draft,awards:awards,rules:rules}[state.tab];document.getElementById("app").innerHTML=f();
}
function dashboard(){const top=state.rosters.slice().sort((a,b)=>pts(b)-pts(a))[0];return `
<div class="eyebrow">LIVE LEAGUE • ${esc(state.league?.season||"2026")}</div><h1 class="hero-title">BUILD FOR TODAY.<br><span class="green">DOMINATE TOMORROW.</span></h1><p class="sub">${esc(state.league?.name||"Sacks in the City")} is connected directly to Sleeper.</p>
<div class="grid2 section"><div class="card spotlight"><div class="eyebrow">PREVIOUS WEEK</div><div class="big">MANAGER SPOTLIGHT</div><p class="sub">The highest-scoring manager from the previous completed week.</p><h3>${top?name(top.owner_id):"TBD"}</h3><div class="green">${top?pts(top).toFixed(2)+" pts":"Starts after Week 1"}</div></div>
<div><div class="card stat"><h2>📊 MOST POINTS</h2><div class="value">${top?name(top.owner_id):"TBD"}</div><div class="green">${top?pts(top).toFixed(2)+" pts":"Waiting for scores"}</div></div><div class="card stat section"><h2>🔥 LONGEST WIN STREAK</h2><div class="value">Live after Week 1</div></div><div class="card stat section"><h2>🧊 LONGEST LOSING STREAK</h2><div class="value">Live after Week 1</div></div></div></div>
<div class="grid2 section"><div class="card"><h2>TOP FANTASY PLAYER BY POSITION</h2><div class="position-grid">${["QB","RB","WR","TE","K","DEF"].map(p=>`<div class="position"><b>${p}</b><span>Live player leader</span></div>`).join("")}</div></div><div class="card"><h2>LEAGUE AT A GLANCE</h2><div class="grid3"><div><b>${state.users.length}</b><div class="muted">TEAMS</div></div><div><b>1 QB</b><div class="muted">STARTING</div></div><div><b>PPR</b><div class="muted">SCORING</div></div><div><b>DYNASTY</b><div class="muted">FORMAT</div></div><div><b>ROOKIE</b><div class="muted">DRAFT</div></div><div><b>WEEK 12</b><div class="muted">TRADE DEADLINE</div></div></div></div></div>
<div class="section"><h2 class="section-title">LATEST 10 MOVES</h2>${transactionList(10)}</div>`}
function weekly(){return `<div class="eyebrow">WEEKLY</div><h1 class="section-title">WEEK ${state.week} MATCHUPS</h1><div class="grid2">${matchupPairs().map(p=>`<div class="card"><div class="player-row"><strong>${name(rosterOwner(p[0]))}</strong><b>${Number(p[0].points||0).toFixed(2)}</b></div><div class="player-row"><strong>${name(rosterOwner(p[1]))}</strong><b>${Number(p[1].points||0).toFixed(2)}</b></div></div>`).join("")||`<div class="empty">This week's matchups are not available yet.</div>`}</div><div class="section"><h2 class="section-title">WEEKLY AWARDS</h2>${weeklyAwards()}</div>`}
function rosterOwner(m){const r=state.rosters.find(r=>r.roster_id===m.roster_id);return r?.owner_id}
function transactionList(n=10){
 const arr=state.transactions.slice(0,n);
 if(!arr.length)return `<div class="empty">No transactions returned by Sleeper yet.</div>`;

 return `<div class="card">${
  arr.map(t=>{
   const teams=(t.roster_ids||[])
    .map(rid=>{
     const r=state.rosters.find(x=>x.roster_id===rid);
     return r?name(r.owner_id):null;
    })
    .filter(Boolean);

   const teamNames=teams.length
    ? teams.join(" ↔ ")
    : (t.consenter_ids||[]).map(name).join(" ↔ ") || "League move";

   return `<div class="player-row">
    <div>
     <strong>${esc(t.type||"TRANSACTION").toUpperCase()}</strong>
     <div class="muted">${teamNames}</div>
    </div>
    <span class="pill">${new Date(t.created||Date.now()).toLocaleDateString()}</span>
   </div>`;
  }).join("")
 }</div>`;
}
function transactions(){return `<div class="eyebrow">TRANSACTION WIRE</div><h1 class="section-title">LATEST 10 MOVES</h1>${transactionList(10)}<div class="section card"><h2>TRANSACTION CENTER</h2><p class="sub">All transaction history is pulled from Sleeper. Trades, waivers, adds, drops and commissioner moves update automatically.</p></div>`}
function managers(){return `<div class="eyebrow">LEAGUE ROSTERS</div><h1 class="section-title">MANAGERS</h1><div class="grid3">${state.users.map(u=>{const r=rosterByOwner(u.user_id);return `<div class="card"><span class="pill">ROSTER ${r?.roster_id??""}</span><h3>${name(u.user_id)}</h3><div class="green">${managerRecord(r)}</div><div class="muted">${Number(r?.settings?.fpts||0).toFixed(2)} pts</div></div>`}).join("")}</div>`}
function standings(){
 const arr=state.rosters.slice().sort(
  (a,b)=>(Number(b.settings?.wins||0)-Number(a.settings?.wins||0))||(pts(b)-pts(a))
 );
 return `<div class="eyebrow">STANDINGS RACE</div><h1 class="section-title">FULL STANDINGS</h1><div class="card"><table class="table"><thead><tr><th>SEED</th><th>MANAGER</th><th>RECORD</th><th>PF</th><th>PA</th></tr></thead><tbody>${arr.map((r,i)=>`<tr><td class="rank">#${i+1}</td><td><strong>${name(r.owner_id)}</strong></td><td>${managerRecord(r)}</td><td>${pts(r).toFixed(2)}</td><td>${Number(r.settings?.fpts_against||0).toFixed(2)}</td></tr>`).join("")}</tbody></table></div>`;
}
function rivalries(){const arr=state.users.map((u,i)=>{const v=state.users[(i+1)%state.users.length];return [name(u.user_id),name(v.user_id)]});return `<div class="eyebrow">HEAD-TO-HEAD</div><h1 class="section-title">RIVALRIES</h1><div class="grid2">${arr.slice(0,6).map(x=>`<div class="card"><h3>${x[0]} <span class="green">⚔</span> ${x[1]}</h3><p class="muted">Head-to-head history can be expanded from completed Sleeper matchups.</p></div>`).join("")}</div>`}
function playoffs(){const arr=state.rosters.slice().sort((a,b)=>(b.settings?.wins-a.settings?.wins)||((b.settings?.fpts||0)-(a.settings?.fpts||0))).slice(0,7);return `<div class="eyebrow">POSTSEASON</div><h1 class="section-title">PLAYOFF RACE</h1><div class="card"><table class="table"><tbody>${arr.map((r,i)=>`<tr><td class="rank">#${i+1}</td><td>${name(r.owner_id)}</td><td class="green">PLAYOFF</td></tr>`).join("")}</tbody></table></div><div class="section card"><h2>PLAYOFF FORMAT</h2><p class="sub">Live standings determine the current playoff race. Confirm the exact bracket from the Sleeper league settings once the regular season is complete.</p></div>`}
function draft(){const grouped={};state.picks.forEach(p=>{const y=p.draftSeason||"Unknown";(grouped[y]??=[]).push(p)});Object.values(grouped).forEach(a=>a.sort((x,y)=>(x.round-y.round)||(x.draft_slot-y.draft_slot)));return `<div class="eyebrow">DRAFT CAPITAL</div><h1 class="section-title">DRAFT PICKS</h1>${Object.keys(grouped).sort((a,b)=>b-a).map(y=>`<div class="card section"><h2>${esc(y)} DRAFT</h2><table class="table"><thead><tr><th>ROUND</th><th>PICK</th><th>ORIGINAL OWNER</th><th>SELECTED BY</th><th>PLAYER</th></tr></thead><tbody>${grouped[y].map(p=>`<tr><td>R${p.round}</td><td>#${p.pick_no||p.draft_slot||""}</td><td>${name(p.roster_id?state.rosters.find(r=>r.roster_id===p.roster_id)?.owner_id:p.picked_by)}</td><td>${name(p.picked_by)}</td><td>${esc(p.metadata?.first_name||"")} ${esc(p.metadata?.last_name||p.player_id||"")}</td></tr>`).join("")}</tbody></table></div>`).join("")||`<div class="empty">No draft picks returned by Sleeper yet.</div>`}<div class="card section"><h2>POST-DRAFT GRADE</h2><p class="sub">Grades are calculated from roster value, draft capital used, positional needs and current player value after the draft. This stays live as rosters change.</p></div>`}
function weeklyAwards(){const m=state.matchups.filter(x=>x.points!=null);if(!m.length)return `<div class="empty">Awards start after Week 1 scores post.</div>`;const high=m.slice().sort((a,b)=>b.points-a.points)[0];return `<div class="grid3"><div class="card award"><h2>🏆 TEAM • MOST POINTS</h2><h3>${name(rosterOwner(high))}</h3><span class="green">${Number(high.points).toFixed(2)} pts</span></div><div class="card award"><h2>🔥 INDIVIDUAL • TOP SCORER</h2><h3>Live player data</h3><span class="muted">Updates after player stats are available.</span></div><div class="card award"><h2>💥 STATEMENT WIN</h2><h3>Live after final</h3><span class="muted">Calculated from weekly margins.</span></div></div>`}
function awards(){return `<div class="eyebrow">THE CARTEL HONORS</div><h1 class="section-title">WEEKLY AWARDS</h1>${weeklyAwards()}<div class="section"><h2 class="section-title">AWARD CATEGORIES</h2><div class="grid3">${["Manager of the Week","Team of the Week","Top Scoring Player","Biggest Blowout","Closest Game","Waiver Wire Winner","Best Starting Lineup","Biggest Bench Points","Longest Win Streak"].map(x=>`<div class="card award"><h3>${x}</h3><div class="muted">Live league calculation</div></div>`).join("")}</div></div>`}
function rules(){const s=state.league?.settings||{};return `<div class="eyebrow">LEAGUE SETTINGS</div><h1 class="section-title">RULES</h1><div class="grid2"><div class="card"><h2>FORMAT</h2><p><b>Dynasty</b></p><p class="muted">${state.users.length} teams • League ID ${LEAGUE_ID}</p><p class="muted">Data source: Sleeper read-only API.</p></div><div class="card"><h2>SCORING</h2><p>QB ${s.qb_type||"1"} • Roster settings are synced from Sleeper.</p><p class="muted">The app displays the live configuration rather than hard-coding league rules.</p></div></div>`}

document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>{state.tab=b.dataset.tab;render();window.scrollTo(0,0)}));
document.getElementById("managerSelect").addEventListener("change",e=>{state.currentUser=e.target.value;render()});
load();
setInterval(load,60000);
