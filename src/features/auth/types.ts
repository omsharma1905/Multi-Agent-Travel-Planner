import { z } from "zod";

/**
 * Minimal User model for VEORA Phase 2.
 * Future phases will connect this to PostgreSQL/Drizzle identity tables.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextValue extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: SignUpData) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name: string }) => Promise<{ success: boolean; user?: User; error?: string }>;
  deleteAccount: (confirmation: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  revalidateSession: (force?: boolean) => Promise<User | null>;
}

// Validation schemas with friendly user-facing messages
export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required").min(2, "Name must be at least 2 characters"),
    email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
