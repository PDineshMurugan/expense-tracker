export interface Category {
    id: string;
    emoji: string;
    label: string;
    color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'food', emoji: '🍕', label: 'Food', color: '#ef4444' },
    { id: 'transport', emoji: '🚗', label: 'Transport', color: '#3b82f6' },
    { id: 'shopping', emoji: '🛒', label: 'Shopping', color: '#8b5cf6' },
    { id: 'entertainment', emoji: '🎬', label: 'Entertainment', color: '#ec4899' },
    { id: 'health', emoji: '💊', label: 'Health', color: '#10b981' },
    { id: 'bills', emoji: '📱', label: 'Bills', color: '#f59e0b' },
    { id: 'rent', emoji: '🏠', label: 'Rent', color: '#6366f1' },
    { id: 'education', emoji: '📚', label: 'Education', color: '#14b8a6' },
    { id: 'travel', emoji: '✈️', label: 'Travel', color: '#06b6d4' },
    { id: 'other', emoji: '🎁', label: 'Other', color: '#78716c' },
];
