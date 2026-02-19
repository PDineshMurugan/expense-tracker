import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NotificationToastComponent } from './shared/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, NotificationToastComponent],
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
    <app-notification-toast></app-notification-toast>
  `,
  styles: [`:host { display: block; }`]
})
export class App { }
