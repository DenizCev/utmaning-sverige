import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDiamonds } from '@/hooks/useDiamonds';
import { useAppSettings } from '@/hooks/useAppSettings';
import { CountdownTimer } from '@/components/CountdownTimer';
import { DiamondBalance } from '@/components/DiamondBalance';
import { ShareButton } from '@/components/ShareButton';
import { DailyClaimButton } from '@/components/DailyClaimButton';
import { RewardedAdDialog } from '@/components/RewardedAdDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, Zap, ChevronRight, CheckCircle2, Lock, Diamond, Eye, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

interface Competition {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  is_active: boolean;
  entry_diamonds: number;
  prizes: { first?: string; second?: string; third?: string; other?: string } | null;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  proof_type: string;
  order_index: number;
  points: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const compParam = searchParams.get('comp');
  const { diamonds, dailyAds, dailyShares, rulesAccepted, watchAd, spendDiamonds } = useDiamonds();
  const { branding } = useAppSettings();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [competitionStarted, setCompetitionStarted] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  useEffect(() => { fetchCompetition(); }, [user, compParam]);


  const fetchCompetition = async () => {
    setLoading(true);
    // If comp query param is set, fetch that specific competition
    if (compParam) {
      const { data: specificComp } = await (supabase.from('competitions') as any)
        .select('*')
        .eq('id', compParam)
        .maybeSingle();
      comp = specificComp;
    } else {
      // Default: fetch latest active competition
      const { data: activeComp } = await (supabase.from('competitions') as any)
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      comp = activeComp;

      if (!comp) {
        const { data: upcoming } = await (supabase.from('competitions') as any)
          .select('*')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();
        comp = upcoming;
      }
    }

    if (comp) {
      setCompetition(comp);
      setCompetitionStarted(new Date(comp.start_time) <= new Date());

      const { count } = await supabase
        .from('competition_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', comp.id);
      setMemberCount(count || 0);

      if (user) {
        const { data: membership } = await supabase
          .from('competition_memberships')
          .select('id')
          .eq('competition_id', comp.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setHasJoined(!!membership);

        const { data: chs } = await supabase
          .from('challenges')
          .select('*')
          .eq('competition_id', comp.id)
          .order('order_index');
        setChallenges(chs || []);

        if (chs && chs.length > 0) {
          const { data: subs } = await supabase
            .from('submissions')
            .select('challenge_id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved')
            .in('challenge_id', chs.map(c => c.id));

          const completed = new Set((subs || []).map(s => s.challenge_id));
          setCompletedChallenges(completed);
          const idx = chs.findIndex(c => !completed.has(c.id));
          setCurrentChallengeIndex(idx === -1 ? chs.length : idx);
        }
      }
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!competition) return;
    if (!rulesAccepted) {
      toast.error('Du måste godkänna reglerna först');
      navigate('/regler');
      return;
    }
    const cost = competition.entry_diamonds ?? 15;
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
      .insert({ competition_id: competition.id, user_id: user.id });
    if (error) {
      if (error.code === '23505') toast.info('Du har redan anmält dig!');
      else toast.error('Kunde inte anmäla dig');
    } else {
      toast.success('Du är anmäld! Lycka till! 🎉');
      setHasJoined(true);
      setMemberCount(prev => prev + 1);
    }
  };

  // Realtime membership count
  useEffect(() => {
    if (!competition) return;
    const channel = supabase
      .channel('memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'competition_memberships', filter: `competition_id=eq.${competition.id}` },
        () => {
          supabase.from('competition_memberships').select('*', { count: 'exact', head: true }).eq('competition_id', competition.id)
            .then(({ count }) => setMemberCount(count || 0));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competition?.id]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Laddar...</div></div>;
  }

  if (!competition) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-display mb-2">Ingen aktiv tävling just nu</h2>
        <p className="text-muted-foreground mb-4">Håll utkik – nästa tävling kommer snart!</p>
        <Link to="/tavlingar"><Button variant="outline">Se alla tävlingar</Button></Link>
      </div>
    );
  }

  const cost = competition.entry_diamonds ?? 15;
  const prizes = competition.prizes as any;
  const hasPrizes = prizes?.first || prizes?.second || prizes?.third;
  const progress = challenges.length > 0 ? (completedChallenges.size / challenges.length) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Hero */}
      <div className="text-center mb-10 animate-slide-up">
        {branding.logo_url && (
          <img src={branding.logo_url} alt={branding.name} className="h-16 w-auto mx-auto mb-4 rounded-lg" />
        )}
        <Badge className="mb-4 gradient-gold text-accent-foreground border-0 px-4 py-1 text-sm font-medium">
          {competitionStarted ? 'Pågående tävling' : 'Kommande tävling'}
        </Badge>
        <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">{competition.name}</h1>
        {branding.hero_text && (
          <p className="text-muted-foreground text-sm mb-2">{branding.hero_text}</p>
        )}
        {competition.description && (
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{competition.description}</p>
        )}
      </div>

      {/* Countdown */}
      {!competitionStarted && competition.is_active && (
        <div className="mb-10">
          <p className="text-center text-sm text-muted-foreground mb-4 uppercase tracking-wider font-medium">Tävlingen startar om</p>
          <CountdownTimer targetDate={new Date(competition.start_time)} onComplete={() => setCompetitionStarted(true)} />
        </div>
      )}

