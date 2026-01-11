# Tournament Enrollment API Architecture

## Executive Summary

This document defines the backend GraphQL API architecture for general multi-discipline tournament enrollment. The design supports per-event enrollment windows, multi-event registration, waiting lists, partner matching, and atomic transactions across multiple sub-events.

**Version:** 1.0
**Last Updated:** 2025-12-14
**Status:** Design Phase

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [New API Endpoints](#new-api-endpoints)
3. [Modified Endpoints](#modified-endpoints)
4. [GraphQL Schema Definitions](#graphql-schema-definitions)
5. [Resolver Architecture](#resolver-architecture)
6. [Service Layer Design](#service-layer-design)
7. [Business Logic Design](#business-logic-design)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling Strategy](#error-handling-strategy)
10. [Transaction Management](#transaction-management)
11. [Performance Considerations](#performance-considerations)
12. [API Documentation](#api-documentation)

---

## Current State Analysis

### Existing Implementation

**Location:** `C:\Users\glenn\Documents\Code\cskiwi\badman-m3\libs\backend\graphql\src\resolvers\event\tournament\tournament-enrollment.resolver.ts`

**Current Mutations:**
- `enrollInTournament(input: EnrollPlayerInput)` - Single sub-event enrollment for authenticated player
- `enrollGuest(input: EnrollGuestInput)` - Single sub-event enrollment for guest
- `updateEnrollment(enrollmentId, input: UpdateEnrollmentInput)` - Update partner preference/notes
- `cancelEnrollment(enrollmentId)` - Withdraw/cancel enrollment
- `promoteFromWaitingList(enrollmentId)` - Admin promotion from waiting list

**Current Queries:**
- `tournamentEnrollment(id)` - Single enrollment by ID
- `tournamentEnrollments(args)` - List enrollments with filtering
- `myTournamentEnrollments(tournamentEventId)` - Current user's enrollments
- `subEventEnrollments(subEventId, status?)` - All enrollments for a sub-event
- `waitingList(subEventId)` - Waiting list for a sub-event
- `lookingForPartner(subEventId)` - Players seeking partners

**Current Validation Logic:**
1. Tournament phase check (`tournament.phase === TournamentPhase.ENROLLMENT_OPEN`)
2. Enrollment date window validation (global `enrollmentOpenDate`/`enrollmentCloseDate`)
3. Duplicate enrollment prevention
4. Capacity checking with waiting list support
5. Partner validation and mutual matching
6. Guest enrollment permissions

**Current Limitations:**
- Enrollment window is tournament-wide, not per sub-event
- No bulk/multi-event enrollment support
- No pre-enrollment validation/cart preview
- No eligibility checking per sub-event (level restrictions, etc.)
- Partner matching is single-event only

---

## New API Endpoints

### 1. Get Available Sub-Events

**Purpose:** List all enrollable sub-events with real-time availability status

```graphql
query {
  getAvailableSubEvents(tournamentId: ID!): [SubEventAvailability!]!
}
```

**Response Type:**
```graphql
type SubEventAvailability {
  subEvent: TournamentSubEvent!
  enrollmentStatus: SubEventEnrollmentStatus!
  availableSlots: Int
  totalSlots: Int
  waitingListLength: Int
  isUserEnrolled: Boolean!
  userEnrollment: TournamentEnrollment
  canEnroll: Boolean!
  enrollmentRestrictions: [EnrollmentRestriction!]!
  partnerRequired: Boolean!
  lookingForPartnerCount: Int!
}
```

**Business Logic:**
- Check per-event enrollment windows (if implemented)
- Calculate available slots (accounting for singles/doubles)
- Verify user eligibility (level requirements, etc.)
- Check existing enrollments
- Return comprehensive status

---

### 2. Bulk Enroll in Tournament

**Purpose:** Enroll in multiple sub-events atomically with optional partner preferences

```graphql
mutation {
  bulkEnrollInTournament(input: BulkEnrollmentInput!): BulkEnrollmentResult!
}
```

**Input Type:**
```graphql
input BulkEnrollmentInput {
  tournamentId: ID!
  enrollments: [SubEventEnrollmentInput!]!
  partnerPreferences: [PartnerPreferenceInput!]
  notes: String
}

input SubEventEnrollmentInput {
  subEventId: ID!
  preferredPartnerId: ID
  notes: String
}

input PartnerPreferenceInput {
  subEventId: ID!
  preferredPartnerId: ID!
}
```

**Response Type:**
```graphql
type BulkEnrollmentResult {
  success: Boolean!
  enrollments: [TournamentEnrollment!]!
  errors: [EnrollmentError!]!
  warnings: [EnrollmentWarning!]!
  partnerMatchesFound: Int!
  waitingListPlacements: Int!
}

type EnrollmentError {
  subEventId: ID!
  subEventName: String!
  code: EnrollmentErrorCode!
  message: String!
  field: String
}

type EnrollmentWarning {
  subEventId: ID!
  message: String!
  severity: WarningSeverity!
}
```

**Transaction Behavior:**
- All-or-nothing: If any enrollment fails validation, rollback all
- Optional: Partial success mode (enroll successful ones, report failures)
- Automatic partner matching across all events
- Waiting list placement if capacity exceeded

---

### 3. Get Enrollment Cart Preview

**Purpose:** Preview enrollment before confirmation (validation + cost calculation)

```graphql
query {
  getEnrollmentCart(input: BulkEnrollmentInput!): EnrollmentCartPreview!
}
```

**Response Type:**
```graphql
type EnrollmentCartPreview {
  valid: Boolean!
  items: [EnrollmentCartItem!]!
  totalCost: Float
  currency: String
  errors: [EnrollmentError!]!
  warnings: [EnrollmentWarning!]!
  requiresPartnerConfirmation: Boolean!
  estimatedWaitingListPositions: [WaitingListEstimate!]!
}

type EnrollmentCartItem {
  subEvent: TournamentSubEvent!
  status: EnrollmentPreviewStatus!
  cost: Float
  preferredPartner: Player
  partnerMatchStatus: PartnerMatchStatus!
  eligibilityStatus: EligibilityStatus!
}

type WaitingListEstimate {
  subEventId: ID!
  subEventName: String!
  estimatedPosition: Int!
  likelihood: WaitingListLikelihood!
}
```

**Business Logic:**
- Dry-run validation (no database writes)
- Calculate costs per sub-event
- Check partner availability and mutual preferences
- Estimate waiting list positions
- Identify potential conflicts

---

### 4. Validate Enrollment

**Purpose:** Pre-submit validation without cart context

```graphql
query {
  validateEnrollment(
    tournamentId: ID!
    subEventIds: [ID!]!
    partnerPreferences: [PartnerPreferenceInput!]
  ): EnrollmentValidationResult!
}
```

**Response Type:**
```graphql
type EnrollmentValidationResult {
  valid: Boolean!
  eligibilityChecks: [SubEventEligibilityCheck!]!
  conflicts: [EnrollmentConflict!]!
  recommendations: [String!]!
}

type SubEventEligibilityCheck {
  subEventId: ID!
  subEventName: String!
  eligible: Boolean!
  reasons: [String!]!
  levelRequirementsMet: Boolean!
  capacityAvailable: Boolean!
  enrollmentWindowOpen: Boolean!
}

type EnrollmentConflict {
  type: ConflictType!
  message: String!
  affectedSubEvents: [ID!]!
  severity: ConflictSeverity!
}
```

**Business Logic:**
- Level requirement validation
- Capacity checks
- Enrollment window validation
- Schedule conflict detection (if dates overlap)
- Duplicate enrollment prevention

---

## Modified Endpoints

### 1. Enhanced `enrollInTournament`

**Current Implementation:**
```graphql
mutation {
  enrollInTournament(input: EnrollPlayerInput!): TournamentEnrollment!
}
```

**Required Changes:**

1. **Per-Event Enrollment Window Validation**
   ```typescript
   // OLD: Check tournament-level phase
   if (tournamentEvent.phase !== TournamentPhase.ENROLLMENT_OPEN) {
     throw new BadRequestException('Enrollment is not currently open');
   }

   // NEW: Check sub-event specific enrollment window
   const now = new Date();
   if (subEvent.enrollmentOpenDate && now < subEvent.enrollmentOpenDate) {
     throw new BadRequestException(
       `Enrollment for ${subEvent.name} has not started yet. Opens on ${subEvent.enrollmentOpenDate.toISOString()}`
     );
   }
   if (subEvent.enrollmentCloseDate && now > subEvent.enrollmentCloseDate) {
     throw new BadRequestException(
       `Enrollment for ${subEvent.name} has closed. Closed on ${subEvent.enrollmentCloseDate.toISOString()}`
     );
   }
   ```

2. **Eligibility Checks**
   ```typescript
   // Check player level against sub-event restrictions
   if (subEvent.minLevel && user.level < subEvent.minLevel) {
     throw new BadRequestException(
       `Your level (${user.level}) is below the minimum required (${subEvent.minLevel})`
     );
   }
   if (subEvent.maxLevel && user.level > subEvent.maxLevel) {
     throw new BadRequestException(
       `Your level (${user.level}) exceeds the maximum allowed (${subEvent.maxLevel})`
     );
   }
   ```

3. **Enhanced Error Responses**
   ```typescript
   // Return structured error codes instead of generic BadRequestException
   throw new EnrollmentException(
     EnrollmentErrorCode.LEVEL_TOO_LOW,
     `Your level (${user.level}) is below the minimum required (${subEvent.minLevel})`,
     { requiredLevel: subEvent.minLevel, playerLevel: user.level }
   );
   ```

### 2. Enhanced `enrollGuest`

**Required Changes:**
- Same per-event validation as `enrollInTournament`
- Add guest eligibility fields to `EnrollGuestInput` (e.g., estimated level)
- Validation based on estimated level vs. sub-event restrictions

---

## GraphQL Schema Definitions

### New Enums

```graphql
enum SubEventEnrollmentStatus {
  OPEN
  CLOSED
  FULL
  WAITING_LIST_AVAILABLE
  NOT_STARTED
  NOT_ELIGIBLE
}

enum PartnerMatchStatus {
  NO_PARTNER_REQUIRED
  PARTNER_MATCHED
  WAITING_FOR_PARTNER
  PARTNER_NOT_ENROLLED
  LOOKING_FOR_PARTNER
}

enum EligibilityStatus {
  ELIGIBLE
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  ALREADY_ENROLLED
  GENDER_MISMATCH
  CUSTOM_RESTRICTION
}

enum EnrollmentErrorCode {
  DUPLICATE_ENROLLMENT
  EVENT_FULL
  ENROLLMENT_CLOSED
  ENROLLMENT_NOT_STARTED
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  INVALID_PARTNER
  SELF_PARTNERING
  PARTNER_ALREADY_ENROLLED
  TOURNAMENT_PHASE_INVALID
  GUEST_NOT_ALLOWED
  CAPACITY_EXCEEDED
  VALIDATION_FAILED
  TRANSACTION_FAILED
}

enum WarningSeverity {
  INFO
  WARNING
  CRITICAL
}

enum WaitingListLikelihood {
  LIKELY
  POSSIBLE
  UNLIKELY
}

enum ConflictType {
  SCHEDULE_OVERLAP
  DUPLICATE_ENROLLMENT
  PARTNER_CONFLICT
  LEVEL_MISMATCH
}

enum ConflictSeverity {
  BLOCKING
  WARNING
  INFO
}

enum EnrollmentPreviewStatus {
  WILL_CONFIRM
  WILL_PEND
  WILL_WAITLIST
  WILL_FAIL
}
```

### New Input Types

```graphql
input BulkEnrollmentInput {
  """Tournament ID to enroll in"""
  tournamentId: ID!

  """List of sub-events to enroll in"""
  enrollments: [SubEventEnrollmentInput!]!

  """Optional partner preferences across events"""
  partnerPreferences: [PartnerPreferenceInput!]

  """Optional notes for all enrollments"""
  notes: String

  """If true, continue with successful enrollments even if some fail"""
  allowPartialSuccess: Boolean = false
}

input SubEventEnrollmentInput {
  """Sub-event ID to enroll in"""
  subEventId: ID!

  """Preferred partner for this specific event"""
  preferredPartnerId: ID

  """Optional notes for this specific enrollment"""
  notes: String
}

input PartnerPreferenceInput {
  """Sub-event ID"""
  subEventId: ID!

  """Preferred partner player ID"""
  preferredPartnerId: ID!
}
```

### New Object Types

```graphql
type SubEventAvailability {
  """The sub-event details"""
  subEvent: TournamentSubEvent!

  """Current enrollment status"""
  enrollmentStatus: SubEventEnrollmentStatus!

  """Number of available slots (null if unlimited)"""
  availableSlots: Int

  """Total capacity (null if unlimited)"""
  totalSlots: Int

  """Current waiting list length"""
  waitingListLength: Int!

  """Whether the current user is already enrolled"""
  isUserEnrolled: Boolean!

  """User's enrollment if exists"""
  userEnrollment: TournamentEnrollment

  """Whether the current user can enroll"""
  canEnroll: Boolean!

  """List of restrictions preventing enrollment"""
  enrollmentRestrictions: [EnrollmentRestriction!]!

  """Whether a partner is required for this event"""
  partnerRequired: Boolean!

  """Number of players looking for partners"""
  lookingForPartnerCount: Int!

  """Enrollment window dates"""
  enrollmentOpenDate: DateTime
  enrollmentCloseDate: DateTime

  """Whether enrollment window is currently open"""
  enrollmentWindowOpen: Boolean!
}

type EnrollmentRestriction {
  """Restriction type"""
  type: EnrollmentRestrictionType!

  """Human-readable message"""
  message: String!

  """Whether this is a blocking restriction"""
  blocking: Boolean!
}

enum EnrollmentRestrictionType {
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  ALREADY_ENROLLED
  EVENT_FULL
  ENROLLMENT_CLOSED
  ENROLLMENT_NOT_STARTED
  GENDER_RESTRICTION
  CUSTOM_RESTRICTION
}

type BulkEnrollmentResult {
  """Overall success status"""
  success: Boolean!

  """List of created enrollments"""
  enrollments: [TournamentEnrollment!]!

  """List of errors encountered"""
  errors: [EnrollmentError!]!

  """List of warnings"""
  warnings: [EnrollmentWarning!]!

  """Number of partner matches found"""
  partnerMatchesFound: Int!

  """Number of waiting list placements"""
  waitingListPlacements: Int!

  """Transaction ID for tracking"""
  transactionId: String!
}

type EnrollmentError {
  """Sub-event ID where error occurred"""
  subEventId: ID!

  """Sub-event name"""
  subEventName: String!

  """Error code"""
  code: EnrollmentErrorCode!

  """Error message"""
  message: String!

  """Field that caused the error"""
  field: String

  """Additional context"""
  metadata: JSON
}

type EnrollmentWarning {
  """Sub-event ID"""
  subEventId: ID!

  """Warning message"""
  message: String!

  """Warning severity"""
  severity: WarningSeverity!
}

type EnrollmentCartPreview {
  """Whether the cart is valid"""
  valid: Boolean!

  """Cart items"""
  items: [EnrollmentCartItem!]!

  """Total cost (if applicable)"""
  totalCost: Float

  """Currency code"""
  currency: String

  """Validation errors"""
  errors: [EnrollmentError!]!

  """Warnings"""
  warnings: [EnrollmentWarning!]!

  """Whether any enrollment requires partner confirmation"""
  requiresPartnerConfirmation: Boolean!

  """Estimated waiting list positions"""
  estimatedWaitingListPositions: [WaitingListEstimate!]!
}

type EnrollmentCartItem {
  """Sub-event details"""
  subEvent: TournamentSubEvent!

  """Expected enrollment status"""
  status: EnrollmentPreviewStatus!

  """Cost for this event"""
  cost: Float

  """Preferred partner (if specified)"""
  preferredPartner: Player

  """Partner match status"""
  partnerMatchStatus: PartnerMatchStatus!

  """Eligibility status"""
  eligibilityStatus: EligibilityStatus!

  """Validation messages"""
  messages: [String!]!
}

type WaitingListEstimate {
  """Sub-event ID"""
  subEventId: ID!

  """Sub-event name"""
  subEventName: String!

  """Estimated position on waiting list"""
  estimatedPosition: Int!

  """Likelihood of promotion"""
  likelihood: WaitingListLikelihood!
}

type EnrollmentValidationResult {
  """Overall validation status"""
  valid: Boolean!

  """Per-event eligibility checks"""
  eligibilityChecks: [SubEventEligibilityCheck!]!

  """Detected conflicts"""
  conflicts: [EnrollmentConflict!]!

  """Recommendations for the user"""
  recommendations: [String!]!
}

type SubEventEligibilityCheck {
  """Sub-event ID"""
  subEventId: ID!

  """Sub-event name"""
  subEventName: String!

  """Overall eligibility"""
  eligible: Boolean!

  """Reasons for ineligibility"""
  reasons: [String!]!

  """Level requirements met"""
  levelRequirementsMet: Boolean!

  """Capacity available"""
  capacityAvailable: Boolean!

  """Enrollment window open"""
  enrollmentWindowOpen: Boolean!
}

type EnrollmentConflict {
  """Conflict type"""
  type: ConflictType!

  """Conflict message"""
  message: String!

  """Affected sub-events"""
  affectedSubEvents: [ID!]!

  """Conflict severity"""
  severity: ConflictSeverity!
}
```

---

## Resolver Architecture

### Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     GraphQL API Layer                           │
│  (TournamentEnrollmentResolver)                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Service Layer                                   │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │ EnrollmentService    │  │ ValidationService        │        │
│  │ - enrollInEvents     │  │ - validateEligibility    │        │
│  │ - bulkEnroll         │  │ - checkCapacity          │        │
│  │ - cancelEnrollment   │  │ - validatePartner        │        │
│  │ - promoteFromWL      │  │ - validateEnrollmentWindow│       │
│  └──────────────────────┘  └──────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │ PartnerMatchService  │  │ WaitingListService       │        │
│  │ - findMatches        │  │ - addToWaitingList       │        │
│  │ - confirmPartnership │  │ - promoteNext            │        │
│  │ - getLookingForPartner│ │ - reorderPositions       │        │
│  └──────────────────────┘  └──────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │ AvailabilityService  │  │ NotificationService      │        │
│  │ - getAvailableSlots  │  │ - sendEnrollmentConfirm  │        │
│  │ - calculateAvailability│ │ - notifyPartnerMatch    │        │
│  └──────────────────────┘  └──────────────────────────┘        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Data Access Layer                               │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │ TournamentEnrollment │  │ TournamentSubEvent       │        │
│  │ (TypeORM Entity)     │  │ (TypeORM Entity)         │        │
│  └──────────────────────┘  └──────────────────────────┘        │
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐        │
│  │ TournamentEvent      │  │ Player                   │        │
│  │ (TypeORM Entity)     │  │ (TypeORM Entity)         │        │
│  └──────────────────────┘  └──────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
libs/backend/graphql/src/
├── resolvers/
│   └── event/
│       └── tournament/
│           └── tournament-enrollment.resolver.ts (EXISTING - Enhanced)
│
├── services/
│   └── tournament/
│       ├── enrollment.service.ts (NEW)
│       ├── validation.service.ts (NEW)
│       ├── partner-match.service.ts (NEW)
│       ├── waiting-list.service.ts (NEW)
│       ├── availability.service.ts (NEW)
│       └── notification.service.ts (NEW)
│
├── inputs/
│   └── tournament-enrollment.input.ts (EXISTING - Enhanced)
│
└── types/
    └── enrollment/
        ├── enrollment-cart.type.ts (NEW)
        ├── availability.type.ts (NEW)
        ├── validation.type.ts (NEW)
        └── errors.type.ts (NEW)
```

---

## Service Layer Design

### Separation of Concerns

Each service has a single, well-defined responsibility:

1. **EnrollmentService** - Core enrollment operations
2. **ValidationService** - Eligibility and business rule validation
3. **PartnerMatchService** - Partner matching logic
4. **WaitingListService** - Waiting list management
5. **AvailabilityService** - Capacity and availability calculations
6. **NotificationService** - User notifications (email, push, etc.)

### EnrollmentService

**Responsibility:** Core enrollment CRUD operations and bulk enrollment

```typescript
@Injectable()
export class EnrollmentService {
  constructor(
    private validationService: ValidationService,
    private partnerMatchService: PartnerMatchService,
    private waitingListService: WaitingListService,
    private notificationService: NotificationService,
    private dataSource: DataSource,
  ) {}

  /**
   * Enroll a player in a single sub-event
   */
  async enrollInSubEvent(
    player: Player,
    subEventId: string,
    options: EnrollmentOptions,
  ): Promise<TournamentEnrollment> {
    // Validation
    await this.validationService.validateEnrollment(player, subEventId, options);

    // Create enrollment
    const enrollment = await this.createEnrollment(player, subEventId, options);

    // Try partner matching if applicable
    if (options.preferredPartnerId) {
      await this.partnerMatchService.tryMatchPartners(enrollment);
    }

    // Send notification
    await this.notificationService.sendEnrollmentConfirmation(enrollment);

    return enrollment;
  }

  /**
   * Bulk enroll in multiple sub-events (atomic transaction)
   */
  async bulkEnroll(
    player: Player,
    input: BulkEnrollmentInput,
  ): Promise<BulkEnrollmentResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const enrollments: TournamentEnrollment[] = [];
      const errors: EnrollmentError[] = [];
      const warnings: EnrollmentWarning[] = [];

      // Validate all enrollments first
      for (const subEventInput of input.enrollments) {
        try {
          await this.validationService.validateEnrollment(
            player,
            subEventInput.subEventId,
            subEventInput,
          );
        } catch (error) {
          if (!input.allowPartialSuccess) {
            throw error; // Rollback all
          }
          errors.push(this.mapErrorToEnrollmentError(error, subEventInput.subEventId));
        }
      }

      // Create enrollments
      for (const subEventInput of input.enrollments) {
        const enrollment = await this.createEnrollmentInTransaction(
          queryRunner,
          player,
          subEventInput,
        );
        enrollments.push(enrollment);
      }

      // Partner matching across all events
      const matchesFound = await this.partnerMatchService.matchAcrossEvents(
        enrollments,
        input.partnerPreferences,
      );

      // Commit transaction
      await queryRunner.commitTransaction();

      // Send notifications (outside transaction)
      await this.notificationService.sendBulkEnrollmentConfirmation(enrollments);

      return {
        success: errors.length === 0,
        enrollments,
        errors,
        warnings,
        partnerMatchesFound: matchesFound,
        waitingListPlacements: enrollments.filter(e => e.status === EnrollmentStatus.WAITING_LIST).length,
        transactionId: generateTransactionId(),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancel an enrollment
   */
  async cancelEnrollment(
    enrollmentId: string,
    userId: string,
  ): Promise<TournamentEnrollment> {
    const enrollment = await this.findEnrollmentOrFail(enrollmentId);

    // Authorization check
    this.checkCancelPermission(enrollment, userId);

    // Update status
    enrollment.status = enrollment.playerId === userId
      ? EnrollmentStatus.WITHDRAWN
      : EnrollmentStatus.CANCELLED;

    // Break partner link if exists
    if (enrollment.confirmedPartnerId) {
      await this.partnerMatchService.breakPartnership(enrollment);
    }

    await enrollment.save();

    // Try to promote from waiting list
    if (enrollment.tournamentSubEvent?.waitingListEnabled) {
      await this.waitingListService.promoteNext(enrollment.tournamentSubEventId);
    }

    return enrollment;
  }
}
```

### ValidationService

**Responsibility:** Business rule validation and eligibility checking

```typescript
@Injectable()
export class ValidationService {
  /**
   * Comprehensive enrollment validation
   */
  async validateEnrollment(
    player: Player,
    subEventId: string,
    options: EnrollmentOptions,
  ): Promise<void> {
    const subEvent = await this.getSubEventOrFail(subEventId);
    const tournament = await this.getTournamentOrFail(subEvent.eventId);

    // 1. Enrollment window validation
    this.validateEnrollmentWindow(subEvent, tournament);

    // 2. Duplicate enrollment check
    await this.checkDuplicateEnrollment(player.id, subEventId);

    // 3. Level eligibility
    this.validateLevelEligibility(player, subEvent);

    // 4. Partner validation
    if (options.preferredPartnerId) {
      await this.validatePartner(options.preferredPartnerId, player.id, subEvent);
    }

    // 5. Guest enrollment permission
    if (options.isGuest && !tournament.allowGuestEnrollments) {
      throw new ForbiddenException('Guest enrollments not allowed');
    }

    // 6. Gender restrictions (if applicable)
    this.validateGenderRestrictions(player, subEvent);
  }

  /**
   * Validate enrollment window (per sub-event)
   */
  private validateEnrollmentWindow(
    subEvent: TournamentSubEvent,
    tournament: TournamentEvent,
  ): void {
    const now = new Date();

    // Check sub-event specific dates (if set)
    if (subEvent.enrollmentOpenDate) {
      if (now < subEvent.enrollmentOpenDate) {
        throw new EnrollmentException(
          EnrollmentErrorCode.ENROLLMENT_NOT_STARTED,
          `Enrollment for ${subEvent.name} opens on ${subEvent.enrollmentOpenDate.toISOString()}`,
        );
      }
    } else if (tournament.enrollmentOpenDate && now < tournament.enrollmentOpenDate) {
      // Fallback to tournament dates
      throw new EnrollmentException(
        EnrollmentErrorCode.ENROLLMENT_NOT_STARTED,
        `Enrollment opens on ${tournament.enrollmentOpenDate.toISOString()}`,
      );
    }

    if (subEvent.enrollmentCloseDate) {
      if (now > subEvent.enrollmentCloseDate) {
        throw new EnrollmentException(
          EnrollmentErrorCode.ENROLLMENT_CLOSED,
          `Enrollment for ${subEvent.name} closed on ${subEvent.enrollmentCloseDate.toISOString()}`,
        );
      }
    } else if (tournament.enrollmentCloseDate && now > tournament.enrollmentCloseDate) {
      throw new EnrollmentException(
        EnrollmentErrorCode.ENROLLMENT_CLOSED,
        `Enrollment closed on ${tournament.enrollmentCloseDate.toISOString()}`,
      );
    }

    // Check tournament phase as additional guard
    if (tournament.phase !== TournamentPhase.ENROLLMENT_OPEN) {
      throw new EnrollmentException(
        EnrollmentErrorCode.TOURNAMENT_PHASE_INVALID,
        `Tournament is in ${tournament.phase} phase`,
      );
    }
  }

  /**
   * Validate player level eligibility
   */
  private validateLevelEligibility(
    player: Player,
    subEvent: TournamentSubEvent,
  ): void {
    if (subEvent.minLevel && player.level < subEvent.minLevel) {
      throw new EnrollmentException(
        EnrollmentErrorCode.LEVEL_TOO_LOW,
        `Your level (${player.level}) is below the minimum required (${subEvent.minLevel})`,
        { requiredLevel: subEvent.minLevel, playerLevel: player.level },
      );
    }

    if (subEvent.maxLevel && player.level > subEvent.maxLevel) {
      throw new EnrollmentException(
        EnrollmentErrorCode.LEVEL_TOO_HIGH,
        `Your level (${player.level}) exceeds the maximum allowed (${subEvent.maxLevel})`,
        { requiredLevel: subEvent.maxLevel, playerLevel: player.level },
      );
    }
  }

  /**
   * Validate partner selection
   */
  private async validatePartner(
    partnerId: string,
    playerId: string,
    subEvent: TournamentSubEvent,
  ): Promise<void> {
    // Prevent self-partnering
    if (partnerId === playerId) {
      throw new EnrollmentException(
        EnrollmentErrorCode.SELF_PARTNERING,
        'You cannot select yourself as a partner',
      );
    }

    // Verify partner exists
    const partner = await Player.findOne({ where: { id: partnerId } });
    if (!partner) {
      throw new EnrollmentException(
        EnrollmentErrorCode.INVALID_PARTNER,
        `Partner with ID ${partnerId} not found`,
      );
    }

    // Check if partner meets level requirements
    if (subEvent.minLevel && partner.level < subEvent.minLevel) {
      throw new EnrollmentException(
        EnrollmentErrorCode.INVALID_PARTNER,
        `Partner's level (${partner.level}) is below the minimum required (${subEvent.minLevel})`,
      );
    }

    // Check if partner is already enrolled with another partner
    const partnerEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEvent.id,
        playerId: partnerId,
      },
    });

    if (partnerEnrollment?.confirmedPartnerId && partnerEnrollment.confirmedPartnerId !== playerId) {
      throw new EnrollmentException(
        EnrollmentErrorCode.PARTNER_ALREADY_ENROLLED,
        `${partner.firstName} ${partner.lastName} is already enrolled with another partner`,
      );
    }
  }

  /**
   * Check for duplicate enrollment
   */
  private async checkDuplicateEnrollment(
    playerId: string,
    subEventId: string,
  ): Promise<void> {
    const existing = await TournamentEnrollment.findOne({
      where: {
        playerId,
        tournamentSubEventId: subEventId,
      },
    });

    if (existing) {
      throw new EnrollmentException(
        EnrollmentErrorCode.DUPLICATE_ENROLLMENT,
        'You are already enrolled in this event',
        { existingEnrollmentId: existing.id },
      );
    }
  }

  /**
   * Validate gender restrictions
   */
  private validateGenderRestrictions(
    player: Player,
    subEvent: TournamentSubEvent,
  ): void {
    // If event type is M (Men) or F (Women), check player gender
    if (subEvent.eventType === SubEventTypeEnum.M && player.gender !== 'M') {
      throw new EnrollmentException(
        EnrollmentErrorCode.VALIDATION_FAILED,
        'This event is for male players only',
      );
    }

    if (subEvent.eventType === SubEventTypeEnum.F && player.gender !== 'F') {
      throw new EnrollmentException(
        EnrollmentErrorCode.VALIDATION_FAILED,
        'This event is for female players only',
      );
    }
  }
}
```

### PartnerMatchService

**Responsibility:** Partner matching and partnership management

```typescript
@Injectable()
export class PartnerMatchService {
  /**
   * Try to match partners based on mutual preference
   */
  async tryMatchPartners(enrollment: TournamentEnrollment): Promise<boolean> {
    if (!enrollment.preferredPartnerId || !enrollment.playerId) {
      return false;
    }

    // Find partner's enrollment
    const partnerEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: enrollment.tournamentSubEventId,
        playerId: enrollment.preferredPartnerId,
      },
    });

    if (!partnerEnrollment) {
      return false; // Partner hasn't enrolled yet
    }

    // Check mutual preference
    if (partnerEnrollment.preferredPartnerId === enrollment.playerId) {
      // Mutual match!
      enrollment.confirmedPartnerId = enrollment.preferredPartnerId;
      enrollment.status = EnrollmentStatus.CONFIRMED;
      await enrollment.save();

      partnerEnrollment.confirmedPartnerId = enrollment.playerId;
      partnerEnrollment.status = EnrollmentStatus.CONFIRMED;
      await partnerEnrollment.save();

      return true;
    }

    return false;
  }

  /**
   * Match partners across multiple events
   */
  async matchAcrossEvents(
    enrollments: TournamentEnrollment[],
    partnerPreferences?: PartnerPreferenceInput[],
  ): Promise<number> {
    let matchCount = 0;

    for (const enrollment of enrollments) {
      const matched = await this.tryMatchPartners(enrollment);
      if (matched) matchCount++;
    }

    return matchCount;
  }

  /**
   * Break partnership when one player cancels
   */
  async breakPartnership(enrollment: TournamentEnrollment): Promise<void> {
    if (!enrollment.confirmedPartnerId) return;

    const partnerEnrollment = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: enrollment.tournamentSubEventId,
        playerId: enrollment.confirmedPartnerId,
      },
    });

    if (partnerEnrollment) {
      partnerEnrollment.confirmedPartnerId = undefined;
      partnerEnrollment.status = EnrollmentStatus.PENDING;
      await partnerEnrollment.save();
    }

    enrollment.confirmedPartnerId = undefined;
  }

  /**
   * Get players looking for partners
   */
  async getLookingForPartner(subEventId: string): Promise<TournamentEnrollment[]> {
    const subEvent = await TournamentSubEvent.findOne({ where: { id: subEventId } });

    if (!subEvent || subEvent.gameType === GameType.S) {
      return []; // Singles events don't need partners
    }

    return TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.PENDING,
        confirmedPartnerId: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });
  }
}
```

### WaitingListService

**Responsibility:** Waiting list management and automatic promotion

```typescript
@Injectable()
export class WaitingListService {
  constructor(
    private availabilityService: AvailabilityService,
    private partnerMatchService: PartnerMatchService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Add enrollment to waiting list
   */
  async addToWaitingList(
    enrollment: TournamentEnrollment,
  ): Promise<number> {
    // Get next position
    const lastWaiting = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: enrollment.tournamentSubEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'DESC' },
    });

    const position = (lastWaiting?.waitingListPosition ?? 0) + 1;

    enrollment.status = EnrollmentStatus.WAITING_LIST;
    enrollment.waitingListPosition = position;
    await enrollment.save();

    return position;
  }

  /**
   * Promote next player from waiting list
   */
  async promoteNext(subEventId: string): Promise<TournamentEnrollment | null> {
    // Check if there's capacity
    const hasCapacity = await this.availabilityService.hasAvailableCapacity(subEventId);
    if (!hasCapacity) {
      return null;
    }

    // Get first in waiting list
    const nextInLine = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });

    if (!nextInLine) {
      return null;
    }

    // Promote
    nextInLine.status = EnrollmentStatus.PENDING;
    nextInLine.waitingListPosition = undefined;
    await nextInLine.save();

    // Try partner matching
    if (nextInLine.preferredPartnerId) {
      await this.partnerMatchService.tryMatchPartners(nextInLine);
    }

    // Reorder waiting list
    await this.reorderWaitingList(subEventId);

    // Notify player
    await this.notificationService.sendWaitingListPromotion(nextInLine);

    return nextInLine;
  }

  /**
   * Reorder waiting list positions
   */
  async reorderWaitingList(subEventId: string): Promise<void> {
    const waitingList = await TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });

    for (let i = 0; i < waitingList.length; i++) {
      waitingList[i].waitingListPosition = i + 1;
      await waitingList[i].save();
    }
  }

  /**
   * Get waiting list for sub-event
   */
  async getWaitingList(subEventId: string): Promise<TournamentEnrollment[]> {
    return TournamentEnrollment.find({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.WAITING_LIST,
      },
      order: { waitingListPosition: 'ASC' },
    });
  }
}
```

### AvailabilityService

**Responsibility:** Capacity calculation and availability checking

```typescript
@Injectable()
export class AvailabilityService {
  /**
   * Get available sub-events for a tournament
   */
  async getAvailableSubEvents(
    tournamentId: string,
    userId?: string,
  ): Promise<SubEventAvailability[]> {
    const subEvents = await TournamentSubEvent.find({
      where: { eventId: tournamentId },
      relations: ['tournamentEvent'],
    });

    const availabilities: SubEventAvailability[] = [];

    for (const subEvent of subEvents) {
      const availability = await this.calculateAvailability(subEvent, userId);
      availabilities.push(availability);
    }

    return availabilities;
  }

