import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSteps } from '@/hooks/useSteps';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Footprints, Plus, Trophy, Calendar, RotateCcw, RefreshCw, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { Link } from 'react-router-dom';

interface StepLeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  step_count: number;
}

export default function StepsPage() {
  const { user, isAdmin } = useAuth();
  const { todaySteps, history, loading, syncing, isNative, addSteps, setSteps, syncFromHealth } = useSteps();
  const [stepInput, setStepInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<StepLeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const { toast } = useToast();

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

  const handleAddSteps = async () => {
    const count = parseInt(stepInput);
    if (!count || count <= 0) return;
    const ok = await addSteps(count);
    if (ok) {
      toast({ title: 'Steg tillagda!', description: `+${count} steg registrerade` });
      setStepInput('');
    }
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
      <div className="text-center mb-6">
        <Footprints className="h-10 w-10 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Stegräknare</h1>
        <p className="text-muted-foreground">
          {isNative ? 'Stegen synkas automatiskt från din hälsoapp' : 'Registrera dina steg varje dag'}
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

            {isNative ? (
              <Button onClick={handleSyncHealth} disabled={syncing} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synkar...' : 'Synka steg från hälsoappen'}
              </Button>
            ) : (
              <>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="number"
                    placeholder="Antal steg..."
                    value={stepInput}
                    onChange={e => setStepInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSteps()}
                  />
                  <Button onClick={handleAddSteps} disabled={!stepInput}>
                    <Plus className="h-4 w-4 mr-1" /> Lägg till
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Använd native-appen för automatisk stegräkning via Apple Health / Google Fit
                </p>
              </>
            )}
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
