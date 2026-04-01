import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import type { User } from '../types/AuthTypes';

interface AuthProviderProps { 
  children: ReactNode; 
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Default to true so RequirePro knows we are checking the session on boot
  const [loading, setLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  /**
   * FETCH: User profile
   * Wrapped in useCallback so it can be safely used in useEffect
   */
  const fetchUserProfile = useCallback(async (authToken: string): Promise<void> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/profile`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch user profile');
      
      const userData: User = data.user || data.data;
      
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('👤 Profile fetched successfully:', userData.subscription.plan);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      logout();
    }
  }, []);

  /**
   * RESTORE SESSION: Runs on page load
   * Handles the case where user is missing from storage (after payment redirect)
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken) {
        setToken(savedToken);
        
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (parseError) {
            console.error('Error parsing saved user:', parseError);
            localStorage.removeItem('user');
            // If parse fails, try to fetch fresh before giving up
            await fetchUserProfile(savedToken);
          }
        } else {
          // ✅ FIX: Token exists but user doesn't (triggered by payment success)
          // Fetch fresh data from DB to get the new 'Pro' status
          await fetchUserProfile(savedToken);
        }
      }
      
      // Verification finished
      setLoading(false);
    };

    initializeAuth();
  }, [fetchUserProfile]);

  const persistAuth = (userData: User, userToken: string): void => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
  };

  const updateUserData = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Local User State Updated:', userData.subscription.plan);
  };

  const setAuthToken = (newToken: string): void => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setLoading(true);
    fetchUserProfile(newToken).finally(() => setLoading(false));
  };

  const register = async (username: string, email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Registration failed');
      persistAuth(data.data, data.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage); 
      throw new Error(errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      persistAuth(data.data, data.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage); 
      throw new Error(errorMessage);
    } finally { 
      setLoading(false); 
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateAvatar = async (file: File): Promise<void> => {
    if (!token) throw new Error("Not logged in");
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/avatar`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Avatar update failed");

    if (user) {
      const newUser: User = { ...user, avatar: data.data.avatar };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  const changeUsername = async (newUsername: string): Promise<void> => {
    if (!token) throw new Error("Not authenticated");
    setLoading(true); 
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/username`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newUsername })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setUser(data.data);
      localStorage.setItem("user", JSON.stringify(data.data));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Username update failed";
      setError(msg); 
      throw new Error(msg);
    } finally { 
      setLoading(false); 
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!token) throw new Error("Not authenticated");
    setLoading(true); 
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password update failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Password update failed";
      setError(msg); 
      throw new Error(msg);
    } finally { 
      setLoading(false); 
    }
  };

  const value = { 
    user, 
    token, 
    register, 
    login, 
    logout, 
    loading, 
    error, 
    updateAvatar, 
    changePassword, 
    changeUsername,
    setAuthToken,
    updateUserData
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}