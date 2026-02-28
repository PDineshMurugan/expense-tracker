import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'tabs',
        loadComponent: () => import('./layout/tabs.component').then(m => m.TabsComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                path: 'add',
                loadComponent: () => import('./features/add-expense/add-expense.component').then(m => m.AddExpenseComponent),
            },
            {
                path: 'reports',
                loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
            },
            {
                path: 'settings',
                loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
            },
            {
                path: 'categories',
                loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent),
            },
            {
                path: 'accounts',
                loadComponent: () => import('./features/accounts/accounts.component').then(m => m.AccountsComponent),
            },
            {
                path: 'accounts/:id',
                loadComponent: () => import('./features/accounts/account-details.component').then(m => m.AccountDetailsComponent),
            },
            {
                path: 'auto-transactions',
                loadComponent: () => import('./features/auto-transactions/auto-transactions.component').then(m => m.AutoTransactionsComponent),
            },
            {
                path: 'auto-transactions/sender/:id',
                loadComponent: () => import('./features/auto-transactions/sender-details.component').then(m => m.SenderDetailsComponent),
            },
            {
                path: 'auto-transactions/merchant/:id',
                loadComponent: () => import('./features/auto-transactions/merchant-details.component').then(m => m.MerchantDetailsComponent),
            },
            {
                path: 'transactions',
                loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent),
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full',
            },
        ],
    },
    {
        path: '',
        redirectTo: 'tabs',
        pathMatch: 'full',
    },
];
