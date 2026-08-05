// REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = "https://eajlzqbleznhyoxnkvwf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhamx6cWJsZXpuaHlveG5rdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzMzNDQsImV4cCI6MjEwMTQ0OTM0NH0._Rnk8WHn5J0-BnCsVtgLy8olAx9o7LpplybzKCTHuws";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const STEALTH_URL = "https://coneqt-s.mountcarmel.tas.edu.au:4430/#?page=/welcome";

let currentUser = null;
let currentProfile = null;
let currentGroup = null;
let currentSubscription = null;
let selectedGroupId = null;
let isSignUpMode = false;
let userMemberColors = {};

// Fallback safety for ADMIN_PERMISSIONS if config.js is missing
if (typeof ADMIN_PERMISSIONS === 'undefined') {
  window.ADMIN_PERMISSIONS = {
    canChangeGroupName: true,
    canChangeGroupPasscode: true
  };
}

// === HELPER FUNCTIONS ===
function isUserAdmin(user, group) {
  if (!user || !group) return false;
  return group.creator_id === user.id;
}

function handleEnterKey(event, actionFunction) {
  if (event.key === 'Enter') {
    event.preventDefault();
    actionFunction();
  }
}

// === INSTANT STEALTH EXIT ===
function triggerStealth() {
  window.location.replace(STEALTH_URL);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    triggerStealth();
  }
}, { capture: true });

// === INITIALIZATION & AUTO-LOGIN SESSION PERSISTENCE ===
window.addEventListener('DOMContentLoaded', async () => {
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

// === DYNAMIC FAVICON / UNREAD BADGE ===
function updateFaviconBadge(hasUnread) {
  const favicon = document.getElementById('favicon');
  if (!favicon) return;
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
  const submitBtn = document.getElementById('auth-submit-
