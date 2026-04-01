import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasActivePro } from '../utils/subscriptionUtils';

export function RequirePro({ children }: { children: React.ReactNode }) {
  // 1. You must destructure 'loading' from your useAuth hook
  const { user, loading } = useAuth();

  // 2. IMPORTANT: If the auth state is still fetching/restoring, 
  // DO NOT redirect. Show a loader instead.
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#121212', // Match your dashboard theme
        color: '#fff'
      }}>
        <p>Verifying Subscription...</p>
      </div>
    );
  }

  // 3. Only after loading is finished do we check the user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 4. Check if the subscription is active
  if (!hasActivePro(user)) {
    return <Navigate to="/pricing" replace />;
  }

  return <>{children}</>;
}