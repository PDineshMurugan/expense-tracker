export interface Category {
    id: string;
    name: string;
    icon: string;
    type: 'expense' | 'income';
    isSystem: boolean;
    color?: string; // Optional for UI coloring
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: '1', name: 'Food', icon: 'fast-food', type: 'expense', isSystem: true, color: '#ef4444' },
    { id: '2', name: 'Transport', icon: 'car', type: 'expense', isSystem: true, color: '#3b82f6' },
    { id: '3', name: 'Shopping', icon: 'cart', type: 'expense', isSystem: true, color: '#8b5cf6' },
    { id: '4', name: 'Entertainment', icon: 'film', type: 'expense', isSystem: true, color: '#ec4899' },
    { id: '5', name: 'Health', icon: 'medkit', type: 'expense', isSystem: true, color: '#10b981' },
    { id: '6', name: 'Bills', icon: 'receipt', type: 'expense', isSystem: true, color: '#f59e0b' },
    { id: '7', name: 'Rent', icon: 'home', type: 'expense', isSystem: true, color: '#6366f1' },
    { id: '8', name: 'Education', icon: 'school', type: 'expense', isSystem: true, color: '#14b8a6' },
    { id: '9', name: 'Travel', icon: 'airplane', type: 'expense', isSystem: true, color: '#06b6d4' },
    { id: '10', name: 'Transfer', icon: 'swap-horizontal', type: 'expense', isSystem: true, color: '#64748b' },
    { id: '11', name: 'Salary', icon: 'cash', type: 'income', isSystem: true, color: '#22c55e' },
    { id: '12', name: 'Other', icon: 'gift', type: 'expense', isSystem: true, color: '#78716c' },
];
