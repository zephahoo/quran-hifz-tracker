
const plans = {
    full: { name: 'Full 30 Juz', totalPages: 600 },
    light: { name: 'Half (15 Juz)', totalPages: 300 },
    intensive: { name: 'Double Pass (60 Juz)', totalPages: 1200 }
};

let currentProfile = null;
let selectedPlan = 'full';
let customSettings = { totalPages: 600, targetDate: '2027-02-08' };
let completedDays = [];
let activeWeek = 1;
let currentDate = new Date();
let ramadanDate = new Date('2027-02-08T00:00:00+08:00');

const quotes = [
    '"And We have certainly made the Quran easy for remembrance, so is there any who will remember?" (Quran 54:17)',
    '"The one who is proficient in the recitation of the Qur\'an will be with the honourable and obedient scribes." (Bukhari)',
    'Consistency is better than intensity. Small drops carve stones.',
    '"Read the Quran, for it will come as an intercessor for its reciters on the Day of Resurrection." (Muslim)',
    'Your future self in Taraweeh will thank you for the effort you put in today.',
    '"Verily, with hardship comes ease." (Quran 94:6) Keep pushing!',
    'Every letter you recite is 10 rewards. Imagine the rewards of revising today\'s portion!'
];

function init() {
    setInterval(() => {
        currentDate = new Date();
        if (currentProfile) renderHeader();
    }, 1000);
    
    const lastProfile = localStorage.getItem('hifz_last_profile');
    if (lastProfile) {
        selectProfile(lastProfile);
    } else {
        renderProfileScreen();
    }
}

function getProfiles() {
    return JSON.parse(localStorage.getItem('hifz_profiles') || '[]');
}

function saveProfile(name) {
    const profiles = getProfiles();
    if (!profiles.includes(name)) {
        profiles.push(name);
        localStorage.setItem('hifz_profiles', JSON.stringify(profiles));
    }
}

function selectProfile(name) {
    currentProfile = name;
    localStorage.setItem('hifz_last_profile', name);
    loadProgress();
    renderApp();
}

function logout() {
    currentProfile = null;
    localStorage.removeItem('hifz_last_profile');
    renderProfileScreen();
}

function addNewProfile() {
    const input = document.getElementById('new-profile-name');
    const name = input.value.trim();
    if (name) {
        saveProfile(name);
        selectProfile(name);
    } else {
        alert('Please enter a name first!');
    }
}

function getTargetDate() {
    if (selectedPlan === 'custom') {
        const d = new Date(customSettings.targetDate + "T00:00:00");
        return isNaN(d.getTime()) ? ramadanDate : d;
    }
    return ramadanDate;
}

function loadProgress() {
    const saved = localStorage.getItem(`hifz_data_${currentProfile}`);
    
    if (saved) {
        const data = JSON.parse(saved);
        selectedPlan = data.selectedPlan || 'full';
        customSettings = data.customSettings || { totalPages: 600, targetDate: '2027-02-08' };
        completedDays = data.completedDays || [];
    } else {
        selectedPlan = 'full';
        customSettings = { totalPages: 600, targetDate: '2027-02-08' };
        completedDays = [];
    }

    const target = getTargetDate();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(1, Math.ceil((target.getTime() - currentDate.getTime()) / msPerDay));
    
    if (completedDays.length !== daysLeft) {
        completedDays = Array.from({length: daysLeft}, (_, i) => completedDays[i] || false);
    }
    
    const firstUncompleted = completedDays.findIndex(d => !d);
    activeWeek = firstUncompleted === -1 ? 1 : Math.floor(firstUncompleted / 7) + 1;
}

function saveProgress() {
    const data = { selectedPlan, customSettings, completedDays };
    localStorage.setItem(`hifz_data_${currentProfile}`, JSON.stringify(data));
    renderApp();
}

function toggleDay(index) {
    completedDays[index] = !completedDays[index];
    saveProgress();
}

