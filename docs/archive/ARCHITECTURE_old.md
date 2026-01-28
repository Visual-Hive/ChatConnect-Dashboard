# Architecture Documentation

## System Overview

ChatConnect Dashboard follows a modern full-stack architecture with clear separation between client and server concerns, leveraging TypeScript throughout for type safety and developer experience.

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Application                         │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │ │
│  │  │  Pages   │  │Components│  │  React Query Cache   │ │ │
│  │  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘ │ │
│  │       └─────────────┴────────────────────┘             │ │
│  └─────────────────────┬────────────────────────────────┬─┘ │
└────────────────────────┼────────────────────────────────┼───┘
                         │ HTTP/REST                      │ WS
                         │                                │
┌────────────────────────┼────────────────────────────────┼───┐
│                        │  Express Server                │   │
│  ┌─────────────────────┼────────────────────────────────┼─┐ │
│  │  ┌─────────────┐    │         ┌──────────────────┐  │ │ │
│  │  │   Routes    │────┘         │   WebSocket      │──┘ │ │
│  │  └──────┬──────┘              │   Handler        │    │ │
│  │         │                     └──────────────────┘    │ │
│  │  ┌──────┴────────────┐                                │ │
│  │  │   Middleware      │                                │ │
│  │  │  - Auth           │                                │ │
│  │  │  - Session        │                                │ │
│  │  │  - Validation     │                                │ │
│  │  └──────┬────────────┘                                │ │
│  └─────────┼─────────────────────────────────────────────┘ │
│            │                                                │
│  ┌─────────┴────────────┐                                  │
│  │   Drizzle ORM        │                                  │
│  └─────────┬────────────┘                                  │
└────────────┼───────────────────────────────────────────────┘
             │
┌────────────┴────────────┐
│   PostgreSQL Database   │
│  - Users                │
│  - Sessions             │
│  - (Future tables)      │
└─────────────────────────┘
```

## Frontend Architecture

### Technology Choices

**React 18**: Latest stable React with concurrent features support
- Chosen for: Mature ecosystem, excellent TypeScript support, component reusability

**Wouter**: Minimal client-side router (~1.2KB)
- Chosen over React Router for: Smaller bundle size, simpler API, sufficient for SPA needs

**TanStack React Query v5**: Server state management
- Chosen for: Automatic caching, background refetching, optimistic updates, request deduplication

**Radix UI**: Unstyled, accessible component primitives
- Chosen for: WAI-ARIA compliant, composable, works seamlessly with Tailwind CSS

### Component Architecture

```
client/src/
├── components/
│   ├── ui/                    # Base UI components (Radix wrappers)
│   │   ├── button.tsx         # Styled button variants
│   │   ├── card.tsx           # Container components
│   │   ├── form.tsx           # Form field components
│   │   └── ...                # Other primitives
│   │
│   ├── examples/              # Component usage examples
│   │   └── *.tsx              # Demo/test components
│   │
│   ├── app-sidebar.tsx        # Application sidebar navigation
│   ├── theme-provider.tsx     # Dark mode context provider
│   ├── stats-card.tsx         # Dashboard statistic display
│   ├── widget-preview.tsx     # Live widget preview
│   └── ...                    # Feature-specific components
│
├── pages/                     # Route page components
│   ├── overview.tsx           # Dashboard home page
│   ├── widget-config.tsx      # Widget configuration page
│   ├── knowledge-base.tsx     # Knowledge management page
│   ├── analytics.tsx          # Analytics dashboard page
│   ├── settings.tsx           # Settings page
│   └── not-found.tsx          # 404 page
│
├── hooks/                     # Custom React hooks
│   ├── use-mobile.tsx         # Responsive breakpoint detection
│   └── use-toast.ts           # Toast notification hook
│
└── lib/                       # Utilities and configuration
    ├── queryClient.ts         # React Query configuration
    └── utils.ts               # Utility functions (cn, etc.)
