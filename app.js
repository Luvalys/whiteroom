const STORAGE_KEY = 'whiteroom_tracker_v2';

/** @typedef {{id:string,name:string,category:string,description:string,targetPerWeek:number,startDate:string,color:string,positionX:number,positionY:number,parents:string[],difficulty:'base'|'hard'}} Skill */
const STRATEGY_XP = { framing:15, scenarios:20, incentives:15, secondOrder:15, eightyTwenty:10, comms:10, retro:15 };
const STRATEGY_MODULES = Object.keys(STRATEGY_XP);

const tabs = [
  ['today', "Aujourd'hui"], ['skills', 'Compétences'], ['planning', 'Planning'], ['quests', 'Quêtes'],
  ['strategy', 'Strategy Lab'], ['focus', 'Focus'], ['library', 'Bibliothèque'], ['stats', 'Stats'], ['settings', 'Réglages'],
];

const quotes = [
  'La discipline douce répète ce que la motivation oublie.','Un jour maîtrisé vaut plus qu’une semaine rêvée.','Tu ne cherches pas la perfection, tu bâtis la constance.','Le calme précède la performance durable.','Une action claire vaut dix intentions floues.','Ton futur dépend de tes routines, pas de tes humeurs.','Fais simple, fais juste, fais aujourd’hui.','Le progrès discret finit toujours par devenir visible.','Ton esprit suit l’ordre que tu imposes à ta journée.','Le minimum quotidien bat le maximum occasionnel.','Réduis la friction, augmente l’exécution.','La constance transforme l’effort en identité.','Un focus profond évite mille distractions coûteuses.','La fatigue se gère, la mission continue.','La clarté du plan protège ton énergie.','Ta trajectoire naît de tes petits choix.','Tu n’as pas besoin d’être prêt, juste présent.','Gagner la journée, c’est répéter l’essentiel.','Le contrôle de soi est un superpouvoir silencieux.','Le respect de tes engagements construit ta puissance.','Le long terme appartient aux réguliers.'
];
const dayNames = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const slots = ['matin','midi','soir'];
let currentTab = 'today';
let focusTimer = null;
let focusLeft = 0;
let selectedCaseId = null;

const defaultStrategyModules = () => ({
  framing:{objective:'',constraints:'',levers:'',successCriteria:'',horizon:'',risks:'',options:[''],oneSentence:''},
  scenarios:{pessimistic:{p:'',signals:'',trigger:'',planB:''},central:{p:'',signals:'',trigger:'',planB:''},optimistic:{p:'',signals:'',trigger:'',planB:''}},
  incentives:{actors:[{name:'',goal:'',fear:'',leverage:'',message:''}]},
  secondOrder:{action:'',effect1:'',effect2:'',effect3:'',mitigation:''},
  eightyTwenty:{goal:'',bottleneck:'',oneMove:'',sayNoTo:[''],nextWeek:''},
  comms:{oneSentence:'',pitch30:'',pitch2min:''},
  retro:{facts:'',cause:'',lesson:'',correction:'',nextStep:''}
});

const defaultState = () => ({
  version: 2,
  skills: [], dailyLogs: {}, journals: {}, recovery: {},
  planning: {}, planningNotes: '', activities: ['Calisthénie','Lecture','Méditation','Piano','Échecs','Italien'],
  questsByDate: {}, activeGoalsByDate: {},
  settings: { cap3: true, capCount: 3, lockMode: 'soft', unlockThreshold: 60, unlockWindow: '30j', strategyQuest: true },
  xpBySkillDay: {}, library: [], focusSessions: 0, badges: {}, quoteIndex: Math.floor(Math.random()*quotes.length),
  strategyCases: [], strategyCompletionsByDay: {}
});

