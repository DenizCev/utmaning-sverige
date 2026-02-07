import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { RankBadge } from '@/components/RankBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, ArrowLeft, Crown, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamProfile {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
}

interface Member {
  user_id: string;
  username: string;
  avatar_url: string | null;
  all_time_points: number;
  role: string;
}

export default function TeamProfilePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (teamId) fetchTeam();
  }, [teamId, user]);

  const fetchTeam = async () => {
    // Fetch team info
    const { data: t } = await (supabase.from('teams') as any)
      .select('*')
      .eq('id', teamId)
      .maybeSingle();
    setTeam(t);

    if (!t) { setLoading(false); return; }

    // Fetch members
    const { data: mems } = await (supabase.from('team_members') as any)
      .select('user_id, role')
      .eq('team_id', teamId);

    if (mems && mems.length > 0) {
      const userIds = mems.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, all_time_points')
        .in('user_id', userIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const memberList: Member[] = mems.map((m: any) => ({
        user_id: m.user_id,
        username: profileMap[m.user_id]?.username || 'Okänd',
        avatar_url: profileMap[m.user_id]?.avatar_url || null,
        all_time_points: profileMap[m.user_id]?.all_time_points || 0,
        role: m.role,
      }));

      // Sort: leader first, then by points
      memberList.sort((a, b) => {
        if (a.role === 'leader' && b.role !== 'leader') return -1;
        if (b.role === 'leader' && a.role !== 'leader') return 1;
        return b.all_time_points - a.all_time_points;
      });

      setMembers(memberList);
      setTotalPoints(memberList.reduce((sum, m) => sum + m.all_time_points, 0));

      // Check if current user is member
      if (user) {
        setIsMember(memberList.some(m => m.user_id === user.id));
      }
    }

    // Check if user has a pending join request
    if (user) {
      const { data: pending } = await (supabase.from('team_invitations') as any)
        .select('id')
        .eq('team_id', teamId)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setHasPendingRequest(!!pending);
    }

    setLoading(false);
  };

  const requestToJoin = async () => {
    if (!user || !team) return;
    setRequesting(true);

    // Delete any old accepted/declined invitations first to avoid unique constraint issues
    await (supabase.from('team_invitations') as any)
      .delete()
      .eq('team_id', team.id)
      .eq('invited_user_id', user.id)
      .in('status', ['accepted', 'declined']);

    // Insert a join request as a team_invitation where the user invites themselves
    const { error } = await (supabase.from('team_invitations') as any)
      .insert({
        team_id: team.id,
        invited_user_id: user.id,
        invited_by: user.id,
        status: 'pending',
      });

    if (error) {
      if (error.code === '23505') {
        toast.info('Du har redan skickat en förfrågan');
      } else {
        toast.error('Kunde inte skicka förfrågan');
      }
    } else {
      toast.success('Förfrågan skickad! Lagledaren måste godkänna dig. 📩');
      setHasPendingRequest(true);

      // Notify team leader
      await (supabase.from('notifications') as any).insert({
        user_id: team.created_by,
        type: 'team',
        title: '👥 Ny förfrågan att gå med i laget!',
        message: `En spelare vill gå med i ${team.name}.`,
        link: '/lag',
      });
    }
    setRequesting(false);
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Laddar...</div>;
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Laget hittades inte.</p>
        <Link to="/sok"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/sok">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka till sök</Button>
      </Link>

      {/* Team header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-5 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={team.avatar_url || undefined} />
              <AvatarFallback className="text-2xl gradient-sweden text-primary-foreground">{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{team.name}</h1>
              {team.description && <p className="text-sm text-muted-foreground mt-1">{team.description}</p>}
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" /> {members.length} medlemmar
                </Badge>
                <Badge variant="outline" className="border-primary/30">
                  <Trophy className="h-3 w-3 mr-1" /> {totalPoints} poäng
                </Badge>
              </div>
            </div>
          </div>

          {/* Join button */}
          {user && !isMember && !hasPendingRequest && (
            <Button onClick={requestToJoin} disabled={requesting} className="w-full gradient-gold text-accent-foreground font-semibold">
              {requesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Skicka förfrågan att gå med
            </Button>
          )}
          {hasPendingRequest && (
            <Badge variant="outline" className="w-full justify-center py-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Förfrågan skickad – väntar på godkännande
            </Badge>
          )}
          {isMember && (
            <Badge variant="outline" className="w-full justify-center py-2 text-success border-success">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Du är medlem i detta lag
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Medlemmar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map(m => (
            <Link
              key={m.user_id}
              to={`/profil/${m.user_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback>{m.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="font-medium text-sm">{m.username}</span>
                {m.role === 'leader' && (
                  <Badge variant="secondary" className="text-xs ml-2"><Crown className="h-3 w-3 mr-1" /> Ledare</Badge>
                )}
              </div>
              <RankBadge points={m.all_time_points} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
