import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'

// This will be available after running 'npx convex init'
// const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Uncomment this once Convex is initialized */}
    {/* <ConvexProvider client={convex}> */}
      <App />
    {/* </ConvexProvider> */}
  </StrictMode>,
)