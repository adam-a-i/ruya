import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpIcon, ArrowDownIcon, RefreshCwIcon, PhoneIcon, TrendingUpIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

interface AgentVersion {
  version: string;
  total_calls: number;
  total_bookings: number;
  conversion_rate: number;
  is_active: boolean;
  created_at: string;
  strategy_json: any;
}

interface Call {
  id: string;
  vapi_call_id: string;
  agent_version: string;
  transcript: string;
  outcome: string;
  duration_seconds: number;
  analysis_json: any;
  created_at: string;
}

interface OverallStats {
  total_calls: number;
  total_bookings: number;
  overall_conversion_rate: number;
  versions_created: number;
  current_version: string;
}

const Dashboard = () => {
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, versionsRes, callsRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats/overall`),
        fetch(`${API_BASE}/api/stats/versions`),
        fetch(`${API_BASE}/api/calls/recent?limit=10`)
      ]);

      const stats = await statsRes.json();
      const versionsData = await versionsRes.json();
      const callsData = await callsRes.json();

      setOverallStats(stats);
      setVersions(versionsData.versions || []);
      setRecentCalls(callsData.calls || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerMutation = async () => {
    try {
      setMutating(true);
      const res = await fetch(`${API_BASE}/api/strategy/mutate`, { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        alert('Strategy mutation triggered! Check logs for new version.');
        fetchData();
      }
    } catch (error) {
      console.error('Error triggering mutation:', error);
      alert('Error triggering mutation. Check backend logs.');
    } finally {
      setMutating(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCwIcon className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">
            ruya<span className="text-primary">.</span> dashboard
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={triggerMutation} disabled={mutating}>
              <TrendingUpIcon className="h-4 w-4 mr-2" />
              {mutating ? 'Mutating...' : 'Force Mutation'}
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Calls</CardDescription>
              <CardTitle className="text-3xl">{overallStats?.total_calls || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneIcon className="h-4 w-4" />
                All time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Bookings</CardDescription>
              <CardTitle className="text-3xl">{overallStats?.total_bookings || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <TrendingUpIcon className="h-4 w-4" />
                Successful conversions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conversion Rate</CardDescription>
              <CardTitle className="text-3xl">
                {((overallStats?.overall_conversion_rate || 0) * 100).toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Overall performance
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Strategy Versions</CardDescription>
              <CardTitle className="text-3xl">{overallStats?.versions_created || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="default">{overallStats?.current_version || 'v1.0'}</Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="versions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="versions">Strategy Versions</TabsTrigger>
            <TabsTrigger value="calls">Recent Calls</TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="space-y-4">
            {versions.map((version) => (
              <Card key={version.version} className={version.is_active ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{version.version}</CardTitle>
                      {version.is_active && <Badge variant="default">Active</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(version.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <CardDescription>
                    {version.strategy_json?.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Calls</div>
                      <div className="text-2xl font-bold">{version.total_calls}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Bookings</div>
                      <div className="text-2xl font-bold text-green-600">{version.total_bookings}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Conversion</div>
                      <div className="text-2xl font-bold">
                        {(version.conversion_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Show strategy preview */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      View Strategy Details
                    </summary>
                    <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(version.strategy_json, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="calls" className="space-y-4">
            <ScrollArea className="h-[600px]">
              {recentCalls.map((call) => (
                <Card key={call.id} className="mb-4">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{call.agent_version}</CardTitle>
                        <Badge 
                          variant={call.outcome === 'booked' ? 'default' : 'secondary'}
                        >
                          {call.outcome}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(call.created_at).toLocaleString()}
                      </div>
                    </div>
                    <CardDescription>
                      Duration: {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {call.analysis_json && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Engagement:</span>
                          <span className="text-sm">{call.analysis_json.engagement_score}/10</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Tone:</span>
                          <span className="text-sm">{call.analysis_json.emotional_tone}</span>
                        </div>
                        {call.analysis_json.objections?.length > 0 && (
                          <div>
                            <span className="text-sm font-medium">Objections:</span>
                            <div className="flex gap-2 mt-1">
                              {call.analysis_json.objections.map((obj: string, i: number) => (
                                <Badge key={i} variant="outline">{obj}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-primary">
                        View Transcript
                      </summary>
                      <div className="mt-2 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {call.transcript || 'No transcript available'}
                      </div>
                    </details>
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
