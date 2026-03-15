import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RuleSection {
  title: string;
  content: string;
}

const FALLBACK_SECTIONS: RuleSection[] = [
  { title: 'Allmänt', content: 'Deltagande i tävlingar i appen är helt gratis och frivilligt.\n\nTävlingarna är baserade på fysiska utomhusutmaningar och skicklighet.\n\nArrangören förbehåller sig rätten att ändra regler utan förvarning.' },
  { title: 'Deltagande på egen risk', content: 'Alla utmaningar sker på egen risk. Deltagaren ansvarar själv för sin säkerhet.' },
  { title: 'Allemansrätten och miljö', content: 'Följ allemansrätten. Lämna inga spår.' },
  { title: 'Fusk och diskvalificering', content: 'Fusk leder till diskvalificering.' },
  { title: 'Priser och vinnare', content: 'Priser delas ut baserat på leaderboard.' },
  { title: 'Personuppgifter (GDPR)', content: 'Vi behandlar dina uppgifter för att hantera tävlingar. Samtycke ges vid godkännande.' },
];

export default function RulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<RuleSection[]>(FALLBACK_SECTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'rules_sections')
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        setSections(data.value as unknown as RuleSection[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleAccept = async () => {
    if (!user) { navigate('/auth'); return; }
    setSaving(true);
    const { error } = await (supabase.from('profiles') as any)
      .update({ rules_accepted: true, rules_accepted_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Kunde inte spara godkännande');
    } else {
      toast.success('Regler godkända! ✅');
      navigate('/');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText className="h-6 w-6 text-sweden-gold" />
        <h1 className="text-3xl font-display font-bold">Regler</h1>
      </div>

      <Card className="mb-6 border-muted">
        <CardContent className="pt-6">
          <h2 className="text-xl font-display font-bold mb-2">Apple-disclaimer / Viktig information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Apple är inte sponsor för denna tävling och är på inget sätt involverad i tävlingen, administrationen eller utdelningen av priser. Alla frågor, kommentarer eller klagomål kring tävlingen ska riktas till{' '}
            <a href="mailto:sverigekampen@gmail.com" className="text-primary underline">sverigekampen@gmail.com</a>, och inte till Apple.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className={`text-xl font-display font-bold ${i > 0 ? 'mt-6' : ''}`}>{section.title}</h2>
              {section.content.split('\n\n').map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {user && (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="rules-accept"
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
            />
            <label htmlFor="rules-accept" className="text-sm cursor-pointer leading-relaxed">
              Jag har läst och godkänner reglerna ovan
            </label>
          </div>
          <Button
            onClick={handleAccept}
            disabled={!accepted || saving}
            className="gradient-gold text-accent-foreground font-semibold"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Bekräfta
          </Button>
        </div>
      )}
    </div>
  );
}