let state = loadState();
function loadState(){
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    const merged = { ...defaultState(), ...raw };
    merged.strategyCases = (merged.strategyCases||[]).map(c=>({
      id: c.id||uid(), title:c.title||'Case', context:c.context||'', createdAt:c.createdAt||new Date().toISOString(), updatedAt:c.updatedAt||new Date().toISOString(),
      modules: { ...defaultStrategyModules(), ...(c.modules||{}) },
      xpAwarded: c.xpAwarded||{}, completedAt: c.completedAt||{}
    }));
    return merged;
  } catch { return defaultState(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
function saveSilent(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1500); }
const $ = (q,p=document)=>p.querySelector(q);
const uid = () => Math.random().toString(36).slice(2,10);
const todayISO = () => new Date().toISOString().slice(0,10);
function getDaily(date){ if(!state.dailyLogs[date]) state.dailyLogs[date] = {}; return state.dailyLogs[date]; }

function completionRate(skillId, win){
  const days = win==='all'?99999: (win==='60j'?60:win==='90j'?90:30);
  const keys = Object.keys(state.dailyLogs).sort().slice(-days); if(!keys.length) return 0;
  return Math.round(keys.filter(d=>state.dailyLogs[d][skillId]?.done).length / keys.length * 100);
}
function isUnlocked(skill){
  if (!skill.parents.length) return {ok:true, reason:''};
  const threshold = state.settings.unlockThreshold;
  for (const pid of skill.parents){
    const p = state.skills.find(s=>s.id===pid); if(!p) continue;
    const rate = completionRate(p.id, state.settings.unlockWindow);
    if(rate < threshold) return {ok:false, reason:`Prérequis ${p.name} à ${rate}% < ${threshold}%`};
  }
  return {ok:true, reason:''};
}

function render(){
  renderTabs(); $('#quoteText').textContent = quotes[state.quoteIndex];
  const v = $('#view'); v.innerHTML='';
  ({today:renderToday,skills:renderSkills,planning:renderPlanning,quests:renderQuests,strategy:renderStrategy,focus:renderFocus,library:renderLibrary,stats:renderStats,settings:renderSettings}[currentTab])();
  saveSilent();
}
function renderTabs(){ const n = $('#tabs'); n.innerHTML = tabs.map(([id,label])=>`<button data-tab="${id}" class="${currentTab===id?'active':''}">${label}</button>`).join(''); n.querySelectorAll('button').forEach(b=>b.onclick=()=>{currentTab=b.dataset.tab; render();}); }

function renderToday(){
  const d=todayISO(); const log=getDaily(d); if(!state.journals[d]) state.journals[d]={fait:'',appris:'',demain:''};
  if(!state.recovery[d]) state.recovery[d]={energie:'mid',sommeil:'ok',douleur:0};
  const active = state.activeGoalsByDate[d]||[]; const showAll = !state.settings.cap3 || active.length===0;
  const allowedIds = showAll? state.skills.map(s=>s.id) : [...new Set([...active,...state.skills.slice(0,state.settings.capCount).map(s=>s.id)])].slice(0,active.length+state.settings.capCount);
  const sq = state.settings.strategyQuest ? `<div class='card'><h3>Strategy Quest (optionnel)</h3><p>🧭 Framing 5 min: clarifie objectif + contrainte principale.</p></div>` : '';
  $('#view').innerHTML = `<section class="card grid two">
      <div><label>Date</label><input type="date" value="${d}" disabled/><p class="muted">Mode CAP3: ${state.settings.cap3?'ON':'OFF'}</p></div>
      <div><h3>Recovery</h3><div class="grid three">
      <div><label>Énergie</label><select id="recEnergy"><option>low</option><option ${state.recovery[d].energie==='mid'?'selected':''}>mid</option><option ${state.recovery[d].energie==='high'?'selected':''}>high</option></select></div>
      <div><label>Sommeil</label><select id="recSleep"><option>bad</option><option ${state.recovery[d].sommeil==='ok'?'selected':''}>ok</option><option ${state.recovery[d].sommeil==='good'?'selected':''}>good</option></select></div>
      <div><label>Douleur</label><input id="recPain" type="number" min="0" max="10" value="${state.recovery[d].douleur}"/></div>
      </div></div>
    </section>${sq}
    <section class="card"><h3>Checklist</h3><button id="viewAllBtn">Voir tout</button><div id="checkWrap"></div></section>
    <section class="card"><h3>Journal intelligent</h3>
      <label>✅ Fait</label><textarea id="jfait">${state.journals[d].fait||''}</textarea>
      <label>🧠 Appris</label><textarea id="jappris">${state.journals[d].appris||''}</textarea>
      <label>🔧 Demain</label><textarea id="jdemain">${state.journals[d].demain||''}</textarea>
      <button id="copyJournal">Copier journal</button>
    </section>`;
  const wrap = $('#checkWrap');
  state.skills.filter(s=>allowedIds.includes(s.id)).forEach(s=>{
    const unlocked = isUnlocked(s), checked = !!log[s.id]?.done;
    const row = document.createElement('div'); row.className='row gap-sm';
    row.innerHTML=`<input type="checkbox" ${checked?'checked':''} ${(!unlocked.ok && state.settings.lockMode==='hard')?'disabled':''}/><span>${s.name}</span><small class="muted">${unlocked.ok?'':'🔒 '+unlocked.reason}</small>`;
    row.querySelector('input').onchange=(e)=>toggleSkillDone(d,s,e.target.checked); wrap.appendChild(row);
  });
  $('#viewAllBtn').onclick=()=>{ state.settings.cap3=false; save(); };
  $('#recEnergy').onchange=e=>{state.recovery[d].energie=e.target.value; save();};
  $('#recSleep').onchange=e=>{state.recovery[d].sommeil=e.target.value; save();};
  $('#recPain').onchange=e=>{state.recovery[d].douleur=Math.max(0,Math.min(10,Number(e.target.value))); save();};
  ['fait','appris','demain'].forEach(k=>$('#j'+k).oninput=e=>{state.journals[d][k]=e.target.value; saveSilent();});
  $('#copyJournal').onclick=()=>{ const j=state.journals[d]; navigator.clipboard.writeText(`${d}\n✅ Fait: ${j.fait}\n🧠 Appris: ${j.appris}\n🔧 Demain: ${j.demain}`); toast('Journal copié'); };
}

function toggleSkillDone(date, skill, done){
  const unlocked = isUnlocked(skill); if(!unlocked.ok && state.settings.lockMode==='hard'){ toast('Compétence verrouillée'); return; }
  const dl=getDaily(date); if(!dl[skill.id]) dl[skill.id]={done:false}; dl[skill.id].done = done;
  const key = `${date}:${skill.id}`; if(done && !state.xpBySkillDay[key]) state.xpBySkillDay[key] = skill.difficulty==='hard'?20:10;
  save();
}

function renderSkills(){
  $('#view').innerHTML = `<section class='card'><h3>Skill Tree</h3><button id='seedBtn' class='primary'>Créer le Skill Tree WhiteRoom</button><div id='tree'></div></section>
  <section class='card'><h3>Ajouter compétence</h3><form id='skillForm' class='grid two'>
  <input name='name' placeholder='Nom' required/><input name='category' placeholder='Catégorie' value='Discipline' required/>
  <input name='description' placeholder='Description'/><input name='targetPerWeek' type='number' value='3'/>
  <input name='startDate' type='date' value='${todayISO()}'/><input name='color' type='color' value='#7aa2ff'/>
  <input name='positionX' type='number' value='1'/><input name='positionY' type='number' value='1'/>
  <input name='parents' placeholder='IDs parents séparés par ,'/><select name='difficulty'><option value='base'>base</option><option value='hard'>hard</option></select>
  <button class='primary'>Ajouter</button></form></section><section class='card'><h3>Liste</h3><div id='skillList'></div></section>`;
  $('#seedBtn').onclick=()=>{ seedSkillTree(); save(); toast('Skill Tree créé'); };
  $('#skillForm').onsubmit=(e)=>{ e.preventDefault(); const f=new FormData(e.target); state.skills.push({id:uid(),name:f.get('name'),category:f.get('category'),description:f.get('description'),targetPerWeek:Number(f.get('targetPerWeek')),startDate:f.get('startDate'),color:f.get('color'),positionX:Number(f.get('positionX')),positionY:Number(f.get('positionY')),parents:(f.get('parents')||'').split(',').map(s=>s.trim()).filter(Boolean),difficulty:f.get('difficulty')}); save(); };
  const t=$('#tree'); t.innerHTML=''; state.skills.sort((a,b)=>a.positionY-b.positionY||a.positionX-b.positionX).forEach(s=>{ const u=isUnlocked(s); const el=document.createElement('div'); el.className='skill-node '+(u.ok?'':'locked'); el.style.borderColor=s.color; el.textContent=`${s.name} (${s.category}) [${s.positionX},${s.positionY}]`; t.appendChild(el); });
  $('#skillList').innerHTML = state.skills.map(s=>`<div class='card'><b>${s.name}</b> <span class='muted'>${s.category}</span> <small>${s.id}</small><div><button data-del='${s.id}' class='danger'>Supprimer</button></div></div>`).join('');
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{state.skills=state.skills.filter(s=>s.id!==b.dataset.del); save();});
}