  /**
   * Calculate availability for a sub-event
   */
  async calculateAvailability(
    subEvent: TournamentSubEvent,
    userId?: string,
  ): Promise<SubEventAvailability> {
    const confirmedCount = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEvent.id,
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    const waitingListLength = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEvent.id,
        status: EnrollmentStatus.WAITING_LIST,
      },
    });

    const isDoubles = subEvent.gameType !== GameType.S;
    const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

    let availableSlots: number | null = null;
    let enrollmentStatus: SubEventEnrollmentStatus;

    if (subEvent.maxEntries) {
      availableSlots = Math.max(0, subEvent.maxEntries - effectiveEntries);

      if (availableSlots > 0) {
        enrollmentStatus = SubEventEnrollmentStatus.OPEN;
      } else if (subEvent.waitingListEnabled) {
        enrollmentStatus = SubEventEnrollmentStatus.WAITING_LIST_AVAILABLE;
      } else {
        enrollmentStatus = SubEventEnrollmentStatus.FULL;
      }
    } else {
      enrollmentStatus = SubEventEnrollmentStatus.OPEN;
    }

    // Check enrollment window
    const now = new Date();
    const enrollmentWindowOpen = this.isEnrollmentWindowOpen(subEvent, now);

    if (!enrollmentWindowOpen) {
      if (subEvent.enrollmentOpenDate && now < subEvent.enrollmentOpenDate) {
        enrollmentStatus = SubEventEnrollmentStatus.NOT_STARTED;
      } else {
        enrollmentStatus = SubEventEnrollmentStatus.CLOSED;
      }
    }

    // User enrollment status
    let isUserEnrolled = false;
    let userEnrollment: TournamentEnrollment | undefined;

    if (userId) {
      userEnrollment = await TournamentEnrollment.findOne({
        where: {
          tournamentSubEventId: subEvent.id,
          playerId: userId,
        },
      });
      isUserEnrolled = !!userEnrollment;
    }

    // Enrollment restrictions
    const restrictions = await this.getEnrollmentRestrictions(subEvent, userId);

    // Looking for partner count
    const lookingForPartnerCount = await this.getLookingForPartnerCount(subEvent.id);

    return {
      subEvent,
      enrollmentStatus,
      availableSlots,
      totalSlots: subEvent.maxEntries ?? null,
      waitingListLength,
      isUserEnrolled,
      userEnrollment,
      canEnroll: restrictions.filter(r => r.blocking).length === 0,
      enrollmentRestrictions: restrictions,
      partnerRequired: isDoubles,
      lookingForPartnerCount,
      enrollmentOpenDate: subEvent.enrollmentOpenDate ?? subEvent.tournamentEvent?.enrollmentOpenDate,
      enrollmentCloseDate: subEvent.enrollmentCloseDate ?? subEvent.tournamentEvent?.enrollmentCloseDate,
      enrollmentWindowOpen,
    };
  }

  /**
   * Check if enrollment window is open
   */
  private isEnrollmentWindowOpen(subEvent: TournamentSubEvent, now: Date): boolean {
    const openDate = subEvent.enrollmentOpenDate ?? subEvent.tournamentEvent?.enrollmentOpenDate;
    const closeDate = subEvent.enrollmentCloseDate ?? subEvent.tournamentEvent?.enrollmentCloseDate;

    if (openDate && now < openDate) return false;
    if (closeDate && now > closeDate) return false;

    return subEvent.tournamentEvent?.phase === TournamentPhase.ENROLLMENT_OPEN;
  }

  /**
   * Get enrollment restrictions for a user
   */
  private async getEnrollmentRestrictions(
    subEvent: TournamentSubEvent,
    userId?: string,
  ): Promise<EnrollmentRestriction[]> {
    const restrictions: EnrollmentRestriction[] = [];

    if (!userId) {
      restrictions.push({
        type: EnrollmentRestrictionType.CUSTOM_RESTRICTION,
        message: 'You must be logged in to enroll',
        blocking: true,
      });
      return restrictions;
    }

    // Check if already enrolled
    const existing = await TournamentEnrollment.findOne({
      where: {
        tournamentSubEventId: subEvent.id,
        playerId: userId,
      },
    });

    if (existing) {
      restrictions.push({
        type: EnrollmentRestrictionType.ALREADY_ENROLLED,
        message: 'You are already enrolled in this event',
        blocking: true,
      });
    }

    // Check level requirements
    const player = await Player.findOne({ where: { id: userId } });
    if (player) {
      if (subEvent.minLevel && player.level < subEvent.minLevel) {
        restrictions.push({
          type: EnrollmentRestrictionType.LEVEL_TOO_LOW,
          message: `Your level (${player.level}) is below the minimum required (${subEvent.minLevel})`,
          blocking: true,
        });
      }

      if (subEvent.maxLevel && player.level > subEvent.maxLevel) {
        restrictions.push({
          type: EnrollmentRestrictionType.LEVEL_TOO_HIGH,
          message: `Your level (${player.level}) exceeds the maximum allowed (${subEvent.maxLevel})`,
          blocking: true,
        });
      }
    }

    // Check capacity
    const hasCapacity = await this.hasAvailableCapacity(subEvent.id);
    if (!hasCapacity && !subEvent.waitingListEnabled) {
      restrictions.push({
        type: EnrollmentRestrictionType.EVENT_FULL,
        message: 'This event is full and does not have a waiting list',
        blocking: true,
      });
    }

    // Check enrollment window
    const now = new Date();
    if (!this.isEnrollmentWindowOpen(subEvent, now)) {
      const openDate = subEvent.enrollmentOpenDate ?? subEvent.tournamentEvent?.enrollmentOpenDate;
      const closeDate = subEvent.enrollmentCloseDate ?? subEvent.tournamentEvent?.enrollmentCloseDate;

      if (openDate && now < openDate) {
        restrictions.push({
          type: EnrollmentRestrictionType.ENROLLMENT_NOT_STARTED,
          message: `Enrollment opens on ${openDate.toISOString()}`,
          blocking: true,
        });
      } else {
        restrictions.push({
          type: EnrollmentRestrictionType.ENROLLMENT_CLOSED,
          message: closeDate ? `Enrollment closed on ${closeDate.toISOString()}` : 'Enrollment is closed',
          blocking: true,
        });
      }
    }

    return restrictions;
  }

  /**
   * Check if sub-event has available capacity
   */
  async hasAvailableCapacity(subEventId: string): Promise<boolean> {
    const subEvent = await TournamentSubEvent.findOne({ where: { id: subEventId } });

    if (!subEvent || !subEvent.maxEntries) {
      return true; // Unlimited capacity
    }

    const confirmedCount = await TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.CONFIRMED,
      },
    });

    const isDoubles = subEvent.gameType !== GameType.S;
    const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

    return effectiveEntries < subEvent.maxEntries;
  }

  /**
   * Get count of players looking for partners
   */
  private async getLookingForPartnerCount(subEventId: string): Promise<number> {
    return TournamentEnrollment.count({
      where: {
        tournamentSubEventId: subEventId,
        status: EnrollmentStatus.PENDING,
        confirmedPartnerId: IsNull(),
      },
    });
  }
}
```

---

## Business Logic Design

### 1. Per-Event Enrollment Window Validation

**Requirement:** Each sub-event can have its own enrollment window, independent of the tournament-level window.

**Database Schema Addition:**
```sql
ALTER TABLE event."SubEventTournaments"
ADD COLUMN "enrollmentOpenDate" TIMESTAMPTZ,
ADD COLUMN "enrollmentCloseDate" TIMESTAMPTZ;
```

**Validation Logic:**
```typescript
// Priority order:
// 1. Sub-event specific dates (if set)
// 2. Tournament-level dates (fallback)
// 3. Tournament phase check

