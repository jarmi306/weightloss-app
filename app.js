import { calculateTDEE } from './math.js';

// --- CONFIGURATION ---
const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; // Replace with your actual key

// --- STATE MANAGEMENT ---
let db = JSON.parse(localStorage.getItem('bio_vault')) || {
    profiles: [],
    activeIndex: null
};

const facts = [
    "Drinking 500ml of water before meals can increase weight loss by 44%.",
    "High-protein breakfasts reduce cravings and calorie intake throughout the day.",
    "Soluble fiber can help reduce belly fat by preventing fat gain.",
    "Walking 10,000 steps is roughly equivalent to burning 400-500 kcal.",
    "Sleep is just as important as diet and exercise for metabolic health.",
    "Whole foods are more thermogenic than processed foods."
];

// --- UI ELEMENTS ---
const setupPage = document.getElementById('setup-page');
const mainApp = document.getElementById('main-app');
const profileManager = document.getElementById('profile-manager');
const profileNav = document.getElementById('profile-nav');
const ticker = document.getElementById('news-ticker');

// --- INITIALIZATION ---
function init() {
    if (db.activeIndex !== null && db.profiles[db.activeIndex]) {
        showDashboard();
    } else if (db.profiles.length > 0) {
        showManager();
    } else {
        showSetup();
    }
}

// --- NAVIGATION ---
window.showSetup = () => {
    hideAll();
    setupPage.style.display = 'block';
};

window.showManager = () => {
    hideAll();
    profileManager.style.display = 'block';
    renderProfileList();
};

function showDashboard() {
    hideAll();
    mainApp.style.display = 'block';
    profileNav.style.display = 'flex';
    startTicker();
    renderDashboard();
}

function hideAll() {
    setupPage.style.display = 'none';
    mainApp.style.display = 'none';
    profileManager.style.display = 'none';
    profileNav.style.display = 'none';
}

// --- CORE FUNCTIONS ---
document.getElementById('user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const profile = {
        name: document.getElementById('profile-name').value,
        age: Number(document.getElementById('age').value),
        height: Number(document.getElementById('height').value),
        weight: Number(document.getElementById('weight').value),
        gender: document.getElementById('gender').value,
        activity: document.getElementById('activity').value,
        eaten: 0,
        log: []
    };

    const results = calculateTDEE(profile);
    profile.dailyGoal = results.target;
    
    db.profiles.push(profile);
    db.activeIndex = db.profiles.length - 1;
    saveAndRefresh();
});

window.selectProfile = (index) => {
    db.activeIndex = index;
    saveAndRefresh();
};

// --- USDA SEARCH LOGIC ---
window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const btn = document.getElementById('search-btn');
    
    if (!query) return;
    
    btn.innerText = "...";
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=1`);
        const data = await res.json();
        
        if (data.foods && data.foods[0]) {
            const food = data.foods[0];
            const calories = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            
            const activeUser = db.profiles[db.activeIndex];
            activeUser.eaten += Math.round(calories);
            activeUser.log.unshift({
                name: food.description,
                cals: Math.round(calories),
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            
            saveAndRefresh();
        } else {
            alert("Food not found in USDA database.");
        }
    } catch (err) {
        console.error("Search Error:", err);
    } finally {
        btn.innerText = "Add";
    }
};

// --- RENDERING ---
function renderDashboard() {
    const user = db.profiles[db.activeIndex];
    document.getElementById('current-user-name').innerText = user.name;
    document.getElementById('cals-left').innerText = user.dailyGoal - user.eaten;
    document.getElementById('eaten-text').innerText = user.eaten;
    document.getElementById('daily-goal-text').innerText = user.dailyGoal;
    
    const logList = document.getElementById('log-list');
    logList.innerHTML = user.log.map(item => `
        <div class="log-item" style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${item.name} <small style="color:#888;">${item.time}</small></span>
            <b>+${item.cals}</b>
        </div>
    `).join('');
}

function renderProfileList() {
    const list = document.getElementById('profile-list');
    list.innerHTML = db.profiles.map((p, i) => `
        <div class="profile-item" onclick="selectProfile(${i})">
            <b>${p.name}</b><br>
            <small>${p.weight}kg • Goal: ${p.dailyGoal} kcal</small>
        </div>
    `).join('');
}

function startTicker() {
    let i = 0;
    ticker.innerText = `RESEARCH: ${facts[0]}`;
    setInterval(() => {
        i = (i + 1) % facts.length;
        ticker.innerText = `RESEARCH: ${facts[i]}`;
    }, 7000);
}

function saveAndRefresh() {
    localStorage.setItem('bio_vault', JSON.stringify(db));
    init();
}

// --- EVENT LISTENERS ---
document.getElementById('manager-btn').onclick = showManager;
document.getElementById('search-btn').onclick = window.searchFood;

init();