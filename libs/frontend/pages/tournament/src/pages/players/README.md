# Tournament Players Page

A comprehensive player search page for the tournament section that follows Angular 18 patterns and integrates seamlessly with the existing codebase.

## Features

### 🔍 Advanced Search & Filtering
- **Text Search**: Search by player name (first name, last name, or full name)
- **Gender Filter**: Filter by Male/Female players
- **Rating Range**: Filter by minimum and maximum rating values
- **Competition Players**: Filter between competition and recreational players
- **Club Filter**: Filter players by their club membership (ready for implementation)

### 📱 Responsive Design
- **Mobile-First**: Responsive grid that adapts from 1 column on mobile to 4 columns on desktop
- **Card-Based Layout**: Clean PrimeNG card layout similar to tournament overview
- **Touch-Friendly**: Optimized for mobile interaction with proper touch targets

### ⚡ Modern Angular 18 Architecture
- **Resource API**: Uses Angular 18's `resource()` for efficient data loading
- **Computed Signals**: Leverages `computed()` for reactive state management
- **Signal Forms**: Reactive forms integrated with signals via `toSignal()`
- **Debounced Search**: 300ms debounce on search input for optimal performance

### 🎨 UI/UX Features
- **Loading States**: Elegant progress bars and loading indicators
- **Error Handling**: Comprehensive error messages with retry capability
- **Empty States**: User-friendly no-results state with guidance
- **Interactive Cards**: Hover effects and smooth transitions
- **Rating Badges**: Color-coded rating tags based on skill level
- **Player Info**: Shows name, rating, club, age, and player type

### 🔧 Technical Implementation

#### Service Layer (`page-players.service.ts`)
```typescript
// Advanced filtering with GraphQL
private _buildPlayerSearchWhere(filters: PlayerSearchFilters)

// Helper methods for data processing
getCurrentRating(player: Player, system: 'single' | 'double' | 'mix')
getCurrentClub(player: Player)
```

#### Component Layer (`page-players.component.ts`)
```typescript
// Reactive state management
players = this.dataService.players;
error = this.dataService.error;
loading = this.dataService.loading;

// Utility methods for UI
getPlayerAge(player: Player): number | null
getRankingColor(rating: number | null): string
formatRating(rating: number | null): string
```

### 🌐 GraphQL Integration

The component uses a comprehensive GraphQL query to fetch player data:

```graphql
query Players($args: PlayerArgs) {
  players(args: $args) {
    id
    firstName
    lastName
    fullName
    slug
    memberId
    gender
    birthDate
    competitionPlayer
    clubPlayerMemberships {
      id
      start
      end
      club {
        id
        name
        abbreviation
      }
    }
    rankingPlaces {
      id
      place
      single
      double
      mix
      rankingDate
      rankingSystem {
        id
        name
      }
    }
  }
}
```

### 🎯 Navigation Integration

The page integrates into the tournament navigation structure:
- Route: `/tournaments/players`
- Layout: `CenterLayoutComponent`
- Navigation: Accessible from tournament overview

### 📋 Future Enhancements

1. **Club Dropdown**: Implement dynamic club selection dropdown
2. **Sorting Options**: Add sorting by name, rating, age, etc.
3. **Export Functionality**: Allow exporting player lists
4. **Advanced Filters**: Age ranges, membership status, etc.
5. **Player Comparison**: Side-by-side player comparison
6. **Favorites**: Save favorite players for quick access

### 🔨 Usage

```typescript
import { PagePlayersComponent } from '@app/frontend-pages/tournament';

// The component is automatically available through the tournament routes
// Navigate to /tournaments/players to access the player search page
```

### 📱 Responsive Breakpoints

- **Mobile**: `< 768px` - Single column
- **Tablet**: `768px - 1024px` - 2 columns
- **Desktop**: `1024px - 1280px` - 3 columns  
- **Large Desktop**: `> 1280px` - 4 columns

### 🎨 Styling

The component follows the existing design system:
- Uses CSS custom properties for theming
- Maintains consistent spacing and typography
- Responsive grid with CSS Grid
- PrimeNG component integration
- Smooth transitions and hover effects

---

Built with ❤️ using Angular 18, PrimeNG, and GraphQL