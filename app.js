import { calculateTDEE } from './math.js';

// --- CONFIG ---
// Replace 'YOUR_USDA_KEY_HERE' with your actual key from the USDA website
const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; 

// --- STATE MANAGEMENT ---
let db = JSON.parse(localStorage.getItem('bio_vault')) || {
    profiles: [],
    activeIndex: null
};

let tempFood = null;

const facts = [
    "Drinking water before meals can increase satiety by 12%.",
    "High-protein breakfasts reduce cravings throughout the day.",
    "Walking after meals improves glucose clearance by 12%.",
    "Sleep deprivation increases cravings for calorie-dense foods.",
    "Consistent fiber intake is linked to lower abdominal fat."
];

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
    startTicker();
    renderDashboard();
}

// --- CORE PROFILE ACTIONS ---
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

// --- REAL-TIME SEARCH & PORTION LOGIC ---
window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const resDiv = document.getElementById('search-results');
    if (!query) return;

    resDiv.innerHTML = "<p>Scanning research database...</p>";
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=8`);
        const data = await res.json();
        
        resDiv.innerHTML = data.foods.map(food => {
            const cals = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            return `
                <div class="result-item" onclick="fetchFoodDetails(${food.fdcId}, '${encodeURIComponent(food.description)}', ${cals})">
                    <span>${food.description}</span>
                    <small>${cals} kcal/100g</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        resDiv.innerHTML = "<p>Search failed. Check connection.</p>";
    }
};

window.fetchFoodDetails = async (fdcId, name, cals) => {
    const modal = document.getElementById('portion-modal');
    const unitSelector = document.getElementById('unit-selector');
    
    // Reset selector and add basic Grams option
    unitSelector.innerHTML = '<option value="1">Grams (g)</option>';
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${API_KEY}`);
        const detail = await res.json();
        
        if (detail.foodPortions && detail.foodPortions.length > 0) {
            detail.foodPortions.forEach(p => {
                const weight = p.gramWeight;
                // FIX: Check for readable modifier, else use unit name, else fallback to 'Portion'
                let label = p.modifier || (p.measureUnit && p.measureUnit.name) || "Portion";
                
                // If the label is just a random USDA number/ID, rename it for clarity
                if (!isNaN(label) || label.length > 15) {
                    label = "Standard Serving";
                }

                const opt = document.createElement('option');
                opt.value = weight;
                opt.textContent = `${label} (${weight}g)`;
                unitSelector.appendChild(opt);
            });
        }

        tempFood = { name: decodeURIComponent(name), calsPer100: cals };
        document.getElementById('selected-food-name').innerText = tempFood.name;
        modal.style.display = 'flex';
        document.getElementById('search-results').innerHTML = ""; 

    } catch (err) {
        console.error("Detail fetch failed", err);
    }
};

window.confirmLog = () => {
    const amount = Number(document.getElementById('amount-input').value);
    const selectedWeight = Number(document.getElementById('unit-selector').value);
    const meal = document.getElementById('meal-type').value;
    const selectorText = document.getElementById('unit-selector').options[document.getElementById('unit-selector').selectedIndex].text;
    
    // Calculation: If 'Grams (g)' is selected, selectedWeight is 1. If a unit is selected, it multiplies by that unit's gram weight.
    let totalGrams = (selectorText.includes("Grams")) ? amount : amount * selectedWeight;
    let finalCals = Math.round(tempFood.calsPer100 * (totalGrams / 100));

    const user = db.profiles[db.activeIndex];
    user.eaten += finalCals;
    user.log.unshift({
        id: Date.now(),
        name: tempFood.name,
        cals: finalCals,
        meal: meal,
        display: `${amount} × ${selectorText}`
    });

    closeModal();
    saveAndRefresh();
};

// --- UTILS & RENDERING ---
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

    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(m => {
        const container = document.getElementById(`log-${m}`);
        container.innerHTML = user.log.filter(i => i.meal === m).map(i => `
            <div class="log-item" style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="font-size: 0.8rem;">${i.name.substring(0, 20)}...<br><small style="color:gray">${i.display}</small></span>
                <div>
                    <b style="color:#4CAF50">${i.cals}</b>
                    <button class="del-btn" onclick="removeLog(${i.id})" style="background:none; border:none; color:red; margin-left:10px;">×</button>
                </div>
            </div>
        `).join('');
    });
}

function renderProfileList() {
    document.getElementById('profile-list').innerHTML = db.profiles.map((p, i) => `
        <div class="profile-item" onclick="selectProfile(${i})" style="padding:15px; background:#f8f9fa; margin-bottom:10px; border-radius:12px; cursor:pointer; border: 1px solid #eee;">
            <b>${p.name}</b><br><small>${p.weight}kg | Goal: ${p.dailyGoal} kcal</small>
        </div>
    `).join('');
}

function startTicker() {
    let i = 0;
    const ticker = document.getElementById('news-ticker');
    setInterval(() => {
        ticker.innerText = `RESEARCH: ${facts[i]}`;
        i = (i + 1) % facts.length;
    }, 7000);
}

function saveAndRefresh() {
    localStorage.setItem('bio_vault', JSON.stringify(db));
    location.reload(); 
}

// Bindings
document.getElementById('manager-btn').onclick = window.showManager;
document.getElementById('search-btn').onclick = window.searchFood;

init();