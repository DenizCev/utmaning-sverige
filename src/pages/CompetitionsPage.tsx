import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiamonds } from '@/hooks/useDiamonds';
import { CountdownTimer } from '@/components/CountdownTimer';
import { DiamondBalance } from '@/components/DiamondBalance';
import { ShareButton } from '@/components/ShareButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Zap, ChevronRight, CheckCircle2, Lock, Diamond, Eye, Gift, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';

interface Competition {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  entry_diamonds: number;
  prizes: { first?: string; second?: string; third?: string; other?: string } | null;
}

export default function CompetitionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { diamonds, dailyAds, rulesAccepted, watchAd, spendDiamonds } = useDiamonds();
  const [activeComps, setActiveComps] = useState<Competition[]>([]);
  const [finishedComps, setFinishedComps] = useState<Competition[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [joinedComps, setJoinedComps] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, { done: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [user]);

  const fetchAll = async () => {
    setLoading(true);

    // All competitions
    const { data: allComps } = await (supabase.from('competitions') as any)
      .select('*')
      .order('start_time', { ascending: false });

    if (!allComps) { setLoading(false); return; }

    const now = new Date();
    const active: Competition[] = [];
    const finished: Competition[] = [];

    for (const c of allComps) {
      const started = new Date(c.start_time) <= now;
      const ended = c.end_time && new Date(c.end_time) <= now;
      if (!c.is_active && started && !ended) {
        // Inactive but not ended — still show as "current" but paused
        active.push(c);
      } else if (c.is_active || !started) {
        active.push(c);
      } else {
        finished.push(c);
      }
    }

    setActiveComps(active);
    setFinishedComps(finished);

    // Member counts
    const counts: Record<string, number> = {};
    for (const c of allComps) {
      const { count } = await supabase
        .from('competition_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', c.id);
      counts[c.id] = count || 0;
    }
    setMemberCounts(counts);

    // User-specific data
    if (user) {
      const { data: memberships } = await supabase
        .from('competition_memberships')
        .select('competition_id')
        .eq('user_id', user.id);
      setJoinedComps(new Set((memberships || []).map(m => m.competition_id)));

      // Progress for each competition
      const prog: Record<string, { done: number; total: number }> = {};
      for (const c of active) {
        const { data: chs } = await supabase
          .from('challenges')
          .select('id')
          .eq('competition_id', c.id);
        if (chs && chs.length > 0) {
          const { data: subs } = await supabase
            .from('submissions')
            .select('challenge_id')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .in('challenge_id', chs.map(ch => ch.id));
          prog[c.id] = { done: subs?.length || 0, total: chs.length };
        }
      }
      setProgressMap(prog);
    }

    setLoading(false);
  };

  const handleJoin = async (comp: Competition) => {
    if (!user) { navigate('/auth'); return; }
    if (!rulesAccepted) {
      toast.error('Du måste godkänna reglerna först');
      navigate('/regler');
      return;
    }
    const cost = comp.entry_diamonds ?? 15;
    if (cost > 0 && diamonds < cost) {
      toast.error(`Du behöver ${cost} diamanter. Du har ${diamonds}. Tjäna fler!`);
      return;
    }
    if (cost > 0) {
      const spent = await spendDiamonds(cost);
      if (!spent) { toast.error('Kunde inte dra diamanter'); return; }
    }
    const { error } = await supabase
      .from('competition_memberships')
      .insert({ competition_id: comp.id, user_id: user.id });
    if (error) {
      if (error.code === '23505') toast.info('Du har redan anmält dig!');
      else toast.error('Kunde inte anmäla dig');
    } else {
      toast.success('Du är anmäld! Lycka till! 🎉');
      setJoinedComps(prev => new Set([...prev, comp.id]));
      setMemberCounts(prev => ({ ...prev, [comp.id]: (prev[comp.id] || 0) + 1 }));
    }
  };

  const CompetitionCard = ({ comp, showJoin = true }: { comp: Competition; showJoin?: boolean }) => {
    const started = new Date(comp.start_time) <= new Date();
    const joined = joinedComps.has(comp.id);
    const progress = progressMap[comp.id];
    const cost = comp.entry_diamonds ?? 15;
    const prizes = comp.prizes as any;
    const hasPrizes = prizes?.first || prizes?.second || prizes?.third;

    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-display font-bold">{comp.name}</h3>
              {comp.description && <p className="text-sm text-muted-foreground mt-1">{comp.description}</p>}
            </div>
            <Badge variant={comp.is_active ? 'default' : 'secondary'}>
              {!started ? 'Kommande' : comp.is_active ? 'Pågående' : 'Pausad'}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(comp.start_time).toLocaleDateString('sv-SE')}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {memberCounts[comp.id] || 0} deltagare</span>
            {cost > 0 && <span className="flex items-center gap-1"><Diamond className="h-4 w-4" /> {cost} diamanter</span>}
            {cost === 0 && <Badge variant="outline" className="text-xs">Gratis</Badge>}
          </div>

          {!started && comp.is_active && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Startar om</p>
              <CountdownTimer targetDate={new Date(comp.start_time)} onComplete={() => fetchAll()} />
            </div>
          )}

          {hasPrizes && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-semibold flex items-center gap-1"><Gift className="h-4 w-4 text-sweden-gold" /> Priser</p>
              {prizes.first && <p>🥇 1:a plats: {prizes.first}</p>}
              {prizes.second && <p>🥈 2:a plats: {prizes.second}</p>}
              {prizes.third && <p>🥉 3:e plats: {prizes.third}</p>}
              {prizes.other && <p className="text-muted-foreground">{prizes.other}</p>}
            </div>
          )}

          {joined && progress && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Framsteg</span>
                <span>{progress.done}/{progress.total} utmaningar</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {showJoin && !joined ? (
              <Button onClick={() => handleJoin(comp)} className="gradient-gold text-accent-foreground font-bold">
                <Diamond className="h-4 w-4 mr-1" /> Anmäl dig {cost > 0 ? `(${cost} 💎)` : '(Gratis)'}
              </Button>
            ) : joined ? (
              <Badge variant="outline" className="text-success border-success px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Anmäld
              </Badge>
            ) : null}
            <Link to={`/leaderboard/${comp.id}`}>
              <Button variant="outline" size="sm">
                <Trophy className="h-4 w-4 mr-1" /> Leaderboard
              </Button>
            </Link>
            {started && joined && (
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Zap className="h-4 w-4 mr-1" /> Utmaningar
                </Button>
              </Link>
            )}
            <ShareButton text={`Tävla i ${comp.name} på Sweden Challenge Race! 🏆🇸🇪`} size="sm" />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Laddar...</div></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <Trophy className="h-10 w-10 text-sweden-gold mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Tävlingar</h1>
        <p className="text-muted-foreground">Alla pågående och avslutade tävlingar</p>
      </div>

      {user && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <DiamondBalance count={diamonds} />
          <Button size="sm" variant="outline" onClick={watchAd} disabled={dailyAds >= 10}>
            <Eye className="h-4 w-4 mr-1" /> Annons ({dailyAds}/10)
          </Button>
          <ShareButton />
        </div>
      )}

      <Tabs defaultValue="active">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="active" className="flex-1">Pågående / Kommande ({activeComps.length})</TabsTrigger>
          <TabsTrigger value="finished" className="flex-1">Avslutade ({finishedComps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {activeComps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Inga pågående tävlingar just nu.</div>
          ) : (
            <div className="space-y-4">
              {activeComps.map(c => <CompetitionCard key={c.id} comp={c} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="finished">
          {finishedComps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Inga avslutade tävlingar ännu.</div>
          ) : (
            <div className="space-y-4">
              {finishedComps.map(c => <CompetitionCard key={c.id} comp={c} showJoin={false} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
