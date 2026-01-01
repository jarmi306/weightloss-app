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
    "Protein is the most thermogenic macronutrient, burning more energy to digest.",
    "Walking after a meal improves glucose clearance and aids digestion.",
    "The 'whole unit' calorie count is an estimate; grams are always more accurate.",
    "Consistent sleep (7-8 hours) regulates hunger hormones like Ghrelin.",
    "Hydration is key: Your brain often confuses thirst with hunger."
];

// --- INITIALIZATION ---
function init() {
    if (db.activeIndex !== null && db.profiles[db.activeIndex]) {
        renderDashboard();
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

// --- CORE ACTIONS ---
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

window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const resDiv = document.getElementById('search-results');
    if (!query) return;

    resDiv.innerHTML = "<p>Researching food data...</p>";
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=5`);
        const data = await res.json();
        
        resDiv.innerHTML = data.foods.map(food => {
            const cals = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            const uWeight = food.servingSize || 100;
            return `
                <div class="result-item" onclick="openPortionModal('${encodeURIComponent(food.description)}', ${cals}, ${uWeight})">
                    <span>${food.description}</span>
                    <small>${cals} kcal/100g (~${uWeight}g serving)</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        resDiv.innerHTML = "<p>Connection error.</p>";
    }
};

window.openPortionModal = (name, cals, uWeight) => {
    tempFood = { name: decodeURIComponent(name), calsPer100: cals, uWeight: uWeight };
    document.getElementById('selected-food-name').innerText = tempFood.name;
    document.getElementById('portion-modal').style.display = 'flex';
    document.getElementById('search-results').innerHTML = ""; 
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
    showDashboard();
    const user = db.profiles[db.activeIndex];
    document.getElementById('current-user-name').innerText = user.name;