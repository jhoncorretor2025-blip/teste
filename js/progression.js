// Progressão do jogador — moedas, XP, nível, desafios, desafio diário, sequência e Liga.
// Tudo fica salvo no navegador. O progresso pessoal não entra no pacote do multiplayer.
const KEY = 'snakeArenaProgressionV1';

export const CHALLENGES = [
  { id:'eat10', title:'🍎 Bom Apetite', desc:'Coma 10 comidas', target:10, type:'foods', rewardCoins:8, rewardXp:35 },
  { id:'combo3', title:'🔥 Combo Relâmpago', desc:'Faça um combo x3', target:3, type:'combo', rewardCoins:10, rewardXp:40 },
  { id:'score200', title:'⭐ Pontuação Forte', desc:'Alcance 200 pontos', target:200, type:'score', rewardCoins:12, rewardXp:50 },
  { id:'length20', title:'🐍 Cresça Bastante', desc:'Chegue a 20 segmentos', target:20, type:'length', rewardCoins:12, rewardXp:50 },
  { id:'survive60', title:'🛡️ Aguente Firme', desc:'Sobreviva 60 segundos', target:60, type:'survive', rewardCoins:15, rewardXp:60 },
];

// 🛒 Loja: mapas são temas visuais e fantasias são padrões da pele.
export const SHOP_MAPS = [
  { id:'cyber', name:'Cyber Neon', cost:80, icon:'🤖', desc:'Arena futurista com luzes ciano.' },
  { id:'aurora', name:'Aurora Boreal', cost:120, icon:'🌌', desc:'Arena com brilho verde e azul.' },
  { id:'volcano', name:'Vulcão', cost:150, icon:'🌋', desc:'Arena quente com visual de lava.' },
  { id:'candy', name:'Mundo Doce', cost:180, icon:'🍭', desc:'Arena colorida de doces.' },
];

export const SHOP_SKINS = [
  { id:'neon', name:'Neon', cost:60, icon:'💚', desc:'Fantasia verde neon.' },
  { id:'fire', name:'Fogo', cost:90, icon:'🔥', desc:'Fantasia com visual de fogo.' },
  { id:'ice', name:'Gelo', cost:110, icon:'❄️', desc:'Fantasia gelada.' },
  { id:'galaxy', name:'Galáxia', cost:160, icon:'🌌', desc:'Fantasia inspirada no espaço.' },
  { id:'venom', name:'Veneno', cost:200, icon:'☣️', desc:'Fantasia tóxica e rara.' },
];

export const COSMETICS = [
  { id:'goldTrail', name:'✨ Rastro Dourado', cost:30, desc:'Deixa seu rastro com brilho dourado.' },
  { id:'neonHead', name:'💎 Cabeça Neon', cost:50, desc:'Aumenta o brilho da sua cabeça.' },
  { id:'championBadge', name:'👑 Emblema Campeão', cost:80, desc:'Mostra uma coroa no seu cartão de progresso.' },
];

export const DAILY_CHALLENGES = [
  { id:'daily_eat20', title:'🍎 Banquete do Dia', desc:'Coma 20 pontos de comida', target:20, type:'foods', rewardCoins:25, rewardXp:90 },
  { id:'daily_combo5', title:'🔥 Combo do Dia', desc:'Faça um combo x5', target:5, type:'combo', rewardCoins:30, rewardXp:110 },
  { id:'daily_score300', title:'⭐ 300 Pontos', desc:'Alcance 300 pontos', target:300, type:'score', rewardCoins:35, rewardXp:125 },
  { id:'daily_length30', title:'🐍 Cresça Hoje', desc:'Chegue a 30 segmentos', target:30, type:'length', rewardCoins:30, rewardXp:110 },
  { id:'daily_survive90', title:'🛡️ Sobrevivente do Dia', desc:'Sobreviva 90 segundos', target:90, type:'survive', rewardCoins:40, rewardXp:140 },
  { id:'daily_eat30', title:'🥕 Fome de Arena', desc:'Coma 30 pontos de comida', target:30, type:'foods', rewardCoins:40, rewardXp:135 },
  { id:'daily_score500', title:'👑 Mestre do Dia', desc:'Alcance 500 pontos', target:500, type:'score', rewardCoins:50, rewardXp:170 },
];

