# LifeOS — Folder Structure Document

This document defines the recommended codebase structures for both the Mobile (React Native / Expo Router) and Backend (Node.js / Express / Prisma) projects. This architecture keeps modules highly decoupled and supports smooth integration of future features.

---

## 1. Mobile Client Folder Structure (React Native / Expo)

The client uses **Expo Router** for file-based navigation, located in the `app/` folder, while the business logic, UI components, states, and utilities are modularized in the `src/` folder.

```
lifeos-mobile/
├── app/                        # Expo Router Navigation & Screen Declarations
│   ├── _layout.tsx             # Root layout configuration (Theme, Providers)
│   ├── index.tsx               # Entrance redirection logic
│   ├── (auth)/                 # Authentication Flow Group
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Login Screen
│   │   └── register.tsx        # Registration Screen
│   ├── (tabs)/                 # Main Navigation Tab Bar Group
│   │   ├── _layout.tsx         # Tab Layout configuration
│   │   ├── day.tsx             # 3. Day View Screen (Home)
│   │   ├── inbox.tsx           # 1. Brain Dump / Capture Screen
│   │   ├── ledger.tsx          # 7. Money Ledger Screen
│   │   ├── people.tsx          # 6. People Directory Screen
│   │   └── places.tsx          # 5. Geofence Places Map Screen
│   └── modals/                 # Overlay Modals Group
│       ├── recap.tsx           # 4. Morning Recap Detail Overlay
│       └── transaction.tsx     # Add Transaction Overlay
│
├── src/                        # Main Application Code Source
│   ├── components/             # Reusable Visual Elements
│   │   ├── common/             # Atom elements (Button, Input, Badge, Card)
│   │   └── features/           # Feature component compositions
│   │       ├── inbox/          # e.g., InboxSwipeList, VoiceRecorder
│   │       ├── tasks/          # e.g., TaskItem, TaskDatePicker
│   │       └── ledger/         # e.g., TransactionRow, DebtIndicator
│   │
│   ├── hooks/                  # Global Custom React Hooks
│   │   ├── useAuth.ts          # Auth state wrapper hook
│   │   ├── useGeofencing.ts    # Background geofencing hooks
│   │   └── useDebounce.ts      # Input optimization hook
│   │
│   ├── services/               # Communication and external APIs layer
│   │   ├── api.ts              # Custom Axios wrapper with JWT refresh interceptors
│   │   ├── notifications.ts    # Local push notification system setup
│   │   └── storage.ts          # MMKV secure local storage accessors
│   │
│   ├── store/                  # Zustand Global State Management stores
│   │   ├── authStore.ts        # Client session and JWT cache
│   │   ├── inboxStore.ts       # Capture queue and offline synchronizations
│   │   └── uiStore.ts          # Global layout states (Modals, light/dark mode)
│   │
│   ├── styles/                 # Theme Configurations and Styles
│   │   └── global.css          # Tailwind / NativeWind design token directives
│   │
│   ├── types/                  # Global TypeScript Interfaces
│   │   └── index.d.ts          # Data models and navigation definitions
│   │
│   └── utils/                  # Domain-agnostic utilities
│       ├── date.ts             # Date formatters
│       └── parser.ts           # Fuzzy date processing
│
├── assets/                     # Media & Static assets (images, icons, fonts)
├── app.json                    # Expo Config Configuration
├── package.json
└── tsconfig.json
```

---

## 2. Backend API Service Folder Structure (Node.js / Express)

The backend follows a **Modular Clean Architecture**. Feature sets are grouped into independent folders inside `src/modules/` containing their own routes, controllers, services, repositories, and data validators (DTOs).

```
lifeos-backend/
├── prisma/                     # Database ORM Files
│   ├── schema.prisma           # Prisma PostgreSQL schema
│   ├── migrations/             # SQL database migration history
│   └── seed.ts                 # Local database seed scripts
│
├── src/                        # Core Source Code
│   ├── app.ts                  # Express Application initialization & core middleware
│   ├── server.ts               # HTTP Server listener
│   │
│   ├── config/                 # Environment and module configurations
│   │   ├── env.ts              # Type-safe process.env validator
│   │   ├── redis.ts            # Redis connection parameters
│   │   └── database.ts         # Prisma client configurations
│   │
│   ├── core/                   # Application Core Framework & Cross-Cutting Concerns
│   │   ├── errors/             # Global error hierarchies (AppError, ValidationError)
│   │   ├── middlewares/        # Core filters (auth.middleware, error.handler)
│   │   └── utils/              # Base loggers, cryptographic operations
│   │
│   ├── infrastructure/         # External delivery systems and third-party wrappers
│   │   ├── database/           # Prisma client singleton instances
│   │   ├── redis/              # Active Redis connections
│   │   ├── queue/              # BullMQ queue instantiators
│   │   └── push/               # Expo Push client implementation
│   │
│   ├── jobs/                   # Background Workers & Schedulers
│   │   ├── workers/            # BullMQ worker loops
│   │   │   ├── notification.worker.ts  # Executes queued notification push jobs
│   │   │   └── recap.worker.ts         # Nightly worker generating Morning Recaps
│   │   └── schedulers/
│   │       └── daily.scheduler.ts      # Cron definitions mapping BullMQ tasks
│   │
│   └── modules/                # Feature Modules (Modular Clean Architecture)
│       ├── auth/               # User registration and Token rotation manager
│       │   ├── auth.routes.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repository.ts
│       │   └── dto/            # Data Transfer Objects (zod schemas validation)
│       │
│       ├── inbox/              # Brain Dump & Captures storage
│       │   ├── inbox.routes.ts
│       │   ├── inbox.controller.ts
│       │   ├── inbox.service.ts
│       │   └── inbox.repository.ts
│       │
│       ├── tasks/              # Task manager and Fuzzy date parser
│       │   ├── tasks.routes.ts
│       │   ├── tasks.controller.ts
│       │   ├── tasks.service.ts
│       │   ├── tasks.repository.ts
│       │   └── utils/          # NLP fuzzy parsing parser (e.g. chronicler.ts)
│       │
│       ├── ledger/             # Money tracking transactions
│       ├── people/             # Person profile directories
│       ├── places/             # Geofencing areas
│       └── recap/              # Morning Recap summary generator
│
├── tests/                      # Global integration / E2E test suites
├── dist/                       # Output built JS files (for production deployment)
├── package.json
└── tsconfig.json
```
