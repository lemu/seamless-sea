import { Link } from 'react-router'
import { Button } from "@rafal.lemieszewski/tide-ui"

function Login() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)] flex items-center justify-center p-6">
      <div className="text-center space-y-8">
        <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">🔐 Login</h1>
        <Link to="/home">
          <Button variant="primary" size="lg">
            Continue to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default Login