export const STREAK_REWARDS = [
  { day:1, coins:5, xp:15, label:'🎁 Primeira chama' },
  { day:2, coins:7, xp:20, label:'🔥 Ritmo pegando' },
  { day:3, coins:12, xp:35, label:'🔥 3 dias seguidos' },
  { day:5, coins:18, xp:50, label:'🔥 Sequência forte' },
  { day:7, coins:30, xp:80, label:'🏆 1 semana' },
  { day:14, coins:50, xp:130, label:'💎 2 semanas' },
  { day:30, coins:100, xp:250, label:'👑 30 dias' },
];

export const LEAGUES = [
  { id:'bronze', name:'Bronze', icon:'🥉', min:0 },
  { id:'silver', name:'Prata', icon:'🥈', min:100 },
  { id:'gold', name:'Ouro', icon:'🥇', min:300 },
  { id:'platinum', name:'Platina', icon:'💠', min:650 },
  { id:'diamond', name:'Diamante', icon:'💎', min:1200 },
  { id:'legend', name:'Lenda', icon:'👑', min:2200 },
];

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dailyIndex(dateKey) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  return hash % DAILY_CHALLENGES.length;
}

function syncDailyChallenge(data) {
  const dateKey = localDateKey();
  if (data.dailyChallenge?.dateKey === dateKey) return false;
  const base = DAILY_CHALLENGES[dailyIndex(dateKey)];
  data.dailyChallenge = { ...base, dateKey, progress:0, completed:false, startedAt:Date.now() };
  data.dailyCompletedCount = Number(data.dailyCompletedCount) || 0;
  return true;
}

function defaults() {
  return {
    coins:0,
    xp:0,
    level:1,
    completedChallenges:0,
    challenge:null,
    unlockedCosmetics:[],
    selectedCosmetic:null,
    lastChallengeId:null,
    dailyChallenge:null,
    dailyCompletedCount:0,
    lastStreakRewardDate:null,
    leaguePoints:0,
    leaguePeakPoints:0,
    unlockedMaps:[],
    unlockedSkins:[],
  };
}

let cachedProgression = null;

function saveProgression(data) {
  cachedProgression = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  return data;
}

export function loadProgression() {
  if (!cachedProgression) {
    try {
      cachedProgression = { ...defaults(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) };
    } catch {
      cachedProgression = defaults();
    }
  }
  if (!Array.isArray(cachedProgression.unlockedMaps)) cachedProgression.unlockedMaps = [];
  if (!Array.isArray(cachedProgression.unlockedSkins)) cachedProgression.unlockedSkins = [];
  if (!Array.isArray(cachedProgression.unlockedMaps)) cachedProgression.unlockedMaps = [];
  if (!Array.isArray(cachedProgression.unlockedSkins)) cachedProgression.unlockedSkins = [];
  if (syncDailyChallenge(cachedProgression)) saveProgression(cachedProgression);
  return cachedProgression;
}

export function xpForNextLevel(level) {
  return 100 + Math.max(0, level - 1) * 50;
}

export function calculateLevel(totalXp) {
  let level = 1;
  let xp = Math.max(0, Number(totalXp) || 0);
  while (xp >= xpForNextLevel(level) && level < 1000) {
    xp -= xpForNextLevel(level);
    level++;
  }
  return level;
}