      {!competition.is_active && (
        <div className="text-center mb-10 glass-card rounded-xl p-6">
          <p className="text-muted-foreground">Denna tävling är inaktiverad.</p>
        </div>
      )}

      {/* Prizes */}
      {hasPrizes && (
        <Card className="mb-6 border-sweden-gold/30">
          <CardContent className="pt-4">
            <h3 className="font-display font-bold flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-sweden-gold" /> Priser i denna tävling
            </h3>
            <div className="space-y-1 text-sm">
              {prizes.first && <p>🥇 <span className="font-semibold">1:a plats:</span> {prizes.first}</p>}
              {prizes.second && <p>🥈 <span className="font-semibold">2:a plats:</span> {prizes.second}</p>}
              {prizes.third && <p>🥉 <span className="font-semibold">3:e plats:</span> {prizes.third}</p>}
              {prizes.other && <p className="text-muted-foreground">{prizes.other}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats + Join */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
        <div className="glass-card rounded-xl px-6 py-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-sweden-blue" />
          <span className="font-semibold">{memberCount}</span>
          <span className="text-muted-foreground">deltagare</span>
        </div>
        {user && <DiamondBalance count={diamonds} />}
        {!hasJoined ? (
          <Button onClick={handleJoin} size="lg" className="gradient-gold text-accent-foreground font-bold shadow-lg hover:opacity-90 px-8">
            <Diamond className="h-5 w-5 mr-2" />
            Anmäl dig {cost > 0 ? `(${cost} 💎)` : '(Gratis)'}
          </Button>
        ) : (
          <Badge variant="outline" className="text-success border-success px-4 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Du är anmäld!
          </Badge>
        )}
      </div>

      {/* Daily Claim */}
      {user && (
        <div className="glass-card rounded-xl p-4 mb-6 flex justify-center">
          <DailyClaimButton />
        </div>
      )}

      {/* Earn diamonds + share */}
      {user && !hasJoined && (
        <div className="glass-card rounded-xl p-4 mb-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Tjäna diamanter:</p>
          <Button size="sm" variant="outline" onClick={() => setAdDialogOpen(true)} disabled={dailyAds >= 10}>
            <Eye className="h-4 w-4 mr-1" /> Annons ({dailyAds}/10)
          </Button>
          <ShareButton text={`Tävla i ${competition.name}! 🏆🇸🇪`} />
        </div>
      )}
      <RewardedAdDialog
        open={adDialogOpen}
        onClose={() => setAdDialogOpen(false)}
        onComplete={async () => { await watchAd(); setAdDialogOpen(false); }}
      />

      {/* Quick links */}
      <div className="flex justify-center gap-3 mb-8">
        <Link to={`/leaderboard/${competition.id}`}>
          <Button variant="outline" size="sm"><Trophy className="h-4 w-4 mr-1" /> Leaderboard</Button>
        </Link>
        <Link to="/tavlingar">
          <Button variant="outline" size="sm">Alla tävlingar</Button>
        </Link>
        <Link to="/leaderboard-alltime">
          <Button variant="ghost" size="sm">All-time ranking</Button>
        </Link>
      </div>

      {/* Progress */}
      {competitionStarted && hasJoined && challenges.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Framsteg</span>
            <span>{completedChallenges.size}/{challenges.length} utmaningar</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Challenges */}
      {competitionStarted && hasJoined && challenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-sweden-gold" /> Utmaningar
          </h2>
          {challenges.map((challenge, idx) => {
            const isCompleted = completedChallenges.has(challenge.id);
            const isCurrent = idx === currentChallengeIndex;
            const isLocked = idx > currentChallengeIndex;

            return (
              <Card key={challenge.id} className={`transition-all ${isCurrent ? 'ring-2 ring-sweden-gold shadow-lg' : ''} ${isLocked ? 'opacity-50' : ''}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-success text-success-foreground' : isCurrent ? 'gradient-gold text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : <span className="font-bold">{idx + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{challenge.title}</h3>
                    {isCurrent && <p className="text-sm text-muted-foreground line-clamp-1">{challenge.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{challenge.points}p</Badge>
                    {isCurrent && (
                      <Link to={`/utmaning/${challenge.id}`}>
                        <Button size="sm" className="gradient-gold text-accent-foreground">
                          Gör utmaning <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    )}
                    {isCompleted && <CheckCircle2 className="h-5 w-5 text-success" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {competitionStarted && !hasJoined && (
        <div className="text-center glass-card rounded-xl p-8">
          <h3 className="text-lg font-display font-bold mb-2">Tävlingen har börjat!</h3>
          <p className="text-muted-foreground mb-4">Anmäl dig nu för att börja med utmaningarna.</p>
          <Button onClick={handleJoin} className="gradient-gold text-accent-foreground font-bold">
            <Diamond className="h-5 w-5 mr-2" /> Anmäl dig {cost > 0 ? `(${cost} 💎)` : '(Gratis)'}
          </Button>
        </div>
      )}
    </div>
  );
}