function changePlan(e) {
    selectedPlan = e.target.value;
    
    // Resize array if date changed between fixed and custom
    const target = getTargetDate();
    const daysLeft = Math.max(1, Math.ceil((target.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    completedDays = Array.from({length: daysLeft}, (_, i) => completedDays[i] || false);
    
    saveProgress();
}

function updateCustomSettings() {
    const pages = parseInt(document.getElementById('custom-pages').value) || 600;
    const date = document.getElementById('custom-date').value || '2027-02-08';
    
    customSettings.totalPages = pages;
    customSettings.targetDate = date;
    
    // Resize array based on new custom date
    const target = getTargetDate();
    const daysLeft = Math.max(1, Math.ceil((target.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    completedDays = Array.from({length: daysLeft}, (_, i) => completedDays[i] || false);
    
    saveProgress();
}

function toggleWeek(weekNum) {
    activeWeek = activeWeek === weekNum ? null : weekNum;
    renderApp();
}

function getStats() {
    const target = getTargetDate();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(1, Math.ceil((target.getTime() - currentDate.getTime()) / msPerDay));
    const totalTasks = daysLeft;
    
    const totalPgs = selectedPlan === 'custom' ? customSettings.totalPages : plans[selectedPlan].totalPages;
    const pagesPerDay = Math.ceil(totalPgs / (daysLeft || 1));
    
    let totalPoints = 0;
    const weeks = [];
    for (let i = 0; i < totalTasks; i += 7) {
        const weekDays = completedDays.slice(i, i + 7);
        const completedInWeek = weekDays.filter(Boolean).length;
        totalPoints += completedInWeek * 10;
        if (completedInWeek === weekDays.length && weekDays.length > 0) totalPoints += 50;
        
        weeks.push({
            weekNumber: Math.floor(i / 7) + 1,
            startIndex: i,
            days: weekDays,
            completedCount: completedInWeek,
            isPerfect: completedInWeek === weekDays.length
        });
    }
    
    const completedCount = completedDays.filter(Boolean).length;
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;
    
    return { daysLeft, totalTasks, pagesPerDay, totalPoints, weeks, completedCount, progressPercent };
}

function renderHeader() {
    const headerEl = document.getElementById('dynamic-header');
    if (!headerEl) return;
    
    const formatterGregorian = new Intl.DateTimeFormat('en-SG', {
        timeZone: 'Asia/Singapore', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const formatterHijri = new Intl.DateTimeFormat('en-SG-u-ca-islamic-umalqura', {
        timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric'
    });
    
    const targetName = selectedPlan === 'custom' ? 'Target Date' : 'Ramadan (Estimated: 8 Feb 2027)';
    headerEl.innerHTML = `
        <div>${formatterGregorian.format(currentDate)}</div>
        <div>${formatterHijri.format(currentDate)} AH</div>
        <div class="countdown">${getStats().daysLeft} Days until ${targetName}</div>
    `;
}

function renderProfileScreen() {
    const app = document.getElementById('app');
    const profiles = getProfiles();
    
    let html = `
        <div class="container" style="max-width: 450px; margin-top: 80px; text-align: center;">
            <h1 style="margin-bottom: 10px; font-size: 2.5rem;">📖 Hifz Tracker</h1>
            <p style="color: #94a3b8; margin-bottom: 40px;">Select your profile to continue</p>
            
            <div class="profile-card">
    `;
    
    if (profiles.length > 0) {
        html += `<h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem;">Welcome Back</h3>
                 <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px;">`;
        profiles.forEach(p => {
            const safeName = p.replace(/'/g, "\'");
            html += `<button class="btn-profile" onclick="selectProfile('${safeName}')">${p}</button>`;
        });
        html += `</div>
                 <div style="width: 100%; height: 1px; background-color: #334155; margin-bottom: 30px;"></div>`;
    }
    
    html += `
                <h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem;">New User</h3>
                <div>
                    <input type="text" id="new-profile-name" class="input-field" placeholder="Enter your name" onkeypress="if(event.key === 'Enter') addNewProfile()">
                    <button class="btn-primary" onclick="addNewProfile()" style="width: 100%;">Create & Start Tracking</button>
                </div>
            </div>
        </div>
    `;
    app.innerHTML = html;
}

function renderApp() {
    const app = document.getElementById('app');
    const stats = getStats();
    const quote = quotes[currentDate.getDay() % quotes.length];
    
    let html = `
        <div class="container">
            <div class="header-top">
                <div style="color: #94a3b8; font-weight: bold;">Salam, <span style="color: #f8fafc;">${currentProfile}</span> 👋</div>
                <button onclick="logout()" class="btn-logout">Switch Profile</button>
            </div>
            
            <div class="header">
                <div>
                    <h1>📖 Pre-Ramadan Hifz</h1>
                    <div id="dynamic-header" class="date-info"></div>
                </div>
                <div class="score-card">
                    <div class="score-title">Total Score</div>
                    <div class="score-value">🏆 ${stats.totalPoints}</div>
                </div>
            </div>
            
            <div class="quote">${quote}</div>
            
            <div class="progress-bg">
                <div class="progress-bar" style="width: ${stats.progressPercent}%"></div>
            </div>
            <div class="progress-text">
                <span>${stats.completedCount} / ${stats.totalTasks} Days Completed</span>
                <span>${stats.progressPercent}%</span>
            </div>
            
            <div class="plan-selector">
                <label>Customize Routine:</label>
                <select onchange="changePlan(event)">
                    ${Object.entries(plans).map(([key, plan]) => `
                        <option value="${key}" ${key === selectedPlan ? 'selected' : ''}>
                            ${plan.name} — Target: ${Math.ceil(plan.totalPages / (stats.daysLeft || 1))} Pages/Day
                        </option>
                    `).join('')}
                    <option value="custom" ${selectedPlan === 'custom' ? 'selected' : ''}>
                        Custom Target...
                    </option>
                </select>
                
                ${selectedPlan === 'custom' ? `
                    <div class="custom-setup">
                        <label>Total Pages to Revise:</label>
                        <input type="number" id="custom-pages" value="${customSettings.totalPages}" onchange="updateCustomSettings()" min="1">
                        <label>Target Date (Deadline):</label>
                        <input type="date" id="custom-date" value="${customSettings.targetDate}" onchange="updateCustomSettings()">
                    </div>
                ` : ''}
            </div>
            
            <h3>Weekly Check-ins</h3>
            <div id="weeks-container">
    `;
    
    stats.weeks.forEach(week => {
        const isExpanded = activeWeek === week.weekNumber;
        html += `
            <div class="week-card ${week.isPerfect ? 'perfect' : ''}">
                <div class="week-header ${week.isPerfect ? 'perfect' : ''}" onclick="toggleWeek(${week.weekNumber})">
                    <div>
                        <span class="week-title ${week.isPerfect ? 'perfect' : ''}">Week ${week.weekNumber}</span>
                        <span class="week-subtitle">(Days ${week.startIndex + 1}-${week.startIndex + week.days.length})</span>
                    </div>
                    <div class="week-stats ${week.isPerfect ? 'perfect' : ''}">
                        <span>${week.completedCount} / ${week.days.length} Days</span>
                        <span class="arrow ${isExpanded ? 'open' : ''}">▼</span>
                    </div>
                </div>
        `;
        
        if (isExpanded) {
            html += `<div class="week-content">`;
            week.days.forEach((isComplete, offset) => {
                const globalIndex = week.startIndex + offset;
                html += `
                    <div class="day-card ${isComplete ? 'completed' : ''}" onclick="toggleDay(${globalIndex})">
                        <div>
                            <div class="day-title ${isComplete ? 'completed' : ''}">Day ${globalIndex + 1}: Revise ${stats.pagesPerDay} Pages</div>
                            <div class="day-points ${isComplete ? 'completed' : ''}">+10 Points</div>
                        </div>
                        <div class="check-circle ${isComplete ? 'completed' : ''}">${isComplete ? '✓' : ''}</div>
                    </div>
                `;
            });
            if (week.isPerfect) {
                html += `<div class="bonus-points">+50 Bonus Points for a Perfect Week! 🌟</div>`;
            }
            html += `</div>`;
        }
        
        html += `</div>`;
    });
    
    html += `</div></div>`;
    app.innerHTML = html;
    renderHeader();
}

window.onload = init;
