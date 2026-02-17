import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { Link } from 'react-router-dom';

interface StepLeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  step_count: number;
}

interface Props {
  userId?: string;
}

export default function StepLeaderboard({ userId }: Props) {
  const [leaderboard, setLeaderboard] = useState<StepLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
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

    if (!entries || entries.length === 0) { setLeaderboard([]); setLoading(false); return; }

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
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Laddar...</div>;
  if (leaderboard.length === 0) return <div className="text-center py-8 text-muted-foreground">Inga steg registrerade idag.</div>;

  return (
    <div className="space-y-2">
      {leaderboard.map((entry, idx) => (
        <Card key={entry.user_id} className={`${userId && entry.user_id === userId ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="text-xl font-bold w-8 text-center text-muted-foreground">
              {idx + 1}
            </div>
            <CharacterAvatar username={entry.username} avatarUrl={entry.avatar_url} equippedSkin={null} size="sm" />
            <Link to={`/profil/${entry.user_id}`} className="flex-1 font-semibold truncate hover:underline">
              {entry.username} {userId && entry.user_id === userId && '(du)'}
            </Link>
            <Badge variant="secondary" className="font-bold">
              {entry.step_count.toLocaleString()} steg
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
