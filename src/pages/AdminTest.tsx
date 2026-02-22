import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, Trash2, BrainCircuit, ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
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

interface Profile {
  user_id: string;
  name: string;
  email: string;
}

interface TrackedUser {
  user_id: string;
  name: string;
  email: string;
  sessions: number;
  pageViews: number;
  clicks: number;
  mouseEvents: number;
  scrollEvents: number;
  lastActivity: string | null;
  is_blocked: boolean;
}

interface Session {
  id: string;
  session_id: string;
  user_id: string | null;
  user_agent: string;
  created_at: string;
  last_activity_at: string;
}

interface PageVisit {
  id: string;
  session_id: string;
  user_id: string | null;
  page_url: string;
  referrer: string;
  time_spent_ms: number;
  timestamp: string;
}

interface ClickEvent {
  id: string;
  session_id: string;
  user_id: string | null;
  page_url: string;
  x_position: number;
  y_position: number;
  element_tag: string;
  timestamp: string;
}

interface MouseEvent {
  id: string;
  session_id: string;
  user_id: string | null;
  page_url: string;
  positions: Array<{ x: number; y: number; timestamp: number }>;
  timestamp: string;
}

interface ScrollEvent {
  id: string;
  session_id: string;
  user_id: string | null;
  page_url: string;
  scroll_depth_percent: number;
  timestamp: string;
}

