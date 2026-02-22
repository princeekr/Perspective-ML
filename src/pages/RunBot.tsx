import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot, CheckCircle, Home, Activity, MousePointer, ScrollText, Eye } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";

interface BotResult {
  intensity: string;
  total_sessions: number;
  total_page_visits: number;
  total_clicks: number;
  total_scrolls: number;
  total_mouse_batches: number;
  bot_name: string;
}

const RunBot = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BotResult | null>(null);
  const navigate = useNavigate();

  const handleRunBot = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('run-bot', {
        method: 'POST',
        body: {},
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setIsComplete(true);
    } catch (err) {
      console.error('Bot execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to run bot');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setIsComplete(false);
    setError(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {isComplete ? (
                <CheckCircle className="h-8 w-8 text-primary" />
              ) : (
                <Bot className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-serif">
              {isComplete ? "Simulation Complete" : "Bot Simulator"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {isComplete && result ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Bot <span className="font-mono text-foreground">{result.bot_name}</span> simulation finished.
                </p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <StatCard icon={Activity} label="Sessions" value={result.total_sessions} />
                  <StatCard icon={Eye} label="Page Visits" value={result.total_page_visits} />
                  <StatCard icon={MousePointer} label="Clicks" value={result.total_clicks} />
                  <StatCard icon={ScrollText} label="Scrolls" value={result.total_scrolls} />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <Button onClick={() => navigate('/')} className="w-full gap-2">
                    <Home className="h-4 w-4" /> Go to Home
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="w-full">
                    Run Another Bot
                  </Button>
                </div>
              </>
            ) : isRunning ? (
              <div className="space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">
                  Running bot simulation…
                </p>
                <p className="text-xs text-muted-foreground">
                  Generating sessions with page visits, clicks, scrolls, and mouse movements. This may take up to 20 seconds.
                </p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">
                  Generate bot-like traffic with high page similarity, variance, and interaction volume for ML model training.
                </p>

                {error && <p className="text-destructive text-sm">{error}</p>}

                <Button onClick={handleRunBot} className="w-full gap-2" size="lg">
                  <Bot className="h-5 w-5" /> Run Bot
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
  <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
    <Icon className="h-4 w-4 text-primary shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  </div>
);

export default RunBot;
