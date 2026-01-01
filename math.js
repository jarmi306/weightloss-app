export const calculateTDEE = (p) => {
    // BMR Calculation (Mifflin-St Jeor)
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr = (p.gender === 'male') ? bmr + 5 : bmr - 161;

    // Activity Multipliers
    const factors = { 
        sedentary: 1.2, 
        moderate: 1.55, 
        active: 1.725 
    };
    
    const tdee = Math.round(bmr * (factors[p.activity] || 1.2));
    
    // Weight Loss Deficit (Standard -500kcal)
    return {
        maintenance: tdee,
        target: tdee - 500
    };
};