import { useEffect, useState } from 'react';
import { getPrediction } from '@/services/mlApi.js';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, BrainCircuit, User, Mail, Hash, Activity, MousePointer, Eye,
  Loader2, Bot, UserCheck, Ban,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface UserStats {
  name: string;
  email: string;
  user_id: string;
  sessions: number;
  pageViews: number;
  clicks: number;
  is_blocked: boolean;
}

interface Features {
  total_topics: number;
  unique_topics: number;
  page_similarity: number;
  page_variance: number;
  boolean_page_variance: number;
}

interface PredictionResult {
  prediction: 'bot' | 'human';
  confidence: number;
}


const UserAnalysis = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchUserStats();
  }, [userId]);

  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      const [profileRes, sessionsRes, pageVisitsRes, clicksRes] = await Promise.all([
        supabase.from('profiles').select('name, email, user_id, is_blocked').eq('user_id', userId).maybeSingle(),
        supabase.from('tracking_sessions').select('id').eq('user_id', userId),
        supabase.from('page_visits').select('page_url').eq('user_id', userId),
        supabase.from('click_events').select('id').eq('user_id', userId),
      ]);

      const profile = profileRes.data;
      const visits = pageVisitsRes.data || [];
      const sessionCount = sessionsRes.data?.length || 0;
      const clickCount = clicksRes.data?.length || 0;
      const blocked = profile?.is_blocked ?? false;

      setIsBlocked(blocked);
      setStats({
        name: profile?.name || 'Unknown User',
        email: profile?.email || 'No email',
        user_id: userId!,
        sessions: sessionCount,
        pageViews: visits.length,
        clicks: clickCount,
        is_blocked: blocked,
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
      toast({ title: 'Error', description: 'Failed to load user data.', variant: 'destructive' });
    }
    setLoadingStats(false);
  };

  const runAnalysis = async () => {
    if (!userId) return;
    setPredicting(true);
    setResult(null);

    try {
      // Fetch features from the download-user-data edge function to ensure
      // frontend values match the CSV export exactly
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const csvRes = await fetch(`${baseUrl}/functions/v1/download-user-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!csvRes.ok) throw new Error('Failed to fetch user features');

      const csvText = await csvRes.text();
      const lines = csvText.trim().split('\n');

      if (lines.length < 2) throw new Error('No data found for this user');

      const values = lines[1].split(',');
      // CSV columns: ID, TOTAL_TOPICS, UNIQUE_TOPICS, PAGE_SIMILARITY, PAGE_VARIANCE, BOOLEAN_PAGE_VARIANCE
      const computedFeatures: Features = {
        total_topics: parseFloat(values[1]),
        unique_topics: parseFloat(values[2]),
        page_similarity: parseFloat(values[3]),
        page_variance: parseFloat(values[4]),
        boolean_page_variance: parseFloat(values[5]),
      };
      setFeatures(computedFeatures);

      const data = await getPrediction(computedFeatures);
      setResult({ prediction: data.prediction, confidence: data.confidence });
    } catch (err) {
      console.error('Analysis error:', err);
      toast({ title: 'Analysis Failed', description: 'Could not complete the analysis.', variant: 'destructive' });
    }
    setPredicting(false);
  };

  const handleBlockUser = async () => {
    if (!userId) return;
    setBlocking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/block-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to block user');

      setIsBlocked(true);
      setStats((prev) => prev ? { ...prev, is_blocked: true } : prev);

      toast({ title: 'User Blocked', description: 'The user has been blocked successfully.' });
    } catch (err: any) {
      console.error('Block error:', err);
      toast({ title: 'Block Failed', description: err.message || 'Could not block user.', variant: 'destructive' });
    }
    setBlocking(false);
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;
  const isBot = result?.prediction === 'bot';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">

        {/* Back button */}
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/admin-test')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Page header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">User Analysis</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Bot detection analysis powered by behavioral metrics</p>
          </div>
          {isBlocked && (
            <Badge className="bg-destructive text-destructive-foreground text-sm px-4 py-1.5 rounded-full">
              BLOCKED
            </Badge>
          )}
        </div>

        {loadingStats ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* User details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Profile</CardTitle>
                <CardDescription>Identity and behavioral summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{stats?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{stats?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 sm:col-span-2">
                    <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-mono text-sm break-all">{stats?.user_id}</p>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <Activity className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats?.sessions}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <Eye className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats?.pageViews}</p>
                    <p className="text-xs text-muted-foreground">Page Views</p>
                  </div>
                  <div className="text-center p-4 rounded-lg border bg-card">
                    <MousePointer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-2xl font-bold">{stats?.clicks}</p>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Run Analysis button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                className="gap-3 px-10 py-6 text-base"
                onClick={runAnalysis}
                disabled={predicting}
              >
                {predicting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-5 w-5" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Feature preview (shown after analysis) */}
            {features && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg">Computed Features</CardTitle>
                  <CardDescription>Behavioral metrics extracted for the model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Total Topics', value: features.total_topics },
                      { label: 'Unique Topics', value: features.unique_topics },
                      { label: 'Page Similarity', value: features.page_similarity.toFixed(4) },
                      { label: 'Page Variance', value: features.page_variance.toFixed(4) },
                      { label: 'Boolean Variance', value: features.boolean_page_variance.toFixed(4) },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-lg bg-muted/40 border">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="font-mono font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prediction Result */}
            {result && (
              <Card
                className={`animate-scale-in border-2 ${isBot ? 'border-destructive/60' : 'border-accent/60'}`}
              >
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col items-center gap-6 text-center">

                    {/* Icon */}
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center ${isBot
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-accent/15 text-accent'
                        }`}
                    >
                      {isBot ? <Bot className="h-10 w-10" /> : <UserCheck className="h-10 w-10" />}
                    </div>

                    {/* Prediction label */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">Prediction</p>
                      <Badge
                        className={`text-lg px-5 py-2 rounded-full font-bold ${isBot
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-accent text-accent-foreground'
                          }`}
                      >
                        {isBot ? '🤖 BOT' : '✅ HUMAN'}
                      </Badge>
                    </div>

                    {/* Confidence bar */}
                    <div className="w-full max-w-xs">
                      <p className="text-sm text-muted-foreground mb-2">
                        Confidence: <span className="font-semibold text-foreground">{confidencePct}%</span>
                      </p>
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isBot ? 'bg-destructive' : 'bg-accent'
                            }`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground max-w-sm">
                      {isBot
                        ? 'Behavioral patterns indicate automated or non-human activity. Review session data for confirmation.'
                        : 'Behavioral patterns are consistent with normal human browsing activity.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Block User — only shown after a bot prediction */}
            {result && isBot && (
              <div className="flex justify-center">
                {isBlocked ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-3 px-10 py-6 text-base cursor-not-allowed opacity-60 border-destructive text-destructive"
                    disabled
                  >
                    <Ban className="h-5 w-5" />
                    User Blocked
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="lg"
                        variant="destructive"
                        className="gap-3 px-10 py-6 text-base"
                        disabled={blocking}
                      >
                        {blocking ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Blocking…
                          </>
                        ) : (
                          <>
                            <Ban className="h-5 w-5" />
                            Block User
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Block this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to block <strong>{stats?.name}</strong>? They will immediately lose access to login and all pages. This action can be reviewed in the dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBlockUser}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirm Block
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default UserAnalysis;