export function addProgressionReward({ xp = 0, coins = 0 } = {}) {
  const data = loadProgression();
  const oldLevel = Number(data.level) || 1;
  data.xp = Math.max(0, Number(data.xp) || 0) + Math.max(0, Number(xp) || 0);
  data.coins = Math.max(0, Number(data.coins) || 0) + Math.max(0, Number(coins) || 0);
  data.level = calculateLevel(data.xp);
  saveProgression(data);
  if (data.level > oldLevel) showProgressionToast(`🎉 Nível ${data.level} alcançado!`);
  refreshProgressionUI();
  return data;
}

export function startProgressionChallenge() {
  const data = loadProgression();
  const pool = CHALLENGES.filter(c => c.id !== data.lastChallengeId);
  const source = pool.length ? pool : CHALLENGES;
  const challenge = source[Math.floor(Math.random() * source.length)];
  data.challenge = { ...challenge, progress:0, startedAt:Date.now(), completed:false };
  data.lastChallengeId = challenge.id;
  saveProgression(data);
  refreshProgressionUI();
  return data.challenge;
}

function applyChallengeProgress(challenge, type, value) {
  if (!challenge || challenge.completed || challenge.type !== type) return false;
  const amount = Number(value) || 0;
  if (['combo','score','length'].includes(type)) {
    challenge.progress = Math.max(Number(challenge.progress) || 0, amount);
  } else {
    challenge.progress = (Number(challenge.progress) || 0) + amount;
  }
  // O loop envia o tempo sobrevivido da vida atual como "value". Isso também faz o
  // Desafio do Dia funcionar corretamente: ficar com a página aberta não conta como jogo.
  if (challenge.progress >= challenge.target) {
    challenge.progress = challenge.target;
    challenge.completed = true;
    return true;
  }
  return false;
}

export function trackProgressionEvent(type, value = 1) {
  const data = loadProgression();
  const completed = [];
  if (applyChallengeProgress(data.challenge, type, value)) completed.push({ kind:'match', challenge:data.challenge });
  if (applyChallengeProgress(data.dailyChallenge, type, value)) completed.push({ kind:'daily', challenge:data.dailyChallenge });

  if (completed.length) {
    data.completedChallenges = (Number(data.completedChallenges) || 0) +
      completed.filter(x => x.kind === 'match').length;
    data.dailyCompletedCount = (Number(data.dailyCompletedCount) || 0) +
      completed.filter(x => x.kind === 'daily').length;
    saveProgression(data);
    completed.forEach(({ kind, challenge }) => {
      showProgressionToast(
        kind === 'daily'
          ? `🌟 Desafio do dia concluído! +${challenge.rewardCoins} 🪙`
          : `🎯 Desafio concluído! +${challenge.rewardCoins} 🪙`
      );
      addProgressionReward({ xp:challenge.rewardXp, coins:challenge.rewardCoins });
    });
    return loadProgression();
  }

  saveProgression(data);
  refreshProgressionUI();
  return data;
}

export function rewardFood(value = 1, combo = 1) {
  const points = Math.max(1, Number(value) || 1);
  const comboBonus = combo >= 3 ? Math.min(4, combo - 2) : 0;
  return addProgressionReward({ xp:2 * points + comboBonus * 2, coins:1 + (comboBonus > 0 ? 1 : 0) });
}

export function rewardMatchStart() {
  return addProgressionReward({ xp:10, coins:1 });
}

export function rewardMilestone() {
  return addProgressionReward({ xp:8, coins:2 });
}

export function claimStreakReward(streak) {
  const data = loadProgression();
  const today = localDateKey();
  if (data.lastStreakRewardDate === today) return { claimed:false, streak };
  const reward = STREAK_REWARDS.find(r => r.day === Number(streak)) ||
    { coins:5, xp:15, label:'🎁 Recompensa diária' };
  data.lastStreakRewardDate = today;
  saveProgression(data);
  addProgressionReward({ xp:reward.xp, coins:reward.coins });
  showProgressionToast(`${reward.label}! +${reward.coins} 🪙 +${reward.xp} XP`);
  return { claimed:true, streak, reward };
}

