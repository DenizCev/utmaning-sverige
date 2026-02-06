import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { RankBadge } from '@/components/RankBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { getRank } = useAppSettings();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ competitions: 0, challenges: 0, points: 0 });
  const [equippedSkins, setEquippedSkins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    const { data: p } = await supabase.from('profiles')
      .select('user_id, username, avatar_url, all_time_points, streak_count, equipped_skin')
      .eq('user_id', userId!)
      .maybeSingle();
    setProfile(p);

    if (p) {
      const { count: compCount } = await supabase.from('competition_memberships')
        .select('*', { count: 'exact', head: true }).eq('user_id', p.user_id);
      const { data: subs } = await supabase.from('submissions')
        .select('points_awarded').eq('user_id', p.user_id).eq('status', 'approved');
      setStats({
        competitions: compCount || 0,
        challenges: subs?.length || 0,
        points: p.all_time_points || 0,
      });

      // Equipped skins
      const { data: userSkins } = await (supabase.from('user_skins') as any)
        .select('skin_id').eq('user_id', p.user_id).eq('equipped', true);
      if (userSkins && userSkins.length > 0) {
        const skinIds = userSkins.map((s: any) => s.skin_id);
        const { data: skins } = await (supabase.from('skins') as any)
          .select('emoji').in('id', skinIds);
        setEquippedSkins((skins || []).map((s: any) => s.emoji));
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Laddar...</div>;
  if (!profile) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Användaren hittades inte.</p>
      <Link to="/leaderboard-alltime"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka</Button></Link>
    </div>
  );

  const rank = getRank(stats.points);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/leaderboard-alltime">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka</Button>
      </Link>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="gradient-sweden text-primary-foreground text-xl">
                  {profile.username?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {equippedSkins.length > 0 && (
                <div className="absolute -top-2 -right-2 text-xl">
                  {equippedSkins.slice(0, 3).join('')}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">{profile.username}</h1>
              <div className="flex items-center gap-2 mt-1">
                <RankBadge points={stats.points} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Flame className="h-3 w-3 mr-1" /> {profile.streak_count || 0} dagars streak
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-sweden-gold" /> Statistik
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tävlingar', value: stats.competitions },
          { label: 'Utmaningar', value: stats.challenges },
          { label: 'Poäng', value: stats.points },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-display font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
