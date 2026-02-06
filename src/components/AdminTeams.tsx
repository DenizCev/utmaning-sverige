import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { Input } from '@/components/ui/input';
import { Search, Users, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
  members: { user_id: string; username: string; avatar_url: string | null; role: string }[];
}

export function AdminTeams() {
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [filtered, setFiltered] = useState<TeamEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => { fetchTeams(); }, []);

  useEffect(() => {
    if (!search.trim()) setFiltered(teams);
    else {
      const q = search.toLowerCase();
      setFiltered(teams.filter(t => t.name.toLowerCase().includes(q)));
    }
  }, [search, teams]);

  const fetchTeams = async () => {
    setLoading(true);
    const { data: allTeams } = await (supabase.from('teams') as any).select('*').order('created_at', { ascending: false });
    if (!allTeams) { setLoading(false); return; }

    const { data: allMembers } = await (supabase.from('team_members') as any).select('team_id, user_id, role');
    const userIds = [...new Set((allMembers || []).map((m: any) => m.user_id))] as string[];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', userIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

    const result: TeamEntry[] = allTeams.map((t: any) => ({
      ...t,
      members: (allMembers || [])
        .filter((m: any) => m.team_id === t.id)
        .map((m: any) => ({
          user_id: m.user_id,
          username: profileMap[m.user_id]?.username || 'Okänd',
          avatar_url: profileMap[m.user_id]?.avatar_url || null,
          role: m.role,
        })),
    }));
    setTeams(result);
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-5 w-5 text-sweden-gold" />
        <h3 className="font-display font-bold">{teams.length} lag</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök lagnamn..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {filtered.map(team => {
          const isExpanded = expandedTeam === team.id;
          return (
            <Card key={team.id}>
              <CardContent className="py-3">
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                >
                  <CharacterAvatar username={team.name} avatarUrl={team.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {team.members.length} medlemmar · Skapad {new Date(team.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{team.members.length} st</Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    {team.description && <p className="text-sm text-muted-foreground mb-2">{team.description}</p>}
                    {team.members.map(m => (
                      <Link key={m.user_id} to={`/profil/${m.user_id}`} className="flex items-center gap-2 hover:bg-muted/50 rounded p-1.5">
                        <CharacterAvatar username={m.username} avatarUrl={m.avatar_url} size="sm" />
                        <span className="text-sm font-medium">{m.username}</span>
                        {m.role === 'leader' && <Badge variant="outline" className="text-xs">Ledare</Badge>}
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