function renderPlanning(){
  const cells = dayNames.map(day=>`<tr><th>${day}</th>${slots.map(slot=>`<td data-cell='${day}:${slot}'></td>`).join('')}</tr>`).join('');
  $('#view').innerHTML=`<section class='card'><h3>Activités (drag)</h3><div id='chips'></div><input id='newAct' placeholder='Nouvelle activité'/><button id='addAct'>Ajouter activité</button></section>
  <section class='card'><table class='table'><tr><th>Jour</th><th>Matin</th><th>Midi</th><th>Soir</th></tr>${cells}</table></section>
  <section class='card'><h3>Notes planning</h3><textarea id='planningNotes'>${state.planningNotes||''}</textarea></section>`;
  $('#chips').innerHTML=state.activities.map(a=>`<span class='chip' draggable='true' data-act='${a}'>${a}</span>`).join('');
  document.querySelectorAll('#chips .chip').forEach(c=>c.ondragstart=e=>e.dataTransfer.setData('text/plain',c.dataset.act));
  document.querySelectorAll('[data-cell]').forEach(td=>{ const key=td.dataset.cell; const list=state.planning[key]||[]; td.innerHTML=list.map((a,i)=>`<span class='chip'>${a}<button data-rm='${key}:${i}'>✕</button></span>`).join(''); td.ondragover=e=>e.preventDefault(); td.ondrop=e=>{e.preventDefault(); const act=e.dataTransfer.getData('text/plain'); state.planning[key]=[...(state.planning[key]||[]),act]; save();}; });
  document.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.rm.split(':'); state.planning[k].splice(Number(i),1); save();});
  $('#addAct').onclick=()=>{const a=$('#newAct').value.trim(); if(a){state.activities.push(a); save();}};
  $('#planningNotes').oninput=e=>{state.planningNotes=e.target.value; saveSilent();};
}

function buildQuests(date,force=false){
  if(state.questsByDate[date] && !force) return state.questsByDate[date];
  const wd=(new Date(date).getDay()+6)%7, day=dayNames[wd];
  const list=[...(state.planning[`${day}:matin`]||[]),...(state.planning[`${day}:midi`]||[]),...(state.planning[`${day}:soir`]||[])];
  const body=list.find(a=>/calis|boxe|yoga|sport|run/i.test(a))||'Corps: mobilité 15 min';
  const mind=list.find(a=>/lecture|langue|italien|anglais|espagnol|échecs|piano|médit/i.test(a))||'Esprit: lecture 20 min';
  const rec=state.recovery[date]||{}, light = rec.energie==='low' || Number(rec.douleur)>=7;
  const q={main:[body,mind],side:['Journal intelligent',...list.slice(0,3)],light}; if(light) q.main=['Corps light: yoga mobilité','Esprit light: méditation 10 min'];
  state.questsByDate[date]=q; return q;
}
function renderQuests(){ const d=todayISO(), q=buildQuests(d); $('#view').innerHTML=`<section class='card'><h3>Main Quest</h3><p>${q.main.join(' + ')||'N/A'}</p><h4>Side Quests</h4><ul>${q.side.map(x=>`<li>${x}</li>`).join('')}</ul><p class='muted'>${q.light?'Mode light suggéré (fatigue/douleur).':''}</p><button id='genQ'>Régénérer</button><button id='applyQ' class='primary'>Appliquer Quêtes → Checklist</button></section>`; $('#genQ').onclick=()=>{state.questsByDate[d]=buildQuests(d,true);save();}; $('#applyQ').onclick=()=>{ const skills=state.skills.filter(s=>q.main.concat(q.side).some(t=>s.name.toLowerCase().includes(t.toLowerCase()))).map(s=>s.id); state.activeGoalsByDate[d]=skills.slice(0,6); state.settings.cap3=true; save(); toast('Quêtes appliquées'); }; }