const now = new Date();
const openDate = subEvent.enrollmentOpenDate ?? tournament.enrollmentOpenDate;
const closeDate = subEvent.enrollmentCloseDate ?? tournament.enrollmentCloseDate;

if (openDate && now < openDate) {
  throw new EnrollmentException(
    EnrollmentErrorCode.ENROLLMENT_NOT_STARTED,
    `Enrollment opens on ${openDate.toISOString()}`
  );
}

if (closeDate && now > closeDate) {
  throw new EnrollmentException(
    EnrollmentErrorCode.ENROLLMENT_CLOSED,
    `Enrollment closed on ${closeDate.toISOString()}`
  );
}

if (tournament.phase !== TournamentPhase.ENROLLMENT_OPEN) {
  throw new EnrollmentException(
    EnrollmentErrorCode.TOURNAMENT_PHASE_INVALID,
    `Tournament is in ${tournament.phase} phase`
  );
}
```

---

### 2. Cross-Event Capacity Checking

**Requirement:** When enrolling in multiple events, ensure capacity checks are accurate and atomic.

**Implementation:**
```typescript
async validateBulkEnrollmentCapacity(
  subEventIds: string[],
): Promise<void> {
  for (const subEventId of subEventIds) {
    const subEvent = await TournamentSubEvent.findOne({ where: { id: subEventId } });

    if (!subEvent.maxEntries) continue; // Unlimited

    // Lock row for capacity check (prevents race conditions)
    const confirmedCount = await TournamentEnrollment
      .createQueryBuilder('enrollment')
      .setLock('pessimistic_write')
      .where('enrollment.tournamentSubEventId = :subEventId', { subEventId })
      .andWhere('enrollment.status = :status', { status: EnrollmentStatus.CONFIRMED })
      .getCount();

    const isDoubles = subEvent.gameType !== GameType.S;
    const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

    if (effectiveEntries >= subEvent.maxEntries) {
      if (!subEvent.waitingListEnabled) {
        throw new EnrollmentException(
          EnrollmentErrorCode.EVENT_FULL,
          `${subEvent.name} is full`
        );
      }
      // Will be added to waiting list
    }
  }
}
```

---

### 3. Atomic Multi-Event Enrollment

**Requirement:** All enrollments in a bulk operation must succeed or fail together (unless `allowPartialSuccess` is enabled).

**Transaction Strategy:**
```typescript
async bulkEnroll(
  player: Player,
  input: BulkEnrollmentInput,
): Promise<BulkEnrollmentResult> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Phase 1: Validation (no writes)
    const validationErrors: EnrollmentError[] = [];
    for (const subEventInput of input.enrollments) {
      try {
        await this.validationService.validateEnrollment(
          player,
          subEventInput.subEventId,
          subEventInput,
        );
      } catch (error) {
        if (!input.allowPartialSuccess) {
          throw error; // Immediate rollback
        }
        validationErrors.push(
          this.mapErrorToEnrollmentError(error, subEventInput.subEventId)
        );
      }
    }

    // Phase 2: Enrollment creation (within transaction)
    const enrollments: TournamentEnrollment[] = [];
    for (const subEventInput of input.enrollments) {
      // Skip if validation failed and partial success allowed
      if (validationErrors.some(e => e.subEventId === subEventInput.subEventId)) {
        continue;
      }

      const enrollment = queryRunner.manager.create(TournamentEnrollment, {
        tournamentSubEventId: subEventInput.subEventId,
        playerId: player.id,
        preferredPartnerId: subEventInput.preferredPartnerId,
        notes: subEventInput.notes,
        status: EnrollmentStatus.PENDING,
        isGuest: false,
      });

      await queryRunner.manager.save(enrollment);
      enrollments.push(enrollment);
    }

    // Phase 3: Partner matching (within transaction)
    let matchesFound = 0;
    for (const enrollment of enrollments) {
      if (enrollment.preferredPartnerId) {
        const matched = await this.partnerMatchService.tryMatchPartnersInTransaction(
          enrollment,
          queryRunner,
        );
        if (matched) matchesFound++;
      }
    }

    // Phase 4: Commit
    await queryRunner.commitTransaction();

    // Phase 5: Post-commit notifications (outside transaction)
    await this.notificationService.sendBulkEnrollmentConfirmation(enrollments);

    return {
      success: validationErrors.length === 0,
      enrollments,
      errors: validationErrors,
      warnings: [],
      partnerMatchesFound: matchesFound,
      waitingListPlacements: enrollments.filter(e => e.status === EnrollmentStatus.WAITING_LIST).length,
      transactionId: uuidv4(),
    };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

