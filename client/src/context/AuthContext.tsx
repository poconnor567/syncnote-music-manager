import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User } from '../types';
import { authAPI } from '../services/api';

// Define response types
interface AuthResponse {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  token: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define action types
type AuthAction =
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'REGISTER_REQUEST' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
};

// Create context
const AuthContext = createContext<{
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}>({
  state: initialState,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearError: () => {},
});

// Reducer function
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_REQUEST':
    case 'REGISTER_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');

      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token },
          });
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      const response = await authAPI.login({ email, password });
      const { token, ...userData } = response;
      
      // Create user object from response
      const user: User = {
        _id: userData._id,
        username: userData.username,
        email: userData.email,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Set a default error message
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // Try to extract a more specific error message if available
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Dispatch the error action
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      
      // Re-throw the error so the component can handle it if needed
      throw error;
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    dispatch({ type: 'REGISTER_REQUEST' });

    try {
      const response = await authAPI.register({ username, email, password });
      const { token, ...userData } = response;
      
      // Create user object from response
      const user: User = {
        _id: userData._id,
        username: userData.username,
        email: userData.email,
        isAdmin: userData.isAdmin,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: { user, token },
      });
    } catch (error: any) {
      console.error('Registration error in context:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle different types of error responses
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: errorMessage,
      });
      
      // Re-throw the error so the component can handle it if needed
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 