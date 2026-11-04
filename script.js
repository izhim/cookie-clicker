// Cookie helper functions
const COOKIE_NAME = 'clicks';
const COOKIE_DAYS = 365;

function getCookie(name) {
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
  if (saved !== null) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 0;
}

function saveClicks(val) {
  setCookie(COOKIE_NAME, val, COOKIE_DAYS);
}

// Application logic
let count = getStoredClicks();
const counterEl = document.getElementById('counter');
const cookieBtn = document.getElementById('cookieBtn');
const cookieContainer = document.getElementById('cookieContainer');
const resetBtn = document.getElementById('resetBtn');

function updateCounter(newCount, animate = true) {
  count = newCount;
  saveClicks(count);
  counterEl.textContent = count.toLocaleString();

  if (animate) {
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
    updateCounter(0);
  });
}