function ensureCase(){
  const c = state.strategyCases.find(x=>x.id===selectedCaseId);
  if(c) return c;
  if(state.strategyCases.length){ selectedCaseId = state.strategyCases[0].id; return state.strategyCases[0]; }
  return null;
}
function caseModuleMinOk(c,m){
  const md = c.modules[m];
  if(m==='framing') return md.objective && md.constraints && md.oneSentence;
  if(m==='scenarios') return md.pessimistic.p && md.central.p && md.optimistic.p;
  if(m==='incentives') return (md.actors||[]).some(a=>a.name && a.goal && a.message);
  if(m==='secondOrder') return md.action && md.effect1 && md.mitigation;
  if(m==='eightyTwenty') return md.goal && md.oneMove;
  if(m==='comms') return md.oneSentence && md.pitch30 && md.pitch2min;
  if(m==='retro') return md.facts && md.lesson && md.nextStep;
  return false;
}
function completeModule(caseId,module){
  const c=state.strategyCases.find(x=>x.id===caseId); if(!c) return;
  c.xpAwarded = c.xpAwarded||{}; c.completedAt = c.completedAt||{};
  if(c.xpAwarded[module]) return toast('XP déjà attribués');
  if(!caseModuleMinOk(c,module)) return toast('Complète les champs minimum du module');
  c.xpAwarded[module] = STRATEGY_XP[module]; c.completedAt[module]=todayISO(); c.updatedAt=new Date().toISOString();
  state.strategyCompletionsByDay[todayISO()] = (state.strategyCompletionsByDay[todayISO()]||0)+1;
  save(); toast(`+${STRATEGY_XP[module]} XP stratégie`);
}

