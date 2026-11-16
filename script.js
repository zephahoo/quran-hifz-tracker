
const plans = {
    full: { name: 'Full 30 Juz', totalPages: 600 },
    light: { name: 'Half (15 Juz)', totalPages: 300 },
    intensive: { name: 'Double Pass (60 Juz)', totalPages: 1200 }
};

let selectedPlan = 'full';
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
    loadProgress();
    setInterval(() => {
        currentDate = new Date();
        renderHeader();
    }, 1000);
    renderApp();
}

function loadProgress() {
    const saved = localStorage.getItem(`hifzProgress_${selectedPlan}`);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(0, Math.ceil((ramadanDate.getTime() - currentDate.getTime()) / msPerDay));
    const totalTasks = daysLeft || 90;
    
    if (saved) {
        completedDays = JSON.parse(saved);
        if (completedDays.length !== totalTasks) {
            completedDays = Array(totalTasks).fill(false);
        }
    } else {
        completedDays = Array(totalTasks).fill(false);
    }
    
    const firstUncompleted = completedDays.findIndex(d => !d);
    activeWeek = firstUncompleted === -1 ? 1 : Math.floor(firstUncompleted / 7) + 1;
}

function saveProgress() {
    localStorage.setItem(`hifzProgress_${selectedPlan}`, JSON.stringify(completedDays));
    renderApp();
}

function toggleDay(index) {
    completedDays[index] = !completedDays[index];
    saveProgress();
}

function changePlan(e) {
    selectedPlan = e.target.value;
    loadProgress();
    renderApp();
}

function toggleWeek(weekNum) {
    activeWeek = activeWeek === weekNum ? null : weekNum;
    renderApp();
}

function getStats() {
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(0, Math.ceil((ramadanDate.getTime() - currentDate.getTime()) / msPerDay));
    const totalTasks = daysLeft || 90;
    const pagesPerDay = Math.ceil(plans[selectedPlan].totalPages / (daysLeft || 1));
    
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
    
    headerEl.innerHTML = `
        <div>${formatterGregorian.format(currentDate)}</div>
        <div>${formatterHijri.format(currentDate)} AH</div>
        <div class="countdown">${getStats().daysLeft} Days until Ramadan (Estimated: 8 Feb 2027)</div>
    `;
}

function renderApp() {
    const app = document.getElementById('app');
    const stats = getStats();
    const quote = quotes[currentDate.getDay() % quotes.length];
    
    let html = `
        <div class="container">
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
                </select>
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
