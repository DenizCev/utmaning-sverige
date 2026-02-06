import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ParticipantData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;
  challenges: ChallengeStatus[];
  totalTime: number | null;
}

interface ChallengeStatus {
  challenge_id: string;
  title: string;
  order_index: number;
  status: 'not_started' | 'pending' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_at: string | null;
  time_taken: number | null; // seconds between submission start and submission
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('sv-SE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function AdminParticipants({ competitionId }: { competitionId: string | null }) {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (competitionId) fetchParticipants();
    else setParticipants([]);
  }, [competitionId]);

  const fetchParticipants = async () => {
    if (!competitionId) return;
    setLoading(true);

    // Get challenges for this competition
    const { data: challenges } = await supabase
      .from('challenges')
      .select('id, title, order_index')
      .eq('competition_id', competitionId)
      .order('order_index');

    // Get members
    const { data: members } = await supabase
      .from('competition_memberships')
      .select('user_id, joined_at')
      .eq('competition_id', competitionId);

    if (!members || members.length === 0) { setParticipants([]); setLoading(false); return; }

    const userIds = members.map(m => m.user_id);
    const joinedMap = Object.fromEntries(members.map(m => [m.user_id, m.joined_at]));

    // Get profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

    // Get all submissions for these challenges
    const challengeIds = (challenges || []).map(c => c.id);
    let allSubs: any[] = [];
    if (challengeIds.length > 0) {
      const { data: subs } = await supabase
        .from('submissions')
        .select('user_id, challenge_id, status, submitted_at, reviewed_at')
        .in('challenge_id', challengeIds)
        .in('user_id', userIds);
      allSubs = subs || [];
    }

    // Build participant data
    const result: ParticipantData[] = userIds.map(uid => {
      const userSubs = allSubs.filter(s => s.user_id === uid);
      const subMap = Object.fromEntries(userSubs.map(s => [s.challenge_id, s]));

      const challengeStatuses: ChallengeStatus[] = (challenges || []).map((ch, idx) => {
        const sub = subMap[ch.id];
        if (!sub) {
          return {
            challenge_id: ch.id,
            title: ch.title,
            order_index: ch.order_index,
            status: 'not_started' as const,
            submitted_at: null,
            reviewed_at: null,
            time_taken: null,
          };
        }

        // Calculate time: from previous challenge approval (or competition join) to this submission
        let startRef = joinedMap[uid];
        if (idx > 0) {
          const prevCh = (challenges || [])[idx - 1];
          const prevSub = subMap[prevCh.id];
          if (prevSub?.reviewed_at && prevSub?.status === 'approved') {
            startRef = prevSub.reviewed_at;
          }
        }

        const timeTaken = sub.submitted_at && startRef
          ? (new Date(sub.submitted_at).getTime() - new Date(startRef).getTime()) / 1000
          : null;

        return {
          challenge_id: ch.id,
          title: ch.title,
          order_index: ch.order_index,
          status: sub.status as 'pending' | 'approved' | 'rejected',
          submitted_at: sub.submitted_at,
          reviewed_at: sub.reviewed_at,
          time_taken: timeTaken && timeTaken > 0 ? timeTaken : null,
        };
      });

      // Total time: sum of all approved challenge times
      const approvedTimes = challengeStatuses
        .filter(c => c.status === 'approved' && c.time_taken !== null)
        .map(c => c.time_taken!);
      const totalTime = approvedTimes.length > 0 ? approvedTimes.reduce((a, b) => a + b, 0) : null;

      return {
        user_id: uid,
        username: profileMap[uid]?.username || 'Okänd',
        avatar_url: profileMap[uid]?.avatar_url || null,
        joined_at: joinedMap[uid],
        challenges: challengeStatuses,
        totalTime,
      };
    });

    // Sort: most challenges completed first, then by total time
    result.sort((a, b) => {
      const aCompleted = a.challenges.filter(c => c.status === 'approved').length;
      const bCompleted = b.challenges.filter(c => c.status === 'approved').length;
      if (bCompleted !== aCompleted) return bCompleted - aCompleted;
      if (a.totalTime !== null && b.totalTime !== null) return a.totalTime - b.totalTime;
      return 0;
    });

    setParticipants(result);
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success text-success-foreground text-xs">Godkänd</Badge>;
      case 'pending': return <Badge className="bg-muted text-muted-foreground text-xs">Väntande</Badge>;
      case 'rejected': return <Badge className="bg-destructive text-destructive-foreground text-xs">Avvisad</Badge>;
      default: return <Badge variant="outline" className="text-xs">Ej påbörjad</Badge>;
    }
  };

  if (!competitionId) {
    return <p className="text-muted-foreground">Välj en tävling i fliken "Tävlingar" först.</p>;
  }

  if (loading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  if (participants.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Inga deltagare ännu.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-sweden-gold" />
        <h3 className="font-display font-bold">{participants.length} deltagare</h3>
      </div>

      {participants.map(p => {
        const completed = p.challenges.filter(c => c.status === 'approved').length;
        const isExpanded = expandedUser === p.user_id;

        return (
          <Card key={p.user_id}>
            <CardContent className="py-3">
              <button
                className="w-full flex items-center gap-3 text-left"
                onClick={() => setExpandedUser(isExpanded ? null : p.user_id)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="gradient-sweden text-primary-foreground text-xs">
                    {p.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm">{p.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Anmäld: {formatDateTime(p.joined_at)} · {completed}/{p.challenges.length} klara
                    {p.totalTime !== null && ` · Total: ${formatDuration(p.totalTime)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">{completed}/{p.challenges.length}</Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 border-t pt-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Utmaning</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Inskickad</TableHead>
                        <TableHead>Granskad</TableHead>
                        <TableHead className="text-right">Tid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.challenges.map(ch => (
                        <TableRow key={ch.challenge_id}>
                          <TableCell className="font-bold text-sm">{ch.order_index}</TableCell>
                          <TableCell className="text-sm truncate max-w-[120px]">{ch.title}</TableCell>
                          <TableCell>{statusBadge(ch.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(ch.submitted_at)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(ch.reviewed_at)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">
                            <span className="flex items-center justify-end gap-1">
                              <Clock className="h-3 w-3" /> {formatDuration(ch.time_taken)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
