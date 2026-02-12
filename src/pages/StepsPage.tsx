import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSteps } from '@/hooks/useSteps';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Footprints, Trophy, Calendar, RotateCcw, RefreshCw, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { Link } from 'react-router-dom';
import { isNativePlatform } from '@/utils/healthSteps';

interface StepLeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  step_count: number;
}

export default function StepsPage() {
  const { user, isAdmin } = useAuth();
  const { todaySteps, history, loading, syncing, isNative, syncFromHealth } = useSteps();
  const [leaderboard, setLeaderboard] = useState<StepLeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { toast } = useToast();

  // Show permission dialog on first visit on mobile
  useEffect(() => {
    const alreadyAsked = localStorage.getItem('health_permission_asked');
    if (!alreadyAsked && isNativePlatform()) {
      setShowPermissionDialog(true);
    }
    if (alreadyAsked === 'granted') {
      setPermissionGranted(true);
    }
  }, []);

  const handlePermissionAccept = async () => {
    setShowPermissionDialog(false);
    localStorage.setItem('health_permission_asked', 'granted');
    setPermissionGranted(true);
    // Trigger the actual native health permission + sync
    const ok = await syncFromHealth();
    if (ok) {
      toast({ title: 'Steg synkade!', description: 'Dina steg har hämtats från hälsoappen.' });
    }
  };

  const handlePermissionDeny = () => {
    setShowPermissionDialog(false);
    localStorage.setItem('health_permission_asked', 'denied');
    toast({ title: 'Hälsodata nekad', description: 'Du kan aktivera detta senare via Synka-knappen.', variant: 'destructive' });
  };

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchLeaderboard();
    const channel = supabase
      .channel('steps-lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'step_entries' }, () => fetchLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeaderboard = async () => {
    const { data: entries } = await (supabase.from('step_entries') as any)
      .select('user_id, step_count')
      .eq('date', today)
      .order('step_count', { ascending: false })
      .limit(50);

    if (!entries || entries.length === 0) { setLeaderboard([]); setLbLoading(false); return; }

    const userIds = entries.map((e: any) => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    setLeaderboard(entries.map((e: any) => ({
      user_id: e.user_id,
      username: profileMap[e.user_id]?.username || 'Okänd',
      avatar_url: profileMap[e.user_id]?.avatar_url || null,
      step_count: e.step_count,
    })));
    setLbLoading(false);
  };

  const handleSyncHealth = async () => {
    const ok = await syncFromHealth();
    if (ok) {
      toast({ title: 'Steg synkade!', description: 'Dina steg har hämtats från hälsoappen.' });
    } else {
      toast({ title: 'Kunde inte synka', description: 'Kontrollera att du gett appen tillgång till hälsodata.', variant: 'destructive' });
    }
  };

  const handleAdminReset = async () => {
    if (!isAdmin) return;
    const { error } = await (supabase.from('step_entries') as any)
      .delete()
      .eq('date', today);
    if (!error) {
      toast({ title: 'Steg återställda', description: 'Alla steg för idag har rensats.' });
      fetchLeaderboard();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Health permission dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <Heart className="h-12 w-12 text-destructive" />
            </div>
            <DialogTitle className="text-center">Tillåt hälsodata</DialogTitle>
            <DialogDescription className="text-center">
              Vill du ge appen tillåtelse att läsa dina steg från din hälsoapp (Apple Health / Google Fit)?
              Detta krävs för att kunna tracka dina steg automatiskt i tävlingen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button onClick={handlePermissionAccept} className="w-full">
              <Heart className="h-4 w-4 mr-2" /> Ja, tillåt
            </Button>
            <Button variant="outline" onClick={handlePermissionDeny} className="w-full">
              Nej, inte nu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-center mb-6">
        <Footprints className="h-10 w-10 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Stegräknare</h1>
        <p className="text-muted-foreground">
          Stegen synkas automatiskt från din hälsoapp
        </p>
      </div>

      {user && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Footprints className="h-5 w-5" /> Idag ({today})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-primary mb-4">
              {todaySteps?.step_count || 0} <span className="text-lg text-muted-foreground">steg</span>
            </div>

            <Button onClick={handleSyncHealth} disabled={syncing} className="w-full">
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synkar...' : 'Synka steg från hälsoappen'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Synkar med Apple Health / Google Fit via native-appen
            </p>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button variant="destructive" size="sm" onClick={handleAdminReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Återställ alla steg idag
          </Button>
        </div>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="leaderboard" className="flex-1">
            <Trophy className="h-4 w-4 mr-1" /> Dagens topp
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <Calendar className="h-4 w-4 mr-1" /> Min historik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          {lbLoading ? (
            <div className="text-center py-8 text-muted-foreground">Laddar...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Inga steg registrerade idag.</div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => (
                <Card key={entry.user_id} className={`${user && entry.user_id === user.id ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="text-xl font-bold w-8 text-center text-muted-foreground">
                      {idx + 1}
                    </div>
                    <CharacterAvatar username={entry.username} avatarUrl={entry.avatar_url} equippedSkin={null} size="sm" />
                    <Link to={`/profil/${entry.user_id}`} className="flex-1 font-semibold truncate hover:underline">
                      {entry.username} {user && entry.user_id === user.id && '(du)'}
                    </Link>
                    <Badge variant="secondary" className="font-bold">
                      {entry.step_count.toLocaleString()} steg
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laddar...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Ingen historik ännu.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Steg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.step_count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
