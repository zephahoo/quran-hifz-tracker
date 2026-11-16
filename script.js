const PLAN_PAGES = { full: 600, light: 300 };
const MS_PER_DAY = 1000 * 60 * 60 * 24;

let currentProfile = null;
let userData = null;
let activeWeek = 1;
let currentDate = new Date();

const quotes = [
    '"And We have certainly made the Quran easy for remembrance, so is there any who will remember?" (Quran 54:17)',
    '"The one who is proficient in the recitation of the Qur\'an will be with the honourable and obedient scribes." (Bukhari)',
    'Consistency is better than intensity. Small drops carve stones.',
    '"Read the Quran, for it will come as an intercessor for its reciters on the Day of Resurrection." (Muslim)',
    'Your future self will thank you for the effort you put in today.',
    '"Verily, with hardship comes ease." (Quran 94:6) Keep pushing!',
    'Every letter you recite is 10 rewards. Imagine the rewards of revising today\'s portion!'
];

function init() {
    setInterval(() => {
        currentDate = new Date();
        if (currentProfile && userData) renderHeader();
    }, 1000);
    
    const lastProfile = localStorage.getItem('hifz_last_profile');
    if (lastProfile) selectProfile(lastProfile);
    else renderProfileScreen();
}

// --- PROFILE & DATA MANAGEMENT ---
function getProfiles() { return JSON.parse(localStorage.getItem('hifz_profiles') || '[]'); }
function saveProfile(name) {
    const profiles = getProfiles();
    if (!profiles.includes(name)) { profiles.push(name); localStorage.setItem('hifz_profiles', JSON.stringify(profiles)); }
}

function selectProfile(name) {
    currentProfile = name;
    localStorage.setItem('hifz_last_profile', name);
    loadUserData();
    renderApp();
}

function logout() {
    currentProfile = null; userData = null;
    localStorage.removeItem('hifz_last_profile');
    renderProfileScreen();
}

function addNewProfile() {
    const input = document.getElementById('new-profile-name');
    const name = input.value.trim();
    if (name) { saveProfile(name); selectProfile(name); }
    else alert('Please enter a name first!');
}

function loadUserData() {
    const saved = localStorage.getItem(`hifz_data_${currentProfile}`);
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            if (parsed.currentJourney) userData = parsed;
            else userData = migrateOldData(parsed); // Migrate legacy structure
        } catch (e) { userData = createDefaultUserData(); }
    } else {
        userData = createDefaultUserData();
    }
}

function saveUserData() {
    localStorage.setItem(`hifz_data_${currentProfile}`, JSON.stringify(userData));
    renderApp();
}

// --- MIGRATION & DEFAULTS ---
function createDefaultUserData() {
    const defaultProj = createProjectObject("Ramadan Preparation", "ramadan", null, "full", null);
    return {
        currentJourney: 'hifz',
        hifz: { activeProjectId: defaultProj.id, projects: { [defaultProj.id]: defaultProj } },
        tilawah: { activeProjectId: null, projects: {} }
    };
}

function migrateOldData(oldData) {
    const target = oldData.selectedPlan === 'custom' && oldData.customSettings ? oldData.customSettings.targetDate : '2027-02-08';
    const pages = oldData.customSettings ? oldData.customSettings.totalPages : 600;
    const proj = {
        id: 'legacy_proj', name: 'Legacy Project', planType: oldData.selectedPlan || 'full', customPages: pages,
        startDate: new Date().toISOString(), targetDate: new Date(target + 'T00:00:00').toISOString(),
        completedDays: oldData.completedDays || []
    };
    return { currentJourney: 'hifz', hifz: { activeProjectId: proj.id, projects: { [proj.id]: proj } }, tilawah: { activeProjectId: null, projects: {} } };
}

