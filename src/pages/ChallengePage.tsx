import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { ShareButton } from '@/components/ShareButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Camera, Video, FileText, Upload, Clock, ArrowLeft, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!id) return;
    fetchData();
  }, [id, user]);
  const fetchData = async () => {
    const { data: ch } = await supabase.from('challenges').select('*').eq('id', id).maybeSingle();
    setChallenge(ch);

    if (user && ch) {
      const { data: sub } = await supabase
        .from('submissions')
        .select('*')
        .eq('challenge_id', ch.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setExistingSubmission(sub);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !challenge) return;
    setSubmitting(true);

    try {
      let fileUrl: string | null = null;

      if (challenge.proof_type !== 'text' && selectedFile) {
        const ext = selectedFile.name.split('.').pop();
        const path = `${user.id}/${challenge.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(path, selectedFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('submissions').getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('submissions').insert({
        challenge_id: challenge.id,
        user_id: user.id,
        file_url: fileUrl,
        text_content: challenge.proof_type === 'text' ? textContent : null,
      });

      if (error) throw error;

      toast.success('Inlämning skickad! Inväntar granskning. ⏳');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Kunde inte skicka inlämning');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!challenge) return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Utmaningen hittades inte</div>;

  const proofIcon = challenge.proof_type === 'video' ? <Video className="h-5 w-5" /> : challenge.proof_type === 'text' ? <FileText className="h-5 w-5" /> : <Camera className="h-5 w-5" />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
      </Button>

      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="gradient-gold text-accent-foreground border-0">Utmaning {challenge.order_index}</Badge>
            <Badge variant="outline">{challenge.points} poäng</Badge>
          </div>
          <CardTitle className="text-2xl">{challenge.title}</CardTitle>
          <CardDescription className="text-base">{challenge.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {existingSubmission ? (
            <div className="text-center py-8 space-y-4">
              <Badge className={existingSubmission.status === 'approved' ? 'bg-success text-success-foreground' : existingSubmission.status === 'rejected' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}>
                {existingSubmission.status === 'pending' && '⏳ Väntar på granskning'}
                {existingSubmission.status === 'approved' && '✅ Godkänd!'}
                {existingSubmission.status === 'rejected' && '❌ Avvisad – försök igen'}
              </Badge>
              <div>
                <ShareButton text={`Jag klarade utmaningen "${challenge.title}" i Sweden Challenge Race! 🏆`} showDiamondInfo />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {proofIcon}
                <span>Bevistyp: {challenge.proof_type === 'photo' ? 'Foto' : challenge.proof_type === 'video' ? 'Video' : 'Text'}</span>
              </div>

              {challenge.proof_type === 'text' ? (
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Skriv ditt svar här..."
                  rows={4}
                />
              ) : (
                <div>
                  {isMobile ? (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={challenge.proof_type === 'video' ? 'video/*' : 'image/*'}
                        capture="environment"
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors"
                      >
                        {selectedFile ? (
                          <p className="text-foreground font-medium">{selectedFile.name}</p>
                        ) : (
                          <>
                            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-muted-foreground">Tryck för att öppna kameran och {challenge.proof_type === 'video' ? 'spela in video' : 'ta ett foto'}</p>
                            <p className="text-xs text-muted-foreground mt-1">Endast nya foton/videos – inga befintliga filer</p>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/30">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground font-medium">Använd din mobil</p>
                      <p className="text-xs text-muted-foreground mt-1">Foto och video måste tas direkt med kameran på din telefon. Öppna denna sida på mobilen för att ladda upp.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Tidsstämpel sparas automatiskt</span>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || (challenge.proof_type === 'text' ? !textContent.trim() : (!selectedFile || !isMobile))}
                className="w-full gradient-gold text-accent-foreground font-bold"
              >
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Skickar...</> : 'Ladda upp bevis'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
