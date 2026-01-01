export const calculateTDEE = (p) => {
    // 1. Calculate Basal Metabolic Rate (BMR)
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr = (p.gender === 'male') ? bmr + 5 : bmr - 161;

    // 2. Adjust for Activity Level
    const factors = { 
        sedentary: 1.2,    // No exercise
        moderate: 1.55,    // 3-5 days/week
        active: 1.725      // 6-7 days/week
    };
    
    const tdee = Math.round(bmr * (factors[p.activity] || 1.2));
    
    // 3. Subtract 500 calories for 0.5kg/week safe loss
    return {
        maintenance: tdee,
        target: tdee - 500
    };
};