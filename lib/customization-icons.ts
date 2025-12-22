// lib/customization-icons.ts
// Helper functions to get emoji icons for customizations

/**
 * Get emoji icon for topping customizations
 */
export function getToppingIcon(name: string): string {
    const lowerName = name.toLowerCase();
    
    // Cheese variations
    if (lowerName.includes('cheese') || lowerName.includes('cheddar') || lowerName.includes('mozzarella')) {
        return '🧀';
    }
    
    // Peppers
    if (lowerName.includes('jalapeño') || lowerName.includes('jalapeno') || lowerName.includes('pepper')) {
        return '🌶️';
    }
    
    // Onions
    if (lowerName.includes('onion')) {
        return '🧅';
    }
    
    // Olives
    if (lowerName.includes('olive')) {
        return '🫒';
    }
    
    // Mushrooms
    if (lowerName.includes('mushroom')) {
        return '🍄';
    }
    
    // Tomatoes
    if (lowerName.includes('tomato')) {
        return '🍅';
    }
    
    // Bacon
    if (lowerName.includes('bacon')) {
        return '🥓';
    }
    
    // Avocado
    if (lowerName.includes('avocado')) {
        return '🥑';
    }
    
    // Cucumber
    if (lowerName.includes('cucumber') || lowerName.includes('pickle')) {
        return '🥒';
    }
    
    // Lettuce/Salad
    if (lowerName.includes('lettuce') || lowerName.includes('salad')) {
        return '🥬';
    }
    
    // Default topping icon
    return '🍕';
}

/**
 * Get emoji icon for side customizations
 */
export function getSideIcon(name: string): string {
    const lowerName = name.toLowerCase();
    
    // Drinks
    if (lowerName.includes('coke') || lowerName.includes('cola') || lowerName.includes('soda')) {
        return '🥤';
    }
    
    if (lowerName.includes('tea') || lowerName.includes('iced tea')) {
        return '🧃';
    }
    
    if (lowerName.includes('juice')) {
        return '🧃';
    }
    
    if (lowerName.includes('water')) {
        return '💧';
    }
    
    // Fries
    if (lowerName.includes('fries') || lowerName.includes('french fries')) {
        return '🍟';
    }
    
    // Wedges/Potatoes
    if (lowerName.includes('wedge') || lowerName.includes('potato')) {
        return '🥔';
    }
    
    // Bread
    if (lowerName.includes('bread') || lowerName.includes('garlic bread')) {
        return '🥖';
    }
    
    // Nuggets
    if (lowerName.includes('nugget') || lowerName.includes('chicken nugget')) {
        return '🍗';
    }
    
    // Salad
    if (lowerName.includes('salad')) {
        return '🥗';
    }
    
    // Corn
    if (lowerName.includes('corn')) {
        return '🌽';
    }
    
    // Mozzarella Sticks
    if (lowerName.includes('mozzarella') || lowerName.includes('stick')) {
        return '🧈';
    }
    
    // Coleslaw
    if (lowerName.includes('coleslaw') || lowerName.includes('slaw')) {
        return '🥬';
    }
    
    // Onion Rings
    if (lowerName.includes('onion ring')) {
        return '🧅';
    }
    
    // Desserts
    if (lowerName.includes('cake') || lowerName.includes('lava cake')) {
        return '🍰';
    }
    
    if (lowerName.includes('ice cream')) {
        return '🍨';
    }
    
    // Default side icon
    return '🍴';
}

/**
 * Get emoji icon based on customization type and name
 */
export function getCustomizationIcon(name: string, type: string): string {
    if (type === 'topping') {
        return getToppingIcon(name);
    } else if (type === 'side') {
        return getSideIcon(name);
    }
    
    // Default
    return '🍽️';
}

/**
 * Get background color for customization icon
 */
export function getIconBackgroundColor(type: string, isSelected: boolean): string {
    if (isSelected) {
        return type === 'topping' ? '#FE8C00' : '#2F9B65';
    }
    
    return type === 'topping' ? '#FFF5E6' : '#E8F5E9';
}

/**
 * Get border color for customization button
 */
export function getButtonBorderColor(type: string, isSelected: boolean): string {
    if (isSelected) {
        return type === 'topping' ? '#FE8C00' : '#2F9B65';
    }
    
    return '#F3F4F6';
}

/**
 * Get text color for price
 */
export function getPriceColor(type: string): string {
    return type === 'topping' ? '#FE8C00' : '#2F9B65';
}