// --- PROJECT MANAGEMENT ---
function createProjectObject(name, durationType, customDateStr, planType, customPages) {
    const start = new Date(); start.setHours(0,0,0,0);
    let target = new Date(start);

    if (durationType === 'weekly') target.setDate(target.getDate() + 7);
    else if (durationType === 'biweekly') target.setDate(target.getDate() + 14);
    else if (durationType === 'monthly') target.setMonth(target.getMonth() + 1);
    else if (durationType === 'bimonthly') target.setMonth(target.getMonth() + 2);
    else if (durationType === 'semiannual') target.setMonth(target.getMonth() + 6);
    else if (durationType === 'annual') target.setFullYear(target.getFullYear() + 1);
    else if (durationType === 'ramadan') target = new Date('2027-02-08T00:00:00');
    else target = new Date(customDateStr + "T00:00:00");

    const totalDays = Math.max(1, Math.ceil((target.getTime() - start.getTime()) / MS_PER_DAY));
    const totalPgs = (planType === 'custom') ? parseInt(customPages) : PLAN_PAGES[planType];

    return {
        id: 'proj_' + Date.now(), name: name, startDate: start.toISOString(), targetDate: target.toISOString(),
        planType: planType, totalPages: totalPgs || 600, completedDays: new Array(totalDays).fill(false)
    };
}

function setJourney(journey) {
    userData.currentJourney = journey;
    saveUserData();
}

function switchProject(projId) {
    userData[userData.currentJourney].activeProjectId = projId;
    saveUserData();
}

function toggleDay(index) {
    const j = userData.currentJourney;
    const pid = userData[j].activeProjectId;
    userData[j].projects[pid].completedDays[index] = !userData[j].projects[pid].completedDays[index];
    saveUserData();
}

function toggleWeek(weekNum) {
    activeWeek = activeWeek === weekNum ? null : weekNum;
    renderApp();
}

function getActiveProject() {
    const j = userData.currentJourney;
    const pid = userData[j].activeProjectId;
    return pid ? userData[j].projects[pid] : null;
}

