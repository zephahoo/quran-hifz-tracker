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
    else if (durationType === 'ramadan') target = new Date('2027-02
 
