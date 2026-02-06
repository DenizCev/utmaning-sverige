import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Trophy, User, Shield, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
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
          <Trophy className="h-6 w-6 text-sweden-gold" />
          <span className="font-display text-lg font-bold tracking-tight">Sweden Challenge</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Link to="/leaderboard">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sweden-blue-light/20">
                  Leaderboard
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
              <Link to="/leaderboard" onClick={() => setMobileOpen(false)} className="text-primary-foreground py-2">Leaderboard</Link>
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