---

### 4. Waiting List Automatic Promotion Logic

**Requirement:** When a player cancels, automatically promote the next player from the waiting list.

**Implementation:**
```typescript
async promoteNext(subEventId: string): Promise<TournamentEnrollment | null> {
  // Check capacity
  const hasCapacity = await this.availabilityService.hasAvailableCapacity(subEventId);
  if (!hasCapacity) {
    return null;
  }

  // Get first in waiting list (FIFO)
  const nextInLine = await TournamentEnrollment.findOne({
    where: {
      tournamentSubEventId: subEventId,
      status: EnrollmentStatus.WAITING_LIST,
    },
    order: { waitingListPosition: 'ASC' },
  });

  if (!nextInLine) {
    return null;
  }

  // Promote
  nextInLine.status = EnrollmentStatus.PENDING;
  nextInLine.waitingListPosition = undefined;
  await nextInLine.save();

  // Try partner matching
  if (nextInLine.preferredPartnerId) {
    const matched = await this.partnerMatchService.tryMatchPartners(nextInLine);
    if (matched) {
      // Partner was found and confirmed
      nextInLine.status = EnrollmentStatus.CONFIRMED;
      await nextInLine.save();
    }
  } else {
    // Singles event - confirm immediately
    const subEvent = await TournamentSubEvent.findOne({ where: { id: subEventId } });
    if (subEvent?.gameType === GameType.S) {
      nextInLine.status = EnrollmentStatus.CONFIRMED;
      await nextInLine.save();
    }
  }

  // Reorder remaining waiting list
  await this.reorderWaitingList(subEventId);

  // Send notification
  await this.notificationService.sendWaitingListPromotion(nextInLine);

  return nextInLine;
}
```

