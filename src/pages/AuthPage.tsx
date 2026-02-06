import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenordet måste vara minst 6 tecken'),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(2, 'Användarnamnet måste vara minst 2 tecken'),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const parsed = loginSchema.parse({ email, password });
        const { error } = await signIn(parsed.email, parsed.password);
        if (error) {
          if (error.message?.includes('Invalid login credentials')) {
            toast.error('Felaktiga inloggningsuppgifter');
          } else if (error.message?.includes('Email not confirmed')) {
            toast.error('Du måste bekräfta din e-postadress först');
          } else {
            toast.error(error.message || 'Inloggningen misslyckades');
          }
        } else {
          toast.success('Välkommen tillbaka!');
          navigate('/');
        }
      } else {
        const parsed = signupSchema.parse({ email, password, username });
        const { error } = await signUp(parsed.email, parsed.password, parsed.username);
        if (error) {
          if (error.message?.includes('already registered')) {
            toast.error('E-postadressen är redan registrerad');
          } else {
            toast.error(error.message || 'Registreringen misslyckades');
          }
        } else {
          toast.success('Konto skapat! Kontrollera din e-post för att bekräfta.');
        }
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md glass-card animate-slide-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl gradient-gold flex items-center justify-center">
            <Trophy className="h-7 w-7 text-accent-foreground" />
          </div>
          <CardTitle className="text-2xl">{isLogin ? 'Logga in' : 'Skapa konto'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Logga in för att delta i tävlingen' : 'Registrera dig gratis och börja tävla'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Användarnamn</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" placeholder="Ditt användarnamn" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-postadress</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="din@email.se" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="Minst 6 tecken" />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-gold text-accent-foreground font-semibold" disabled={loading}>
              {loading ? 'Laddar...' : isLogin ? 'Logga in' : 'Registrera dig'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isLogin ? 'Har du inget konto? Registrera dig' : 'Har du redan ett konto? Logga in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
