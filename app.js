import { calculateTDEE, getTargetCalories } from './math.js';

let profile = JSON.parse(localStorage.getItem('user_profile'));
const setupForm = document.getElementById('setup-form');

function init() {
    if (profile) {
        document.getElementById('setup-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        updateUI();
    }
}

setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
        age: Number(document.getElementById('age').value),
        height: Number(document.getElementById('height').value),
        weight: Number(document.getElementById('weight').value),
        gender: document.getElementById('gender').value,
        activity: document.getElementById('activity').value,
        eaten: 0
    };
    
    const tdee = calculateTDEE(data);
    data.dailyGoal = getTargetCalories(tdee, 500); // 500 cal deficit
    profile = data;
    localStorage.setItem('user_profile', JSON.stringify(data));
    init();
});

function updateUI() {
    document.getElementById('goal-val').innerText = profile.dailyGoal;
    document.getElementById('eaten-val').innerText = profile.eaten;
    document.getElementById('cals-remaining').innerText = profile.dailyGoal - profile.eaten;
}

init();