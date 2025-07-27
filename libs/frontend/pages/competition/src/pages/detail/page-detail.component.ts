import { DatePipe, SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '@app/frontend-components/page-header';
import { SeoService } from '@app/frontend-modules-seo/service';
import { TranslateModule } from '@ngx-translate/core';
import { injectParams } from 'ngxtension/inject-params';
import { DetailService } from './page-detail.service';
import { ProgressBarModule } from 'primeng/progressbar';

@Component({
  selector: 'app-page-detail',
  imports: [DatePipe, SlicePipe, ProgressBarModule, RouterModule, TranslateModule, PageHeaderComponent],
  templateUrl: './page-detail.component.html',
  styleUrl: './page-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageDetailComponent {
  private readonly dataService = new DetailService();
  private readonly seoService = inject(SeoService);
  private readonly competitionId = injectParams('competitionId');

  // selectors
  competition = this.dataService.competition;
  
  // Helper function to extract event type and level
  private getEventTypeAndLevel = (eventType: string) => {
    if (!eventType) return { type: 'Other', level: 999 };
    
    const match = eventType.match(/^(MX|M|F)(\d+)?/);

    console.log(match, eventType)

    if (!match) return { type: 'Other', level: 999 };
    
    return {
      type: match[1],
      level: parseInt(match[2] || '0', 10)
    };
  };

  // Grouped sub-events by type for visual separation
  groupedSubEvents = computed(() => {
    const subEvents = this.competition()?.competitionSubEvents ?? [];
    
    // Sort all events first
    const sortedEvents = [...subEvents].sort((a, b) => {
      const aData = this.getEventTypeAndLevel(a.eventType || '');
      const bData = this.getEventTypeAndLevel(b.eventType || '');
      
      // Define order for event types
      const typeOrder = { 'M': 1, 'F': 2, 'MX': 3, 'Other': 4 };
      const aTypeOrder = typeOrder[aData.type as keyof typeof typeOrder] || 999;
      const bTypeOrder = typeOrder[bData.type as keyof typeof typeOrder] || 999;
      
      // First sort by event type
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder;
      }
      
      // Then sort by level
      return aData.level - bData.level;
    });

    // Group by event type
    const groups: { type: string; label: string; events: typeof subEvents }[] = [];
    const typeLabels = { 
      'M': 'all.competition.types.men', 
      'F': 'all.competition.types.women', 
      'MX': 'all.competition.types.mix', 
      'Other': 'all.competition.types.other'
    };

    sortedEvents.forEach(event => {
      const eventData = this.getEventTypeAndLevel(event.eventType || '');
      let group = groups.find(g => g.type === eventData.type);
      
      if (!group) {
        group = {
          type: eventData.type,
          label: typeLabels[eventData.type as keyof typeof typeLabels] || 'all.competition.types.other',
          events: []
        };
        groups.push(group);
      }
      
      group.events.push(event);
    });

    return groups;
  });

  error = this.dataService.error;
  loading = this.dataService.loading;


  /**
   * Scroll smoothly to the event group with the given type.
   * @param type The group type string
   */
  scrollToGroup(type: string): void {
    const el = document.getElementById('group-' + type);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  constructor() {
    effect(() => {
      this.dataService.filter.get('competitionId')?.setValue(this.competitionId());
    });

    effect(() => {
      const competition = this.competition();
      if (competition) {
        this.seoService.update({
          seoType: 'competition',
          competition,
        });
      }
    });
  }
}
