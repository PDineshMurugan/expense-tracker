import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, home, addCircleOutline, addCircle, barChartOutline, barChart, settingsOutline, settings, gridOutline, grid } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" id="tab-dashboard">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reports" id="tab-reports">
          <ion-icon name="bar-chart-outline"></ion-icon>
          <ion-label>Reports</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="add" id="tab-add" class="tab-add-center">
          <div class="add-btn-wrapper">
            <ion-icon name="add-circle" class="add-icon-lg"></ion-icon>
          </div>
        </ion-tab-button>

        <ion-tab-button tab="categories" id="tab-categories">
          <ion-icon name="grid-outline"></ion-icon>
          <ion-label>Categories</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="settings" id="tab-settings">
          <ion-icon name="settings-outline"></ion-icon>
          <ion-label>Settings</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      --background: var(--glass-bg);
      --border: none;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid var(--glass-border);
      padding-bottom: env(safe-area-inset-bottom, 0);
      height: 64px;
      position: relative;
    }

    ion-tab-button {
      --color: var(--color-text-secondary);
      --color-selected: var(--color-primary);
      font-size: 10px;
      font-weight: var(--font-weight-medium);
      transition: all var(--transition-base);
      position: relative;
    }

    ion-tab-button::after {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%) scaleX(0);
      width: 24px;
      height: 3px;
      background: var(--gradient-primary);
      border-radius: 0 0 var(--radius-full) var(--radius-full);
      transition: transform var(--transition-spring);
    }

    ion-tab-button[aria-selected="true"]::after {
      transform: translateX(-50%) scaleX(1);
    }

    .tab-add-center {
      --color: #fff;
      --color-selected: #fff;
    }

    .add-btn-wrapper {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--gradient-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: -20px;
      box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.35);
      transition: transform var(--transition-spring), box-shadow var(--transition-base);
    }

    .tab-add-center:hover .add-btn-wrapper,
    .tab-add-center[aria-selected="true"] .add-btn-wrapper {
      transform: scale(1.08);
      box-shadow: 0 6px 24px rgba(var(--color-primary-rgb), 0.45);
    }

    .add-icon-lg {
      font-size: 28px;
      color: #fff;
    }

    .tab-add-center ion-label {
      display: none;
    }
  `]
})
export class TabsComponent {
  constructor() {
    addIcons({ homeOutline, home, addCircleOutline, addCircle, barChartOutline, barChart, settingsOutline, settings, gridOutline, grid });
  }
}
