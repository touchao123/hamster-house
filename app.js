/* ===== Game State ===== */
let state = {
  coins: 0,
  hunger: 80,
  clean: 80,
  inventory: [],      // owned decoration item IDs
  activeDeco: [],     // decoration IDs currently shown in room
  tasks: {},
  lastSave: Date.now(),
  petName: '小团子'
};

// Shop items
const SHOP_ITEMS = [
  { id: 'food1', name: '瓜子零食', icon: '🌻', price: 30, type: 'food', desc: '仓鼠最爱！' },
  { id: 'food2', name: '水果拼盘', icon: '🍇', price: 50, type: 'food', desc: '新鲜水果' },
  { id: 'deco_bed', name: '小木床', icon: '🛏️', price: 80, type: 'decoration', desc: '温馨小床' },
  { id: 'deco_rug', name: '花地毯', icon: '🟤', price: 60, type: 'decoration', desc: '软软地毯' },
  { id: 'deco_pot', name: '小盆栽', icon: '🪴', price: 40, type: 'decoration', desc: '绿色植物' },
  { id: 'deco_ball', name: '跑轮', icon: '⚽', price: 70, type: 'decoration', desc: '运动健身' },
  { id: 'deco_lamp', name: '小台灯', icon: '💡', price: 50, type: 'decoration', desc: '温暖灯光' },
  { id: 'deco_pic', name: '风景画', icon: '🖼️', price: 45, type: 'decoration', desc: '美丽挂画' },
  { id: 'deco_cushion', name: '软坐垫', icon: '🟣', price: 35, type: 'decoration', desc: '舒服靠垫' },
  { id: 'deco_clock', name: '小闹钟', icon: '⏰', price: 55, type: 'decoration', desc: '滴答滴答' },
];

// Daily tasks
const DAILY_TASKS = [
  { id: 'feed3', name: '喂食 3 次', icon: '🍎', need: 3 },
  { id: 'clean2', name: '清洁 2 次', icon: '🧹', need: 2 },
  { id: 'visit', name: '来看小团子', icon: '👋', need: 1 },
];

// Pet expression mapping based on status
function getPetExpression(hunger, clean) {
  const avg = (hunger + clean) / 2;
  if (avg >= 70) return { face: '😊', pet: '🐹', className: 'pet-happy' };
  if (avg >= 40) return { face: '🙂', pet: '🐹', className: 'pet-neutral' };
  if (avg >= 20) return { face: '😢', pet: '🐹', className: 'pet-sad' };
  return { face: '😰', pet: '🐹', className: 'pet-hungry' };
}

// Decoration emoji mapping
const DECO_EMOJI = {
  'deco_bed': '🛏️',
  'deco_rug': '🟤',
  'deco_pot': '🪴',
  'deco_ball': '⚽',
  'deco_lamp': '💡',
  'deco_pic': '🖼️',
  'deco_cushion': '🟣',
  'deco_clock': '⏰',
};

/* ===== Save / Load ===== */
function saveGame() {
  state.lastSave = Date.now();
  try {
    localStorage.setItem('hamsterHouse', JSON.stringify(state));
  } catch(e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('hamsterHouse');
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge to keep defaults for new fields
      state = { ...state, ...saved };
      // Ensure arrays exist
      if (!state.inventory) state.inventory = [];
      if (!state.activeDeco) state.activeDeco = [];
      if (!state.tasks) state.tasks = {};
      checkDailyReset();
      return true;
    }
  } catch(e) {}
  return false;
}

/* ===== Daily Reset ===== */
function checkDailyReset() {
  const today = new Date().toDateString();
  const savedDay = localStorage.getItem('hamsterHouse_day');
  if (savedDay !== today) {
    // Reset daily tasks
    state.tasks = {};
    DAILY_TASKS.forEach(t => { state.tasks[t.id] = 0; });
    localStorage.setItem('hamsterHouse_day', today);
    saveGame();
  }
}

