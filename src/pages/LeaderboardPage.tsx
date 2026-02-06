import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  completed_challenges: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchLeaderboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeaderboard = async () => {
    // Get the active competition
    const { data: comp } = await supabase
      .from('competitions')
      .select('id')
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!comp) { setLoading(false); return; }

    // Get all approved submissions for this competition's challenges
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

    // Aggregate by user
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
    setLoading(false);
  };

  const getRankStyle = (rank: number) => {
    if (rank === 0) return 'text-sweden-gold';
    if (rank === 1) return 'text-muted-foreground';
    if (rank === 2) return 'text-orange-600';
    return '';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <Trophy className="h-10 w-10 text-sweden-gold mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Realtidsranking för aktuell tävling</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Laddar...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Inga godkända utmaningar ännu. Bli först!</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <Card key={entry.user_id} className={idx < 3 ? 'ring-1 ring-sweden-gold/30' : ''}>
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
                  <p className="font-semibold truncate">{entry.username}</p>
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
