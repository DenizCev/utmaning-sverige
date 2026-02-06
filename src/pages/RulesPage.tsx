import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function RulesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText className="h-6 w-6 text-sweden-gold" />
        <h1 className="text-3xl font-display font-bold">Regler</h1>
      </div>

      <Card>
        <CardContent className="pt-6 prose prose-sm max-w-none dark:prose-invert">
          <h2 className="text-xl font-display font-bold">Allmänt</h2>
          <p>Deltagande i tävlingar i appen är helt gratis och frivilligt.</p>
          <p>Tävlingarna är baserade på fysiska utomhusutmaningar och skicklighet (tid, kvalitet på bevis). Det finns ingen slump – vinnare utses efter objektiva kriterier (t.ex. totaltid eller admin-bedömning).</p>
          <p>Arrangören förbehåller sig rätten att ändra regler, utmaningar eller avsluta tävlingar utan förvarning.</p>

          <h2 className="text-xl font-display font-bold mt-6">Deltagande på egen risk</h2>
          <p>Alla utmaningar sker på egen risk. Deltagaren ansvarar själv för sin säkerhet, hälsa och eventuella skador.</p>
          <p>Appen rekommenderar: Använd sunt förnuft, kontrollera väder, undvik farliga situationer (t.ex. tunt is, starka strömmar, mörker utan lampa), ha rätt kläder/skor och informera någon om vart du är på väg.</p>
          <p>Arrangören tar inget ansvar för personskador, egendomsskador eller andra förluster som uppstår under deltagande.</p>

          <h2 className="text-xl font-display font-bold mt-6">Allemansrätten och miljö</h2>
          <p>Följ allemansrätten: Gå, cykla, vistas i naturen – men störa inte djur, markägare eller andra.</p>
          <p>Lämna inga spår: Ta med skräp, förstör inte natur eller egendom.</p>
          <p>Undvik skyddade områden (nationalparker, naturreservat) om specifika regler förbjuder aktiviteter. Kolla alltid lokala restriktioner.</p>

          <h2 className="text-xl font-display font-bold mt-6">Fusk och diskvalificering</h2>
          <p>Fusk (t.ex. fejkade uploads, gammal video, hjälp från andra) leder till diskvalificering och eventuell avstängning från framtida tävlingar.</p>
          <p>Arrangören/admin har rätt att neka eller ta bort inlämningar utan förklaring.</p>

          <h2 className="text-xl font-display font-bold mt-6">Priser och vinnare</h2>
          <p>Priser delas ut till vinnare baserat på leaderboard.</p>
          <p>Vinnare kontaktas via app/email. Priser kan vara presentkort, prylar etc. – vinnaren ansvarar för skatt om priset överstiger skattefria gränser (kontrollera Skatteverket).</p>

          <h2 className="text-xl font-display font-bold mt-6">Personuppgifter (GDPR)</h2>
          <p>Vi behandlar dina uppgifter (namn/användarnamn, email, avatar, uploads, eventuell platsdata) för att hantera tävlingar, leaderboard och kommunikation.</p>
          <p>Samtycke ges vid godkännande av regler. Du kan när som helst begära utdrag, rättelse eller radering via kontakt.</p>
          <p>Data sparas så länge det behövs för tävlingar + max 12 månader efter.</p>
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