/* ===== UI Update ===== */
function updateUI() {
  // Coins
  document.getElementById('coinCount').textContent = state.coins;

  // Pet expression
  const expr = getPetExpression(state.hunger, state.clean);
  document.getElementById('petFace').textContent = expr.face;
  document.getElementById('petFace').className = expr.className;

  // Hunger bar
  const hPct = Math.min(100, Math.max(0, Math.round(state.hunger)));
  document.getElementById('hungerBar').style.width = hPct + '%';
  document.getElementById('hungerText').textContent = hPct + '%';

  // Clean bar
  const cPct = Math.min(100, Math.max(0, Math.round(state.clean)));
  document.getElementById('cleanBar').style.width = cPct + '%';
  document.getElementById('cleanText').textContent = cPct + '%';

  // Color thresholds
  document.getElementById('hungerBar').className = 'bar-fill ' + (hPct > 50 ? 'bar-green' : hPct > 20 ? 'bar-yellow' : 'bar-red');
  document.getElementById('cleanBar').className = 'bar-fill ' + (cPct > 50 ? 'bar-blue' : cPct > 20 ? 'bar-yellow' : 'bar-red');

  // Decorations in room
  renderRoom();

  // Panels
  renderShop();
  renderTasks();
  renderDeco();
}

/* ===== Room ===== */
function renderRoom() {
  const container = document.getElementById('decorations');
  container.innerHTML = '';
  if (state.activeDeco.length === 0) {
    container.innerHTML = '<span style="color:#aaa;font-size:14px;">暂无装饰，去商店买吧～</span>';
    return;
  }
  // Show current decorations as emojis
  const shown = new Set();
  state.activeDeco.forEach(id => {
    if (!shown.has(id)) {
      shown.add(id);
      const emoji = DECO_EMOJI[id] || '🎁';
      const span = document.createElement('span');
      span.textContent = emoji;
      span.style.fontSize = '28px';
      container.appendChild(span);
    }
  });
}

