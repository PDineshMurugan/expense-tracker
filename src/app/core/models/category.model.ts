export interface Category {
    id: string;
    icon: string;
    label: string;
    color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'food', icon: 'fast-food', label: 'Food', color: '#ef4444' },
    { id: 'transport', icon: 'car', label: 'Transport', color: '#3b82f6' },
    { id: 'shopping', icon: 'cart', label: 'Shopping', color: '#8b5cf6' },
    { id: 'entertainment', icon: 'film', label: 'Entertainment', color: '#ec4899' },
    { id: 'health', icon: 'medkit', label: 'Health', color: '#10b981' },
    { id: 'bills', icon: 'receipt', label: 'Bills', color: '#f59e0b' },
    { id: 'rent', icon: 'home', label: 'Rent', color: '#6366f1' },
    { id: 'education', icon: 'school', label: 'Education', color: '#14b8a6' },
    { id: 'travel', icon: 'airplane', label: 'Travel', color: '#06b6d4' },
    { id: 'transfer', icon: 'swap-horizontal', label: 'Transfer', color: '#64748b' },
    { id: 'other', icon: 'gift', label: 'Other', color: '#78716c' },
];
