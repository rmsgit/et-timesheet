"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Loader2 } from 'lucide-react';

const LOGIN_FORM_LOADER_ID = "login_form_loader";

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    showLoader(LOGIN_FORM_LOADER_ID, "Logging in...");
    try {
      const success = await login(username, password);
      if (!success) {
        toast({
          title: "Login Failed",
          description: "Invalid username or password. (Hint: try 'admin' or 'editor')",
          variant: "destructive",
        });
      }
      // On success, AuthContext handles redirection
    } catch (error) {
        console.error("Login handleSubmit error:", error);
        toast({
            title: "Login Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
        });
    }
    finally {
      hideLoader(LOGIN_FORM_LOADER_ID);
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
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., editor"
              required
              disabled={isSubmitting}
            />
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
        <p className="mt-4 text-center text-sm text-muted-foreground">
            Mock users: admin/any_password, editor/any_password, alice/any_password, bob/any_password.
        </p>
      </CardContent>
    </Card>
  );
};
