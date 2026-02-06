import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShareButton } from '@/components/ShareButton';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Gift, ArrowLeft } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  completed_challenges: number;
}

interface Prizes {
  first?: string;
  second?: string;
  third?: string;
  other?: string;
}

export default function CompetitionLeaderboardPage() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [prizes, setPrizes] = useState<Prizes>({});
  const [compName, setCompName] = useState('');
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (competitionId) fetchLeaderboard();

    const channel = supabase
      .channel(`lb-${competitionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        if (competitionId) fetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [competitionId]);

  const fetchLeaderboard = async () => {
    const { data: comp } = await (supabase.from('competitions') as any)
      .select('id, name, prizes')
      .eq('id', competitionId)
      .maybeSingle();

    if (!comp) { setLoading(false); return; }
    setCompName(comp.name);
    setPrizes((comp.prizes as Prizes) || {});

    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, points')
      .eq('competition_id', comp.id);

    if (!challenges || challenges.length === 0) { setLoading(false); return; }

    const challengeIds = challenges.map(c => c.id);
    const pointsMap = Object.fromEntries(challenges.map(c => [c.id, c.points]));

    const { data: subs } = await supabase
      .from('submissions')
      .select('user_id, challenge_id, status, points_awarded')
      .eq('status', 'approved')
      .in('challenge_id', challengeIds);

    if (!subs) { setLoading(false); return; }

    const userMap: Record<string, { total_points: number; completed: number }> = {};
    for (const s of subs) {
      if (!userMap[s.user_id]) userMap[s.user_id] = { total_points: 0, completed: 0 };
      userMap[s.user_id].total_points += (s.points_awarded || pointsMap[s.challenge_id] || 0);
      userMap[s.user_id].completed++;
    }

    const userIds = Object.keys(userMap);
    if (userIds.length === 0) { setEntries([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    const result: LeaderboardEntry[] = userIds
      .map(uid => ({
        user_id: uid,
        username: profileMap[uid]?.username || 'Okänd',
        avatar_url: profileMap[uid]?.avatar_url || null,
        total_points: userMap[uid].total_points,
        completed_challenges: userMap[uid].completed,
      }))
      .sort((a, b) => b.total_points - a.total_points || b.completed_challenges - a.completed_challenges);

    setEntries(result);
    if (user) {
      const idx = result.findIndex(e => e.user_id === user.id);
      setMyRank(idx >= 0 ? idx + 1 : null);
    }
    setLoading(false);
  };

  const getRankStyle = (rank: number) => {
    if (rank === 0) return 'text-sweden-gold';
    if (rank === 1) return 'text-muted-foreground';
    if (rank === 2) return 'text-orange-600';
    return '';
  };

  const hasPrizes = prizes.first || prizes.second || prizes.third;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/tavlingar">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>
      </Link>

      <div className="text-center mb-8">
        <Trophy className="h-10 w-10 text-sweden-gold mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">{compName}</p>
        {myRank && (
          <Badge className="mt-2 gradient-gold text-accent-foreground border-0">
            Din placering: #{myRank}
          </Badge>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <ShareButton text={`Kolla leaderboarden för ${compName}! 🏆`} />
      </div>

      {hasPrizes && (
        <Card className="mb-6 border-sweden-gold/30">
          <CardContent className="pt-4">
            <h3 className="font-display font-bold flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-sweden-gold" /> Priser
            </h3>
            <div className="space-y-1 text-sm">
              {prizes.first && <p><span className="font-semibold text-sweden-gold">🥇 1:a plats:</span> {prizes.first}</p>}
              {prizes.second && <p><span className="font-semibold text-muted-foreground">🥈 2:a plats:</span> {prizes.second}</p>}
              {prizes.third && <p><span className="font-semibold text-orange-600">🥉 3:e plats:</span> {prizes.third}</p>}
              {prizes.other && <p className="text-muted-foreground">{prizes.other}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Laddar...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Inga godkända utmaningar ännu.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <Card key={entry.user_id} className={`${idx < 3 ? 'ring-1 ring-sweden-gold/30' : ''} ${user && entry.user_id === user.id ? 'bg-primary/5' : ''}`}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className={`text-2xl font-display font-bold w-10 text-center ${getRankStyle(idx)}`}>
                  {idx < 3 ? <Medal className="h-6 w-6 mx-auto" /> : idx + 1}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="gradient-sweden text-primary-foreground text-sm">
                    {entry.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{entry.username} {user && entry.user_id === user.id && '(du)'}</p>
                  <p className="text-xs text-muted-foreground">{entry.completed_challenges} utmaningar klara</p>
                </div>
                <Badge className="gradient-gold text-accent-foreground border-0 font-bold">
                  {entry.total_points}p
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
