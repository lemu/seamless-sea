import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input } from "@rafal.lemieszewski/tide-ui";
import { useUser } from '../contexts/UserContext';

function Login() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const success = await login(email);
    if (success) {
      navigate('/home');
    } else {
      setError('No user found with this email address');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">🔐 Login</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-2">
            Enter your email to access your account
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Login