**Trigger Points:**
1. Player cancels enrollment
2. Player is manually removed by admin
3. Capacity is increased by admin
4. Partner breaks partnership (freeing a slot)

---

### 5. Partner Matching Across Multiple Events

**Requirement:** When enrolling in multiple events, match partners across all events simultaneously.

**Implementation:**
```typescript
async matchAcrossEvents(
  enrollments: TournamentEnrollment[],
  partnerPreferences?: PartnerPreferenceInput[],
): Promise<number> {
  let matchCount = 0;

  // Group enrollments by sub-event
  const bySubEvent = new Map<string, TournamentEnrollment>();
  for (const enrollment of enrollments) {
    bySubEvent.set(enrollment.tournamentSubEventId, enrollment);
  }

  // Apply global partner preferences (if specified)
  if (partnerPreferences) {
    for (const pref of partnerPreferences) {
      const enrollment = bySubEvent.get(pref.subEventId);
      if (enrollment) {
        enrollment.preferredPartnerId = pref.preferredPartnerId;
      }
    }
  }

  // Try matching for each enrollment
  for (const enrollment of enrollments) {
    const matched = await this.tryMatchPartners(enrollment);
    if (matched) matchCount++;
  }

  return matchCount;
}
```

**Mutual Preference Logic:**
```typescript
async tryMatchPartners(enrollment: TournamentEnrollment): Promise<boolean> {
  if (!enrollment.preferredPartnerId || !enrollment.playerId) {
    return false;
  }

  // Find partner's enrollment
  const partnerEnrollment = await TournamentEnrollment.findOne({
    where: {
      tournamentSubEventId: enrollment.tournamentSubEventId,
      playerId: enrollment.preferredPartnerId,
    },
  });

  if (!partnerEnrollment) {
    return false; // Partner hasn't enrolled yet
  }

  // Check mutual preference (both must name each other)
  if (partnerEnrollment.preferredPartnerId === enrollment.playerId) {
    // MUTUAL MATCH!
    enrollment.confirmedPartnerId = enrollment.preferredPartnerId;
    enrollment.status = EnrollmentStatus.CONFIRMED;
    await enrollment.save();

    partnerEnrollment.confirmedPartnerId = enrollment.playerId;
    partnerEnrollment.status = EnrollmentStatus.CONFIRMED;
    await partnerEnrollment.save();

    // Send notifications
    await this.notificationService.sendPartnerMatchConfirmation(
      enrollment,
      partnerEnrollment,
    );

    return true;
  }

  return false;
}
```

---

## Authentication & Authorization

### Permission Model

```typescript
enum EnrollmentPermission {
  // Player permissions
  ENROLL_SELF = 'enroll:tournament',
  VIEW_OWN_ENROLLMENTS = 'view-own:enrollment',
  CANCEL_OWN_ENROLLMENT = 'cancel-own:enrollment',
  UPDATE_OWN_ENROLLMENT = 'update-own:enrollment',

  // Admin permissions
  ENROLL_ANY = 'enroll-any:tournament',
  VIEW_ALL_ENROLLMENTS = 'view-all:enrollment',
  CANCEL_ANY_ENROLLMENT = 'cancel-any:enrollment',
  PROMOTE_WAITING_LIST = 'manage:waiting-list',
  MANAGE_TOURNAMENT = 'edit-any:tournament',

  // Club permissions (scoped by clubId)
  MANAGE_CLUB_TOURNAMENT = '{clubId}_edit:tournament',
}
```

### Permission Checks

**1. Enroll in Tournament**
- Authenticated players: Can enroll themselves
- Guests: Can enroll if `tournament.allowGuestEnrollments === true`
- Admins: Can enroll on behalf of others (with `enroll-any:tournament`)

