export const calculateTDEE = (profile) => {
    const { weight, height, age, gender, activity } = profile;
    
    // Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const activityFactors = {
        sedentary: 1.2,      // Little exercise
        light: 1.375,        // 1-3 days/week
        moderate: 1.55,      // 3-5 days/week
        active: 1.725        // 6-7 days/week
    };

    return Math.round(bmr * activityFactors[activity]);
};

export const getTargetCalories = (tdee, intensity) => {
    // intensity: 0 (maintain), 500 (standard loss), 1000 (aggressive loss)
    return tdee - intensity;
};