function renderStrategy(){
  const current = ensureCase();
  $('#view').innerHTML = `<section class='card'><h3>Strategy Cases</h3><div class='row gap-sm wrap'><input id='caseTitle' placeholder='Nouveau case'/><button id='addCase' class='primary'>Créer case</button></div><div id='caseList'></div></section><section class='card'><div id='caseEditor'></div></section>`;
  $('#addCase').onclick=()=>{ const title=$('#caseTitle').value.trim()||`Case ${state.strategyCases.length+1}`; const c={id:uid(),title,context:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),modules:defaultStrategyModules(),xpAwarded:{},completedAt:{}}; state.strategyCases.unshift(c); selectedCaseId=c.id; save(); };
  $('#caseList').innerHTML = state.strategyCases.map(c=>`<div class='chip'><button data-open='${c.id}'>${c.title}</button><button data-del='${c.id}'>✕</button></div>`).join('') || '<p class="muted">Aucun case.</p>';
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{selectedCaseId=b.dataset.open; render();});
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{state.strategyCases=state.strategyCases.filter(c=>c.id!==b.dataset.del); if(selectedCaseId===b.dataset.del) selectedCaseId = state.strategyCases[0]?.id||null; save();});
  if(!current){ $('#caseEditor').innerHTML='<p class="muted">Crée un case pour commencer.</p>'; return; }

  const c = current;
  const mod = (name,label,body,copy='') => `<details class='card' open><summary><b>${label}</b> ${c.xpAwarded?.[name]?`✅ +${c.xpAwarded[name]} XP`:''}</summary>${body}<div class='row gap-sm wrap'><button data-complete='${name}' class='primary'>Marquer comme complété</button>${copy?`<button data-copy='${copy}'>Copier</button>`:''}</div></details>`;
  $('#caseEditor').innerHTML = `<h3>${c.title}</h3><label>Contexte</label><textarea id='ctx'>${c.context||''}</textarea>
  ${mod('framing','1) Cadrage',`<label>Objectif</label><input id='f_objective' value='${c.modules.framing.objective||''}'/><label>Contraintes</label><textarea id='f_constraints'>${c.modules.framing.constraints||''}</textarea><label>Levers</label><textarea id='f_levers'>${c.modules.framing.levers||''}</textarea><label>Critères succès</label><input id='f_success' value='${c.modules.framing.successCriteria||''}'/><label>Horizon</label><input id='f_horizon' value='${c.modules.framing.horizon||''}'/><label>Risques</label><textarea id='f_risks'>${c.modules.framing.risks||''}</textarea><label>Options (une par ligne)</label><textarea id='f_options'>${(c.modules.framing.options||[]).join('\n')}</textarea><label>1 phrase</label><input id='f_one' value='${c.modules.framing.oneSentence||''}'/>`,'framingOne')}
  ${mod('scenarios','2) Scénarios probabilistes',`${['pessimistic','central','optimistic'].map(k=>`<h4>${k}</h4><label>Probabilité p</label><input id='s_${k}_p' value='${c.modules.scenarios[k].p||''}'/><label>Signals</label><input id='s_${k}_signals' value='${c.modules.scenarios[k].signals||''}'/><label>Trigger</label><input id='s_${k}_trigger' value='${c.modules.scenarios[k].trigger||''}'/><label>Plan B</label><textarea id='s_${k}_planB'>${c.modules.scenarios[k].planB||''}</textarea>`).join('')}`,'scenarioSummary')}
  ${mod('incentives','3) Incentives map',`<label>Actors (1/ligne: name|goal|fear|leverage|message)</label><textarea id='i_actors'>${(c.modules.incentives.actors||[]).map(a=>[a.name,a.goal,a.fear,a.leverage,a.message].join('|')).join('\n')}</textarea>`)}
  ${mod('secondOrder','4) 2e ordre',`<label>Action</label><input id='so_action' value='${c.modules.secondOrder.action||''}'/><label>Effet 1</label><input id='so_e1' value='${c.modules.secondOrder.effect1||''}'/><label>Effet 2</label><input id='so_e2' value='${c.modules.secondOrder.effect2||''}'/><label>Effet 3</label><input id='so_e3' value='${c.modules.secondOrder.effect3||''}'/><label>Mitigation</label><textarea id='so_m'>${c.modules.secondOrder.mitigation||''}</textarea>`)}
  ${mod('eightyTwenty','5) 80/20',`<label>Goal</label><input id='e_goal' value='${c.modules.eightyTwenty.goal||''}'/><label>Bottleneck</label><input id='e_b' value='${c.modules.eightyTwenty.bottleneck||''}'/><label>One move</label><input id='e_move' value='${c.modules.eightyTwenty.oneMove||''}'/><label>Say no to (1/ligne)</label><textarea id='e_no'>${(c.modules.eightyTwenty.sayNoTo||[]).join('\n')}</textarea><label>Next week</label><textarea id='e_next'>${c.modules.eightyTwenty.nextWeek||''}</textarea>`)}
  ${mod('comms','6) Communication 1 phrase / 30 sec / 2 min',`<label>1 phrase</label><input id='c_1' value='${c.modules.comms.oneSentence||''}'/><label>30 sec</label><textarea id='c_30'>${c.modules.comms.pitch30||''}</textarea><label>2 min</label><textarea id='c_2m'>${c.modules.comms.pitch2min||''}</textarea>`,'comms')}
  ${mod('retro','7) Rétro',`<label>Facts</label><textarea id='r_f'>${c.modules.retro.facts||''}</textarea><label>Cause</label><textarea id='r_c'>${c.modules.retro.cause||''}</textarea><label>Lesson</label><textarea id='r_l'>${c.modules.retro.lesson||''}</textarea><label>Correction</label><textarea id='r_corr'>${c.modules.retro.correction||''}</textarea><label>Next step</label><input id='r_n' value='${c.modules.retro.nextStep||''}'/>`)}
  `;
  const persist = ()=>{
    c.context=$('#ctx').value;
    c.modules.framing = { objective:$('#f_objective').value,constraints:$('#f_constraints').value,levers:$('#f_levers').value,successCriteria:$('#f_success').value,horizon:$('#f_horizon').value,risks:$('#f_risks').value,options:$('#f_options').value.split('\n').map(s=>s.trim()).filter(Boolean),oneSentence:$('#f_one').value };
    const readSc=(k)=>({p:$(`#s_${k}_p`).value,signals:$(`#s_${k}_signals`).value,trigger:$(`#s_${k}_trigger`).value,planB:$(`#s_${k}_planB`).value});
    c.modules.scenarios={pessimistic:readSc('pessimistic'),central:readSc('central'),optimistic:readSc('optimistic')};
    c.modules.incentives={actors:$('#i_actors').value.split('\n').filter(Boolean).map(line=>{const [name,goal,fear,leverage,message]=line.split('|'); return {name:name||'',goal:goal||'',fear:fear||'',leverage:leverage||'',message:message||''};})};
    c.modules.secondOrder={action:$('#so_action').value,effect1:$('#so_e1').value,effect2:$('#so_e2').value,effect3:$('#so_e3').value,mitigation:$('#so_m').value};
    c.modules.eightyTwenty={goal:$('#e_goal').value,bottleneck:$('#e_b').value,oneMove:$('#e_move').value,sayNoTo:$('#e_no').value.split('\n').map(s=>s.trim()).filter(Boolean),nextWeek:$('#e_next').value};
    c.modules.comms={oneSentence:$('#c_1').value,pitch30:$('#c_30').value,pitch2min:$('#c_2m').value};
    c.modules.retro={facts:$('#r_f').value,cause:$('#r_c').value,lesson:$('#r_l').value,correction:$('#r_corr').value,nextStep:$('#r_n').value};
    c.updatedAt=new Date().toISOString(); saveSilent();
  };
  $('#caseEditor').querySelectorAll('input,textarea').forEach(el=>el.oninput=persist);
  document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>{persist(); completeModule(c.id,b.dataset.complete);});
  document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{
    persist();
    if(b.dataset.copy==='framingOne') navigator.clipboard.writeText(c.modules.framing.oneSentence||'');
    if(b.dataset.copy==='comms') navigator.clipboard.writeText(`1 phrase: ${c.modules.comms.oneSentence}\n30 sec: ${c.modules.comms.pitch30}\n2 min: ${c.modules.comms.pitch2min}`);
    if(b.dataset.copy==='scenarioSummary') navigator.clipboard.writeText(`Pessimistic p=${c.modules.scenarios.pessimistic.p}; Central p=${c.modules.scenarios.central.p}; Optimistic p=${c.modules.scenarios.optimistic.p}`);
    toast('Copié');
  });
}

