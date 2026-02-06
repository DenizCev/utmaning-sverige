import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Diamond, User, UsersRound } from 'lucide-react';
import { Team } from '@/hooks/useTeams';

interface Props {
  cost: number;
  myTeams: Team[];
  userId?: string;
  onJoin: (teamId?: string) => void;
}

export function CompetitionJoinButton({ cost, myTeams, userId, onJoin }: Props) {
  const [open, setOpen] = useState(false);
  const leaderTeams = myTeams.filter(t => t.created_by === userId);

  // No teams → just join individually
  if (leaderTeams.length === 0) {
    return (
      <Button onClick={() => onJoin()} className="gradient-gold text-accent-foreground font-bold">
        <Diamond className="h-4 w-4 mr-1" /> Anmäl dig {cost > 0 ? `(${cost} 💎)` : '(Gratis)'}
      </Button>
    );
  }

  // Has teams → show dialog to choose
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-gold text-accent-foreground font-bold">
          <Diamond className="h-4 w-4 mr-1" /> Anmäl dig {cost > 0 ? `(${cost} 💎)` : '(Gratis)'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Hur vill du tävla?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => { onJoin(); setOpen(false); }}
          >
            <User className="h-4 w-4" /> Anmäl mig själv
          </Button>
          {leaderTeams.map(team => (
            <Button
              key={team.id}
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => { onJoin(team.id); setOpen(false); }}
            >
              <UsersRound className="h-4 w-4" /> Anmäl lag: {team.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
