import { ShieldX, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Blocked = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md animate-scale-in border-destructive/30">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-serif font-bold text-foreground">
              Account Suspended
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Your account has been suspended by an administrator due to a policy violation. You are no longer able to access this platform.
            </p>
          </div>

          <div className="w-full border-t border-border" />

          <div className="space-y-3 w-full">
            <p className="text-xs text-muted-foreground">
              If you believe this is a mistake, please contact support.
            </p>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => window.location.href = 'mailto:support@perspective.com'}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Blocked;
