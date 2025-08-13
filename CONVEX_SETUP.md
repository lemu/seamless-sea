# 🗄️ Convex Database Setup Guide

## Prerequisites Complete ✅
- [x] Convex package installed (`npm install convex`)
- [x] Database schema created (`convex/schema.ts`)
- [x] CRUD functions created (`convex/posts.ts`, `convex/todos.ts`)
- [x] React integration prepared (`src/components/TodoDemo.tsx`)
- [x] ConvexProvider setup ready (`src/main-with-convex.tsx`)

## Required Manual Steps

### 1. Login to Convex
Run this command in your terminal:
```bash
npx convex login
```
This will open your browser and authenticate with Convex.

### 2. Initialize Convex Project
```bash
npx convex init
```
This will:
- Create `convex.json` configuration file
- Generate `convex/_generated/` folder with type definitions
- Set up your Convex deployment

### 3. Update Environment Variables
After `npx convex init`, you'll get a `VITE_CONVEX_URL`. Add it to your `.env.local`:
```bash
# Create .env.local file
echo "VITE_CONVEX_URL=<your-convex-url>" > .env.local
```

### 4. Update main.tsx
Replace the content of `src/main.tsx` with the content from `src/main-with-convex.tsx`:
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)
```

### 5. Update TodoDemo Component
Uncomment the Convex hooks in `src/components/TodoDemo.tsx`:
```typescript
// Replace these imports
import { useQuery, useMutation } from "../convex/_generated/react";
import { api } from "../convex/_generated/api";

// Replace the placeholder data with:
const todos = useQuery(api.todos.getTodos) ?? [];
const createTodo = useMutation(api.todos.createTodo);
const toggleTodo = useMutation(api.todos.toggleTodo);
const deleteTodo = useMutation(api.todos.deleteTodo);
```

### 6. Deploy Schema
```bash
npx convex dev
```
This will:
- Deploy your schema to Convex
- Start watching for changes
- Generate type definitions

## Testing the Integration

1. **Start Development Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**: Go to `http://localhost:5175`

3. **Test Todo Operations**:
   - Add new todos
   - Mark todos as complete
   - Delete todos
   - All changes should persist in your Convex database!

## Available Convex Functions

### Todos (`convex/todos.ts`)
- `getTodos()` - Get all todos
- `createTodo({ text })` - Create new todo
- `toggleTodo({ id })` - Toggle completion status
- `updateTodo({ id, text })` - Update todo text
- `deleteTodo({ id })` - Delete todo

### Posts (`convex/posts.ts`)
- `getPosts()` - Get all posts
- `getPost({ id })` - Get single post
- `createPost({ title, author, body })` - Create post
- `updatePost({ id, title?, body? })` - Update post
- `deletePost({ id })` - Delete post

## Next Steps

After setup is complete:

1. **Explore the Admin Dashboard**: Visit your Convex dashboard to see live data
2. **Add Authentication**: Integrate Convex Auth for user management
3. **Add More Features**: Extend the schema and functions as needed
4. **Deploy to Production**: Your Vercel deployment will automatically use Convex

## Troubleshooting

- **Missing types**: Run `npx convex codegen` to regenerate types
- **Connection issues**: Check your `VITE_CONVEX_URL` environment variable
- **Build errors**: Ensure all generated files are created with `npx convex dev`