```typescript
@Mutation(() => TournamentEnrollment)
@UseGuards(PermGuard)
async enrollInTournament(
  @User() user: Player,
  @Args('input') input: EnrollPlayerInput,
): Promise<TournamentEnrollment> {
  // User is enrolling themselves (default case)
  return this.enrollmentService.enrollInSubEvent(user, input.tournamentSubEventId, input);
}
```

**2. Bulk Enroll**
- Requires authentication
- Cannot enroll on behalf of others (unless admin)

```typescript
@Mutation(() => BulkEnrollmentResult)
@UseGuards(PermGuard)
async bulkEnrollInTournament(
  @User() user: Player,
  @Args('input') input: BulkEnrollmentInput,
): Promise<BulkEnrollmentResult> {
  return this.enrollmentService.bulkEnroll(user, input);
}
```

**3. Cancel Enrollment**
- Player can cancel their own enrollments
- Admins can cancel any enrollment
- Club organizers can cancel enrollments for their tournament

```typescript
@Mutation(() => TournamentEnrollment)
@UseGuards(PermGuard)
async cancelEnrollment(
  @User() user: Player,
  @Args('enrollmentId') enrollmentId: string,
): Promise<TournamentEnrollment> {
  const enrollment = await TournamentEnrollment.findOne({
    where: { id: enrollmentId },
    relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
  });

  if (!enrollment) {
    throw new NotFoundException('Enrollment not found');
  }

  // Check permissions
  const isOwner = enrollment.playerId === user.id;
  const isAdmin = user.hasAnyPermission(['cancel-any:enrollment', 'edit-any:tournament']);
  const isClubOrganizer = user.hasAnyPermission([
    `${enrollment.tournamentSubEvent.tournamentEvent.clubId}_edit:tournament`,
  ]);

  if (!isOwner && !isAdmin && !isClubOrganizer) {
    throw new ForbiddenException('You do not have permission to cancel this enrollment');
  }

  return this.enrollmentService.cancelEnrollment(enrollmentId, user.id);
}
```

**4. Promote from Waiting List**
- Admin only
- Club organizers for their tournaments

```typescript
@Mutation(() => TournamentEnrollment)
@UseGuards(PermGuard)
async promoteFromWaitingList(
  @User() user: Player,
  @Args('enrollmentId') enrollmentId: string,
): Promise<TournamentEnrollment> {
  const enrollment = await TournamentEnrollment.findOne({
    where: { id: enrollmentId },
    relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
  });

  if (!enrollment) {
    throw new NotFoundException('Enrollment not found');
  }

  const isAdmin = user.hasAnyPermission(['manage:waiting-list', 'edit-any:tournament']);
  const isClubOrganizer = user.hasAnyPermission([
    `${enrollment.tournamentSubEvent.tournamentEvent.clubId}_edit:tournament`,
  ]);

  if (!isAdmin && !isClubOrganizer) {
    throw new ForbiddenException('You do not have permission to manage the waiting list');
  }

  return this.waitingListService.promoteFromWaitingList(enrollmentId);
}
```

**5. Get Available Sub-Events**
- Public query (no authentication required)
- Returns personalized data if user is authenticated

```typescript
@Query(() => [SubEventAvailability])
@AllowAnonymous()
async getAvailableSubEvents(
  @User() user: Player | null,
  @Args('tournamentId') tournamentId: string,
): Promise<SubEventAvailability[]> {
  return this.availabilityService.getAvailableSubEvents(tournamentId, user?.id);
}
```

**6. Get Enrollment Cart**
- Requires authentication (needs user context for validation)

```typescript
@Query(() => EnrollmentCartPreview)
@UseGuards(PermGuard)
async getEnrollmentCart(
  @User() user: Player,
  @Args('input') input: BulkEnrollmentInput,
): Promise<EnrollmentCartPreview> {
  return this.enrollmentService.previewEnrollment(user, input);
}
```

### Rate Limiting

Prevent abuse of bulk enrollment endpoints:

```typescript
@Throttle(5, 60) // 5 requests per 60 seconds
@Mutation(() => BulkEnrollmentResult)
@UseGuards(PermGuard, ThrottlerGuard)
async bulkEnrollInTournament(
  @User() user: Player,
  @Args('input') input: BulkEnrollmentInput,
): Promise<BulkEnrollmentResult> {
  // Limit number of simultaneous enrollments
  if (input.enrollments.length > 10) {
    throw new BadRequestException('Maximum 10 enrollments per request');
  }

  return this.enrollmentService.bulkEnroll(user, input);
}
```

---

## Error Handling Strategy

### Error Codes

```typescript
enum EnrollmentErrorCode {
  // Validation errors
  DUPLICATE_ENROLLMENT = 'DUPLICATE_ENROLLMENT',
  LEVEL_TOO_LOW = 'LEVEL_TOO_LOW',
  LEVEL_TOO_HIGH = 'LEVEL_TOO_HIGH',
  INVALID_PARTNER = 'INVALID_PARTNER',
  SELF_PARTNERING = 'SELF_PARTNERING',
  PARTNER_ALREADY_ENROLLED = 'PARTNER_ALREADY_ENROLLED',
  GENDER_MISMATCH = 'GENDER_MISMATCH',

  // Capacity errors
  EVENT_FULL = 'EVENT_FULL',
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED',
  WAITING_LIST_DISABLED = 'WAITING_LIST_DISABLED',

  // Timing errors
  ENROLLMENT_CLOSED = 'ENROLLMENT_CLOSED',
  ENROLLMENT_NOT_STARTED = 'ENROLLMENT_NOT_STARTED',
  TOURNAMENT_PHASE_INVALID = 'TOURNAMENT_PHASE_INVALID',

  // Permission errors
  GUEST_NOT_ALLOWED = 'GUEST_NOT_ALLOWED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // System errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### Custom Exception Class

```typescript
export class EnrollmentException extends Error {
  constructor(
    public readonly code: EnrollmentErrorCode,
    public readonly message: string,
    public readonly metadata?: Record<string, any>,
  ) {
    super(message);
    this.name = 'EnrollmentException';
  }

