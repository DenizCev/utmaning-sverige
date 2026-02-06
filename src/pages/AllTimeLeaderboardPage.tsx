import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShareButton } from '@/components/ShareButton';
import { UserSearch } from '@/components/UserSearch';
import { Card, CardContent } from '@/components/ui/card';
import { CharacterAvatar, EquippedSkinBadge } from '@/components/CharacterAvatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AllTimeEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  equipped_skin: string | null;
  total_points: number;
  competitions_joined: number;
  challenges_completed: number;
}

export default function AllTimeLeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AllTimeEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllTime();
    const channel = supabase
      .channel('alltime-lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => fetchAllTime())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAllTime = async () => {
    // Get all approved submissions across all competitions
    const { data: subs } = await supabase
      .from('submissions')
      .select('user_id, points_awarded, challenge_id')
      .eq('status', 'approved');

    if (!subs || subs.length === 0) { setEntries([]); setLoading(false); return; }

    // Build user stats
    const userMap: Record<string, { total_points: number; challenges: Set<string> }> = {};
    for (const s of subs) {
      if (!userMap[s.user_id]) userMap[s.user_id] = { total_points: 0, challenges: new Set() };
      userMap[s.user_id].total_points += (s.points_awarded || 0);
      userMap[s.user_id].challenges.add(s.challenge_id);
    }

    const userIds = Object.keys(userMap);

    // Get competition counts
    const { data: memberships } = await supabase
      .from('competition_memberships')
      .select('user_id, competition_id')
      .in('user_id', userIds);

    const compCounts: Record<string, Set<string>> = {};
    for (const m of memberships || []) {
      if (!compCounts[m.user_id]) compCounts[m.user_id] = new Set();
      compCounts[m.user_id].add(m.competition_id);
    }

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url, equipped_skin')
      .in('user_id', userIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    const result: AllTimeEntry[] = userIds
      .map(uid => ({
        user_id: uid,
        username: profileMap[uid]?.username || 'Okänd',
        avatar_url: profileMap[uid]?.avatar_url || null,
        equipped_skin: profileMap[uid]?.equipped_skin || null,
        total_points: userMap[uid].total_points,
        competitions_joined: compCounts[uid]?.size || 0,
        challenges_completed: userMap[uid].challenges.size,
      }))
      .sort((a, b) => b.total_points - a.total_points);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <Star className="h-10 w-10 text-sweden-gold mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">All-time Leaderboard</h1>
        <p className="text-muted-foreground">Kumulativ ranking över alla tävlingar</p>
        {myRank && (
          <Badge className="mt-2 gradient-gold text-accent-foreground border-0">
            Din placering: #{myRank}
          </Badge>
        )}
      </div>

      <div className="flex justify-center mb-4">
        <ShareButton text="Kolla all-time leaderboarden på Sweden Challenge Race! 🏆🇸🇪" />
      </div>

      <div className="mb-6">
        <UserSearch />
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Laddar...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Inga poäng registrerade ännu.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <Card key={entry.user_id} className={`${idx < 3 ? 'ring-1 ring-sweden-gold/30' : ''} ${user && entry.user_id === user.id ? 'bg-primary/5' : ''}`}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className={`text-2xl font-display font-bold w-10 text-center ${getRankStyle(idx)}`}>
                  {idx < 3 ? <Medal className="h-6 w-6 mx-auto" /> : idx + 1}
                </div>
                <CharacterAvatar
                  username={entry.username}
                  avatarUrl={entry.avatar_url}
                  equippedSkin={entry.equipped_skin}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <Link to={`/profil/${entry.user_id}`} className="hover:underline">
                    <p className="font-semibold truncate">
                      {entry.username} <EquippedSkinBadge skin={entry.equipped_skin} size="sm" /> {user && entry.user_id === user.id && '(du)'}
                    </p>
                  </Link>
                  <p className="text-xs text-muted-foreground">{entry.competitions_joined} tävlingar · {entry.challenges_completed} utmaningar</p>
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