export function getNextStreakReward(streak) {
  const s = Math.max(0, Number(streak) || 0);
  return STREAK_REWARDS.find(r => r.day > s) || { day:s + 1, coins:5, xp:15, label:'🎁 Recompensa diária' };
}

export function getLeagueInfo(points = 0) {
  const total = Math.max(0, Number(points) || 0);
  let current = LEAGUES[0];
  for (const tier of LEAGUES) if (total >= tier.min) current = tier;
  const index = LEAGUES.indexOf(current);
  const next = LEAGUES[index + 1] || null;
  const base = current.min;
  const range = next ? next.min - base : Math.max(100, total - base + 100);
  const progress = next ? Math.min(100, Math.round(((total - base) / range) * 100)) : 100;
  return {
    points:total,
    current,
    next,
    progress,
    pointsToNext:next ? Math.max(0, next.min - total) : 0,
  };
}

export function addLeaguePoints(points = 0, reason = 'desempenho') {
  const data = loadProgression();
  const amount = Math.max(0, Math.floor(Number(points) || 0));
  if (!amount) {
    refreshProgressionUI();
    return data;
  }
  const before = getLeagueInfo(data.leaguePoints);
  data.leaguePoints = Math.max(0, Number(data.leaguePoints) || 0) + amount;
  data.leaguePeakPoints = Math.max(Number(data.leaguePeakPoints) || 0, data.leaguePoints);
  const after = getLeagueInfo(data.leaguePoints);
  saveProgression(data);
  if (after.current.id !== before.current.id) {
    showProgressionToast(`🏆 Promoção! ${after.current.icon} Liga ${after.current.name}`);
  } else {
    showProgressionToast(`🏆 +${amount} pontos de Liga`);
  }
  refreshProgressionUI();
  return { ...loadProgression(), leaguePoints:data.leaguePoints, reason };
}

export function awardLeagueRun({ score = 0, length = 0, survivedSec = 0 } = {}) {
  const s = Math.max(0, Number(score) || 0);
  const len = Math.max(0, Number(length) || 0);
  const survive = Math.max(0, Number(survivedSec) || 0);
  if (s < 15 && len < 10 && survive < 10) return 0;
  let points = Math.floor(s / 25) + Math.floor(survive / 20) + Math.max(0, Math.floor(len / 10) - 1);
  if (s >= 100) points += 3;
  points = Math.min(40, Math.max(1, points));
  addLeaguePoints(points, `corrida ${s} pontos`);
  return points;
}

const FREE_MAPS = new Set(['space','night','void','forest','garden','sunflower','jungle','swamp','deep','ice','ocean','glacier','desert','canyon','sunset','city','autumn']);
const FREE_SKINS = new Set(['solid','stripes','dots','tricolor']);

export function isMapUnlocked(id) {
  return FREE_MAPS.has(id) || loadProgression().unlockedMaps.includes(id);
}

export function isSkinUnlocked(id) {
  return FREE_SKINS.has(id) || loadProgression().unlockedSkins.includes(id);
}

export function buyMap(id) {
  const item = SHOP_MAPS.find(x => x.id === id);
  const data = loadProgression();
  if (!item) return data;
  if (isMapUnlocked(id)) { equipMap(id); return data; }
  if (data.coins < item.cost) {
    showProgressionToast('🪙 Faltam ' + (item.cost - data.coins) + ' moedas');
    return data;
  }
  data.coins -= item.cost;
  data.unlockedMaps.push(id);
  saveProgression(data);
  showProgressionToast('🗺️ ' + item.name + ' desbloqueado!');
  equipMap(id);
  refreshProgressionUI();
  return data;
}

export function equipMap(id) {
  if (!isMapUnlocked(id)) return false;
  const select = document.getElementById('boardTheme');
  if (select) {
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles:true }));
  }
  return true;
}