  toGraphQLError(): GraphQLError {
    return new GraphQLError(this.message, {
      extensions: {
        code: this.code,
        metadata: this.metadata,
      },
    });
  }
}
```

### Error Response Format

**Single Mutation Error:**
```json
{
  "errors": [
    {
      "message": "Your level (4) is below the minimum required (6)",
      "extensions": {
        "code": "LEVEL_TOO_LOW",
        "metadata": {
          "requiredLevel": 6,
          "playerLevel": 4
        }
      },
      "path": ["enrollInTournament"]
    }
  ],
  "data": null
}
```

**Bulk Mutation Partial Success:**
```json
{
  "data": {
    "bulkEnrollInTournament": {
      "success": false,
      "enrollments": [
        {
          "id": "enrollment-1",
          "tournamentSubEventId": "event-1",
          "status": "CONFIRMED"
        },
        {
          "id": "enrollment-2",
          "tournamentSubEventId": "event-2",
          "status": "PENDING"
        }
      ],
      "errors": [
        {
          "subEventId": "event-3",
          "subEventName": "Men's Doubles A",
          "code": "LEVEL_TOO_LOW",
          "message": "Your level (4) is below the minimum required (6)",
          "metadata": {
            "requiredLevel": 6,
            "playerLevel": 4
          }
        }
      ],
      "warnings": [
        {
          "subEventId": "event-2",
          "message": "Partner has not enrolled yet. You will be marked as looking for partner.",
          "severity": "WARNING"
        }
      ],
      "partnerMatchesFound": 1,
      "waitingListPlacements": 0,
      "transactionId": "txn-12345-abcde"
    }
  }
}
```

### Error Handling in Resolvers

```typescript
@Mutation(() => TournamentEnrollment)
@UseGuards(PermGuard)
async enrollInTournament(
  @User() user: Player,
  @Args('input') input: EnrollPlayerInput,
): Promise<TournamentEnrollment> {
  try {
    return await this.enrollmentService.enrollInSubEvent(
      user,
      input.tournamentSubEventId,
      input,
    );
  } catch (error) {
    if (error instanceof EnrollmentException) {
      throw error.toGraphQLError();
    }

    if (error instanceof NotFoundException) {
      throw new GraphQLError(error.message, {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (error instanceof ForbiddenException) {
      throw new GraphQLError(error.message, {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Unknown error
    throw new GraphQLError('An unexpected error occurred', {
      extensions: {
        code: EnrollmentErrorCode.UNKNOWN_ERROR,
        originalError: error.message,
      },
    });
  }
}
```

### Validation Error Accumulation

For bulk operations, accumulate errors instead of failing fast:

```typescript
async validateBulkEnrollment(
  player: Player,
  input: BulkEnrollmentInput,
): Promise<EnrollmentError[]> {
  const errors: EnrollmentError[] = [];

  for (const subEventInput of input.enrollments) {
    try {
      await this.validationService.validateEnrollment(
        player,
        subEventInput.subEventId,
        subEventInput,
      );
    } catch (error) {
      if (error instanceof EnrollmentException) {
        errors.push({
          subEventId: subEventInput.subEventId,
          subEventName: await this.getSubEventName(subEventInput.subEventId),
          code: error.code,
          message: error.message,
          metadata: error.metadata,
        });
      } else {
        errors.push({
          subEventId: subEventInput.subEventId,
          subEventName: await this.getSubEventName(subEventInput.subEventId),
          code: EnrollmentErrorCode.VALIDATION_FAILED,
          message: error.message,
        });
      }
    }
  }

  return errors;
}
```

---

## Transaction Management

### ACID Guarantees

All bulk enrollment operations must maintain ACID properties:

1. **Atomicity:** All enrollments succeed or all fail (unless `allowPartialSuccess`)
2. **Consistency:** Database constraints maintained (unique enrollments, capacity limits)
3. **Isolation:** Concurrent enrollments don't interfere (pessimistic locking)
4. **Durability:** Committed enrollments persist

### Transaction Implementation

```typescript
async bulkEnroll(
  player: Player,
  input: BulkEnrollmentInput,
): Promise<BulkEnrollmentResult> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('READ COMMITTED');

  try {
    // Step 1: Acquire locks on all sub-events (prevent race conditions)
    const subEvents = await queryRunner.manager
      .createQueryBuilder(TournamentSubEvent, 'subEvent')
      .setLock('pessimistic_write')
      .whereInIds(input.enrollments.map(e => e.subEventId))
      .getMany();

    // Step 2: Validate all enrollments
    const errors = await this.validateBulkEnrollmentInTransaction(
      player,
      input,
      queryRunner,
    );

    if (errors.length > 0 && !input.allowPartialSuccess) {
      throw new EnrollmentException(
        EnrollmentErrorCode.VALIDATION_FAILED,
        'One or more enrollments failed validation',
        { errors },
      );
    }

    // Step 3: Create enrollments
    const enrollments = await this.createEnrollmentsInTransaction(
      player,
      input,
      queryRunner,
      errors,
    );

    // Step 4: Partner matching
    const matchesFound = await this.matchPartnersInTransaction(
      enrollments,
      queryRunner,
    );

    // Step 5: Commit
    await queryRunner.commitTransaction();

    // Step 6: Post-commit operations (notifications, logging)
    await this.postCommitOperations(enrollments);

    return {
      success: errors.length === 0,
      enrollments,
      errors,
      warnings: [],
      partnerMatchesFound: matchesFound,
      waitingListPlacements: enrollments.filter(e => e.status === EnrollmentStatus.WAITING_LIST).length,
      transactionId: uuidv4(),
    };

  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Pessimistic Locking

Prevent race conditions when checking capacity:

```typescript
async checkCapacityWithLock(
  subEventId: string,
  queryRunner: QueryRunner,
): Promise<boolean> {
  const subEvent = await queryRunner.manager
    .createQueryBuilder(TournamentSubEvent, 'subEvent')
    .setLock('pessimistic_write')
    .where('subEvent.id = :id', { id: subEventId })
    .getOne();

  if (!subEvent || !subEvent.maxEntries) {
    return true; // Unlimited capacity
  }

  const confirmedCount = await queryRunner.manager
    .createQueryBuilder(TournamentEnrollment, 'enrollment')
    .where('enrollment.tournamentSubEventId = :subEventId', { subEventId })
    .andWhere('enrollment.status = :status', { status: EnrollmentStatus.CONFIRMED })
    .getCount();

  const isDoubles = subEvent.gameType !== GameType.S;
  const effectiveEntries = isDoubles ? Math.ceil(confirmedCount / 2) : confirmedCount;

  return effectiveEntries < subEvent.maxEntries;
}
```

### Retry Logic

For transient failures (deadlocks, connection issues):

```typescript
async enrollWithRetry(
  player: Player,
  input: BulkEnrollmentInput,
  maxRetries: number = 3,
): Promise<BulkEnrollmentResult> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.bulkEnroll(player, input);
    } catch (error) {
      lastError = error;

      // Retry on deadlock or connection errors
      if (this.isRetryableError(error) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error or max retries exceeded
      throw error;
    }
  }

  throw lastError!;
}

private isRetryableError(error: any): boolean {
  return (
    error.code === 'DEADLOCK_DETECTED' ||
    error.code === 'CONNECTION_ERROR' ||
    error.message.includes('deadlock')
  );
}
```

---

## Performance Considerations

### 1. Database Indexes

**Required Indexes:**
```sql
-- Enrollment lookups
CREATE INDEX idx_enrollment_subevent_player
ON event."TournamentEnrollments" ("tournamentSubEventId", "playerId");

CREATE INDEX idx_enrollment_subevent_status
ON event."TournamentEnrollments" ("tournamentSubEventId", "status");

CREATE INDEX idx_enrollment_waitinglist
ON event."TournamentEnrollments" ("tournamentSubEventId", "status", "waitingListPosition")
WHERE "status" = 'WAITING_LIST';

-- Partner matching
CREATE INDEX idx_enrollment_preferred_partner
ON event."TournamentEnrollments" ("tournamentSubEventId", "preferredPartnerId")
WHERE "preferredPartnerId" IS NOT NULL;

CREATE INDEX idx_enrollment_confirmed_partner
ON event."TournamentEnrollments" ("tournamentSubEventId", "confirmedPartnerId")
WHERE "confirmedPartnerId" IS NOT NULL;

-- Sub-event queries
CREATE INDEX idx_subevent_tournament
ON event."SubEventTournaments" ("eventId");

CREATE INDEX idx_subevent_enrollment_dates
ON event."SubEventTournaments" ("enrollmentOpenDate", "enrollmentCloseDate");
```

### 2. Query Optimization

**Batch Loading with DataLoader:**
```typescript
@Injectable()
export class EnrollmentDataLoader {
  private readonly subEventLoader: DataLoader<string, TournamentSubEvent>;
  private readonly enrollmentCountLoader: DataLoader<string, number>;

  constructor() {
    this.subEventLoader = new DataLoader(async (ids: string[]) => {
      const subEvents = await TournamentSubEvent.findByIds(ids);
      const map = new Map(subEvents.map(se => [se.id, se]));
      return ids.map(id => map.get(id) || null);
    });

    this.enrollmentCountLoader = new DataLoader(async (subEventIds: string[]) => {
      const counts = await TournamentEnrollment
        .createQueryBuilder('enrollment')
        .select('enrollment.tournamentSubEventId', 'subEventId')
        .addSelect('COUNT(*)', 'count')
        .where('enrollment.tournamentSubEventId IN (:...ids)', { ids: subEventIds })
        .andWhere('enrollment.status = :status', { status: EnrollmentStatus.CONFIRMED })
        .groupBy('enrollment.tournamentSubEventId')
        .getRawMany();

      const map = new Map(counts.map(c => [c.subEventId, parseInt(c.count)]));
      return subEventIds.map(id => map.get(id) || 0);
    });
  }

  async loadSubEvent(id: string): Promise<TournamentSubEvent | null> {
    return this.subEventLoader.load(id);
  }

  async loadEnrollmentCount(subEventId: string): Promise<number> {
    return this.enrollmentCountLoader.load(subEventId);
  }
}
```

### 3. Caching Strategy

**Cache availability data (short TTL):**
```typescript
@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getAvailableSubEvents(
    tournamentId: string,
    userId?: string,
  ): Promise<SubEventAvailability[]> {
    // Cache key includes userId for personalized data
    const cacheKey = `availability:${tournamentId}:${userId || 'anonymous'}`;

    // Check cache
    const cached = await this.cacheManager.get<SubEventAvailability[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Compute availability
    const availability = await this.computeAvailability(tournamentId, userId);

    // Cache for 30 seconds (availability changes frequently)
    await this.cacheManager.set(cacheKey, availability, 30);

    return availability;
  }

  async invalidateCache(tournamentId: string): Promise<void> {
    // Invalidate all cached availability for this tournament
    const keys = await this.cacheManager.store.keys(`availability:${tournamentId}:*`);
    await Promise.all(keys.map(key => this.cacheManager.del(key)));
  }
}
```

### 4. Pagination

**For large enrollment lists:**
```typescript
@Query(() => PaginatedEnrollments)
async tournamentEnrollments(
  @Args('tournamentId') tournamentId: string,
  @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
  @Args('pageSize', { type: () => Int, defaultValue: 50 }) pageSize: number,
): Promise<PaginatedEnrollments> {
  const skip = (page - 1) * pageSize;

  const [enrollments, total] = await TournamentEnrollment.findAndCount({
    where: { tournamentSubEvent: { eventId: tournamentId } },
    take: pageSize,
    skip,
    order: { createdAt: 'DESC' },
  });

  return {
    items: enrollments,
    total,
    page,
    pageSize,
    hasNextPage: skip + pageSize < total,
  };
}
```

### 5. Background Jobs

**For time-consuming operations:**
```typescript
@Injectable()
export class EnrollmentQueueService {
  constructor(
    @InjectQueue('enrollment') private enrollmentQueue: Queue,
  ) {}

  async queueBulkEnrollment(
    player: Player,
    input: BulkEnrollmentInput,
  ): Promise<string> {
    const job = await this.enrollmentQueue.add('bulk-enroll', {
      playerId: player.id,
      input,
    });

    return job.id;
  }
}

@Processor('enrollment')
export class EnrollmentProcessor {
  @Process('bulk-enroll')
  async handleBulkEnrollment(job: Job): Promise<void> {
    const { playerId, input } = job.data;
    const player = await Player.findOne({ where: { id: playerId } });

    const result = await this.enrollmentService.bulkEnroll(player, input);

    // Notify user of completion
    await this.notificationService.sendEnrollmentComplete(player, result);
  }
}
```

---

## API Documentation

### GraphQL Schema (Complete)

```graphql
# ========================================
# QUERIES
# ========================================

type Query {
  """Get a single enrollment by ID"""
  tournamentEnrollment(id: ID!): TournamentEnrollment

  """Get all enrollments with optional filtering"""
  tournamentEnrollments(args: TournamentEnrollmentArgs): [TournamentEnrollment!]!

  """Get current user's enrollments for a tournament"""
  myTournamentEnrollments(tournamentEventId: ID!): [TournamentEnrollment!]!

  """Get enrollments for a specific sub-event"""
  subEventEnrollments(
    subEventId: ID!
    status: EnrollmentStatus
  ): [TournamentEnrollment!]!

  """Get waiting list for a sub-event"""
  waitingList(subEventId: ID!): [TournamentEnrollment!]!

  """Get players looking for a partner in a sub-event"""
  lookingForPartner(subEventId: ID!): [TournamentEnrollment!]!

  """Get available sub-events for enrollment"""
  getAvailableSubEvents(tournamentId: ID!): [SubEventAvailability!]!

  """Preview enrollment before confirmation"""
  getEnrollmentCart(input: BulkEnrollmentInput!): EnrollmentCartPreview!

  """Validate enrollment eligibility"""
  validateEnrollment(
    tournamentId: ID!
    subEventIds: [ID!]!
    partnerPreferences: [PartnerPreferenceInput!]
  ): EnrollmentValidationResult!
}

# ========================================
# MUTATIONS
# ========================================

type Mutation {
  """Enroll the current player in a tournament sub-event"""
  enrollInTournament(input: EnrollPlayerInput!): TournamentEnrollment!

  """Enroll a guest in a tournament sub-event"""
  enrollGuest(input: EnrollGuestInput!): TournamentEnrollment!

  """Enroll in multiple sub-events at once"""
  bulkEnrollInTournament(input: BulkEnrollmentInput!): BulkEnrollmentResult!

  """Update an enrollment"""
  updateEnrollment(
    enrollmentId: ID!
    input: UpdateEnrollmentInput!
  ): TournamentEnrollment!

  """Cancel/withdraw from an enrollment"""
  cancelEnrollment(enrollmentId: ID!): TournamentEnrollment!

  """Promote a player from the waiting list (admin only)"""
  promoteFromWaitingList(enrollmentId: ID!): TournamentEnrollment!
}

# ========================================
# TYPES
# ========================================

type TournamentEnrollment {
  id: ID!
  createdAt: DateTime!
  updatedAt: DateTime!

  tournamentSubEventId: ID!
  tournamentSubEvent: TournamentSubEvent

  playerId: ID
  player: Player

  isGuest: Boolean!
  guestName: String
  guestEmail: String
  guestPhone: String

  preferredPartnerId: ID
  preferredPartner: Player

  confirmedPartnerId: ID
  confirmedPartner: Player

  status: EnrollmentStatus!
  waitingListPosition: Int
  notes: String
}

type SubEventAvailability {
  subEvent: TournamentSubEvent!
  enrollmentStatus: SubEventEnrollmentStatus!
  availableSlots: Int
  totalSlots: Int
  waitingListLength: Int!
  isUserEnrolled: Boolean!
  userEnrollment: TournamentEnrollment
  canEnroll: Boolean!
  enrollmentRestrictions: [EnrollmentRestriction!]!
  partnerRequired: Boolean!
  lookingForPartnerCount: Int!
  enrollmentOpenDate: DateTime
  enrollmentCloseDate: DateTime
  enrollmentWindowOpen: Boolean!
}

type EnrollmentRestriction {
  type: EnrollmentRestrictionType!
  message: String!
  blocking: Boolean!
}

type BulkEnrollmentResult {
  success: Boolean!
  enrollments: [TournamentEnrollment!]!
  errors: [EnrollmentError!]!
  warnings: [EnrollmentWarning!]!
  partnerMatchesFound: Int!
  waitingListPlacements: Int!
  transactionId: String!
}

type EnrollmentError {
  subEventId: ID!
  subEventName: String!
  code: EnrollmentErrorCode!
  message: String!
  field: String
  metadata: JSON
}

type EnrollmentWarning {
  subEventId: ID!
  message: String!
  severity: WarningSeverity!
}

type EnrollmentCartPreview {
  valid: Boolean!
  items: [EnrollmentCartItem!]!
  totalCost: Float
  currency: String
  errors: [EnrollmentError!]!
  warnings: [EnrollmentWarning!]!
  requiresPartnerConfirmation: Boolean!
  estimatedWaitingListPositions: [WaitingListEstimate!]!
}

type EnrollmentCartItem {
  subEvent: TournamentSubEvent!
  status: EnrollmentPreviewStatus!
  cost: Float
  preferredPartner: Player
  partnerMatchStatus: PartnerMatchStatus!
  eligibilityStatus: EligibilityStatus!
  messages: [String!]!
}

type WaitingListEstimate {
  subEventId: ID!
  subEventName: String!
  estimatedPosition: Int!
  likelihood: WaitingListLikelihood!
}

type EnrollmentValidationResult {
  valid: Boolean!
  eligibilityChecks: [SubEventEligibilityCheck!]!
  conflicts: [EnrollmentConflict!]!
  recommendations: [String!]!
}

type SubEventEligibilityCheck {
  subEventId: ID!
  subEventName: String!
  eligible: Boolean!
  reasons: [String!]!
  levelRequirementsMet: Boolean!
  capacityAvailable: Boolean!
  enrollmentWindowOpen: Boolean!
}

type EnrollmentConflict {
  type: ConflictType!
  message: String!
  affectedSubEvents: [ID!]!
  severity: ConflictSeverity!
}

# ========================================
# INPUTS
# ========================================

input EnrollPlayerInput {
  tournamentSubEventId: ID!
  preferredPartnerId: ID
  notes: String
}

input EnrollGuestInput {
  tournamentSubEventId: ID!
  guestName: String!
  guestEmail: String!
  guestPhone: String
  preferredPartnerId: ID
  notes: String
}

input UpdateEnrollmentInput {
  preferredPartnerId: ID
  notes: String
}

input BulkEnrollmentInput {
  tournamentId: ID!
  enrollments: [SubEventEnrollmentInput!]!
  partnerPreferences: [PartnerPreferenceInput!]
  notes: String
  allowPartialSuccess: Boolean = false
}

input SubEventEnrollmentInput {
  subEventId: ID!
  preferredPartnerId: ID
  notes: String
}

input PartnerPreferenceInput {
  subEventId: ID!
  preferredPartnerId: ID!
}

# ========================================
# ENUMS
# ========================================

enum EnrollmentStatus {
  PENDING
  CONFIRMED
  WAITING_LIST
  CANCELLED
  WITHDRAWN
}

enum SubEventEnrollmentStatus {
  OPEN
  CLOSED
  FULL
  WAITING_LIST_AVAILABLE
  NOT_STARTED
  NOT_ELIGIBLE
}

enum EnrollmentRestrictionType {
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  ALREADY_ENROLLED
  EVENT_FULL
  ENROLLMENT_CLOSED
  ENROLLMENT_NOT_STARTED
  GENDER_RESTRICTION
  CUSTOM_RESTRICTION
}

enum EnrollmentErrorCode {
  DUPLICATE_ENROLLMENT
  EVENT_FULL
  ENROLLMENT_CLOSED
  ENROLLMENT_NOT_STARTED
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  INVALID_PARTNER
  SELF_PARTNERING
  PARTNER_ALREADY_ENROLLED
  TOURNAMENT_PHASE_INVALID
  GUEST_NOT_ALLOWED
  CAPACITY_EXCEEDED
  VALIDATION_FAILED
  TRANSACTION_FAILED
}

enum WarningSeverity {
  INFO
  WARNING
  CRITICAL
}

enum PartnerMatchStatus {
  NO_PARTNER_REQUIRED
  PARTNER_MATCHED
  WAITING_FOR_PARTNER
  PARTNER_NOT_ENROLLED
  LOOKING_FOR_PARTNER
}

enum EligibilityStatus {
  ELIGIBLE
  LEVEL_TOO_LOW
  LEVEL_TOO_HIGH
  ALREADY_ENROLLED
  GENDER_MISMATCH
  CUSTOM_RESTRICTION
}

enum WaitingListLikelihood {
  LIKELY
  POSSIBLE
  UNLIKELY
}

enum ConflictType {
  SCHEDULE_OVERLAP
  DUPLICATE_ENROLLMENT
  PARTNER_CONFLICT
  LEVEL_MISMATCH
}

enum ConflictSeverity {
  BLOCKING
  WARNING
  INFO
}

enum EnrollmentPreviewStatus {
  WILL_CONFIRM
  WILL_PEND
  WILL_WAITLIST
  WILL_FAIL
}
```

### Example Queries

**1. Get Available Sub-Events**
```graphql
query GetAvailableSubEvents($tournamentId: ID!) {
  getAvailableSubEvents(tournamentId: $tournamentId) {
    subEvent {
      id
      name
      gameType
      minLevel
      maxLevel
      maxEntries
    }
    enrollmentStatus
    availableSlots
    totalSlots
    waitingListLength
    isUserEnrolled
    canEnroll
    enrollmentRestrictions {
      type
      message
      blocking
    }
    partnerRequired
    lookingForPartnerCount
    enrollmentWindowOpen
    enrollmentOpenDate
    enrollmentCloseDate
  }
}
```

**2. Preview Enrollment Cart**
```graphql
query PreviewEnrollment($input: BulkEnrollmentInput!) {
  getEnrollmentCart(input: $input) {
    valid
    items {
      subEvent {
        id
        name
      }
      status
      cost
      partnerMatchStatus
      eligibilityStatus
      messages
    }
    totalCost
    currency
    errors {
      subEventId
      subEventName
      code
      message
    }
    warnings {
      subEventId
      message
      severity
    }
    requiresPartnerConfirmation
    estimatedWaitingListPositions {
      subEventName
      estimatedPosition
      likelihood
    }
  }
}
```

**3. Bulk Enroll**
```graphql
mutation BulkEnroll($input: BulkEnrollmentInput!) {
  bulkEnrollInTournament(input: $input) {
    success
    enrollments {
      id
      tournamentSubEventId
      status
      confirmedPartnerId
      waitingListPosition
    }
    errors {
      subEventId
      subEventName
      code
      message
    }
    warnings {
      message
      severity
    }
    partnerMatchesFound
    waitingListPlacements
    transactionId
  }
}

# Variables:
{
  "input": {
    "tournamentId": "tournament-123",
    "enrollments": [
      {
        "subEventId": "event-1",
        "preferredPartnerId": "player-456"
      },
      {
        "subEventId": "event-2",
        "preferredPartnerId": "player-456"
      },
      {
        "subEventId": "event-3"
      }
    ],
    "allowPartialSuccess": false
  }
}
```

**4. Get My Enrollments**
```graphql
query MyEnrollments($tournamentId: ID!) {
  myTournamentEnrollments(tournamentEventId: $tournamentId) {
    id
    status
    waitingListPosition
    tournamentSubEvent {
      id
      name
      gameType
    }
    preferredPartner {
      id
      firstName
      lastName
    }
    confirmedPartner {
      id
      firstName
      lastName
    }
    createdAt
  }
}
```

---

## Migration Plan

### Phase 1: Database Schema Updates

1. Add per-event enrollment date fields to `SubEventTournaments` table
2. Create new indexes for performance
3. Run migration scripts

### Phase 2: Service Layer Implementation

1. Create service classes (`EnrollmentService`, `ValidationService`, etc.)
2. Extract business logic from resolvers
3. Add unit tests for services

### Phase 3: Resolver Enhancements

1. Add new queries (`getAvailableSubEvents`, `getEnrollmentCart`, `validateEnrollment`)
2. Add new mutation (`bulkEnrollInTournament`)
3. Update existing resolvers to use service layer

### Phase 4: Error Handling

1. Create `EnrollmentException` class
2. Implement structured error responses
3. Add error code enums

### Phase 5: Testing

1. Unit tests for all services
2. Integration tests for resolvers
3. E2E tests for complete enrollment flows
4. Load testing for bulk operations

### Phase 6: Documentation

1. Update API documentation
2. Create user guides
3. Add inline code comments

### Phase 7: Deployment

1. Deploy to staging environment
2. Performance testing
3. Security audit
4. Deploy to production with feature flags

---

## Summary

This architecture provides a comprehensive, scalable solution for multi-discipline tournament enrollment with the following key features:

**Core Capabilities:**
- Per-event enrollment windows
- Bulk multi-event enrollment with atomic transactions
- Real-time availability checking
- Automatic partner matching across events
- Intelligent waiting list management
- Pre-enrollment validation and cart preview

**Technical Strengths:**
- Clean service-oriented architecture
- ACID transaction guarantees
- Comprehensive error handling
- Performance optimizations (caching, indexing, DataLoader)
- Extensive validation and authorization
- Detailed API documentation

**Extensibility:**
- Modular service design allows easy addition of features
- Flexible permission model
- Support for future payment integration
- Ready for notification system integration
- Built for scale with queue-based processing option

The implementation follows GraphQL and NestJS best practices while maintaining backward compatibility with existing enrollment functionality.
