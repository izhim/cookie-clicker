// Cookie helper functions
const COOKIE_NAME = 'clicks';
const COOKIE_SIG_NAME = 'clicks_sig';
const ACHIEVEMENTS_COOKIE = 'achievements';
const COOKIE_DAYS = 365;
const SECRET_SALT = 'c00k13_cl1ck3r_s3cr3t_s4lt_v1';

// Simple deterministic hash function for client-side integrity signature
function generateChecksum(val) {
  const str = `${val}:${SECRET_SALT}`;
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(16);
}

// Trophy milestone definitions
const ACHIEVEMENTS = [
  { id: '10', milestone: 10, name: 'Bronze Baker', description: 'Bake 10 cookies' },
  { id: '100', milestone: 100, name: 'Silver Master', description: 'Bake 100 cookies' },
  { id: '1000', milestone: 1000, name: 'Golden Legend', description: 'Bake 1,000 cookies' }
];

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

function setCookie(name, value, days) {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
}

function getStoredClicks() {
  const saved = getCookie(COOKIE_NAME);
  const savedSig = getCookie(COOKIE_SIG_NAME);

  if (saved !== null) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      // Validate signature to prevent unauthorized tampering of cookie value
      if (savedSig !== null && savedSig === generateChecksum(parsed)) {
        return parsed;
      }
      // If cookie exists without valid signature (or was tampered), reset it
      console.warn('Tampering or invalid cookie detected. Resetting count to 0.');
      saveClicks(0);
      return 0;
    }
  }
  // Initialize initial signature if no cookie exists yet
  saveClicks(0);
  return 0;
}

function saveClicks(val) {
  setCookie(COOKIE_NAME, val, COOKIE_DAYS);
  setCookie(COOKIE_SIG_NAME, generateChecksum(val), COOKIE_DAYS);
}

function getStoredAchievements() {
  const saved = getCookie(ACHIEVEMENTS_COOKIE);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  return [];
}

function saveAchievements(unlockedIds) {
  setCookie(ACHIEVEMENTS_COOKIE, JSON.stringify(unlockedIds), COOKIE_DAYS);
}

// Application state
let count = getStoredClicks();
let unlockedAchievements = getStoredAchievements();
let toastTimeout = null;

const counterEl = document.getElementById('counter');
const cookieBtn = document.getElementById('cookieBtn');
const cookieContainer = document.getElementById('cookieContainer');
const resetBtn = document.getElementById('resetBtn');
const achievementToast = document.getElementById('achievementToast');
const toastTitle = document.getElementById('toastTitle');

function showAchievementToast(achievement) {
  if (!achievementToast || !toastTitle) return;

  toastTitle.textContent = `${achievement.name} (${achievement.milestone} clicks)`;
  achievementToast.classList.add('show');

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastTimeout = setTimeout(() => {
    achievementToast.classList.remove('show');
  }, 3000);
}

function updateAchievementsUI(justUnlockedId = null) {
  ACHIEVEMENTS.forEach((ach) => {
    const card = document.getElementById(`trophy-${ach.id}`);
    const badge = document.getElementById(`badge-${ach.id}`);
    if (!card) return;

    const isUnlocked = unlockedAchievements.includes(ach.id) || count >= ach.milestone;

    if (isUnlocked) {
      if (!unlockedAchievements.includes(ach.id)) {
        unlockedAchievements.push(ach.id);
        saveAchievements(unlockedAchievements);
      }
      card.classList.remove('locked');
      card.classList.add('unlocked');
      if (badge) {
        badge.textContent = 'Unlocked';
      }

      if (justUnlockedId === ach.id) {
        card.classList.remove('just-unlocked');
        // Force reflow
        void card.offsetWidth;
        card.classList.add('just-unlocked');
      }
    } else {
      card.classList.remove('unlocked');
      card.classList.remove('just-unlocked');
      card.classList.add('locked');
      if (badge) {
        badge.textContent = 'Locked';
      }
    }
  });
}

function checkAchievements(newCount) {
  ACHIEVEMENTS.forEach((ach) => {
    if (newCount >= ach.milestone && !unlockedAchievements.includes(ach.id)) {
      unlockedAchievements.push(ach.id);
      saveAchievements(unlockedAchievements);
      updateAchievementsUI(ach.id);
      showAchievementToast(ach);
    }
  });
}

function updateCounter(newCount, animate = true) {
  count = newCount;
  saveClicks(count);
  if (counterEl) {
    counterEl.textContent = count.toLocaleString();
  }

  checkAchievements(count);

  if (animate && counterEl) {
    // Punchy pulse effect on counter
    counterEl.style.transform = 'scale(1.2)';
    setTimeout(() => {
      counterEl.style.transform = 'scale(1)';
    }, 100);
  }
}

function createFloatingNumber(x, y) {
  const floatEl = document.createElement('span');
  floatEl.classList.add('floating-feedback');
  floatEl.textContent = '+1';

  // Position relative to cookie container
  const rect = cookieContainer.getBoundingClientRect();
  const posX = x ? (x - rect.left) : (rect.width / 2);
  const posY = y ? (y - rect.top) : (rect.height / 2);

  floatEl.style.left = `${posX}px`;
  floatEl.style.top = `${posY}px`;

  cookieContainer.appendChild(floatEl);

  floatEl.addEventListener('animationend', () => {
    floatEl.remove();
  });
}

function clickCookie(event) {
  updateCounter(count + 1);

  // Trigger button animation class for keyboard accessibility trigger
  cookieBtn.classList.add('clicked');
  setTimeout(() => cookieBtn.classList.remove('clicked'), 100);

  // Add floating +1
  if (event && event.clientX && event.clientY) {
    createFloatingNumber(event.clientX, event.clientY);
  } else {
    createFloatingNumber();
  }
}

// Initialize display with stored count without bounce animation
if (counterEl) {
  counterEl.textContent = count.toLocaleString();
}

if (cookieBtn) {
  cookieBtn.addEventListener('click', clickCookie);
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    unlockedAchievements = [];
    saveAchievements([]);
    updateCounter(0);
    updateAchievementsUI();
  });
}

// Security: Prevent context menu (right-click)
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  return false;
});

// Security: Prevent DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, etc.)
document.addEventListener('keydown', (event) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? event.metaKey : event.ctrlKey;
  const key = event.key ? event.key.toUpperCase() : '';
  const keyCode = event.keyCode || event.which;

  // F12 key
  if (key === 'F12' || keyCode === 123) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
  // or Cmd+Option+I, Cmd+Option+J, Cmd+Option+C on Mac
  if ((modifier && event.shiftKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67)) ||
      (isMac && event.metaKey && event.altKey && (key === 'I' || key === 'J' || key === 'C' || keyCode === 73 || keyCode === 74 || keyCode === 67))) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  // Ctrl+U (View Source) or Cmd+Option+U on Mac
  if ((modifier && (key === 'U' || keyCode === 85)) ||
      (isMac && event.metaKey && event.altKey && (key === 'U' || keyCode === 85))) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }

  // Ctrl+S (Save Page)
  if (modifier && (key === 'S' || keyCode === 83)) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
}, true);

// Periodic cookie integrity check to catch out-of-band edits to document.cookie
setInterval(() => {
  const currentStored = getStoredClicks();
  if (currentStored !== count) {
    updateCounter(currentStored, false);
  }
}, 1000);
// Initial achievements render
updateAchievementsUI();
