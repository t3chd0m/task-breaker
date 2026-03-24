import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm mx-4 border border-border/60">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="text-4xl">🧩</div>
          <h1
            className="font-display text-xl font-bold"
            data-testid="text-404-title"
          >
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This page doesn't exist. Let's get you back on track.
          </p>
          <Link href="/">
            <Button className="gap-2 h-11" data-testid="button-go-home" aria-label="Go to home page">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
