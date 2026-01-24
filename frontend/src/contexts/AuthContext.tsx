import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_URL } from '../config';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'VIEWER';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'margaz_auth_token';
const USER_KEY = 'margaz_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            // Verify token is still valid
            verifyToken(savedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const verifyToken = async (authToken: string) => {
        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            } else {
                // Token invalid, clear auth
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Giriş başarısız' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Bağlantı hatası' };
        }
    };

    const register = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (response.ok) {
                setToken(data.token);
                setUser(data.user);
                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(USER_KEY, JSON.stringify(data.user));
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Kayıt başarısız' };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: 'Bağlantı hatası' };
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    };

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// Helper hook for making authenticated API requests
export function useAuthFetch() {
    const { token } = useAuth();

    const authFetch = async (url: string, options: RequestInit = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        return fetch(url, {
            ...options,
            headers
        });
    };

    return authFetch;
}