export function buySkin(id) {
  const item = SHOP_SKINS.find(x => x.id === id);
  const data = loadProgression();
  if (!item) return data;
  if (isSkinUnlocked(id)) { equipSkin(id); return data; }
  if (data.coins < item.cost) {
    showProgressionToast('🪙 Faltam ' + (item.cost - data.coins) + ' moedas');
    return data;
  }
  data.coins -= item.cost;
  data.unlockedSkins.push(id);
  saveProgression(data);
  showProgressionToast('🎭 ' + item.name + ' desbloqueada!');
  equipSkin(id);
  document.dispatchEvent(new CustomEvent('shopSkinUnlocked', { detail:id }));
  refreshProgressionUI();
  return data;
}

export function equipSkin(id) {
  if (!isSkinUnlocked(id)) return false;
  const select = document.querySelector('.ppattern[data-i="0"]');
  if (select) {
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles:true }));
  }
  return true;
}

function syncLockedShopOptions() {
  document.querySelectorAll('#boardTheme option[data-shop-map]').forEach(option => {
    if (!option.dataset.shopOriginal) option.dataset.shopOriginal = option.textContent;
    const unlocked = isMapUnlocked(option.value);
    option.disabled = !unlocked;
    option.textContent = unlocked ? option.dataset.shopOriginal : '🔒 ' + option.dataset.shopOriginal;
  });
}

export function getSelectedCosmetic() {
  return loadProgression().selectedCosmetic || null;
}

export function buyCosmetic(id) {
  const item = COSMETICS.find(c => c.id === id);
  if (!item) return loadProgression();
  const data = loadProgression();
  if (data.unlockedCosmetics.includes(id)) {
    data.selectedCosmetic = id;
    saveProgression(data);
    refreshProgressionUI();
    return data;
  }
  if (data.coins < item.cost) {
    showProgressionToast(`🪙 Faltam ${item.cost - data.coins} moedas`);
    return data;
  }
  data.coins -= item.cost;
  data.unlockedCosmetics.push(id);
  data.selectedCosmetic = id;
  saveProgression(data);
  showProgressionToast(`✨ ${item.name} desbloqueado!`);
  refreshProgressionUI();
  return data;
}

export function selectCosmetic(id) {
  const data = loadProgression();
  if (id === null || data.unlockedCosmetics.includes(id)) {
    data.selectedCosmetic = id;
    saveProgression(data);
    refreshProgressionUI();
  }
  return data;
}

