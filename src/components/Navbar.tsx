import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useTeams } from '@/hooks/useTeams';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, User, Shield, LogOut, Menu, X, Users, Search, Footprints, Bell } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const { branding } = useAppSettings();
  const { unreadCount } = useNotifications();
  const { joinRequests, invitations } = useTeams();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 gradient-sweden border-b border-sweden-blue-light/20">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-primary-foreground">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} className="h-8 w-auto rounded" />
          ) : (
            <Trophy className="h-6 w-6 text-sweden-gold" />
          )}
          <span className="font-display text-lg font-bold tracking-tight">{branding.name || 'Sweden Challenge'}</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/tavlingar">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  Tävlingar
                </Button>
              </Link>
              <Link to="/leaderboard-alltime">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  Leaderboard
                </Button>
              </Link>
              <Link to="/regler">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  Regler
                </Button>
              </Link>
              <Link to="/lag" className="relative">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  <Users className="h-4 w-4 mr-1" /> Lag
                  {(joinRequests.length + invitations.length) > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                      {joinRequests.length + invitations.length}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/steg">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  <Footprints className="h-4 w-4 mr-1" /> Steg
                </Button>
              </Link>
              <Link to="/sok">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  <Search className="h-4 w-4 mr-1" /> Sök
                </Button>
              </Link>
              <Link to="/notiser" className="relative">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  <Bell className="h-4 w-4 mr-1" /> Notiser
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/profil">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  <User className="h-4 w-4 mr-1" /> Profil
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-sweden-gold hover:bg-sweden-blue-light/20">
                    <Shield className="h-4 w-4 mr-1" /> Admin
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-primary-foreground hover:bg-sweden-blue-light/20">
                <LogOut className="h-4 w-4 mr-1" /> Logga ut
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gradient-gold text-accent-foreground font-semibold shadow-lg hover:opacity-90">
                Logga in
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-primary-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden gradient-sweden border-t border-sweden-blue-light/20 px-4 py-4 flex flex-col gap-2">
          {user ? (
            <>
              <Link to="/tavlingar" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">Tävlingar</Link>
              <Link to="/leaderboard-alltime" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">Leaderboard</Link>
              <Link to="/regler" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">Regler</Link>
              <Link to="/lag" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2 flex items-center gap-2">
                Lag {(joinRequests.length + invitations.length) > 0 && <Badge className="bg-destructive text-destructive-foreground text-xs">{joinRequests.length + invitations.length}</Badge>}
              </Link>
              <Link to="/steg" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">👟 Stegräknare</Link>
              <Link to="/sok" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">🔍 Sök spelare</Link>
              <Link to="/notiser" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2 flex items-center gap-2">
                🔔 Notiser {unreadCount > 0 && <Badge className="bg-destructive text-destructive-foreground text-xs">{unreadCount}</Badge>}
              </Link>
              <Link to="/profil" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">Profil</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sweden-gold py-2">Admin-panel</Link>}
              <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="text-primary-foreground py-2 text-left">Logga ut</button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button className="w-full gradient-gold text-accent-foreground font-semibold">Logga in</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
