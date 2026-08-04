// REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = "https://eajlzqbleznhyoxnkvwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhamx6cWJsZXpuaHlveG5rdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzMzNDQsImV4cCI6MjEwMTQ0OTM0NH0._Rnk8WHn5J0-BnCsVtgLy8olAx9o7LpplybzKCTHuws";

// Variable renamed to avoid scope conflict with the global window.supabase object
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const STEALTH_URL = "https://coneqt-s.mountcarmel.tas.edu.au:4430/#?page=/welcome";

let currentUser = null;
let currentGroup = null;
let currentSubscription = null;
let selectedGroupId = null;
let isSignUpMode = false;

// === INITIALIZATION & AUTO-LOGIN SESSION PERSISTENCE ===
window.addEventListener('DOMContentLoaded', async () => {
  // Checks if the user is already logged in (even after browser close/reopen)
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    showScreen('menu-screen');
    loadUserGroups();
  } else {
    showScreen('auth-screen');
  }
});

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
  updateFaviconBadge(false);
});

// === AUTHENTICATION TOGGLE & SUBMIT ===
function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const usernameInput = document.getElementById('auth-username');
  const title = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleBtn = document.getElementById('auth-toggle-btn');

  if (isSignUpMode) {
    title.innerText = "SEQTA Portal Sign Up";
    usernameInput.classList.remove('hidden');
    submitBtn.innerText = "Create Account";
    toggleBtn.innerText = "Already have an account? Sign In";
  } else {
    title.innerText = "SEQTA Portal Sign In";
    usernameInput.classList.add('hidden');
    submitBtn.innerText = "Sign In";
    toggleBtn.innerText = "Need an account? Sign Up";
  }
}

async function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-pass').value.trim();

  if (!email || !password) {
    return alert("Please enter both email and password.");
  }

  if (isSignUpMode) {
    const username = document.getElementById('auth-username').value.trim();
    if (!username) return alert("Please enter a username.");

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert("Sign Up Error: " + error.message);

    if (data.user) {
      const { error: profileError } = await supabaseClient.from('profiles').insert([
        { id: data.user.id, username: username }
      ]);
      if (profileError) console.error("Profile Creation Error:", profileError);
      
      alert("Account created successfully! Auto-signing you in...");
      currentUser = data.user;
      showScreen('menu-screen');
      loadUserGroups();
    }
  } else {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Sign In Error: " + error.message);

    currentUser = data.user;
    await loadUserProfile();
    showScreen('menu-screen');
    loadUserGroups();
  }
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showScreen('auth-screen');
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
  if (!currentUser) return;
  const themeSettings = {
    bg: document.getElementById('theme-bg').value,
    header: document.getElementById('theme-header').value,
    text: document.getElementById('theme-text').value,
    card: document.getElementById('theme-card').value
  };
  await supabaseClient.from('profiles').update({ theme_settings: themeSettings }).eq('id', currentUser.id);
  closeThemeModal();
}

async function loadUserProfile() {
  if (!currentUser) return;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  if (data && data.theme_settings && data.theme_settings.bg) {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', data.theme_settings.bg);
    root.style.setProperty('--header-color', data.theme_settings.header);
    root.style.setProperty('--text-color', data.theme_settings.text);
    root.style.setProperty('--card-color', data.theme_settings.card);

    document.getElementById('theme-bg').value = data.theme_settings.bg;
    document.getElementById('theme-header').value = data.theme_settings.header;
    document.getElementById('theme-text').value = data.theme_settings.text;
    document.getElementById('theme-card').value = data.theme_settings.card;
  }
}

