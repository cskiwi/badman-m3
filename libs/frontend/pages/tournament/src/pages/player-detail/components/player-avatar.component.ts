import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { type Player } from '@app/models';

@Component({
  selector: 'app-player-avatar',
  imports: [
    AvatarModule,
  ],
  template: `
    <div class="player-avatar-container">
      @if (imageUrl()) {
        <!-- Player photo -->
        <img 
          [src]="imageUrl()" 
          [alt]="altText()"
          [class]="avatarClasses()"
          (error)="onImageError($event)"
          loading="lazy">
      } @else {
        <!-- Fallback to initials -->
        <p-avatar 
          [label]="initials()"
          [size]="size()"
          shape="circle"
          [styleClass]="fallbackClasses()">
        </p-avatar>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerAvatarComponent {
  player = input.required<Player | null>();
  size = input<'normal' | 'large' | 'xlarge'>('large');
  imageUrl = input<string | null>(null);

  initials = computed(() => {
    const player = this.player();
    if (!player) return '?';
    
    const firstName = player.firstName || '';
    const lastName = player.lastName || '';
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    return firstInitial + lastInitial || '?';
  });

  altText = computed(() => {
    const player = this.player();
    if (!player) return 'Player avatar';
    
    return `${player.fullName || 'Player'} avatar`;
  });

  avatarClasses = computed(() => {
    const size = this.size();
    const baseClasses = 'rounded-full object-cover border-2 border-surface-200 dark:border-surface-700';
    
    switch (size) {
      case 'xlarge':
        return `${baseClasses} w-24 h-24`;
      case 'large':
        return `${baseClasses} w-16 h-16`;
      case 'normal':
      default:
        return `${baseClasses} w-12 h-12`;
    }
  });

  fallbackClasses = computed(() => {
    const genderColor = this.getGenderColor();
    return `${genderColor} font-semibold shadow-lg`;
  });

  private getGenderColor(): string {
    const player = this.player();
    if (!player?.gender) {
      return 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400';
    }
    
    switch (player.gender) {
      case 'M':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';
      case 'F':
        return 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-400';
      default:
        return 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400';
    }
  }

  onImageError(event: Event) {
    // Hide the image element when it fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}