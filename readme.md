# SmartSchool – Single School Management System

![License](https://img.shields.io/badge/license-MIT-blue)

## 📖 Overview
SmartSchool is a **full‑stack** school management system built for a **single school**. It covers everything from student enrollment, attendance, timetabling, fees, library, transport, communications, and reporting. The backend is powered by **Node.js + TypeScript** (Express) and the frontend uses **React** (Vite). Data is stored in **PostgreSQL** (via Prisma) and optional Supabase integration is provided for authentication and real‑time features.

## ✨ Key Features
- **Student & Parent Management** – profiles, documents, medical records, emergency contacts.
- **Academic Management** – years, classes, sections, subjects, teacher assignments, enrolments.
- **Attendance & Timetable** – per‑class attendance, flexible timetable configuration.
- **Homework & Exams** – assignments, submissions, grading schema, result publishing.
- **Fees & Payments** – fee structures, invoices, discounts, multi‑method payments.
- **Library & Transport** – catalog, circulation, vehicle/route management.
- **Communication Hub** – notices, notifications, email/SMS dispatch.
- **Inventory & Assets** – stock tracking, procurement, depreciation.
- **Audit & Reporting** – activity logs, custom reports, export to CSV/Excel.
- **Role‑Based Access Control (RBAC)** – fine‑grained permissions for admins, teachers, staff, parents, and students.

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express, TypeScript, Prisma ORM |
| **Frontend** | React 19, Vite, TailwindCSS (optional) |
| **Database** | PostgreSQL (local) – optional Supabase integration |
| **Auth** | JWT, RBAC, Supabase Auth (demo mode fallback) |
| **Storage** | Local file system / Cloudinary |
| **Testing** | Vitest, Jest |
| **CI/CD** | GitHub Actions (lint, type‑check, test) |

## 🚀 Getting Started
### Prerequisites
- **Node.js** >= 20
- **pnpm** (or npm/yarn) – package manager
- **PostgreSQL** (or use Supabase free tier) – create a database
- **Git**

### Installation
```bash
# Clone the repository (already done)
cd "d:/software/school management systems/school-management-systems"

# Install dependencies
pnpm install   # or npm i

# Copy environment example and fill values
cp .env.example .env
# Edit .env – set DB connection, PORT, NODE_ENV, SUPABASE keys, etc.
```
### Database setup
```bash
# Run Prisma migrations (or execute schema.sql located in /database)
npx prisma migrate dev --name init   # creates tables
# Or, for a quick demo, the server can serve `database/schema.sql` for copy‑paste.
```
### Development mode
```bash
pnpm run dev   # Starts Vite dev server + Express API on the same process
```
Visit **http://localhost:3000** (or the PORT you set) to see the UI.

### Production build
```bash
pnpm run build   # Vite builds static assets into ./dist
pnpm start       # Starts Express serving the compiled assets
```

## 📁 Project Structure
```
├─ /src               # Frontend React source
├─ /server            # Express API entry point (server.ts)
├─ /database          # SQL schema for the demo
├─ prisma/            # Prisma schema & migrations
├─ package.json       # Scripts, dependencies
├─ vite.config.ts     # Vite configuration (SPA mode)
└─ README.md          # This file
```

## 🤝 Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/awesome-feature`)
3. Install dependencies & run tests
4. Submit a Pull Request with a clear description

Please adhere to the existing coding style (TS linting, Prettier) and write unit tests for new logic.

## 📄 License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---
*Happy coding! 🎓*
