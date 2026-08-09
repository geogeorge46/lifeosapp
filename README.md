# LifeOS — Personal Operating System

Welcome to **LifeOS**, a personal operating system built to reduce mental overload by providing a unified, instant-capture inbox alongside a structured, contextual organization system (Tasks, Locations, Ledger, People).
    
---

## 1. Project Organization

This workspace is structured as a monorepo-style folder layout to decouple backend and frontend concerns:

*   **[`lifeos-mobile/`](file:///c:/Users/ASUS/Downloads/lifeosapp/lifeos-mobile)**: React Native mobile client built with Expo, Expo Router, Zustand, and TanStack Query.
*   **[`lifeos-backend/`](file:///c:/Users/ASUS/Downloads/lifeosapp/lifeos-backend)**: REST API service built with Express.js, TypeScript, PostgreSQL, Prisma ORM, and BullMQ background workers.
*   **[`docs/`](file:///c:/Users/ASUS/Downloads/lifeosapp/docs)**: Architectural blueprints, database designs, folder mappings, and roadmaps:
    *   [System Architecture Document](file:///c:/Users/ASUS/Downloads/lifeosapp/docs/architecture.md)
    *   [Database & Schema Design](file:///c:/Users/ASUS/Downloads/lifeosapp/docs/database.md)
    *   [Codebase Folder Structure](file:///c:/Users/ASUS/Downloads/lifeosapp/docs/folder_structure.md)
    *   [Roadmap & Standards](file:///c:/Users/ASUS/Downloads/lifeosapp/docs/roadmap_git.md)

---

## 2. Prerequisites

To run the application locally, you will need:
1.  **Node.js** (v18.0.0 or higher)
2.  **PostgreSQL** database instance (local or remote)
3.  **Redis** server (for caching and job queues)

---

## 3. Local Development Setup

### 3.1. Setting up the Backend API
1.  Navigate to the backend directory:
    ```bash
    cd lifeos-backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment configurations in `.env`:
    *   Ensure `DATABASE_URL` matches your local PostgreSQL connection string.
    *   Ensure `REDIS_URL` matches your active Redis instance.
4.  Generate Prisma Client:
    ```bash
    npm run prisma:generate
    ```
5.  Start the development server:
    ```bash
    npm run dev
    ```

### 3.2. Setting up the Mobile App
1.  Navigate to the mobile directory:
    ```bash
    cd ../lifeos-mobile
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the Expo development server:
    ```bash
    npm run start
    ```
4.  Press `a` to run on an Android emulator/device, or `i` to run on an iOS simulator.
