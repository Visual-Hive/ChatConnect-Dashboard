# ChatConnect Dashboard

A modern SaaS dashboard platform for configuring and managing conference chat widgets. Built with a focus on clarity, efficiency, and professional design, inspired by Stripe, Vercel, and Notion's dashboard patterns.

## Overview

ChatConnect Dashboard enables conference organizers to configure AI-powered chat widgets for their events, manage knowledge bases, analyze chat analytics, and customize the widget appearance—all through an intuitive, clean interface.

## Key Features

### 🏠 Overview Dashboard
- Setup progress tracking (onboarding steps)
- Real-time statistics: messages, active sessions, response quality, token costs
- Recent activity feed
- Quick action shortcuts

### 🎨 Widget Configuration
- Brand customization (logo, colors, naming)
- Widget positioning controls
- Feature toggles (login requirements, feedback, typing indicators)
- Live preview with real-time updates
- One-click widget code generation

### 📚 Knowledge Base Management
- Drag-and-drop file uploads (PDF, CSV)
- Document status tracking (Processing/Ready/Failed)
- System prompt customization for AI personality
- Knowledge testing interface

### 📊 Analytics Dashboard
- Time-range analysis (7 days, 30 days, 3 months)
- Usage metrics with interactive charts
- Quality metrics and feedback analysis
- Cost tracking and budget monitoring
- Popular questions identification

### ⚙️ Settings
- Account and conference management
- Team member administration
- API key management
- Billing and subscription controls

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack React Query v5
- **Styling:** Tailwind CSS v4 with custom design system
- **UI Components:** Radix UI primitives
- **Charts:** Recharts
- **Forms:** React Hook Form with Zod validation
- **Theme:** next-themes (light/dark mode support)

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Passport.js with express-session
- **Session Store:** connect-pg-simple (PostgreSQL-backed sessions)
- **WebSockets:** ws library for real-time features

### Development Tools
- **Build Tool:** Vite
- **Type Checking:** TypeScript 5.6
- **Database Migrations:** Drizzle Kit
- **Code Bundling:** esbuild (production)

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js:** v20.x or higher
- **npm:** v10.x or higher (comes with Node.js)
- **PostgreSQL:** v14 or higher

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ChatConnectDashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/chatconnect

# Session Secret (generate a secure random string)
SESSION_SECRET=your-super-secure-random-secret-key-here

# Node Environment
NODE_ENV=development

# Optional: Configure port (defaults to 5000)
PORT=5000
```

**Generate a secure session secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Setup

Push the database schema to your PostgreSQL instance:

```bash
npm run db:push
```

This will create the necessary tables defined in `shared/schema.ts`.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Project Structure

```
ChatConnectDashboard/
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # Base UI components (Radix UI)
│   │   │   ├── examples/    # Component usage examples
│   │   │   └── *.tsx        # Custom components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and configurations
│   │   ├── App.tsx          # Root application component
│   │   └── main.tsx         # Application entry point
│   └── index.html           # HTML template
├── server/                   # Backend application
│   ├── index.ts             # Express server setup
│   ├── routes.ts            # API route definitions
│   ├── storage.ts           # Database connection
│   └── vite.ts              # Vite middleware configuration
├── shared/                   # Shared code between client/server
│   └── schema.ts            # Database schema definitions
├── attached_assets/         # Design mockups and references
├── design_guidelines.md     # Complete design system documentation
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── vite.config.ts           # Vite build configuration
└── drizzle.config.ts        # Drizzle ORM configuration
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (client + server) |
| `npm start` | Run production build |
| `npm run check` | Type-check TypeScript without building |
| `npm run db:push` | Push database schema changes |

## Design System

This project follows a comprehensive design system documented in `design_guidelines.md`. Key principles:

- **Clean, minimal interface** with purposeful white space
- **Stripe/Vercel-inspired** professional dashboard aesthetic
- **Inter font family** for UI, JetBrains Mono for code
- **Modern blue color palette** (HSL: 217 91% 60%) with light/dark mode support
- **Card-based layouts** with consistent spacing (Tailwind scale: 4, 6, 8)
- **Minimal, purposeful animations** (150-200ms transitions)

Refer to `design_guidelines.md` for complete specifications on:
- Color palette (light/dark modes)
- Typography scale
- Component patterns
- Layout system
- Animation guidelines

## Database Schema

Current schema includes:

### Users Table
```typescript
{
  id: uuid (primary key, auto-generated)
  username: text (unique, required)
  password: text (required, hashed)
}
```

Extend the schema in `shared/schema.ts` and run `npm run db:push` to apply changes.

## Development Guidelines

### Component Development
1. Follow the design system specifications in `design_guidelines.md`
2. Use existing UI components from `client/src/components/ui/`
3. Create page-specific components in `client/src/components/`
4. Maintain TypeScript strict mode compliance

### Styling Conventions
- Use Tailwind utility classes following the design system
- Refer to `design_guidelines.md` for spacing, colors, and typography
- Leverage the custom theme configuration in `tailwind.config.ts`
- Support both light and dark modes using next-themes

### State Management
- Use React Query for server state (fetching, caching, mutations)
- Use React hooks (useState, useContext) for local UI state
- Keep global state minimal

### API Development
- Define routes in `server/routes.ts`
- Use Zod schemas for request validation
- Return consistent error responses
- Implement proper authentication checks

## Troubleshooting

### Database Connection Issues

**Problem:** Cannot connect to PostgreSQL
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env` matches your PostgreSQL configuration
- Ensure database exists: `createdb chatconnect`

### Port Already in Use

**Problem:** Port 5000 is already allocated
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**
- Change PORT in `.env` to an available port (e.g., 3000, 8080)
- Or kill the process using port 5000:
  ```bash
  lsof -ti:5000 | xargs kill -9
  ```

### Build Errors

**Problem:** TypeScript compilation errors

**Solutions:**
- Run `npm run check` to see all type errors
- Ensure all dependencies are installed: `npm install`
- Clear cache and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Session Issues

**Problem:** Getting logged out frequently

**Solutions:**
- Verify SESSION_SECRET is set in `.env`
- Check PostgreSQL connection for session store
- Ensure cookies are enabled in your browser

## Migration from Replit

If you're migrating this project from Replit:

1. **Environment Variables:** Replit Secrets become `.env` variables
2. **Database:** Export your Replit PostgreSQL data and import to local PostgreSQL
3. **File Uploads:** If you had file storage, set up local storage or cloud service
4. **Secrets:** Regenerate SESSION_SECRET and any API keys for security

## Contributing

When contributing to this project:

1. Follow the design system guidelines
2. Maintain TypeScript strict mode
3. Write descriptive commit messages
4. Test changes in both light and dark modes
5. Ensure responsive design works across breakpoints

## License

MIT

## Support

For issues, questions, or contributions, please refer to the documentation in the `docs/` folder:
- **Architecture:** `docs/ARCHITECTURE.md`
- **Development:** `docs/DEVELOPMENT.md`
- **Deployment:** `docs/DEPLOYMENT.md`

---

**Built with ❤️ for conference organizers who want beautiful, functional chat widgets**
