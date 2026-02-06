import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RankBadge } from '@/components/RankBadge';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SearchResult {
  user_id: string;
  username: string;
  avatar_url: string | null;
  all_time_points: number;
}

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase.from('profiles')
      .select('user_id, username, avatar_url, all_time_points')
      .ilike('username', `%${q.trim()}%`)
      .limit(10);
    setResults(data || []);
    setSearching(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Sök användare..."
          className="pl-9"
        />
      </div>
      {results.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.map(r => (
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
      )}
      {query.trim().length >= 2 && results.length === 0 && !searching && (
        <p className="text-sm text-muted-foreground text-center py-2">Inga användare hittades.</p>
      )}
    </div>
  );
}