// === SCREEN SWITCHING ===
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// === GROUPS & PASSCODE ===
async function loadUserGroups() {
  if (!currentUser) return;
  const { data, error } = await supabaseClient.from('group_members').select('group_id, groups(id, name)').eq('user_id', currentUser.id);
  const container = document.getElementById('groups-list');
  container.innerHTML = '';

  if (error) {
    container.innerHTML = '<p>Error loading groups.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No groups joined yet.</p>';
    return;
  }

  data.forEach(item => {
    if (item.groups) {
      const btn = document.createElement('button');
      btn.innerText = item.groups.name;
      btn.onclick = () => promptPasscode(item.groups);
      container.appendChild(btn);
    }
  });
}

function promptPasscode(group) {
  selectedGroupId = group;
  document.getElementById('passcode-modal').classList.remove('hidden');
}

async function verifyPasscode() {
  const enteredPass = document.getElementById('passcode-input').value;
  const { data, error } = await supabaseClient.from('groups').select('*').eq('id', selectedGroupId.id).single();

  if (error || !data) return alert("Group not found.");

  if (data.passcode === enteredPass) {
    currentGroup = data;
    document.getElementById('passcode-modal').classList.add('hidden');
    document.getElementById('passcode-input').value = '';
    enterChatRoom();
  } else {
    alert("Incorrect passcode!");
  }
}

async function createGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  const passcode = document.getElementById('new-group-passcode').value.trim();

  if (!name || passcode.length !== 4) {
    return alert("Please supply a valid name and a 4-digit passcode.");
  }

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: groupData, error: groupErr } = await supabaseClient
    .from('groups')
    .insert([{ name, invite_code: inviteCode, passcode, creator_id: currentUser.id }])
    .select()
    .single();

  if (groupErr) return alert("Creation error: " + groupErr.message);

  await supabaseClient.from('group_members').insert([
    { group_id: groupData.id, user_id: currentUser.id, is_admin: true }
  ]);

  alert(`Group Created! Share this invite code with others: ${inviteCode}`);
  document.getElementById('new-group-name').value = '';
  document.getElementById('new-group-passcode').value = '';
  loadUserGroups();
}

async function joinGroup() {
  const inviteCode = document.getElementById('join-code').value.trim().toUpperCase();
  if (!inviteCode) return alert("Enter an invite code.");

  const { data: groupData, error } = await supabaseClient.from('groups').select('*').eq('invite_code', inviteCode).single();
  if (error || !groupData) return alert("Invalid invite code.");

  const { error: joinErr } = await supabaseClient.from('group_members').insert([
    { group_id: groupData.id, user_id: currentUser.id, is_admin: false }
  ]);

  if (joinErr) return alert("Already in group or error joining.");

  alert("Joined successfully!");
  document.getElementById('join-code').value = '';
  loadUserGroups();
}

// === MESSAGING & REALTIME ===
async function enterChatRoom() {
  showScreen('chat-screen');
  document.getElementById('current-group-title').innerText = currentGroup.name;

  const { data } = await supabaseClient.from('group_members').select('is_admin').eq('group_id', currentGroup.id).eq('user_id', currentUser.id).single();
  if (data && data.is_admin) {
    document.getElementById('admin-panel-btn').classList.remove('hidden');
  } else {
    document.getElementById('admin-panel-btn').classList.add('hidden');
  }

  fetchMessages();
  subscribeToRealtime();
}

async function fetchMessages() {
  const { data } = await supabaseClient.from('messages').select('*, profiles(username)').eq('group_id', currentGroup.id).order('created_at', { ascending: true });
  const container = document.getElementById('messages-container');
  container.innerHTML = '';
  if (data) {
    data.forEach(msg => renderMessage(msg));
  }
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

  await supabaseClient.from('messages').insert([{
    group_id: currentGroup.id,
    user_id: currentUser.id,
    content: input.value
  }]);
  input.value = '';
}

function subscribeToRealtime() {
  if (currentSubscription) supabaseClient.removeChannel(currentSubscription);

  currentSubscription = supabaseClient.channel('realtime:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${currentGroup.id}` }, async payload => {
      const { data } = await supabaseClient.from('profiles').select('username').eq('id', payload.new.user_id).single();
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
