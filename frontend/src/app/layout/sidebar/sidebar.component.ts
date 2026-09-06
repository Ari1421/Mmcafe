import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS } from '../../core/constants/nav-items';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Input() mobileOpen = false;
  @Output() navigate = new EventEmitter<void>();

  constructor(private readonly auth: AuthService) {}

  readonly items = computed(() =>
    NAV_ITEMS.filter((item) => !item.adminOnly || this.auth.isAdmin())
  );

  onNavigate(): void {
    this.navigate.emit();
  }
}
