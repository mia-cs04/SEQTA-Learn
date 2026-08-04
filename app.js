// REPLACE WITH YOUR SUPABASE KEYS
const SUPABASE_URL = "https://YOUR_SUPABASE_PROJECT_ID.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STEALTH_URL = "https://coneqt-s.mountcarmel.tas.edu.au:4430/#?page=/welcome";

let currentUser = null;
let currentGroup = null;
let currentSubscription = null;
let unreadCount = 0;

// === STEALTH & KEYBOARD TRIGGERS ===
function triggerStealth() {
  window.location.href = STEALTH_URL;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    triggerStealth();
  }
});

// === DYNAMIC FAVICON / UNREAD BADGE ===
function updateFaviconBadge(hasUnread) {
  const favicon = document.getElementById('favicon');
  if (hasUnread) {
    document.title = "(1) SEQTA Learn";
    favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23dc2626%22/></svg>";
  } else {
    document.title = "SEQTA Learn";
    favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%234a90e2%22/></svg>";
  }
}

window.addEventListener('focus', () => {
  unreadCount = 0;
  updateFaviconBadge(false);
});

// === AUTHENTICATION ===
async function handleSignUp() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-pass').value;
  const username = document.getElementById('auth-username').value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);

  await supabase.from('profiles').insert([{ id: data.user.id, username }]);
  alert("Account created successfully! Please sign in.");
}

async function handleSignIn() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-pass').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  currentUser = data.user;
  loadUserProfile();
  showScreen('menu-screen');
  loadUserGroups();
}

// === THEME CUSTOMISATION ===
function applyCustomTheme() {
  const root = document.documentElement;
  root.style.setProperty('--bg-color', document.getElementById('theme-bg').value);
  root.style.setProperty('--header-color', document.getElementById('theme-header').value);
  root.style.setProperty('--text-color', document.getElementById('theme-text').value);
  root.style.setProperty('--card-color', document.getElementById('theme-card').value);
}

async function saveThemeToAccount() {
  const themeSettings = {
    bg: document.getElementById('theme-bg').value,
    header: document.getElementById('theme-header').value,
    text: document.getElementById('theme-text').value,
    card: document.getElementById('theme-card').value
  };
  await supabase.from('profiles').update({ theme_settings: themeSettings }).eq('id', currentUser.id);
  closeThemeModal();
}

async function loadUserProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data && data.theme_settings && data.theme_settings.bg) {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', data.theme_settings.bg);
    root.style.setProperty('--header-color', data.theme_settings.header);
    root.style.setProperty('--text-color', data.theme_settings.text);
    root.style.setProperty('--card-color', data.theme_settings.card);
  }
}

// === SCREEN SWITCHING ===
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// === GROUPS & PASSCODE ===
let selectedGroupId = null;

async function loadUserGroups() {
  const { data } = await supabase.from('group_members').select('group_id, groups(id, name)').eq('user_id', currentUser.id);
  const container = document.getElementById('groups-list');
  container.innerHTML = '';
  if (data) {
    data.forEach(item => {
      const btn = document.createElement('button');
      btn.innerText = item.groups.name;
      btn.onclick = () => promptPasscode(item.groups);
      container.appendChild(btn);
    });
  }
}

function promptPasscode(group) {
  selectedGroupId = group;
  document.getElementById('passcode-modal').classList.remove('hidden');
}

async function verifyPasscode() {
  const enteredPass = document.getElementById('passcode-input').value;
  const { data } = await supabase.from('groups').select('*').eq('id', selectedGroupId.id).single();

  if (data.passcode === enteredPass) {
    currentGroup = data;
    document.getElementById('passcode-modal').classList.add('hidden');
    document.getElementById('passcode-input').value = '';
    enterChatRoom();
  } else {
    alert("Incorrect passcode!");
  }
}

// === MESSAGING & REALTIME ===
async function enterChatRoom() {
  showScreen('chat-screen');
  document.getElementById('current-group-title').innerText = currentGroup.name;

  // Check Admin Rights
  const { data } = await supabase.from('group_members').select('is_admin').eq('group_id', currentGroup.id).eq('user_id', currentUser.id).single();
  if (data && data.is_admin) {
    document.getElementById('admin-panel-btn').classList.remove('hidden');
  } else {
    document.getElementById('admin-panel-btn').classList.add('hidden');
  }

  fetchMessages();
  subscribeToRealtime();
}

async function fetchMessages() {
  const { data } = await supabase.from('messages').select('*, profiles(username)').eq('group_id', currentGroup.id).order('created_at', { ascending: true });
  const container = document.getElementById('messages-container');
  container.innerHTML = '';
  data.forEach(msg => renderMessage(msg));
  container.scrollTop = container.scrollHeight;
}

function renderMessage(msg) {
  const container = document.getElementById('messages-container');
  const div = document.createElement('div');
  div.className = `msg-bubble ${msg.is_broadcast ? 'broadcast' : ''}`;
  div.innerHTML = `<strong>${msg.profiles ? msg.profiles.username : 'User'}:</strong> ${msg.content}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  if (!input.value.trim()) return;

  await supabase.from('messages').insert([{
    group_id: currentGroup.id,
    user_id: currentUser.id,
    content: input.value
  }]);
  input.value = '';
}

function subscribeToRealtime() {
  if (currentSubscription) supabase.removeChannel(currentSubscription);

  currentSubscription = supabase.channel('realtime:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${currentGroup.id}` }, async payload => {
      const { data } = await supabase.from('profiles').select('username').eq('id', payload.new.user_id).single();
      payload.new.profiles = data;
      renderMessage(payload.new);
      
      if (document.hidden) {
        updateFaviconBadge(true);
      }
    }).subscribe();
}

// === MODAL HELPERS ===
function closePasscodeModal() { document.getElementById('passcode-modal').classList.add('hidden'); }
function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }
function openThemeModal() { document.getElementById('theme-modal').classList.remove('hidden'); }
function closeThemeModal() { document.getElementById('theme-modal').classList.add('hidden'); }
function leaveChatRoom() { showScreen('menu-screen'); loadUserGroups(); }
