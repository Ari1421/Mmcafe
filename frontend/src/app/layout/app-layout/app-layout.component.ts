import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';

/**
 * Application shell: dark sidebar (desktop) / collapsible drawer (mobile) +
 * top navbar + routed content. All authenticated feature routes render
 * inside this shell via a wrapper route (see app.routes.ts).
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, NavbarComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent {
  readonly mobileSidebarOpen = signal(false);

  toggleSidebar(): void {
    this.mobileSidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
