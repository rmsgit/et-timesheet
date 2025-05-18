
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2, Mail } from 'lucide-react'; // Added Mail icon

const LOGIN_FORM_LOADER_ID = "login_form_loader";

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState(''); // Changed from username to email
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showLoader, hideLoader } = useLoader(); // useLoader hook
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    // Loader message is now handled by AuthContext's login
    // showLoader(LOGIN_FORM_LOADER_ID, "Logging in..."); 
    try {
      const success = await login(email, password); // Pass email and password
      if (success) {
        // Redirection is handled by AuthContext or page effects after successful login and role fetch
      } else {
        // Specific error toasts are handled by the login function in AuthContext
        // No need to toast here unless for a very generic fallback, but AuthContext should be more specific.
      }
    } catch (error) {
        console.error("Login handleSubmit error:", error);
        toast({
            title: "Login Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
        });
    }
    finally {
      // hideLoader(LOGIN_FORM_LOADER_ID);
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full inline-block">
            <LogIn className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your timesheet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label> {/* Changed from username to email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email" // Changed type to email
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g., user@example.com"
                required
                disabled={isSubmitting}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>
        {/* Removed mock user hint as it's no longer relevant with Firebase Auth */}
      </CardContent>
    </Card>
  );
};
