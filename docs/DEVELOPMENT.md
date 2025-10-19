# Development Guide

This guide covers development workflows, best practices, and conventions for contributing to ChatConnect Dashboard.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Development Workflow](#development-workflow)
3. [Code Style & Conventions](#code-style--conventions)
4. [Component Development](#component-development)
5. [API Development](#api-development)
6. [Database Development](#database-development)
7. [Testing Guidelines](#testing-guidelines)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

```bash
# Verify installations
node --version    # Should be v20.x or higher
npm --version     # Should be v10.x or higher
psql --version    # Should be v14 or higher
```

### Initial Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ChatConnectDashboard
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env  # Create from template if available
# Edit .env with your configuration
```

3. **Set up database:**
```bash
# Create database
createdb chatconnect

# Push schema
npm run db:push
```

4. **Start development server:**
```bash
npm run dev
```

Visit `http://localhost:5000` to see the application.

### VSCode Setup (Recommended)

Install these extensions for the best development experience:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind class autocompletion
- **TypeScript Error Translator** - Better TS error messages
- **PostCSS Language Support** - Syntax highlighting for PostCSS

**Workspace Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Development Workflow

### Daily Development Cycle

1. **Pull latest changes:**
```bash
git pull origin main
npm install  # If dependencies changed
```

2. **Create a feature branch:**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

3. **Make changes and test:**
```bash
npm run dev        # Start dev server
npm run check      # Type check
```

4. **Commit changes:**
```bash
git add .
git commit -m "feat: add widget preview component"
```

**Commit message format:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

5. **Push and create PR:**
```bash
git push origin feature/your-feature-name
```

### Hot Module Replacement (HMR)

Vite provides instant feedback during development:
- **React components**: Automatically reload with state preservation
- **CSS/Tailwind**: Inject new styles without page refresh
- **Server code**: Requires manual restart (`Ctrl+C` then `npm run dev`)

### Database Schema Changes

When modifying the database schema:

1. **Edit schema:**
```typescript
// shared/schema.ts
export const newTable = pgTable("new_table", {
  id: varchar("id").primaryKey(),
  // ... columns
});
```

2. **Push changes:**
```bash
npm run db:push
```

3. **For production migrations:**
```bash
npx drizzle-kit generate:pg
# Review generated migration in drizzle/ folder
# Apply migration in production
```

## Code Style & Conventions

### TypeScript

**Strict mode enabled** - all code must pass strict type checking:
```typescript
// ✅ Good - explicit types
interface UserProps {
  username: string;
  email: string;
}

function createUser(props: UserProps): User {
  // implementation
}

// ❌ Bad - implicit any
function createUser(props) {  // Error: Parameter has implicit 'any' type
  // implementation
}
```

**Use type inference when obvious:**
```typescript
// ✅ Good - inferred type is clear
const count = 0;
const items = ['a', 'b', 'c'];

// ❌ Bad - unnecessary explicit type
const count: number = 0;
const items: string[] = ['a', 'b', 'c'];
```

**Prefer interfaces for objects, types for unions:**
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

type Status = 'active' | 'inactive' | 'pending';

// ✅ Also acceptable for complex types
type ApiResponse<T> = {
  data: T;
  error?: string;
};
```

### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}
export const StatsCard = () => {}

// Functions: camelCase
function calculateTotal() {}
const handleSubmit = () => {}

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 5_000_000;
const API_BASE_URL = '/api';

// Files:
// - Components: PascalCase (UserProfile.tsx) or kebab-case (user-profile.tsx)
// - Utilities: kebab-case (use-toast.ts)
// - Pages: kebab-case (knowledge-base.tsx)

// CSS classes: kebab-case (Tailwind convention)
<div className="bg-primary-500 rounded-lg" />
```

### File Organization

```typescript
// Order of imports
// 1. External dependencies
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal absolute imports (@/)
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 3. Relative imports
import { UserCard } from "./user-card";

// 4. Type imports (optional, can be mixed)
import type { User } from "@/types";

// Component structure
export function MyComponent({ prop1, prop2 }: Props) {
  // 1. Hooks
  const [state, setState] = useState();
  const query = useQuery(...);
  
  // 2. Derived values
  const computedValue = useMemo(() => ..., []);
  
  // 3. Event handlers
  const handleClick = () => {};
  
  // 4. Effects (if needed)
  useEffect(() => {}, []);
  
  // 5. Early returns (loading, errors)
  if (query.isLoading) return <Skeleton />;
  if (query.error) return <ErrorMessage />;
  
  // 6. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Styling with Tailwind

Follow the design system in `design_guidelines.md`:

```typescript
// ✅ Good - follows design system
<Card className="p-6 rounded-lg shadow-sm">
  <h2 className="text-2xl font-semibold mb-4">Title</h2>
  <p className="text-sm text-muted-foreground">Description</p>
</Card>

// ❌ Bad - arbitrary values, inconsistent spacing
<Card className="p-[23px] rounded-[13px]">
  <h2 className="text-[26px] font-[550] mb-[17px]">Title</h2>
</Card>

// Use cn() utility for conditional classes
<Button 
  className={cn(
    "base-classes",
    isActive && "bg-primary text-white",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

**Design System Values:**
- **Spacing**: 4, 6, 8, 12, 16, 20, 24 (use `p-4`, `p-6`, `p-8`, etc.)
- **Colors**: Use semantic tokens (`bg-primary`, `text-muted-foreground`)
- **Typography**: Follow scale (`text-sm`, `text-base`, `text-lg`, `text-2xl`)
- **Borders**: `rounded-md` (6px), `rounded-lg` (8px)
- **Shadows**: `shadow-sm`, `shadow-md` (sparingly)

## Component Development

### Creating a New Page Component

```typescript
// client/src/pages/my-page.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MyPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Page Title</h1>
        <p className="text-sm text-muted-foreground">
          Page description or subtitle
        </p>
      </div>

      {/* Page content */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Section</h2>
        {/* Content */}
      </Card>
    </div>
  );
}
```

Add route in `client/src/App.tsx`:
```typescript
<Route path="/my-page" component={MyPage} />
```

### Creating a Reusable Component

```typescript
// client/src/components/my-component.tsx
import { Card } from "@/components/ui/card";

interface MyComponentProps {
  title: string;
  description?: string;
  onClick?: () => void;
}

export function MyComponent({ title, description, onClick }: MyComponentProps) {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      )}
      {onClick && (
        <Button onClick={onClick} className="mt-4">
          Action
        </Button>
      )}
    </Card>
  );
}
```

### Form Handling with React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## API Development

### Creating a New Endpoint

1. **Define route in `server/routes.ts`:**
```typescript
export function registerRoutes(app: Express) {
  // ... existing routes

  // GET endpoint
  app.get("/api/widgets", requireAuth, async (req, res) => {
    try {
      const widgets = await db.select().from(schema.widgets);
      res.json(widgets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  // POST endpoint with validation
  app.post("/api/widgets", requireAuth, async (req, res) => {
    try {
      const parsed = insertWidgetSchema.parse(req.body);
      const widget = await db.insert(schema.widgets).values(parsed).returning();
      res.json(widget[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create widget" });
      }
    }
  });
}
```

2. **Create React Query hook:**
```typescript
// client/src/hooks/use-widgets.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useWidgets() {
  return useQuery({
    queryKey: ["widgets"],
    queryFn: async () => {
      const res = await fetch("/api/widgets");
      if (!res.ok) throw new Error("Failed to fetch widgets");
      return res.json();
    },
  });
}

export function useCreateWidget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWidgetInput) => {
      const res = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create widget");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widgets"] });
    },
  });
}
```

3. **Use in component:**
```typescript
export function WidgetList() {
  const { data: widgets, isLoading } = useWidgets();
  const createWidget = useCreateWidget();

  if (isLoading) return <Skeleton />;

  return (
    <div>
      {widgets?.map(widget => (
        <div key={widget.id}>{widget.name}</div>
      ))}
    </div>
  );
}
```

### Error Handling Pattern

```typescript
// Server
app.get("/api/resource", requireAuth, async (req, res) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    console.error("Error fetching resource:", error);
    res.status(500).json({ 
      error: "Failed to fetch resource",
      message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Client
const { data, error } = useQuery({
  queryKey: ["resource"],
  queryFn: async () => {
    const res = await fetch("/api/resource");
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Unknown error");
    }
    return res.json();
  },
});

if (error) {
  return <Alert variant="destructive">{error.message}</Alert>;
}
```

## Database Development

### Adding a New Table

1. **Define schema:**
```typescript
// shared/schema.ts
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
```

2. **Push to database:**
```bash
npm run db:push
```

3. **Use in queries:**
```typescript
// Get all documents for user
const userDocs = await db.select()
  .from(documents)
  .where(eq(documents.userId, userId));

// Insert new document
const newDoc = await db.insert(documents)
  .values({ userId, filename, status: "processing" })
  .returning();
```

### Query Patterns

```typescript
import { eq, and, or, desc, like } from "drizzle-orm";

// Simple select
const users = await db.select().from(schema.users);

// With conditions
const user = await db.select()
  .from(schema.users)
  .where(eq(schema.users.id, userId))
  .limit(1);

// Joins (when relations are defined)
const widgetsWithConference = await db.select()
  .from(schema.widgets)
  .leftJoin(schema.conferences, 
    eq(schema.widgets.conferenceId, schema.conferences.id)
  );

// Complex conditions
const results = await db.select()
  .from(schema.documents)
  .where(
    and(
      eq(schema.documents.userId, userId),
      or(
        eq(schema.documents.status, "ready"),
        eq(schema.documents.status, "processing")
      )
    )
  )
  .orderBy(desc(schema.documents.createdAt));

// Pagination
const page = 1;
const pageSize = 20;
const items = await db.select()
  .from(schema.documents)
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

## Testing Guidelines

### Manual Testing Checklist

When implementing a feature, test:

- ✅ Light and dark modes
- ✅ Responsive breakpoints (mobile, tablet, desktop)
- ✅ Loading states
- ✅ Error states
- ✅ Empty states
- ✅ Form validation
- ✅ Success feedback (toasts)

### Browser Testing

Test in at least:
- Chrome/Edge (primary)
- Firefox
- Safari (if on macOS)

## Common Patterns

### Loading States

```typescript
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

### Empty States

```typescript
if (data?.length === 0) {
  return (
    <Card className="p-12 text-center">
      <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload your first document to get started
      </p>
      <Button onClick={handleUpload}>Upload Document</Button>
    </Card>
  );
}
```

### Toast Notifications

```typescript
import { useToast } from "@/hooks/use-toast";

export function MyComponent() {
  const { toast } = useToast();

  const handleAction = async () => {
    try {
      await performAction();
      toast({
        title: "Success",
        description: "Action completed successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong",
      });
    }
  };
}
```

## Troubleshooting

### TypeScript Errors

**Check files:**
```bash
npm run check
```

**Common issues:**
- Missing type definitions: `npm install --save-dev @types/package-name`
- Strict null checks: Add `?` for optional properties or use nullish coalescing
- Any types: Replace with proper types or use `unknown` as intermediate

### Tailwind Classes Not Working

1. Check if file is in `tailwind.config.ts` content array
2. Restart dev server (Vite HMR issue)
3. Clear browser cache
4. Check for typos in class names

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -d chatconnect -c "SELECT 1;"

# Check environment variable
echo $DATABASE_URL

# Reset database
npm run db:push
```

### Port Conflicts

```bash
# Find process using port 5000
lsof -ti:5000

# Kill the process
lsof -ti:5000 | xargs kill -9

# Or use different port in .env
PORT=3000
```

---

## Additional Resources

- **Design System**: See `design_guidelines.md`
- **Architecture**: See `docs/ARCHITECTURE.md`
- **Deployment**: See `docs/DEPLOYMENT.md`
- **React Query Docs**: https://tanstack.com/query/latest
- **Drizzle ORM Docs**: https://orm.drizzle.team
- **Tailwind CSS Docs**: https://tailwindcss.com
- **Radix UI Docs**: https://www.radix-ui.com

---

Happy coding! 🚀
