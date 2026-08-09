# LifeOS — Coding Standards, Git Workflow & Roadmap

This document outlines the development guidelines, coding standards, version control workflows, and the phased implementation roadmap for building **LifeOS**.

---

## 1. Coding Standards

To ensure production-ready quality, the codebase enforces the following:

### TypeScript Strict Settings
All projects must run in strict mode (`strict: true`). Avoid using `any` type overrides. Always define explicit return types for functions, routes, and services.

### Standardized API Responses
All REST endpoints must return a standardized JSON structure for consistent client-side parsing:

*Success Response Format (200 OK, 201 Created)*
```json
{
  "success": true,
  "data": {
    "id": "8ba2f6cd-53a5-48b0-8e12-005d4e12e123",
    "title": "Clean room tomorrow",
    "dueDate": "2026-08-08T12:00:00.000Z"
  }
}
```

*Failure Response Format (4xx Client Error, 5xx Server Error)*
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The due date must be in the future.",
    "details": [
      {
        "field": "dueDate",
        "issue": "date_out_of_bounds"
      }
    ]
  }
}
```

### Clean Code Guidelines (SOLID)
*   **Single Responsibility Principle (SRP)**: Keep Express controllers simple. Offload calculations and database writes to services and repositories.
*   **Dependency Injection (DI)**: Inject dependencies (e.g., Prisma context, mailer, push service) into classes or services via constructors, making unit testing with mock services straightforward.
*   **Composition over Inheritance**: Utilize utility helper methods and custom React hooks rather than building deep base classes.

---

## 2. Git & Version Control Workflow

We use **Trunk-Based Development** paired with short-lived feature branches and strict integration controls.

```
                  ┌──────────────────────┐
                  │      main branch     │
                  └──────────┬───────────┘
                             │
                             ├──────────────┐
                             │              ▼
                    ┌────────┴────────┐  [Create Feature Branch]
                    │ feature/auth    │  (local development & testing)
                    └────────┬────────┘
                             │
                             ├──────────────┐
                             │              ▼
                    [Push & Open PR]     [CI Pipelines Run]
                    (Code Review)        (Linter, TSC, Unit Tests)
                             │
                             ├◄─────────────┘
                             ▼
                    [Merge to main]
```

### Branch Naming Conventions
*   `feature/feature-name` (e.g., `feature/inbox-capture`)
*   `bugfix/issue-description` (e.g., `bugfix/auth-token-refresh`)
*   `chore/maintenance-task` (e.g., `chore/dependency-upgrade`)

### Commit Standards (Conventional Commits)
Commits must follow the Conventional Commits format to support automated changelog generations:
*   `feat(scope): message` — For new features (e.g., `feat(auth): implement token rotation refresh`).
*   `fix(scope): message` — For bug fixes (e.g., `fix(tasks): resolve timezone shifts in day view`).
*   `docs(scope): message` — For documentation updates (e.g., `docs(readme): add docker setup instructions`).
*   `chore(scope): message` — For build/infra adjustments (e.g., `chore(deps): bump prisma to latest version`).

---

## 3. Phased Development Roadmap

The LifeOS development cycle is broken down into modular phases. Each phase provides a functional foundation for subsequent features.

```
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 1: Core Foundation & Secure Authentication            │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 2: Inbox & Instant Capture (Brain Dump)               │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 3: Tasks Engine & Day View (NLP Processing)           │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 4: Places Directory & Geofencing Notifications        │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 5: People CRM & Transaction Ledger                    │
  └──────────────────────────────┬──────────────────────────────┘
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ Phase 6: Morning Recap Scheduler & Notification Engine      │
  └─────────────────────────────────────────────────────────────┘
```

### Phase 1: Core Foundation & Secure Authentication
*   **Focus**: Setting up basic structure and secure authentication.
*   **Deliverables**:
    *   Backend Express server configuration with Prisma ORM setup.
    *   Database connection pool configuration, migration runner, and health check routes.
    *   JWT Session management controllers, including token rotation and revocation logic in Redis.
    *   Mobile Expo client setup, establishing NativeWind styling tokens, Zustand persisted stores, and Axios credentials.
*   **Verification**: Unit tests on authorization, database validation, and local docker testing.

### Phase 2: Inbox & Instant Capture (Brain Dump)
*   **Focus**: Zero-barrier capturing of user entries.
*   **Deliverables**:
    *   Backend `/inbox` endpoint to write instantly to PostgreSQL database.
    *   Mobile app Brain Dump capture component (instant input panel).
    *   Zustand-based Offline Sync Queue on mobile to persist drafts when internet connection is lost.
    *   Mock layer for speech-to-text processing (framework setup for future integration).
*   **Verification**: Offline/online mode simulation tests.

### Phase 3: Tasks Engine & Day View
*   **Focus**: Organizing and presenting tasks.
*   **Deliverables**:
    *   Tasks table relations and queries.
    *   Fuzzy Date Parser (Natural Language Processing parser logic: translating "tomorrow" into proper dates).
    *   Mobile app Day View (focused screen displaying today's tasks and inbox items).
    *   Optimistic updates UI (instantly checking off tasks on the client before network acknowledgment).
*   **Verification**: Parser accuracy test suite (validating multiple text strings).

### Phase 4: Places Directory & Geofencing Notifications
*   **Focus**: Contextual locations mapping.
*   **Deliverables**:
    *   Places database schema with coordinate arrays.
    *   Map selection UI utilizing React Native Mapbox or Google Maps.
    *   `expo-location` background listeners.
    *   Local device trigger handler, alerting users with push notifications when entering/exiting place circles.
*   **Verification**: Mock geolocation walk-through script.

### Phase 5: People CRM & Transaction Ledger
*   **Focus**: Managing relationships and finances.
*   **Deliverables**:
    *   People and Tag tables with dynamic junction mapping.
    *   Transaction Ledger table to record expenses and money lent/borrowed.
    *   Person-to-Transaction linking workflows (tracking exact debt records).
    *   Mobile interfaces for adding transactions and managing contacts.
*   **Verification**: Precision Decimal currency test cases.

### Phase 6: Morning Recap Scheduler & Notification Engine
*   **Focus**: Centralizing background work and push channels.
*   **Deliverables**:
    *   Central Notification service implementing BullMQ queue listeners.
    *   Daily recap template builder pulling tasks, transactions, and calendar records.
    *   Expo Push API connection wrapper executing push queues.
    *   Recap UI summary dashboard on the mobile application.
*   **Verification**: Run queue performance tests.
