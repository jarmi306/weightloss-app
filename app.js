import { calculateTDEE } from './math.js';

const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; 

let db = JSON.parse(localStorage.getItem('bio_vault')) || {
    profiles: [],
    activeIndex: null
};

let tempFood = null;

// --- NAVIGATION & INIT ---
function init() {
    if (db.activeIndex !== null && db.profiles[db.activeIndex]) {
        showDashboard();
    } else if (db.profiles.length > 0) {
        showManager();
    } else {
        showSetup();
    }
}

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

// --- CORE PROFILE LOGIC ---
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

// --- REAL-TIME SEARCH & PORTION FETCH ---
window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const resDiv = document.getElementById('search-results');
    if (!query) return;

    resDiv.innerHTML = "<p>Scanning real-time database...</p>";
    
    try {
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=8`);
        const data = await res.json();
        
        resDiv.innerHTML = data.foods.map(food => {
            const cals = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
            // We pass the FDC ID to the next function to get deep details
            return `
                <div class="result-item" onclick="fetchFoodDetails(${food.fdcId}, '${encodeURIComponent(food.description)}', ${cals})">
                    <span>${food.description}</span>
                    <small>${cals} kcal/100g</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        resDiv.innerHTML = "<p>Search failed.</p>";
    }
};

window.fetchFoodDetails = async (fdcId, name, cals) => {
    const modal = document.getElementById('portion-modal');
    const unitSelector = document.getElementById('unit-selector');
    
    // Reset selector
    unitSelector.innerHTML = '<option value="grams">Grams (g)</option>';
    
    try {
        // Fetch deep details for this specific food item
        const res = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${API_KEY}`);
        const detail = await res.json();
        
        let unitWeight = 100; // Default fallback

        // Real-time extraction of portion data (slices, pieces, cups, etc.)
        if (detail.foodPortions && detail.foodPortions.length > 0) {
            detail.foodPortions.forEach(p => {
                const weight = p.gramWeight;
                const label = p.modifier || p.measureUnit?.name || "Unit";
                const opt = document.createElement('option');
                opt.value = weight;
                opt.textContent = `${label} (${weight}g)`;
                unitSelector.appendChild(opt);
            });
            // Default to the first found real-world unit
            unitWeight = detail.foodPortions[0].gramWeight;
            unitSelector.value = unitWeight;
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
    
    // If user chose grams, weight will be handled as 1g per unit essentially
    // But our selector now holds the gram weight of the unit chosen
    let totalGrams = (document.getElementById('unit-selector').options[document.getElementById('unit-selector').selectedIndex].text.includes("Grams")) 
        ? amount 
        : amount * selectedWeight;

    let finalCals = Math.round(tempFood.calsPer100 * (totalGrams / 100));

    const user = db.profiles[db.activeIndex];
    user.eaten += finalCals;
    user.log.unshift({
        id: Date.now(),
        name: tempFood.name,
        cals: finalCals,
        meal: meal,
        display: `${amount} × ${document.getElementById('unit-selector').options[document.getElementById('unit-selector').selectedIndex].text}`
    });

    closeModal();
    saveAndRefresh();
};

// --- UTILS ---
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
            <div class="log-item" style="display:flex; justify-content:space-between; align-items:center; padding: 5px 0; border-bottom: 1px solid #f9f9f9;">
                <span style="font-size: 0.85rem;">${i.name.substring(0, 22)}...<br><small style="color:gray">${i.display}</small></span>
                <div>
                    <b style="color:var(--primary)">${i.cals}</b>
                    <button class="del-btn" onclick="removeLog(${i.id})">×</button>
                </div>
            </div>
        `).join('');
    });
}

function renderProfileList() {
    document.getElementById('profile-list').innerHTML = db.profiles.map((p, i) => `
        <div class="profile-item" onclick="selectProfile(${i})" style="padding:15px; background:#f0f0f0; margin-bottom:10px; border-radius:10px; cursor:pointer;">
            <b>${p.name}</b><br><small>${p.weight}kg | Goal: ${p.dailyGoal} kcal</small>
        </div>
    `).join('');
}

window.selectProfile = (i) => { db.activeIndex = i; saveAndRefresh(); };

function saveAndRefresh() {
    localStorage.setItem('bio_vault', JSON.stringify(db));
    location.reload(); 
}

document.getElementById('manager-btn').onclick = showManager;
document.getElementById('search-btn').onclick = window.searchFood;

init();