import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MenuModule, ButtonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();

  constructor(readonly auth: AuthService, private readonly router: Router) {}

  readonly userMenuItems: MenuItem[] = [
    {
      label: 'Change Password',
      icon: 'pi pi-key',
      command: () => this.router.navigate(['/change-password'])
    },
    {
      label: 'Log Out',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  async logout(): Promise<void> {
    try {
      await this.auth.logout();
    } finally {
      // Always leave the protected area, even if sign-out hit an
      // unexpected error — an already-cleared session must not leave the
      // user stuck on a page they can no longer use.
      await this.router.navigate(['/login']);
    }
  }
}