function renderFocus(){
  $('#view').innerHTML=`<section class='card'><h3>Focus Mode (Pomodoro)</h3><div class='grid three'><select id='focusSkill'>${state.skills.map(s=>`<option value='${s.id}'>${s.name}</option>`).join('')}</select><select id='focusMin'><option>25</option><option>45</option><option>60</option></select><button id='startFocus' class='primary'>Start</button></div><h2 id='timer'>${String(Math.floor(focusLeft/60)).padStart(2,'0')}:${String(focusLeft%60).padStart(2,'0')}</h2><button id='doneFocus'>Terminé → cocher</button></section>`;
  $('#startFocus').onclick=()=>{ focusLeft=Number($('#focusMin').value)*60; clearInterval(focusTimer); focusTimer=setInterval(()=>{focusLeft--; $('#timer').textContent=`${String(Math.floor(focusLeft/60)).padStart(2,'0')}:${String(focusLeft%60).padStart(2,'0')}`; if(focusLeft<=0){clearInterval(focusTimer); toast('Focus terminé');}},1000); };
  $('#doneFocus').onclick=()=>{ const id=$('#focusSkill').value; const sk=state.skills.find(s=>s.id===id); if(sk){ toggleSkillDone(todayISO(),sk,true); state.focusSessions++; save(); }};
}

function renderLibrary(){
  $('#view').innerHTML=`<section class='card'><h3>Bibliothèque</h3><div class='row gap-sm wrap'><select id='fType'><option value=''>type: tous</option>${['book','film','history','theology','language','chess','piano'].map(t=>`<option>${t}</option>`).join('')}</select><select id='fStatus'><option value=''>status: tous</option><option>todo</option><option>doing</option><option>done</option></select><button id='seedLib'>Pré-remplir</button></div><form id='libForm' class='grid two'><select name='type'>${['book','film','history','theology','language','chess','piano'].map(t=>`<option>${t}</option>`).join('')}</select><select name='status'><option>todo</option><option>doing</option><option>done</option></select><input name='title' placeholder='Titre' required/><input name='note' placeholder='Note'/><button>Ajouter</button></form><div id='libList'></div></section>`;
  $('#libForm').onsubmit=(e)=>{e.preventDefault();const f=new FormData(e.target);state.library.push({id:uid(),type:f.get('type'),status:f.get('status'),title:f.get('title'),note:f.get('note'),createdAt:new Date().toISOString()});save();};
  $('#seedLib').onclick=()=>{ seedLibrary(); save(); };
  const draw=()=>{ const t=$('#fType').value,s=$('#fStatus').value; $('#libList').innerHTML=state.library.filter(i=>(!t||i.type===t)&&(!s||i.status===s)).map(i=>`<div class='card'>${i.title} <small>${i.type}/${i.status}</small> <button data-del='${i.id}' class='danger'>✕</button></div>`).join(''); document.querySelectorAll('#libList [data-del]').forEach(b=>b.onclick=()=>{state.library=state.library.filter(i=>i.id!==b.dataset.del);save();}); };
  draw(); $('#fType').onchange=draw; $('#fStatus').onchange=draw;
}

function checkMVD(date){
  const body = state.skills.filter(s=>s.category==='Corps').some(s=>state.dailyLogs[date]?.[s.id]?.done);
  const mind = state.skills.filter(s=>['Esprit','Langues'].includes(s.category)).some(s=>state.dailyLogs[date]?.[s.id]?.done);
  const j = state.journals[date]; return body && mind && !!(j?.fait && j?.appris && j?.demain);
}
function computeStreaks(){
  const dates = Object.keys(state.dailyLogs).sort(); let disc=0,wr=0,best=0,run=0;
  for(const d of dates){ const done=Object.values(state.dailyLogs[d]||{}).filter(x=>x.done).length; const pct=state.skills.length?done/state.skills.length:0; if(pct>=0.6){disc++;run++;} else run=0; if(checkMVD(d)) wr++; best=Math.max(best,run); }
  return {discipline:disc,whiteroom:wr,best};
}
function strategyStats(){
  const cases = state.strategyCases||[];
  const counts={framing:0,scenarios:0,incentives:0,secondOrder:0,eightyTwenty:0,comms:0,retro:0,totalModules:0};
  for(const c of cases){ for(const m of STRATEGY_MODULES){ if(c.xpAwarded?.[m]){ counts[m]++; counts.totalModules++; } } }
  const byDay={};
  for(const c of cases){ for(const m of STRATEGY_MODULES){ const day=c.completedAt?.[m]; if(day) byDay[day]=(byDay[day]||0)+1; } }
  const days=Object.keys(byDay).sort(); let run=0,best=0; for(let i=0;i<days.length;i++){ if(i===0 || ((new Date(days[i])-new Date(days[i-1]))===86400000)){ run++; } else run=1; best=Math.max(best,run);} 
  return {counts, streak:best};
}
function computeBadges(){
  const totalXP = Object.values(state.xpBySkillDay).reduce((a,b)=>a+b,0) + strategyXP();
  const mvdCount = Object.keys(state.dailyLogs).filter(checkMVD).length;
  const journalCount = Object.values(state.journals).filter(j=>j.fait&&j.appris&&j.demain).length;
  const d=Object.keys(state.dailyLogs).sort().slice(-30); const disc30 = !d.length?0:Math.round(d.filter(x=>{const done=Object.values(state.dailyLogs[x]||{}).filter(v=>v.done).length; return state.skills.length?done/state.skills.length>=0.8:false;}).length/d.length*100);
  const ss = strategyStats().counts; const strategyStreak = strategyStats().streak;
  return [
    {name:'WhiteRoom 7 jours', ok:mvdCount>=7},{name:'WhiteRoom 30 jours', ok:mvdCount>=30},{name:'Discipline moyenne 30j ≥ 80%', ok:disc30>=80},{name:'1 000 XP', ok:totalXP>=1000},{name:'5 000 XP', ok:totalXP>=5000},{name:'Journal écrit 10 jours', ok:journalCount>=10},{name:'Journal écrit 30 jours', ok:journalCount>=30},{name:'10 sessions Focus', ok:state.focusSessions>=10},
    {name:'10 framings', ok:ss.framing>=10},{name:'10 scenarios', ok:ss.scenarios>=10},{name:'5 incentives maps', ok:ss.incentives>=5},{name:'5 retros', ok:ss.retro>=5},{name:'30 modules Strategy complétés', ok:ss.totalModules>=30},{name:'Strategy streak 7 jours', ok:strategyStreak>=7}
  ];
}
function strategyXP(){ return (state.strategyCases||[]).reduce((a,c)=>a+Object.values(c.xpAwarded||{}).reduce((x,y)=>x+Number(y||0),0),0); }