const AdminTest = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [trackedUsers, setTrackedUsers] = useState<TrackedUser[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [clickEvents, setClickEvents] = useState<ClickEvent[]>([]);
  const [mouseEvents, setMouseEvents] = useState<MouseEvent[]>([]);
  const [scrollEvents, setScrollEvents] = useState<ScrollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const [
        profilesRes,
        sessionsRes,
        pageVisitsRes,
        clicksRes,
        mouseRes,
        scrollRes
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, name, email, is_blocked'),
        supabase.from('tracking_sessions').select('*').order('last_activity_at', { ascending: false }).limit(500),
        supabase.from('page_visits').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('click_events').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('mouse_events').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('scroll_events').select('*').order('timestamp', { ascending: false }).limit(500)
      ]);

      const profilesData = profilesRes.data || [];
      const sessionsData = sessionsRes.data || [];
      const pageVisitsData = pageVisitsRes.data || [];
      const clicksData = clicksRes.data || [];
      const mouseData = (mouseRes.data || []) as unknown as MouseEvent[];
      const scrollData = scrollRes.data || [];

      setProfiles(profilesData.map(p => ({ user_id: p.user_id, name: p.name, email: p.email })));
      setSessions(sessionsData);
      setPageVisits(pageVisitsData);
      setClickEvents(clicksData);
      setMouseEvents(mouseData);
      setScrollEvents(scrollData);

      const allSessionUsers = await supabase
        .from('tracking_sessions')
        .select('user_id, last_activity_at')
        .not('user_id', 'is', null);
      const allSessionsData = allSessionUsers.data || [];

      const userIdsWithData = [...new Set(allSessionsData.map(s => s.user_id).filter(Boolean))] as string[];
      
      const users: TrackedUser[] = await Promise.all(userIdsWithData.map(async (userId) => {
        const profile = profilesData.find(p => p.user_id === userId);

        const [sessCount, pvCount, clickCount, mouseCount, scrollCount] = await Promise.all([
          supabase.from('tracking_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('page_visits').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('click_events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('mouse_events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('scroll_events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        const userSessions = allSessionsData.filter(s => s.user_id === userId);
        const lastActivity = userSessions.length > 0 
          ? userSessions.reduce((latest, s) => 
              new Date(s.last_activity_at) > new Date(latest.last_activity_at) ? s : latest
            ).last_activity_at
          : null;

        return {
          user_id: userId,
          name: profile?.name || 'Unknown User',
          email: profile?.email || 'No email',
          sessions: sessCount.count ?? 0,
          pageViews: pvCount.count ?? 0,
          clicks: clickCount.count ?? 0,
          mouseEvents: mouseCount.count ?? 0,
          scrollEvents: scrollCount.count ?? 0,
          lastActivity,
          is_blocked: profile?.is_blocked ?? false,
        };
      }));

      users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      setTrackedUsers(users);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unknown';
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.name || userId.slice(0, 8) + '...';
  };

  const filterByUser = <T extends { user_id: string | null }>(data: T[]) => {
    if (selectedUserId === 'all') return data;
    return data.filter(item => item.user_id === selectedUserId);
  };

  const filterBySession = <T extends { session_id: string }>(data: T[]) => {
    if (selectedSessionId === 'all') return data;
    return data.filter(item => item.session_id === selectedSessionId);
  };

  const applyFilters = <T extends { user_id: string | null; session_id: string }>(data: T[]) => {
    return filterBySession(filterByUser(data));
  };

  const filteredSessions = filterByUser(sessions);
  const filteredPageVisits = applyFilters(pageVisits);
  const filteredClickEvents = applyFilters(clickEvents);
  const filteredMouseEvents = applyFilters(mouseEvents);
  const filteredScrollEvents = applyFilters(scrollEvents);

  const getActiveSessions = () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return filteredSessions.filter(s => new Date(s.last_activity_at) > fiveMinutesAgo).length;
  };

  const getUniquePages = () => {
    return [...new Set(filteredPageVisits.map(p => p.page_url))].length;
  };

  const getUniqueUsers = () => {
    const userIds = sessions.map(s => s.user_id).filter(Boolean);
    return [...new Set(userIds)].length;
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const uniqueSessionIds = [...new Set(sessions.map(s => s.session_id))];

  const downloadUserData = async (userId: string, userName: string) => {
    setDownloading(userId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/download-user-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) throw new Error('Failed to download data');

      const csvText = await res.text();
      console.log('CSV response length:', csvText.length, 'preview:', csvText.substring(0, 200));
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `user_${userId}_tracking_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download Complete',
        description: `Tracking data for ${userName} has been downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download user data. Please try again.',
        variant: 'destructive',
      });
    }
    setDownloading(null);
  };

  const downloadAllData = async () => {
    setDownloading('all');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/download-user-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ all: true }),
      });

      if (!res.ok) throw new Error('Failed to download data');

      const csvText = await res.text();
      console.log('CSV all response length:', csvText.length, 'preview:', csvText.substring(0, 200));
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `all_users_tracking_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Download Complete',
        description: 'All tracking data has been downloaded.',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download data. Please try again.',
        variant: 'destructive',
      });
    }
    setDownloading(null);
  };

  const deleteAllData = async () => {
    setDeleting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/functions/v1/delete-all-data`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${session?.access_token || supabaseKey}`,
        },
      });

      if (!res.ok) {
        let errorMessage = 'Failed to delete data';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response may not be JSON
        }
        throw new Error(errorMessage);
      }

      toast({
        title: 'All Data Deleted',
        description: 'All users, sessions, and tracking data have been permanently removed.',
      });

      await fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Deletion Failed',
        description: 'Could not delete data. Please try again.',
        variant: 'destructive',
      });
    }
    setDeleting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header section - stacks on mobile */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Behavior Tracking Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Monitor user behavior data for bot detection ML training</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={downloadAllData} disabled={downloading === 'all'}>
              <Download className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{downloading === 'all' ? 'Downloading...' : 'Download All'}</span>
              <span className="sm:hidden">{downloading === 'all' ? '...' : 'All Data'}</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{deleting ? 'Deleting...' : 'Delete All'}</span>
                  <span className="sm:hidden">{deleting ? '...' : 'Delete'}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="mx-4 max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to delete ALL data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all users, sessions, and tracking data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Filters - stack on mobile */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">User:</span>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {trackedUsers.map(user => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">Session:</span>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {uniqueSessionIds.map(sessionId => (
                  <SelectItem key={sessionId} value={sessionId}>
                    {sessionId.slice(0, 20)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards - 2 cols on mobile, 3 on md, 6 on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Total Users</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{trackedUsers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Sessions</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{filteredSessions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Active</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl text-primary">{getActiveSessions()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Page Views</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{filteredPageVisits.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Clicks</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{filteredClickEvents.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 sm:pb-2 sm:p-6">
              <CardDescription className="text-xs sm:text-sm">Unique Pages</CardDescription>
              <CardTitle className="text-2xl sm:text-3xl">{getUniquePages()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Data Tabs - scrollable on mobile */}
        <Tabs defaultValue="users" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="mb-4 w-max sm:w-auto">
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs sm:text-sm">Sessions</TabsTrigger>
              <TabsTrigger value="pages" className="text-xs sm:text-sm">Pages</TabsTrigger>
              <TabsTrigger value="clicks" className="text-xs sm:text-sm">Clicks</TabsTrigger>
              <TabsTrigger value="mouse" className="text-xs sm:text-sm">Mouse</TabsTrigger>
              <TabsTrigger value="scroll" className="text-xs sm:text-sm">Scroll</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Registered Users</CardTitle>
                <CardDescription className="text-xs sm:text-sm">All users with tracking data</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {trackedUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground px-4">
                    {loading ? 'Loading users...' : 'No users with tracking data found.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead className="hidden lg:table-cell">User ID</TableHead>
                          <TableHead className="text-center">Sessions</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Views</TableHead>
                          <TableHead className="text-center hidden sm:table-cell">Clicks</TableHead>
                          <TableHead className="hidden md:table-cell">Last Activity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trackedUsers.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium text-sm">{user.name}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm">{user.email}</TableCell>
                            <TableCell className="hidden lg:table-cell font-mono text-xs">{user.user_id.slice(0, 12)}...</TableCell>
                            <TableCell className="text-center">{user.sessions}</TableCell>
                            <TableCell className="text-center hidden sm:table-cell">{user.pageViews}</TableCell>
                            <TableCell className="text-center hidden sm:table-cell">{user.clicks}</TableCell>
                            <TableCell className="text-sm hidden md:table-cell">
                              {user.lastActivity ? formatTimestamp(user.lastActivity) : 'Never'}
                            </TableCell>
                            <TableCell>
                              {user.is_blocked ? (
                                <Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1 text-xs">
                                  <ShieldOff className="h-3 w-3" />
                                  <span className="hidden sm:inline">Blocked</span>
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <span className="hidden sm:inline">Active</span>
                                  <span className="sm:hidden">✓</span>
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 sm:px-3"
                                  onClick={() => navigate(`/analysis/${user.user_id}`)}
                                >
                                  <BrainCircuit className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-1">Analysis</span>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 px-2 sm:px-3"
                                  onClick={() => downloadUserData(user.user_id, user.name)}
                                  disabled={downloading === user.user_id}
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-1">{downloading === user.user_id ? '...' : 'Download'}</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Session Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">All tracked user sessions</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No sessions found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Session ID</TableHead>
                          <TableHead className="hidden lg:table-cell">User Agent</TableHead>
                          <TableHead className="hidden md:table-cell">Created</TableHead>
                          <TableHead>Last Activity</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.map((session) => {
                          const isActive = new Date(session.last_activity_at) > new Date(Date.now() - 5 * 60 * 1000);
                          return (
                            <TableRow key={session.id}>
                              <TableCell className="font-medium text-sm">{getUserName(session.user_id)}</TableCell>
                              <TableCell className="hidden sm:table-cell font-mono text-xs">{session.session_id.slice(0, 16)}...</TableCell>
                              <TableCell className="hidden lg:table-cell max-w-xs truncate text-xs">{session.user_agent?.slice(0, 40)}...</TableCell>
                              <TableCell className="hidden md:table-cell text-sm">{formatTimestamp(session.created_at)}</TableCell>
                              <TableCell className="text-sm">{formatTimestamp(session.last_activity_at)}</TableCell>
                              <TableCell>
                                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                                  {isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Page Visit Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">All tracked page visits with time spent</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {filteredPageVisits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No page visits found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Session ID</TableHead>
                          <TableHead>Page URL</TableHead>
                          <TableHead className="hidden lg:table-cell">Referrer</TableHead>
                          <TableHead className="hidden sm:table-cell">Time Spent</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPageVisits.map((visit) => (
                          <TableRow key={visit.id}>
                            <TableCell className="font-medium text-sm">{getUserName(visit.user_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell font-mono text-xs">{visit.session_id.slice(0, 12)}...</TableCell>
                            <TableCell className="font-medium text-sm max-w-[120px] truncate">{visit.page_url}</TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{visit.referrer || '-'}</TableCell>
                            <TableCell className="hidden sm:table-cell">{formatDuration(visit.time_spent_ms)}</TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatTimestamp(visit.timestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clicks">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Click Event Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">All tracked click events</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {filteredClickEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No click events found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Session ID</TableHead>
                          <TableHead>Page</TableHead>
                          <TableHead className="hidden sm:table-cell">Position</TableHead>
                          <TableHead className="hidden md:table-cell">Element</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClickEvents.map((click) => (
                          <TableRow key={click.id}>
                            <TableCell className="font-medium text-sm">{getUserName(click.user_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell font-mono text-xs">{click.session_id.slice(0, 12)}...</TableCell>
                            <TableCell className="text-sm max-w-[100px] truncate">{click.page_url}</TableCell>
                            <TableCell className="hidden sm:table-cell font-mono text-xs">({click.x_position}, {click.y_position})</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">&lt;{click.element_tag}&gt;</TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatTimestamp(click.timestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mouse">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Mouse Movement Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Sampled mouse positions</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {filteredMouseEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No mouse events found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Session ID</TableHead>
                          <TableHead>Page</TableHead>
                          <TableHead className="hidden sm:table-cell">Count</TableHead>
                          <TableHead className="hidden md:table-cell">Sample</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMouseEvents.map((mouse) => (
                          <TableRow key={mouse.id}>
                            <TableCell className="font-medium text-sm">{getUserName(mouse.user_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell font-mono text-xs">{mouse.session_id.slice(0, 12)}...</TableCell>
                            <TableCell className="text-sm max-w-[100px] truncate">{mouse.page_url}</TableCell>
                            <TableCell className="hidden sm:table-cell">{mouse.positions?.length || 0}</TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-xs max-w-xs truncate">
                              {mouse.positions?.slice(0, 3).map(p => `(${p.x},${p.y})`).join(' → ') || '-'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatTimestamp(mouse.timestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scroll">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Scroll Event Logs</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Maximum scroll depth per session</CardDescription>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {filteredScrollEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No scroll events found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden sm:table-cell">Session ID</TableHead>
                          <TableHead>Page</TableHead>
                          <TableHead>Scroll Depth</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredScrollEvents.map((scroll) => (
                          <TableRow key={scroll.id}>
                            <TableCell className="font-medium text-sm">{getUserName(scroll.user_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell font-mono text-xs">{scroll.session_id.slice(0, 12)}...</TableCell>
                            <TableCell className="text-sm max-w-[100px] truncate">{scroll.page_url}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary" 
                                    style={{ width: `${scroll.scroll_depth_percent}%` }}
                                  />
                                </div>
                                <span className="text-xs sm:text-sm">{scroll.scroll_depth_percent}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">{formatTimestamp(scroll.timestamp)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading tracking data...
          </div>
        )}

        <div className="mt-4 text-xs sm:text-sm text-muted-foreground text-center">
          Auto-refreshes every 10 seconds
        </div>
      </main>
    </div>
  );
};

export default AdminTest;
