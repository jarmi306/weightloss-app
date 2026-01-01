import { calculateTDEE } from './math.js';

const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; 

let db = JSON.parse(localStorage.getItem('bio_vault')) || {
    profiles: [],
    activeIndex: null
};

let tempFood = null;

const facts = [
    "1g of Carbohydrate = 4 kcal. A standard roti is mostly complex carbs.",
    "Roti made from whole wheat contains fiber, which slows down digestion.",
    "Weight-based logging (grams) is always more accurate than 'units'.",
    "Consistency is better than perfection in calorie tracking."
];

function init() {
    if (db.activeIndex !== null && db.profiles[db.activeIndex]) {
        showDashboard();
    } else if (db.profiles.length > 0) {
        showManager();
    } else {
        showSetup();
    }
}

// Navigation
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

// Form Submit
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

// SEARCH WITH SMART CORRECTION
window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const resDiv = document.getElementById('search-results');
    if (!query) return;

    resDiv.innerHTML = "<p>Searching...</p>";
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=5`);
        const data = await res.json();
        
        resDiv.innerHTML = data.foods.map(food => {
            const cals = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            
            // SMART CORRECTION FOR ROTI/BREAD
            let uWeight = food.servingSize || 100; 
            if (food.description.toLowerCase().includes('roti') && uWeight > 50) {
                uWeight = 35; // Default standard home roti weight
            }

            return `
                <div class="result-item" onclick="openPortionModal('${encodeURIComponent(food.description)}', ${cals}, ${uWeight})">
                    <span>${food.description}</span>
                    <small>${cals} kcal/100g (Assumed 1 unit = ${uWeight}g)</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        resDiv.innerHTML = "<p>Search Error.</p>";
    }
};

window.openPortionModal = (name, cals, uWeight) => {
    tempFood = { name: decodeURIComponent(name), calsPer100: cals, uWeight: uWeight };
    document.getElementById('selected-food-name').innerText = tempFood.name;
    document.getElementById('amount-input').value = 1; // Default to 1 unit
    document.getElementById('portion-modal').style.display = 'flex';
};

window.confirmLog = () => {
    const amount = Number(document.getElementById('amount-input').value);
    const unitType = document.getElementById('unit-selector').value;
    const meal = document.getElementById('meal-type').value;
    
    // CALCULATION LOGIC
    let totalGrams = (unitType === 'units') ? amount * tempFood.uWeight : amount;
    let finalCals = Math.round(tempFood.calsPer100 * (totalGrams / 100));

    const user = db.profiles[db.activeIndex];
    user.eaten += finalCals;
    user.log.unshift({
        id: Date.now(),
        name: tempFood.name,
        cals: finalCals,
        meal: meal,
        display: unitType === 'units' ? `${amount} unit(s)` : `${amount}g`
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
        container.innerHTML = user.log.filter(i => i.meal === m).map(i => `
            <div class="log-item" style="display:flex; justify-content:space-between; align-items:center; padding: 5px 0;">
                <span>${i.name.substring(0, 20)}... <br><small>${i.display}</small></span>
                <div>
                    <b>${i.cals} kcal</b>
                    <button class="del-btn" onclick="removeLog(${i.id})" style="color:red; background:none; border:none; margin-left:10px; cursor:pointer;">×</button>
                </div>
            </div>
        `).join('');
    });
}

function renderProfileList() {
    document.getElementById('profile-list').innerHTML = db.profiles.map((p, i) => `
        <div class="profile-item" onclick="selectProfile(${i})" style="padding:15px; background:#f0f0f0; margin-bottom:10px; border-radius:10px; cursor:pointer;">
            <b>${p.name}</b><br><small>${p.weight}kg | ${p.dailyGoal} kcal</small>
        </div>
    `).join('');
}

window.selectProfile = (i) => { db.activeIndex = i; saveAndRefresh(); };

function saveAndRefresh() {
    localStorage.setItem('bio_vault', JSON.stringify(db));
    location.reload(); 
}

// Bindings
document.getElementById('manager-btn').onclick = showManager;
document.getElementById('search-btn').onclick = window.searchFood;

init();