function renderStats(){
  const totalXP = Object.values(state.xpBySkillDay).reduce((a,b)=>a+b,0);
  const sXP = strategyXP();
  const byCat=['Discipline','Corps','Esprit','Langues'];
  const cards = byCat.map(c=>{ const xp=Object.entries(state.xpBySkillDay).reduce((acc,[k,val])=>{const sid=k.split(':')[1]; const s=state.skills.find(x=>x.id===sid); return acc + ((s?.category===c)?val:0);},0); return `<div class='card'><b>${c}</b><div>${xp} XP (Niv ${Math.floor(xp/100)+1})</div><div class='progress'><span style='width:${xp%100}%'></span></div></div>`; }).join('');
  const streaks = computeStreaks(), badges = computeBadges();
  $('#view').innerHTML=`<section class='grid two'>${cards}<div class='card'><b>Stratégie</b><div>${sXP} XP (Niv ${Math.floor(sXP/100)+1})</div><div class='progress'><span style='width:${sXP%100}%'></span></div></div><div class='card'><b>Total</b><div>${totalXP+sXP} XP (Niv ${Math.floor((totalXP+sXP)/100)+1})</div><div class='progress'><span style='width:${(totalXP+sXP)%100}%'></span></div></div></section>
  <section class='card'><h3>Streaks</h3><p>Discipline: ${streaks.discipline}</p><p>WhiteRoom (MVD): ${streaks.whiteroom}</p><p>Meilleur: ${streaks.best}</p><p>Strategy: ${strategyStats().streak}</p></section>
  <section class='card'><h3>Badges</h3>${badges.map(b=>`<span class='badge ${b.ok?'unlocked':''}'>${b.ok?'✅':'🔒'} ${b.name}</span>`).join('')}</section>
  <section class='card'><h3>Export / Import</h3><div class='row gap-sm wrap'><button id='expJson'>Export JSON</button><input id='impJson' type='file' accept='application/json'/><button id='expCsv'>Export CSV</button></div></section>`;
  $('#expJson').onclick=()=>download('whiteroom-export.json',JSON.stringify(state,null,2),'application/json');
  $('#expCsv').onclick=()=>download('whiteroom-export.csv',toCSV(),'text/csv');
  $('#impJson').onchange=async(e)=>{const f=e.target.files[0]; if(!f) return; const t=await f.text(); try{ const obj=JSON.parse(t); if(!obj.version) obj.version=1; state={...defaultState(),...obj}; state=loadFromObject(state); save(); toast('Import réussi'); }catch{ toast('Import invalide'); }};
}
function loadFromObject(obj){
  const m={...defaultState(),...obj};
  m.strategyCases=(m.strategyCases||[]).map(c=>({id:c.id||uid(),title:c.title||'Case',context:c.context||'',createdAt:c.createdAt||new Date().toISOString(),updatedAt:c.updatedAt||new Date().toISOString(),modules:{...defaultStrategyModules(),...(c.modules||{})},xpAwarded:c.xpAwarded||{},completedAt:c.completedAt||{}}));
  return m;
}

function renderSettings(){
  $('#view').innerHTML=`<section class='card grid two'><div><h3>Locks</h3><label>Mode</label><select id='lockMode'><option>off</option><option>soft</option><option>hard</option></select><label>Seuil %</label><input id='th' type='number' min='1' max='100' value='${state.settings.unlockThreshold}'/><label>Fenêtre</label><select id='win'><option value='30j'>30j</option><option value='60j'>60j</option><option value='90j'>90j</option><option value='all'>depuis le début</option></select></div><div><h3>CAP 3 / Quêtes</h3><label><input id='cap3' type='checkbox' ${state.settings.cap3?'checked':''}/> Activer CAP 3</label><label>Objectifs max</label><input id='capCount' type='number' min='1' max='10' value='${state.settings.capCount}'/><label><input id='sq' type='checkbox' ${state.settings.strategyQuest?'checked':''}/> Strategy Quest dans Aujourd'hui</label></div></section>`;
  $('#lockMode').value=state.settings.lockMode; $('#win').value=state.settings.unlockWindow;
  $('#lockMode').onchange=e=>{state.settings.lockMode=e.target.value;save();}; $('#th').onchange=e=>{state.settings.unlockThreshold=Number(e.target.value);save();}; $('#win').onchange=e=>{state.settings.unlockWindow=e.target.value;save();};
  $('#cap3').onchange=e=>{state.settings.cap3=e.target.checked;save();}; $('#capCount').onchange=e=>{state.settings.capCount=Number(e.target.value);save();}; $('#sq').onchange=e=>{state.settings.strategyQuest=e.target.checked;save();};
}

