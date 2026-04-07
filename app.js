/**
 * Token Refresh Tracker - Mission Control Logic
 */

const STORAGE_KEY = 'tokenRefreshTracker_v2';
let timers = [];
let deleteTargetId = null;
let intervalId = null;

// DOM Elements
const timersGrid = document.getElementById('timers-grid');
const emptyState = document.getElementById('empty-state');
const timerForm = document.getElementById('timer-form');
const emailInput = document.getElementById('email');
const daysInput = document.getElementById('days');
const hoursInput = document.getElementById('hours');
const minutesInput = document.getElementById('minutes');
const emailError = document.getElementById('email-error');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editIdInput = document.getElementById('edit-id');
const editEmailInput = document.getElementById('edit-email');
const editDaysInput = document.getElementById('edit-days');
const editHoursInput = document.getElementById('edit-hours');
const editMinutesInput = document.getElementById('edit-minutes');
const editEmailError = document.getElementById('edit-email-error');

const confirmDialog = document.getElementById('confirm-dialog');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');

const totalCount = document.getElementById('total-count');
const activeCount = document.getElementById('active-count');
const expiredCount = document.getElementById('expired-count');

/**
 * Initialization
 */
function init() {
    loadTimers();
    renderTimers();
    startUpdateLoop();
    requestNotificationPermission();
}

/**
 * Data Persistence
 */
function loadTimers() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        timers = JSON.parse(stored);
        // Check for expired timers since last load
        timers.forEach(t => {
            if (t.status === 'active' && t.targetTime && t.targetTime <= Date.now()) {
                t.status = 'expired';
            }
        });
        saveTimers();
    }
}

function saveTimers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
}

/**
 * Utilities
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00:00';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDuration(days, hours, minutes) {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.length > 0 ? parts.join(' ') : '0m';
}

function getTimerRemainingMs(timer) {
    if (timer.status === 'paused') return timer.pausedRemaining;
    if (timer.status === 'active' && timer.targetTime) return Math.max(0, timer.targetTime - Date.now());
    if (timer.status === 'idle' || timer.status === 'expired') return timer.durationMs;
    return 0;
}

function getCountdownClass(timer) {
    if (timer.status !== 'active') return timer.status;
    const remaining = timer.targetTime - Date.now();
    if (remaining <= 10 * 60 * 1000) return 'danger'; // 10 mins
    if (remaining <= 60 * 60 * 1000) return 'warning'; // 1 hour
    return 'active';
}

/**
 * UI Rendering
 */
