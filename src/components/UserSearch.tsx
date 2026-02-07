import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RankBadge } from '@/components/RankBadge';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  all_time_points: number;
}

interface TeamResult {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  member_count?: number;
}

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState('profiles');

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setProfiles([]); setTeams([]); return; }
    setSearching(true);

    const [profileRes, teamRes] = await Promise.all([
      supabase.from('profiles')
        .select('user_id, username, avatar_url, all_time_points')
        .ilike('username', `%${q.trim()}%`)
        .limit(10),
      (supabase.from('teams') as any)
        .select('id, name, description, avatar_url')
        .ilike('name', `%${q.trim()}%`)
        .limit(10),
    ]);

    setProfiles(profileRes.data || []);

    // Get member counts for found teams
    const foundTeams: TeamResult[] = teamRes.data || [];
    if (foundTeams.length > 0) {
      const counts = await Promise.all(
        foundTeams.map(async (t) => {
          const { count } = await (supabase.from('team_members') as any)
            .select('*', { count: 'exact', head: true })
            .eq('team_id', t.id);
          return { ...t, member_count: count || 0 };
        })
      );
      setTeams(counts);
    } else {
      setTeams([]);
    }

    setSearching(false);
  };

  const totalResults = profiles.length + teams.length;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Sök spelare eller lag..."
          className="pl-9"
        />
      </div>

      {query.trim().length >= 2 && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="profiles" className="flex-1">
              <User className="h-4 w-4 mr-1" /> Spelare ({profiles.length})
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex-1">
              <Users className="h-4 w-4 mr-1" /> Lag ({teams.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profiles">
            {profiles.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {profiles.map(r => (
                  <Link key={r.user_id} to={`/profil/${r.user_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={r.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{r.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm flex-1">{r.username}</span>
                    <RankBadge points={r.all_time_points} />
                  </Link>
                ))}
              </div>
            ) : !searching ? (
              <p className="text-sm text-muted-foreground text-center py-4">Inga spelare hittades.</p>
            ) : null}
          </TabsContent>

          <TabsContent value="teams">
            {teams.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {teams.map(t => (
                  <Link key={t.id} to={`/lag/${t.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={t.avatar_url || undefined} />
                      <AvatarFallback className="text-xs gradient-sweden text-primary-foreground">{t.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm block truncate">{t.name}</span>
                      {t.description && <span className="text-xs text-muted-foreground block truncate">{t.description}</span>}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      <Users className="h-3 w-3 mr-1" /> {t.member_count}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : !searching ? (
              <p className="text-sm text-muted-foreground text-center py-4">Inga lag hittades.</p>
            ) : null}
          </TabsContent>
        </Tabs>
      )}

      {query.trim().length >= 2 && totalResults === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-2">Inga resultat hittades.</p>
      )}
    </div>
  );
}