function seedLibrary(){ [['book','doing','Classroom of the Elite Year 1'],['book','todo','1984'],['book','todo','Le Mage du Kremlin'],['book','todo','Chaos Protocol'],['history','todo','Braudel'],['theology','todo','Fondements de théologie'],['film','todo','Cinéma d’auteur — sélection'],['language','todo','Italien grammaire active']].forEach(([type,status,title])=>state.library.push({id:uid(),type,status,title,note:'',createdAt:new Date().toISOString()})); }
function seedSkillTree(){ if(state.skills.length) return; const add=(name,category,x,y,parents=[],difficulty='base')=>{const id=uid();state.skills.push({id,name,category,description:'',targetPerWeek:3,startDate:todayISO(),color:'#7aa2ff',positionX:x,positionY:y,parents,difficulty});return id;}; const wr=add('WhiteRoom','Discipline',1,1,[]); const dis=add('Discipline','Discipline',2,1,[wr]); const corps=add('Corps','Corps',2,2,[dis]); const esprit=add('Esprit','Esprit',2,3,[dis]); const journal=add('Journal','Discipline',2,4,[dis]); add('Review','Discipline',2,5,[journal]); const c1=add('Calisthénie Base','Corps',3,1,[corps]); const c2=add('Calisthénie Volume','Corps',3,2,[c1]); const c3=add('Calisthénie Intermédiaire','Corps',3,3,[c2]); const c4=add('Calisthénie Avancé','Corps',3,4,[c3],'hard'); add('Calisthénie Master','Corps',3,5,[c4],'hard'); const y1=add('Yoga Base','Corps',4,1,[corps]); const y2=add('Yoga Flow','Corps',4,2,[y1]); const y3=add('Yoga Avancé','Corps',4,3,[y2],'hard'); add('Yoga Master Pose','Corps',4,4,[y3],'hard'); const b1=add('Boxe Thaï Technique','Corps',5,1,[corps]); const b2=add('Boxe Thaï Conditioning','Corps',5,2,[b1]); add('Boxe Thaï Sparring','Corps',5,3,[b2],'hard'); const l1=add('Lecture Lire','Esprit',6,1,[esprit]); const l2=add('Lecture Notes','Esprit',6,2,[l1]); const l3=add('Lecture Synthèse','Esprit',6,3,[l2],'hard'); add('Lecture Output','Esprit',6,4,[l3],'hard'); const m1=add('Méditation 10','Esprit',7,1,[esprit]); const m2=add('Méditation 20','Esprit',7,2,[m1]); const m3=add('Méditation Concentration','Esprit',7,3,[m2]); const m4=add('Méditation Ouverte','Esprit',7,4,[m3]); add('Méditation Longue','Esprit',7,5,[m4],'hard'); add('Filmographie','Esprit',8,1,[esprit]); add('Histoire','Esprit',8,2,[esprit]); add('Théologie','Esprit',8,3,[esprit]); const lr=add('Linguistique','Langues',9,1,[wr]); const it=add('Italien Session','Langues',9,2,[lr]); const it2=add('Italien Input','Langues',9,3,[it]); const it3=add('Italien Output','Langues',9,4,[it2],'hard'); add('Italien Mastery','Langues',9,5,[it3],'hard'); const en=add('Anglais Session','Langues',10,2,[lr]); add('Anglais Input','Langues',10,3,[en]); const es=add('Espagnol Session','Langues',11,2,[lr]); add('Espagnol Input','Langues',11,3,[es]); const e1=add('Échecs Tactiques','Esprit',12,1,[esprit]); const e2=add('Échecs Parties','Esprit',12,2,[e1]); const e3=add('Échecs Étude','Esprit',12,3,[e2]); add('Échecs Analyse','Esprit',12,4,[e3],'hard'); const p1=add('Piano Technique','Esprit',13,1,[esprit]); const p2=add('Piano Morceaux','Esprit',13,2,[p1]); const p3=add('Piano Régularité','Esprit',13,3,[p2]); add('Piano Performance','Esprit',13,4,[p3],'hard'); }

function toCSV(){
  const skills=state.skills, dates=Object.keys(state.dailyLogs).sort();
  const head=['date','score','streak_discipline','streak_whiteroom','xp_gagne','strategy_xp_total','strategy_modules_done','journal',...skills.map(s=>s.name)];
  const rows=[head.join(',')], st=computeStreaks(), sStats=strategyStats();
  for(const d of dates){ const logs=state.dailyLogs[d]||{}; const done=Object.values(logs).filter(x=>x.done).length; const score=skills.length?Math.round(done/skills.length*100):0; const xp=Object.entries(state.xpBySkillDay).filter(([k])=>k.startsWith(d+':')).reduce((a,[,v])=>a+v,0); const j=state.journals[d]; const jt=j?`Fait:${j.fait} | Appris:${j.appris} | Demain:${j.demain}`:''; rows.push([d,score,st.discipline,st.whiteroom,xp,strategyXP(),sStats.counts.totalModules,`"${jt.replaceAll('"','""')}"`,...skills.map(s=>logs[s.id]?.done?'1':'0')].join(',')); }
  return rows.join('\n');
}
function download(name,content,type){ const b=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; a.click(); }

document.getElementById('newQuoteBtn').onclick=()=>{ state.quoteIndex=(state.quoteIndex+1)%quotes.length; save(); };
document.getElementById('copyQuoteBtn').onclick=()=>{ navigator.clipboard.writeText(quotes[state.quoteIndex]); toast('Phrase copiée'); };
render();
