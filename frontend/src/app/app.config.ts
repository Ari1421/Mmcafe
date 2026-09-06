import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // Every feature route is lazy-loaded (see app.routes.ts) so the first
    // load stays small — but that also means the first click on a sidebar
    // item like "Sales" or "Reports" has to download that chunk before it
    // can render. PreloadAllModules quietly fetches every lazy chunk in the
    // background right after the app boots (once, over the network idle
    // time), so by the time the user actually clicks a menu item its code
    // is already in memory and navigation is instant.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false // cafe dashboard uses a fixed light theme + dark sidebar
        }
      }
    }),
    MessageService,
    ConfirmationService
  ]
};