function renderTimerCard(timer) {
    const remaining = getTimerRemainingMs(timer);
    const countdownClass = getCountdownClass(timer);
    const statusLabel = timer.status.toUpperCase();
    
    const div = document.createElement('div');
    div.className = `timer-card status-${timer.status} ${countdownClass === 'danger' ? 'danger' : (countdownClass === 'warning' ? 'warning' : '')}`;
    div.dataset.id = timer.id;
    
    const canStart = timer.status === 'idle';
    const canPause = timer.status === 'active';
    const canResume = timer.status === 'paused';
    
    div.innerHTML = `
        <button class="delete-btn" onclick="showDeleteConfirm('${timer.id}')" title="Delete">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
        </button>
        <div class="timer-email" title="${timer.email}">${timer.email}</div>
        <div class="timer-original">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            Planned: ${formatDuration(timer.durationDays, timer.durationHours, timer.durationMinutes)}
        </div>
        <div class="countdown ${countdownClass}" data-id="${timer.id}">
            ${formatCountdown(remaining)}
        </div>
        <div class="timer-controls">
            ${canStart ? `<button onclick="startTimer('${timer.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg> START</button>` : ''}
            ${canPause ? `<button class="btn-pause" onclick="pauseTimer('${timer.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> PAUSE</button>` : ''}
            ${canResume ? `<button class="btn-resume" onclick="resumeTimer('${timer.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"></polygon></svg> RESUME</button>` : ''}
            <button class="btn-secondary btn-edit" onclick="openEditModal('${timer.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
        </div>
    `;
    return div;
}

function renderTimers() {
    timersGrid.innerHTML = '';
    
    if (timers.length === 0) {
        emptyState.style.display = 'block';
        timersGrid.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        timersGrid.style.display = 'grid';
        
        // Sort: Active first, then by remaining time
        const sorted = [...timers].sort((a, b) => {
            if (a.status === 'active' && b.status !== 'active') return -1;
            if (b.status === 'active' && a.status !== 'active') return 1;
            return getTimerRemainingMs(a) - getTimerRemainingMs(b);
        });
        
        sorted.forEach(t => timersGrid.appendChild(renderTimerCard(t)));
    }
    updateStats();
}

function updateStats() {
    totalCount.textContent = timers.length;
    activeCount.textContent = timers.filter(t => t.status === 'active').length;
    expiredCount.textContent = timers.filter(t => t.status === 'expired').length;
}

/**
 * Loop Logic
 */
function startUpdateLoop() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        const timerEls = document.querySelectorAll('.countdown');
        timerEls.forEach(el => {
            const id = el.dataset.id;
            const timer = timers.find(t => t.id === id);
            if (!timer) return;
            
            const remaining = getTimerRemainingMs(timer);
            el.textContent = formatCountdown(remaining);
            
            // Handle transition to expired
            if (timer.status === 'active' && remaining <= 0) {
                timer.status = 'expired';
                timer.targetTime = null;
                saveTimers();
                notifyTimerExpired(timer);
                renderTimers();
            }
            
            // Update classes for visual feedback
            const countdownClass = getCountdownClass(timer);
            el.className = `countdown ${countdownClass}`;
            
            const card = el.closest('.timer-card');
            if (card) {
                card.className = `timer-card status-${timer.status} ${countdownClass === 'danger' ? 'danger' : (countdownClass === 'warning' ? 'warning' : '')}`;
            }
        });
        updateStats();
    }, 1000);
}

/**
 * Actions
 */
function addTimer(email, days, hours, minutes) {
    const durationMs = (days * 24 * 3600000) + (hours * 3600000) + (minutes * 60000);
    const newTimer = {
        id: generateId(),
        email,
        durationDays: days,
        durationHours: hours,
        durationMinutes: minutes,
        durationMs,
        status: 'idle',
        targetTime: null,
        pausedRemaining: 0
    };
    timers.push(newTimer);
    saveTimers();
    renderTimers();
}

function startTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (timer) {
        timer.status = 'active';
        timer.targetTime = Date.now() + timer.durationMs;
        saveTimers();
        renderTimers();
    }
}

function pauseTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (timer && timer.status === 'active') {
        timer.status = 'paused';
        timer.pausedRemaining = Math.max(0, timer.targetTime - Date.now());
        timer.targetTime = null;
        saveTimers();
        renderTimers();
    }
}

function resumeTimer(id) {
    const timer = timers.find(t => t.id === id);
    if (timer && timer.status === 'paused') {
        timer.status = 'active';
        timer.targetTime = Date.now() + timer.pausedRemaining;
        timer.pausedRemaining = 0;
        saveTimers();
        renderTimers();
    }
}

function deleteTimer(id) {
    timers = timers.filter(t => t.id !== id);
    saveTimers();
    renderTimers();
}

/**
 * Modals & Dialogs
 */
function openEditModal(id) {
    const timer = timers.find(t => t.id === id);
    if (!timer) return;
    
    editIdInput.value = timer.id;
    editEmailInput.value = timer.email;
    editDaysInput.value = timer.durationDays;
    editHoursInput.value = timer.durationHours;
    editMinutesInput.value = timer.durationMinutes;
    
    editModal.classList.add('show');
}

function closeEditModal() {
    editModal.classList.remove('show');
}

function showDeleteConfirm(id) {
    deleteTargetId = id;
    confirmDialog.classList.add('show');
}

function hideDeleteConfirm() {
    confirmDialog.classList.remove('show');
}

/**
 * Notifications
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function notifyTimerExpired(timer) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Timer Expired!', {
            body: `Token refresh needed for: ${timer.email}`,
            icon: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png'
        });
    }
    // Sound alert
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
}

/**
 * Event Listeners
 */
timerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const d = parseInt(daysInput.value) || 0;
    const h = parseInt(hoursInput.value) || 0;
    const m = parseInt(minutesInput.value) || 0;
    
    if (email && (d || h || m)) {
        addTimer(email, d, h, m);
        timerForm.reset();
        emailInput.focus();
    }
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editIdInput.value;
    const timer = timers.find(t => t.id === id);
    if (timer) {
        timer.email = editEmailInput.value.trim();
        timer.durationDays = parseInt(editDaysInput.value) || 0;
        timer.durationHours = parseInt(editHoursInput.value) || 0;
        timer.durationMinutes = parseInt(editMinutesInput.value) || 0;
        timer.durationMs = (timer.durationDays * 24 * 3600000) + (timer.durationHours * 3600000) + (timer.durationMinutes * 60000);
        
        // If it was expired, reset it to idle
        if (timer.status === 'expired') {
            timer.status = 'idle';
        }
        
        saveTimers();
        renderTimers();
        closeEditModal();
    }
});

confirmDeleteBtn.addEventListener('click', () => {
    if (deleteTargetId) {
        deleteTimer(deleteTargetId);
        hideDeleteConfirm();
    }
});

cancelDeleteBtn.addEventListener('click', hideDeleteConfirm);

// Start
init();
