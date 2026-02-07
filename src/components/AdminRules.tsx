import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save, Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

interface RuleSection {
  title: string;
  content: string;
}

const DEFAULT_SECTIONS: RuleSection[] = [
  { title: 'Allmänt', content: 'Deltagande i tävlingar i appen är helt gratis och frivilligt.\n\nTävlingarna är baserade på fysiska utomhusutmaningar och skicklighet (tid, kvalitet på bevis). Det finns ingen slump – vinnare utses efter objektiva kriterier (t.ex. totaltid eller admin-bedömning).\n\nArrangören förbehåller sig rätten att ändra regler, utmaningar eller avsluta tävlingar utan förvarning.' },
  { title: 'Deltagande på egen risk', content: 'Alla utmaningar sker på egen risk. Deltagaren ansvarar själv för sin säkerhet, hälsa och eventuella skador.\n\nAppen rekommenderar: Använd sunt förnuft, kontrollera väder, undvik farliga situationer (t.ex. tunt is, starka strömmar, mörker utan lampa), ha rätt kläder/skor och informera någon om vart du är på väg.\n\nArrangören tar inget ansvar för personskador, egendomsskador eller andra förluster som uppstår under deltagande.' },
  { title: 'Allemansrätten och miljö', content: 'Följ allemansrätten: Gå, cykla, vistas i naturen – men störa inte djur, markägare eller andra.\n\nLämna inga spår: Ta med skräp, förstör inte natur eller egendom.\n\nUndvik skyddade områden (nationalparker, naturreservat) om specifika regler förbjuder aktiviteter. Kolla alltid lokala restriktioner.' },
  { title: 'Fusk och diskvalificering', content: 'Fusk (t.ex. fejkade uploads, gammal video, hjälp från andra) leder till diskvalificering och eventuell avstängning från framtida tävlingar.\n\nArrangören/admin har rätt att neka eller ta bort inlämningar utan förklaring.' },
  { title: 'Priser och vinnare', content: 'Priser delas ut till vinnare baserat på leaderboard.\n\nVinnare kontaktas via app/email. Priser kan vara presentkort, prylar etc. – vinnaren ansvarar för skatt om priset överstiger skattefria gränser (kontrollera Skatteverket).' },
  { title: 'Personuppgifter (GDPR)', content: 'Vi behandlar dina uppgifter (namn/användarnamn, email, avatar, uploads, eventuell platsdata) för att hantera tävlingar, leaderboard och kommunikation.\n\nSamtycke ges vid godkännande av regler. Du kan när som helst begära utdrag, rättelse eller radering via kontakt.\n\nData sparas så länge det behövs för tävlingar + max 12 månader efter.' },
];

export function AdminRules() {
  const [sections, setSections] = useState<RuleSection[]>(DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
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

  const saveRules = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'rules_sections')
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('app_settings')
        .update({ value: sections as unknown as any, updated_at: new Date().toISOString() })
        .eq('key', 'rules_sections'));
    } else {
      ({ error } = await supabase
        .from('app_settings')
        .insert({ key: 'rules_sections', value: sections as unknown as any }));
    }

    if (error) toast.error('Kunde inte spara regler');
    else toast.success('Regler sparade! ✅');
    setSaving(false);
  };

  const updateSection = (index: number, field: keyof RuleSection, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const addSection = () => {
    setSections([...sections, { title: '', content: '' }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Redigera regler
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Redigera regelsektionerna nedan. Ändringar syns direkt på regelsidan efter att du sparar.
          </p>

          {sections.map((section, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <Label>Rubrik</Label>
                    <Input
                      value={section.title}
                      onChange={e => updateSection(i, 'title', e.target.value)}
                      placeholder="Sektionsrubrik"
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeSection(i)} className="text-destructive shrink-0 mt-5">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label>Innehåll</Label>
                  <Textarea
                    value={section.content}
                    onChange={e => updateSection(i, 'content', e.target.value)}
                    placeholder="Regeltext..."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">Använd tomma rader för att separera stycken.</p>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addSection}>
              <Plus className="h-4 w-4 mr-2" /> Lägg till sektion
            </Button>
            <Button onClick={saveRules} disabled={saving} className="gradient-gold text-accent-foreground font-semibold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Spara regler
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
