import { calculateTDEE } from './math.js';

const API_KEY = 'LEqFvTAubP3u0ftrVH4bidUvtaQzCMCsuHIt9D1j'; // Replace with your key for higher limits
let user = JSON.parse(localStorage.getItem('bio_user')) || null;

const setupPage = document.getElementById('setup-page');
const mainApp = document.getElementById('main-app');

function startApp() {
    if (user) {
        setupPage.style.display = 'none';
        mainApp.style.display = 'block';
        updateUI();
    }
}

document.getElementById('user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const profile = {
        age: Number(document.getElementById('age').value),
        height: Number(document.getElementById('height').value),
        weight: Number(document.getElementById('weight').value),
        gender: document.getElementById('gender').value,
        activity: document.getElementById('activity').value,
        eaten: 0,
        history: []
    };

    const results = calculateTDEE(profile);
    profile.dailyGoal = results.target;
    user = profile;
    localStorage.setItem('bio_user', JSON.stringify(profile));
    startApp();
});

window.searchFood = async () => {
    const query = document.getElementById('query').value;
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}&query=${query}&pageSize=1`);
    const data = await res.json();
    
    if (data.foods && data.foods[0]) {
        const food = data.foods[0];
        // Nutrient 1008 is Energy (Calories)
        const calories = food.foodNutrients.find(n => n.nutrientId === 1008)?.value || 0;
        
        user.eaten += Math.round(calories);
        user.history.unshift({ name: food.description, cals: Math.round(calories) });
        localStorage.setItem('bio_user', JSON.stringify(user));
        updateUI();
    }
};

function updateUI() {
    document.getElementById('cals-left').innerText = user.dailyGoal - user.eaten;
    document.getElementById('eaten-text').innerText = user.eaten;
    document.getElementById('daily-goal-text').innerText = user.dailyGoal;
}

startApp();