export function showProgressionToast(text) {
  const el = document.getElementById('progressionToast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function timeUntilNextDay() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const ms = Math.max(0, tomorrow.getTime() - now.getTime());
  return Math.floor(ms / 3600000) + 'h ' +
    String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0') + 'min';
}

function shopButton(item, type) {
  const data = loadProgression();
  const unlocked = type === 'map'
    ? isMapUnlocked(item.id)
    : type === 'skin'
      ? isSkinUnlocked(item.id)
      : data.unlockedCosmetics.includes(item.id);
  const selected = type === 'map'
    ? document.getElementById('boardTheme')?.value === item.id
    : type === 'skin'
      ? document.querySelector('.ppattern[data-i="0"]')?.value === item.id
      : data.selectedCosmetic === item.id;
  const label = selected ? '✅ Equipado' : unlocked ? 'Toque para equipar' : '🪙 ' + item.cost;
  return '<button type="button" class="shopItem ' + (unlocked ? 'unlocked' : 'locked') + ' ' + (selected ? 'selected' : '') + '" data-shop-type="' + type + '" data-shop-id="' + item.id + '"><span class="shopItemIcon">' + (item.icon || '✨') + '</span><span class="shopItemText"><b>' + item.name + '</b><small>' + label + '</small></span></button>';
}

export function refreshProgressionUI() {
  const data = loadProgression();
  syncLockedShopOptions();
  syncLockedShopOptions();
  const next = xpForNextLevel(data.level);
  let base = 0;
  for (let n = 1; n < data.level; n++) base += xpForNextLevel(n);
  const current = Math.max(0, data.xp - base);
  const pct = Math.min(100, Math.round(current / next * 100));
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('progressCoinsValue', `🪙 ${data.coins}`);
  set('shopCoinsLabel', `🪙 ${data.coins}`);
  set('progressLevelValue', `Nível ${data.level}`);
  set('progressXpValue', `${current}/${next} XP`);
  set('progressChallengeValue', data.challenge ? `${data.challenge.title} • ${data.challenge.progress}/${data.challenge.target}` : 'Nenhum');
  set('progressChallengeMiniValue', data.challenge ? `${data.challenge.progress}/${data.challenge.target}` : '—');

  const bar = document.getElementById('progressXpBar');
  if (bar) bar.style.width = pct + '%';

  const c = data.challenge;
  set('challengeDisplay', c
    ? `${c.title} — ${c.desc} • ${c.progress}/${c.target}${c.completed ? ' ✅' : ''}`
    : '🎯 Nenhum desafio ativo'
  );

  const daily = data.dailyChallenge;
  if (daily) {
    set('dailyChallengeTitle', daily.title);
    set('dailyChallengeDesc', daily.desc);
    set('dailyChallengeProgress', daily.completed
      ? `✅ Concluído hoje! +${daily.rewardCoins} 🪙 +${daily.rewardXp} XP`
      : `${daily.progress}/${daily.target} • ${daily.rewardCoins} 🪙 +${daily.rewardXp} XP`);
    set('dailyChallengeTimer', `⏳ Renova em ${timeUntilNextDay()}`);
    set('dailyChallengeMenu', daily.completed
      ? '🌟 Desafio do dia concluído!'
      : `🎯 ${daily.title} • ${daily.progress}/${daily.target}`);
  }

  const streak = Number((typeof window !== 'undefined' && window.__mioquinhaStreak) || 0);
  const streakValue = document.getElementById('progressStreakValue');
  if (streakValue) streakValue.textContent = streak ? `🔥 ${streak} dias` : '🔥 Comece hoje';
  const reward = getNextStreakReward(streak);
  set('streakRewardValue', `🎁 Dia ${reward.day}: +${reward.coins} 🪙 +${reward.xp} XP`);

  const league = getLeagueInfo(data.leaguePoints);
  set('progressLeagueValue', `${league.current.icon} ${league.current.name}`);
  set('leaguePointsValue', `${league.points} pts`);
  set('leagueNextValue', league.next
    ? `${league.pointsToNext} pts para ${league.next.icon} ${league.next.name}`
    : '👑 Liga máxima alcançada');
  const leagueBar = document.getElementById('leagueProgressBar');
  if (leagueBar) leagueBar.style.width = league.progress + '%';

  const shop = document.getElementById('cosmeticShop');
  if(shop){
    shop.innerHTML='<div class="shopSectionLabel">✨ Itens</div>'+COSMETICS.map(x=>shopButton(x,'item')).join('')+
      '<div class="shopSectionLabel">🗺️ Mapas especiais</div>'+SHOP_MAPS.map(x=>shopButton(x,'map')).join('')+
      '<div class="shopSectionLabel">🎭 Fantasias da minhoca</div>'+SHOP_SKINS.map(x=>shopButton(x,'skin')).join('');
    shop.querySelectorAll('[data-shop-type]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.shopType,id=btn.dataset.shopId;
      if(type==='map')buyMap(id);else if(type==='skin')buySkin(id);else buyCosmetic(id);
    }));
  }
}

export function initProgressionUI() {
  refreshProgressionUI();
  const reroll = document.getElementById('newChallengeBtn');
  if (reroll && !reroll.dataset.bound) {
    reroll.dataset.bound = '1';
    reroll.addEventListener('click', () => {
      startProgressionChallenge();
      showProgressionToast('🎯 Novo desafio escolhido!');
    });
  }
}