function getStats(project) {
    if (!project) return null;
    const target = new Date(project.targetDate);
    const start = new Date(project.startDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    
    // Total physical checkboxes created for this project
    const totalTasks = project.completedDays.length;
    
    // Days remaining from TODAY
    const daysLeftFromToday = Math.max(0, Math.ceil((target.getTime() - currentDate.getTime()) / msPerDay));
    
    // To ensure they always know what pace they should be at, pagesPerDay is calculated from start
    const pagesPerDay = Math.ceil(project.totalPages / (totalTasks || 1));
    
    let totalPoints = 0;
    const weeks = [];
    for (let i = 0; i < totalTasks; i += 7) {
        const weekDays = project.completedDays.slice(i, i + 7);
        const completedInWeek = weekDays.filter(Boolean).length;
        totalPoints += completedInWeek * 10;
        if (completedInWeek === weekDays.length && weekDays.length > 0) totalPoints += 50;
        
        weeks.push({
            weekNumber: Math.floor(i / 7) + 1, startIndex: i, days: weekDays,
            completedCount: completedInWeek, isPerfect: completedInWeek === weekDays.length
        });
    }
    
    const completedCount = project.completedDays.filter(Boolean).length;
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 100;
    
    return { daysLeft: daysLeftFromToday, totalTasks, pagesPerDay, totalPoints, weeks, completedCount, progressPercent };
}

// --- UI RENDERING ---
function renderHeader() {
    const headerEl = document.getElementById('dynamic-header');
    if (!headerEl) return;
    
    const formatterGregorian = new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const formatterHijri = new Intl.DateTimeFormat('en-SG-u-ca-islamic-umalqura', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric' });
    
    const proj = getActiveProject();
    const stats = getStats(proj);
    let countdownHtml = proj ? `<div class="countdown">${stats.daysLeft} Days left until deadline</div>` : '';

    headerEl.innerHTML = `<div>${formatterGregorian.format(currentDate)}</div><div>${formatterHijri.format(currentDate)} AH</div>${countdownHtml}`;
}

function renderProfileScreen() {
    const app = document.getElementById('app');
    const profiles = getProfiles();
    let html = `<div class="container" style="max-width: 450px; margin-top: 80px; text-align: center;">
        <h1 style="margin-bottom: 10px; font-size: 2.5rem;">📖 Hifz & Tilawah</h1>
        <p style="color: #94a3b8; margin-bottom: 40px;">Select your profile to continue</p>
        <div class="profile-card">`;
    
    if (profiles.length > 0) {
        html += `<h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem;">Welcome Back</h3>
                 <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px;">`;
        profiles.forEach(p => { html += `<button class="btn-profile" onclick="selectProfile('${p.replace(/'/g, "\'")}')">${p}</button>`; });
        html += `</div><div style="width: 100%; height: 1px; background-color: #334155; margin-bottom: 30px;"></div>`;
    }
    html += `<h3 style="margin-top: 0; margin-bottom: 20px; font-size: 1.2rem;">New User</h3>
             <div><input type="text" id="new-profile-name" class="input-field" placeholder="Enter your name" onkeypress="if(event.key === 'Enter') addNewProfile()">
             <button class="btn-primary" onclick="addNewProfile()">Create & Start</button></div></div></div>`;
    app.innerHTML = html;
}

function renderApp() {
    const app = document.getElementById('app');
    const j = userData.currentJourney;
    const isHifz = j === 'hifz';
    const proj = getActiveProject();
    const stats = getStats(proj);
    const quote = quotes[currentDate.getDay() % quotes.length];
    
    // Auto-expand first uncompleted week if proj exists
    if (proj) {
        const firstUncompleted = proj.completedDays.findIndex(d => !d);
        activeWeek = firstUncompleted === -1 ? 1 : Math.floor(firstUncompleted / 7) + 1;
    }

    let html = `
        <div class="container">
            <div class="header-top">
                <div style="color: #94a3b8; font-weight: bold;">Salam, <span style="color: #f8fafc;">${currentProfile}</span> 👋</div>
                <button onclick="logout()" class="btn-logout">Switch Profile</button>
            </div>
            
            <div class="tabs">
                <button class="tab ${isHifz ? 'active' : ''}" onclick="setJourney('hifz')">📖 Hifz</button>
                <button class="tab ${!isHifz ? 'active' : ''}" onclick="setJourney('tilawah')">📖 Tilawah</button>
            </div>
            
            <div class="project-bar">
                <select onchange="switchProject(this.value)">
                    ${Object.values(userData[j].projects).length === 0 ? '<option value="">No projects found...</option>' : ''}
                    ${Object.values(userData[j].projects).map(p => `<option value="${p.id}" ${p.id === userData[j].activeProjectId ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
                <button class="btn-new" onclick="openProjectModal()">+ New Project</button>
            </div>
    `;

    if (!proj) {
        html += `
            <div class="empty-state">
                <h3 style="margin-top: 0; color: #94a3b8;">No Active Project</h3>
                <p style="color: #64748b; margin-bottom: 20px;">You don't have any ${isHifz ? 'Hifz' : 'Tilawah'} projects yet.</p>
                <button class="btn-primary" style="width: auto; padding: 10px 20px;" onclick="openProjectModal()">Create Your First Project</button>
            </div></div>
        `;
        app.innerHTML = html + getModalHtml();
        return;
    }

    html += `
            <div class="header">
                <div>
                    <h1>📖 ${currentProfile}'s ${isHifz ? 'Hifz' : 'Tilawah'} Tracker</h1>
                    <div id="dynamic-header" class="date-info"></div>
                </div>
                <div class="score-card">
                    <div class="score-title">Total Score</div>
                    <div class="score-value">🏆 ${stats.totalPoints}</div>
                </div>
            </div>
            
            <div class="quote">${quote}</div>
            
            <div class="progress-bg"><div class="progress-bar" style="width: ${stats.progressPercent}%"></div></div>
            <div class="progress-text">
                <span>${stats.completedCount} / ${stats.totalTasks} Days Completed</span>
                <span>${stats.progressPercent}%</span>
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
                            <div class="day-title ${isComplete ? 'completed' : ''}">Day ${globalIndex + 1}: Revise/Read ${stats.pagesPerDay} Pages</div>
                            <div class="day-points ${isComplete ? 'completed' : ''}">+10 Points</div>
                        </div>
                        <div class="check-circle ${isComplete ? 'completed' : ''}">${isComplete ? '✓' : ''}</div>
                    </div>
                `;
            });
            if (week.isPerfect) html += `<div class="bonus-points">+50 Bonus Points for a Perfect Week! 🌟</div>`;
            html += `</div>`;
        }
        html += `</div>`;
    });
    
    html += `</div></div>`;
    app.innerHTML = html + getModalHtml();
    renderHeader();
}

// --- MODAL LOGIC ---
function getModalHtml() {
    return `
    <div id="project-modal" class="modal hidden">
        <div class="modal-content">
            <h3 style="margin-top: 0;">Create New Project</h3>
            <div class="form-group">
                <label>Project Name</label>
                <input type="text" id="p-name" placeholder="e.g. My Monthly Recitation">
            </div>
            <div class="form-group">
                <label>Target Duration</label>
                <select id="p-duration" onchange="checkModalFields()">
                    <option value="weekly">1 Week</option>
                    <option value="biweekly">2 Weeks</option>
                    <option value="monthly">1 Month</option>
                    <option value="bimonthly">2 Months</option>
                    <option value="semiannual">6 Months</option>
                    <option value="annual">1 Year</option>
                    <option value="ramadan">Ramadan 2027</option>
                    <option value="custom">Custom Date...</option>
                </select>
            </div>
            <div class="form-group hidden" id="p-custom-date-container">
                <label>Select Deadline Date</label>
                <input type="date" id="p-custom-date">
            </div>
            <div class="form-group">
                <label>Plan Type</label>
                <select id="p-plan" onchange="checkModalFields()">
                    <option value="full">Full 30 Juz (600 Pages)</option>
                    <option value="light">Half 15 Juz (300 Pages)</option>
                    <option value="custom">Custom Target...</option>
                </select>
            </div>
            <div class="form-group hidden" id="p-custom-pages-container">
                <label>Total Pages to Read/Revise</label>
                <input type="number" id="p-custom-pages" placeholder="e.g. 150">
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeProjectModal()">Cancel</button>
                <button class="btn-save" onclick="saveNewProject()">Create</button>
            </div>
        </div>
    </div>`;
}

function openProjectModal() { document.getElementById('project-modal').classList.remove('hidden'); }
function closeProjectModal() { document.getElementById('project-modal').classList.add('hidden'); }
function checkModalFields() {
    const dur = document.getElementById('p-duration').value;
    const plan = document.getElementById('p-plan').value;
    document.getElementById('p-custom-date-container').classList.toggle('hidden', dur !== 'custom');
    document.getElementById('p-custom-pages-container').classList.toggle('hidden', plan !== 'custom');
}

function saveNewProject() {
    const name = document.getElementById('p-name').value.trim() || 'New Project';
    const dur = document.getElementById('p-duration').value;
    const customDate = document.getElementById('p-custom-date').value;
    const plan = document.getElementById('p-plan').value;
    const customPages = document.getElementById('p-custom-pages').value;

    if (dur === 'custom' && !customDate) return alert("Please select a date.");
    if (plan === 'custom' && !customPages) return alert("Please enter custom pages.");

    const newProj = createProjectObject(name, dur, customDate, plan, customPages);
    const j = userData.currentJourney;
    
    userData[j].projects[newProj.id] = newProj;
    userData[j].activeProjectId = newProj.id;
    saveUserData();
}

window.onload = init;
