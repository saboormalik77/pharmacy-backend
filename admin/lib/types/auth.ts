export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  permissions?: string[];
  buying_group_id?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  access_token?: string;
  user?: User;
  id?: string;
  userId?: string;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

