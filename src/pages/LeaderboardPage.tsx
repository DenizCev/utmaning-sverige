import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CompetitionLeaderboardPage from './CompetitionLeaderboardPage';

// This page handles /leaderboard without a competition ID by finding the latest competition
export default function LeaderboardPage() {
  const { competitionId } = useParams<{ competitionId?: string }>();
  const [resolvedId, setResolvedId] = useState<string | undefined>(competitionId);

  useEffect(() => {
    if (!competitionId) {
      // Find the latest active competition
      (supabase.from('competitions') as any)
        .select('id')
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) setResolvedId(data.id);
          else {
            // Fallback to any latest competition
            (supabase.from('competitions') as any)
              .select('id')
              .order('start_time', { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data: fallback }: any) => {
                if (fallback) setResolvedId(fallback.id);
              });
          }
        });
    }
  }, [competitionId]);

  if (!resolvedId) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Laddar...</div>;
  }

  return <CompetitionLeaderboardPage />;
}