/* ===== Shop ===== */
function renderShop() {
  const container = document.getElementById('shopItems');
  container.innerHTML = '';

  // Only show decoration-type items in shop (food items are purchased consumables)
  const shopItems = SHOP_ITEMS.filter(i => i.type === 'decoration');

  shopItems.forEach(item => {
    const owned = state.inventory.includes(item.id);
    const active = state.activeDeco.includes(item.id);
    const canBuy = state.coins >= item.price;

    const div = document.createElement('div');
    div.className = 'grid-item';
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <div class="item-price">🪙 ${item.price}</div>
      <button ${owned && active ? 'disabled class="bought"' : owned ? 'class="bought"' : canBuy ? '' : 'disabled'}>
        ${owned && active ? '✅ 已摆放' : owned ? '🏠 摆放' : canBuy ? '🛒 购买' : '💔 钱不够'}
      </button>
    `;
    div.querySelector('button').onclick = () => handleShopBuy(item);
    container.appendChild(div);
  });
}

function handleShopBuy(item) {
  if (state.inventory.includes(item.id)) {
    // Toggle decoration active state
    const idx = state.activeDeco.indexOf(item.id);
    if (idx >= 0) {
      state.activeDeco.splice(idx, 1);
      showToast(`移除了 ${item.name}`);
    } else {
      state.activeDeco.push(item.id);
      // Animate pet
      document.getElementById('petContainer').classList.add('wiggle');
      setTimeout(() => document.getElementById('petContainer').classList.remove('wiggle'), 300);
      showToast(`摆放了 ${item.name} 🎉`);
    }
    saveGame();
    updateUI();
    return;
  }

  if (state.coins < item.price) {
    showToast('金币不够啦！多做任务赚金币～');
    return;
  }

  state.coins -= item.price;
  state.inventory.push(item.id);
  state.activeDeco.push(item.id);
  showToast(`买了 ${item.name}！🎉`);
  document.getElementById('petContainer').classList.add('wiggle');
  setTimeout(() => document.getElementById('petContainer').classList.remove('wiggle'), 300);
  saveGame();
  updateUI();
}

/* ===== Tasks ===== */
function renderTasks() {
  const container = document.getElementById('taskList');
  container.innerHTML = '';

  checkDailyReset();

  DAILY_TASKS.forEach(task => {
    const progress = state.tasks[task.id] || 0;
    const done = progress >= task.need;

    const div = document.createElement('div');
    div.className = 'task-item';
    div.innerHTML = `
      <div class="task-icon">${task.icon}</div>
      <div class="task-info">
        <div class="task-name">${task.name}</div>
        <div class="task-progress">${done ? '已完成 ✅' : `${progress} / ${task.need}`}</div>
        <div class="task-reward">+10 🪙</div>
      </div>
      <div class="task-status ${done ? 'done' : 'todo'}">${done ? '✅' : '⏳'}</div>
    `;
    container.appendChild(div);
  });
}

function checkTasks(action) {
  let earned = 0;
  DAILY_TASKS.forEach(task => {
    if (!state.tasks[task.id]) state.tasks[task.id] = 0;

    // Check if action matches task
    if (action === 'feed' && task.id === 'feed3') state.tasks[task.id]++;
    if (action === 'clean' && task.id === 'clean2') state.tasks[task.id]++;

    // Check completion
    if (state.tasks[task.id] >= task.need) {
      if (!state.tasks[task.id + '_done']) {
        // Already counting progress, task reward given on first visit of day
      }
    }
  });

  // Visit task: always counts when any action happens
  if (state.tasks['visit'] < 1) {
    state.tasks['visit'] = 1;
  }

  saveGame();
  updateUI();
}

/* ===== Actions ===== */
function feed() {
  if (state.hunger >= 100) {
    showToast('小团子已经很饱了！😋');
    return;
  }
  state.hunger = Math.min(100, state.hunger + 15);
  state.coins += 5;
  document.getElementById('petContainer').classList.add('bounce');
  setTimeout(() => document.getElementById('petContainer').classList.remove('bounce'), 400);
  showToast('🍎 小团子吃得开心！+5 🪙');
  checkTasks('feed');
  saveGame();
  updateUI();
}

function clean() {
  if (state.clean >= 100) {
    showToast('小团子已经很干净了！✨');
    return;
  }
  state.clean = Math.min(100, state.clean + 15);
  state.coins += 5;
  document.getElementById('petContainer').classList.add('bounce');
  setTimeout(() => document.getElementById('petContainer').classList.remove('bounce'), 400);
  showToast('🧹 小团子变干净了！+5 🪙');
  checkTasks('clean');
  saveGame();
  updateUI();
}

// Pet click - gives a small reward and reaction
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('petContainer').addEventListener('click', () => {
    state.coins += 2;
    document.getElementById('petContainer').classList.add('bounce');
    setTimeout(() => document.getElementById('petContainer').classList.remove('bounce'), 400);
    showToast('🐹 小团子蹭了蹭你！+2 🪙');
    saveGame();
    updateUI();
  });
});

/* ===== Decay System ===== */
function decayTick() {
  // Hunger and clean decrease over time
  state.hunger = Math.max(0, state.hunger - 2);
  state.clean = Math.max(0, state.clean - 2);
  updateUI();
}

// Decay every 30 seconds (in real play, slower feels better)
const DECAY_INTERVAL = 30000; // 30s

/* ===== Tab Switching ===== */
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(tab + 'Panel').classList.add('active');

  if (tab === 'shop') renderShop();
  if (tab === 'tasks') renderTasks();
  if (tab === 'deco') renderDeco();
}

/* ===== Decoration Panel ===== */
function renderDeco() {
  const container = document.getElementById('decoList');
  container.innerHTML = '';

  const owned = SHOP_ITEMS.filter(i => i.type === 'decoration' && state.inventory.includes(i.id));
  if (owned.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#aaa;">还没有装饰品，去商店买吧～</div>';
    return;
  }

  owned.forEach(item => {
    const active = state.activeDeco.includes(item.id);
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.innerHTML = `
      <div class="item-icon">${item.icon}</div>
      <div class="item-name">${item.name}</div>
      <button class="${active ? 'bought' : ''}">${active ? '收起' : '摆放'}</button>
    `;
    div.querySelector('button').onclick = () => {
      const idx = state.activeDeco.indexOf(item.id);
      if (idx >= 0) {
        state.activeDeco.splice(idx, 1);
        showToast(`收起了 ${item.name}`);
      } else {
        state.activeDeco.push(item.id);
        showToast(`摆放了 ${item.name}`);
      }
      saveGame();
      updateUI();
    };
    container.appendChild(div);
  });
}

/* ===== Toast ===== */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 1500);
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  loadGame();
  checkDailyReset();
  updateUI();

  // Start decay timer
  setInterval(decayTick, DECAY_INTERVAL);

  // Save periodically
  setInterval(saveGame, 10000);

  // Save on page hide
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveGame();
  });
});
