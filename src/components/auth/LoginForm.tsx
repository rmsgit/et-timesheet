
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';
import Image from 'next/image';

const LOGIN_FORM_LOADER_ID = "login_form_loader";

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showLoader, hideLoader } = useLoader();
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
    try {
      const success = await login(email, password);
      if (success) {
        // Redirection is handled by AuthContext or page effects after successful login and role fetch
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
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
            <Image 
                src="https://editorstable.com/wp-content/uploads/2025/01/et-logo.jpg" 
                alt="Company Logo" 
                width={80} 
                height={80} 
                className="rounded-md"
                data-ai-hint="company logo" 
            />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access your timesheet.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
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
      </CardContent>
    </Card>
  );
};
