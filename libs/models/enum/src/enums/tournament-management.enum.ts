export enum EnrollmentStatus {
  PENDING = 'PENDING', // Waiting for partner confirmation (doubles)
  CONFIRMED = 'CONFIRMED', // Partnership confirmed or singles enrolled
  WAITING_LIST = 'WAITING_LIST', // Sub-event is full
  CANCELLED = 'CANCELLED', // Enrollment was cancelled
  WITHDRAWN = 'WITHDRAWN', // Player withdrew from tournament
}

export enum TournamentPhase {
  DRAFT = 'DRAFT', // Tournament is being set up
  ENROLLMENT_OPEN = 'ENROLLMENT_OPEN', // Players can enroll
  ENROLLMENT_CLOSED = 'ENROLLMENT_CLOSED', // Enrollment period ended
  DRAWS_MADE = 'DRAWS_MADE', // Draws have been generated
  SCHEDULED = 'SCHEDULED', // Games are scheduled
  IN_PROGRESS = 'IN_PROGRESS', // Tournament is running
  COMPLETED = 'COMPLETED', // Tournament finished
}

export enum CheckInStatus {
  PENDING = 'PENDING', // Player has not checked in yet
  CHECKED_IN = 'CHECKED_IN', // Player has arrived
  NO_SHOW = 'NO_SHOW', // Player did not show up
}

export enum ScheduleSlotStatus {
  AVAILABLE = 'AVAILABLE', // Slot is free
  SCHEDULED = 'SCHEDULED', // Game assigned but not started
  IN_PROGRESS = 'IN_PROGRESS', // Game is being played
  COMPLETED = 'COMPLETED', // Game finished
  BLOCKED = 'BLOCKED', // Slot is not available
}

export enum ScheduleStrategy {
  MINIMIZE_WAIT = 'MINIMIZE_WAIT', // Minimize wait time between games
  CATEGORY_ORDER = 'CATEGORY_ORDER', // Schedule by category (MD, WD, XD)
  BY_LEVEL = 'BY_LEVEL', // Group games by level
  RANDOM = 'RANDOM', // Random assignment
}