```

### Component Patterns

#### 1. UI Component Pattern (Radix Wrappers)
```typescript
// client/src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: { default: "...", destructive: "...", outline: "..." },
      size: { default: "h-10 px-4", sm: "h-9 px-3", lg: "h-11 px-8" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

#### 2. Page Component Pattern
```typescript
// client/src/pages/overview.tsx
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/stats-card";

export default function Overview() {
  // Fetch data with React Query
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      return res.json();
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's your overview.
        </p>
      </div>
      
      {/* Stats grid following design system */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Messages"
          value={stats?.messages || 0}
          icon={MessageSquare}
          trend={stats?.messagesTrend}
        />
        {/* More stats cards... */}
      </div>
    </div>
  );
}
```

#### 3. Feature Component Pattern
```typescript
// client/src/components/widget-preview.tsx
import { Card } from "@/components/ui/card";

interface WidgetPreviewProps {
  config: {
    primaryColor: string;
    position: "left" | "right";
    welcomeMessage: string;
  };
}

export function WidgetPreview({ config }: WidgetPreviewProps) {
  return (
    <Card className="p-6 sticky top-6">
      <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
      <div className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
        {/* Preview rendering logic */}
        <div 
          className={`absolute bottom-4 ${
            config.position === "left" ? "left-4" : "right-4"
          }`}
          style={{ backgroundColor: config.primaryColor }}
        >
          {/* Widget mockup */}
        </div>
      </div>
    </Card>
  );
}
```

### State Management Strategy

**Server State (React Query):**
- API data fetching and caching
- Background refetching for real-time updates
- Optimistic updates for instant UI feedback
- Automatic retry and error handling

```typescript
// Query example
const { data, isLoading, error } = useQuery({
  queryKey: ['documents'],
  queryFn: fetchDocuments,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutation example
const uploadMutation = useMutation({
  mutationFn: uploadDocument,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
  },
});
```

**Local UI State (React hooks):**
- Form inputs (React Hook Form)
- Modal open/closed states
- Temporary UI interactions
- Theme preferences (Context API)

**URL State (Wouter):**
- Current page/route
- Query parameters for filters/pagination

### Routing Strategy

Using Wouter for minimal, declarative routing:

```typescript
// client/src/App.tsx
<Switch>
  <Route path="/" component={Overview} />
  <Route path="/widget" component={WidgetConfig} />
  <Route path="/knowledge" component={KnowledgeBase} />
  <Route path="/analytics" component={Analytics} />
  <Route path="/settings" component={Settings} />
  <Route component={NotFound} />
</Switch>
```

### Styling Architecture

**Tailwind CSS v4** with custom configuration:
- Design system values mapped to Tailwind theme
- Custom color palette in HSL format
- Consistent spacing scale (4, 6, 8, 12, 16, 20, 24)
- Typography utilities matching design guidelines

**CSS Utilities:**
```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge Tailwind classes intelligently
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Component Variants (CVA):**
```typescript
import { cva } from "class-variance-authority"

const buttonVariants = cva("base-classes", {
  variants: {
    variant: { primary: "...", secondary: "..." },
    size: { sm: "...", md: "...", lg: "..." }
  }
})
```

## Backend Architecture

### Technology Choices

**Express.js**: Minimal, unopinionated web framework
- Chosen for: Flexibility, middleware ecosystem, TypeScript compatibility

**Drizzle ORM**: TypeScript-first SQL ORM
- Chosen for: Type-safe queries, minimal runtime overhead, migration system

**Passport.js**: Authentication middleware
- Chosen for: Mature, flexible strategy system, Express integration

### Server Structure

```
server/
├── index.ts          # Server entry point, middleware setup
├── routes.ts         # API route definitions
├── storage.ts        # Database connection and initialization
└── vite.ts           # Vite dev server middleware integration
```

### Express Application Setup

```typescript
// server/index.ts
import express from "express";
import session from "express-session";
import passport from "passport";
import { setupVite } from "./vite";
import { registerRoutes } from "./routes";

const app = express();

// Middleware stack
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration (PostgreSQL-backed)
app.use(session({
  store: new (require('connect-pg-simple')(session))({
    conObject: { connectionString: process.env.DATABASE_URL },
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.NODE_ENV === "production"
  }
}));

// Authentication
app.use(passport.initialize());
app.use(passport.session());

// API routes
registerRoutes(app);

// Vite middleware (development) or static serving (production)
if (process.env.NODE_ENV === "development") {
  await setupVite(app);
} else {
  app.use(express.static("dist/public"));
}
```

### API Route Structure

```typescript
// server/routes.ts
import type { Express } from "express";
import { db } from "./storage";
import { users } from "../shared/schema";

export function registerRoutes(app: Express) {
  // Authentication routes
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  // Protected API routes
  app.get("/api/stats", requireAuth, async (req, res) => {
    // Fetch and return dashboard statistics
  });

  app.get("/api/documents", requireAuth, async (req, res) => {
    // Fetch knowledge base documents
  });

  // ... more routes
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}
```

### Database Layer (Drizzle ORM)

```typescript
// server/storage.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Query examples:
// const users = await db.select().from(schema.users);
// const user = await db.select().from(schema.users).where(eq(schema.users.id, userId));
// await db.insert(schema.users).values({ username, password });
```

```typescript
// shared/schema.ts
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type-safe insert schema with Zod validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

### Authentication Flow

```
1. User submits credentials
   POST /api/auth/login { username, password }
   
2. Passport Local Strategy validates
   - Query user from database
   - Compare hashed password
   
3. On success, establish session
   - Session ID stored in cookie
   - Session data stored in PostgreSQL
   
4. Subsequent requests include session cookie
   - Passport deserializes user from session
   - User object available in req.user
   
5. Protected routes check authentication
   - Middleware: requireAuth()
   - Returns 401 if not authenticated
```

## Database Schema Design

### Current Schema

```sql
-- Users table (authentication)
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL  -- bcrypt hashed
);

-- Sessions table (auto-created by connect-pg-simple)
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL
);
```

### Planned Schema Extensions

```typescript
// Future schema additions for full functionality

export const conferences = pgTable("conferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  // ... conference settings
});

export const widgets = pgTable("widgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conferenceId: varchar("conference_id").references(() => conferences.id),
  primaryColor: text("primary_color"),
  position: text("position"), // 'left' | 'right'
  welcomeMessage: text("welcome_message"),
  // ... widget configuration
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conferenceId: varchar("conference_id").references(() => conferences.id),
  filename: text("filename").notNull(),
  status: text("status"), // 'processing' | 'ready' | 'failed'
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  // ... document metadata
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  widgetId: varchar("widget_id").references(() => widgets.id),
  message: text("message").notNull(),
  response: text("response"),
  rating: integer("rating"), // 1-5 stars
  createdAt: timestamp("created_at").defaultNow(),
  // ... analytics data
});
```

## Build System

### Development Mode (Vite)

```typescript
// server/vite.ts
import type { Express } from "express";
import { createServer as createViteServer } from "vite";

export async function setupVite(app: Express) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const template = await vite.transformIndexHtml(url, 
        fs.readFileSync("client/index.html", "utf-8")
      );
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
```

### Production Build

```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

**Build process:**
1. `vite build` - Builds client assets to `dist/public`
2. `esbuild` - Bundles server code to `dist/index.js`
3. Result: Single deployable directory with server + static assets

## Security Considerations

### Authentication
- Passwords hashed with bcrypt (via Passport local strategy)
- Session secrets stored in environment variables
- HTTP-only cookies (CSRF protection recommended for production)

### Database
- Parameterized queries via Drizzle ORM (SQL injection prevention)
- Connection string in environment variables
- Database credentials never committed to repository

### API
- All mutation endpoints require authentication
- Input validation with Zod schemas
- Rate limiting should be added for production

### Future Enhancements
- Add CSRF protection (csurf middleware)
- Implement rate limiting (express-rate-limit)
- Add API key rotation functionality
- File upload validation and virus scanning
- Content Security Policy headers

## Performance Optimization

### Frontend
- Code splitting by route (Vite automatic)
- React Query caching reduces redundant requests
- Lazy loading for heavy components
- Debounced search inputs
- Virtual scrolling for large lists (future)

### Backend
- Database connection pooling (Neon serverless)
- Session store in PostgreSQL (distributed-ready)
- Static asset caching headers
- Gzip compression for responses

### Database
- Indexes on frequently queried columns
- Pagination for large datasets
- Query optimization with Drizzle's query builder

## Deployment Architecture

```
Production Environment:
├── Load Balancer (if needed)
├── Node.js Application (Express)
│   ├── Serves API endpoints
│   └── Serves static assets (client build)
├── PostgreSQL Database
│   └── Stores users, sessions, data
└── File Storage (future)
    └── Document uploads (S3, etc.)
```

## Monitoring & Observability (Future)

Recommended additions:
- Application logging (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- Database query performance tracking
- User analytics integration

---

This architecture provides a solid foundation for a modern SaaS dashboard with room to scale as features are added.
