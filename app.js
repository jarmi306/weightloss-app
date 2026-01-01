import { calculateTDEE } from './math.js';

// --- CONFIG ---
const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; 

// --- STATE ---
let db = JSON.parse(localStorage.getItem('bio_vault')) || {
    profiles: [],
    activeIndex: null
};

let tempFood = null;

const facts = [
    "Protein is the most thermogenic macronutrient.",
    "Walking after a meal improves glucose clearance.",
    "Hydration: Your brain often confuses thirst with hunger.",
    "Consistent sleep regulates hunger hormones.",
    "Fiber intake is linked to lower abdominal fat."
];

// --- INITIALIZATION ---
function init() {
    console.log("App Initializing...");
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
    document.getElementById('setup-page').style.display = 'block';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('profile-manager').style.display = 'none';
};

window.showManager = () => {
    document.getElementById('setup-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('profile-manager').style.display = 'block';
    renderProfileList();
};

function showDashboard() {
    document.getElementById('setup-page').style.display = 'none';
    document.getElementById('profile-manager').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('profile-nav').style.display = 'flex';
    renderDashboard();
}

// --- CORE ACTIONS ---
const userForm = document.getElementById('user-form');
if (userForm) {
    userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("Form submitted, calculating...");

        try {
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
            
            console.log("Profile created:", profile.name);
            saveAndRefresh();
        } catch (err) {
            console.error("Profile Creation Error:", err);
            alert("Error creating profile. Check the console.");
        }
    });
}

// --- FOOD SEARCH ---
window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const resDiv = document.getElementById('search-results');
    if (!query) return;

    resDiv.innerHTML = "<p>Searching research database...</p>";
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=5`);
        const data = await res.json();
        
        resDiv.innerHTML = data.foods.map(food => {
            const cals = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            const uWeight = food.servingSize || 100;
            return `
                <div class="result-item" onclick="openPortionModal('${encodeURIComponent(food.description)}', ${cals}, ${uWeight})">
                    <span>${food.description}</span>
                    <small>${cals} kcal/100g (~${uWeight}g unit)</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        resDiv.innerHTML = "<p>Search failed. Check internet.</p>";
    }
};

window.openPortionModal = (name, cals, uWeight) => {
    tempFood = { name: decodeURIComponent(name), calsPer100: cals, uWeight: uWeight };
    document.getElementById('selected-food-name').innerText = tempFood.name;
    document.getElementById('portion-modal').style.display = 'flex';
};

window.confirmLog = () => {
    const amount = Number(document.getElementById('amount-input').value);
    const unitType = document.getElementById('unit-selector').value;
    const meal = document.getElementById('meal-type').value;
    
    let totalGrams = (unitType === 'units') ? amount * tempFood.uWeight : amount;
    let finalCals = Math.round(tempFood.calsPer100 * (totalGrams / 100));

    const user = db.profiles[db.activeIndex];
    user.eaten += finalCals;
    user.log.unshift({
        id: Date.now(),
        name: tempFood.name,
        cals: finalCals,
        meal: meal,
        display: unitType === 'units' ? `${amount} pc` : `${amount}g`
    });

    closeModal();
    saveAndRefresh();
};

window.removeLog = (id) => {
    const user = db.profiles[db.activeIndex];
    const idx = user.log.findIndex(i => i.id === id);
    if (idx > -1) {
        user.eaten -= user.log[idx].cals;
        user.log.splice(idx, 1);
        saveAndRefresh();
    }
};

window.closeModal = () => document.getElementById('portion-modal').style.display = 'none';

function renderDashboard() {
    const user = db.profiles[db.activeIndex];
    document.getElementById('current-user-name').innerText = user.name;
    document.getElementById('cals-left').innerText = user.dailyGoal - user.eaten;
    document.getElementById('eaten-text').innerText = user.eaten;
    document.getElementById('daily-goal-text').innerText = user.dailyGoal;

    const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
    meals.forEach(m => {
        const container = document.getElementById(`log-${m}`);
        if (container) {
            container.innerHTML = user.log.filter(i => i.meal === m).map(i => `
                <div class="log-item">
                    <span>${i.name.substring(0,25)}... <small>(${i.display})</small></span>
                    <div>
                        <b>${i.cals}</b>
                        <button class="del-btn" onclick="removeLog(${i.id})">×</button>
                    </div>
                </div>
            `).join('');
        }
    });
}

function renderProfileList() {
    const list = document.getElementById('profile-list');
    list.innerHTML = db.profiles.map((p, i) => `
        <div class="profile-item" onclick="selectProfile(${i})">
            <b>${p.name}</b><br><small>${p.weight}kg | Goal: ${p.dailyGoal} kcal</small>
        </div>
    `).join('');
}

window.selectProfile = (i) => { db.activeIndex = i; saveAndRefresh(); };

// Fact Ticker Logic
let factIdx = 0;
setInterval(() => {
    const ticker = document.getElementById('news-ticker');
    if (ticker) {
        ticker.innerText = `RESEARCH: ${facts[factIdx]}`;
        factIdx = (factIdx + 1) % facts.length;
    }
}, 8000);

function saveAndRefresh() {
    localStorage.setItem('bio_vault', JSON.stringify(db));
    location.reload(); 
}

// Event bindings
const searchBtn = document.getElementById('search-btn');
if (searchBtn) searchBtn.onclick = window.searchFood;

const managerBtn = document.getElementById('manager-btn');
if (managerBtn) managerBtn.onclick = window.showManager;

init();