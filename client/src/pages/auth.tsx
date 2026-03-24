import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Logo } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, isLoading, login, loginPending, register, registerPending } = useAuth();

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [confirmError, setConfirmError] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username: loginUsername, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError("");
    if (regPassword !== regConfirm) {
      setConfirmError("Passwords don't match");
      return;
    }
    register({ username: regUsername, password: regPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Welcome */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4 text-primary">
            <Logo />
          </div>
          <h1 className="font-display text-xl font-bold tracking-tight" data-testid="text-welcome-title">
            Welcome to Task Breaker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Break big tasks into simple, clear steps.
          </p>
        </div>

        <Card className="border border-border/60">
          <CardContent className="pt-6">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" data-testid="tab-signin">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="signin">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Your username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      minLength={3}
                      data-testid="input-login-username"
                      aria-label="Username"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-login-password"
                      aria-label="Password"
                      className="h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={loginPending}
                    data-testid="button-login"
                  >
                    {loginPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Username</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="Choose a username"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                      minLength={3}
                      maxLength={30}
                      data-testid="input-register-username"
                      aria-label="Username"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-register-password"
                      aria-label="Password"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Repeat your password"
                      value={regConfirm}
                      onChange={(e) => {
                        setRegConfirm(e.target.value);
                        setConfirmError("");
                      }}
                      required
                      minLength={6}
                      data-testid="input-register-confirm"
                      aria-label="Confirm password"
                      className="h-12"
                    />
                    {confirmError && (
                      <p className="text-destructive text-sm" data-testid="text-confirm-error">
                        {confirmError}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={registerPending}
                    data-testid="button-register"
                  >
                    {registerPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
