export interface AppSettings {
    monthlyBudget: number;
    darkMode: boolean;
    currency: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
    monthlyBudget: 0,
    darkMode: false,
    currency: '₹',
};
