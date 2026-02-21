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
