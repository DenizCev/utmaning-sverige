import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSteps } from '@/hooks/useSteps';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Footprints, Trophy, Calendar, RotateCcw, RefreshCw, Heart, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { Link } from 'react-router-dom';
import StepLeaderboard from '@/components/StepLeaderboard';

export default function StepsPage() {
  const { user, isAdmin } = useAuth();
  const {
    todaySteps, history, loading, syncing, isNative,
    permissionStatus, requestPermission, openHealthSettings, syncFromHealth,
  } = useSteps();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({ title: 'Tillåtelse beviljad!', description: 'Dina steg synkas nu automatiskt.' });
      // Auto-sync after granting
      const ok = await syncFromHealth();
      if (ok) {
        toast({ title: 'Steg synkade!', description: 'Dina steg har hämtats från hälsoappen.' });
      }
    } else {
      toast({
        title: 'Tillåtelse nekad',
        description: 'Du kan ge tillåtelse via Inställningar.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncHealth = async () => {
    const ok = await syncFromHealth();
    if (ok) {
      toast({ title: 'Steg synkade!', description: 'Dina steg har hämtats från hälsoappen.' });
    } else {
      toast({
        title: 'Kunde inte synka',
        description: 'Kontrollera att Kampen har tillgång i Inställningar > Hälsa > Kampen och försök igen.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenSettings = async () => {
    await openHealthSettings();
  };

  const handleAdminReset = async () => {
    if (!isAdmin) return;
    const { error } = await (supabase.from('step_entries') as any)
      .delete()
      .eq('date', today);
    if (!error) {
      toast({ title: 'Steg återställda', description: 'Alla steg för idag har rensats.' });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-6">
        <Footprints className="h-10 w-10 text-primary mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Stegräknare</h1>
        <p className="text-muted-foreground">
          Stegen synkas automatiskt från din hälsoapp
        </p>
      </div>

      {/* Permission banner – shown when permission is missing on native */}
      {isNative && permissionStatus !== 'granted' && (
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <Heart className="h-5 w-5 text-primary" />
          <AlertDescription className="ml-2">
            {permissionStatus === 'unavailable' ? (
              <>
                <p className="font-semibold mb-2">Hälsoappen behöver aktiveras</p>
                <p className="text-sm text-muted-foreground mb-3">
                  På Android behöver Health Connect vara installerad. På iPhone hanteras åtkomst i Apple Hälsa.
                </p>
                <Button variant="outline" onClick={handleOpenSettings} className="w-full">
                  <Settings className="h-4 w-4 mr-2" /> Öppna hälsokonfiguration
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  iPhone: Inställningar {'>'} Appar {'>'} Hälsa {'>'} Dataåtkomst och enheter {'>'} Kampen
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold mb-2">Appen behöver tillgång till hälsodata</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Tillåt appen att läsa dina steg från Apple Health / Google Fit för att kunna tracka steg i tävlingen.
                </p>
                <div className="flex flex-col gap-2">
                  <Button onClick={handleRequestPermission} className="w-full">
                    <Heart className="h-4 w-4 mr-2" /> Ge tillåtelse
                  </Button>
                  {permissionStatus === 'denied' && (
                    <Button variant="outline" onClick={handleOpenSettings} className="w-full">
                      <Settings className="h-4 w-4 mr-2" /> Öppna inställningar
                    </Button>
                  )}
                </div>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}


      {user && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Footprints className="h-5 w-5" /> Idag ({today})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-primary mb-4">
              {todaySteps?.step_count || 0} <span className="text-lg text-muted-foreground">steg</span>
            </div>

            <Button
              onClick={handleSyncHealth}
              disabled={syncing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synkar...' : 'Synka steg från hälsoappen'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button variant="destructive" size="sm" onClick={handleAdminReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Återställ alla steg idag
          </Button>
        </div>
      )}

      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="leaderboard" className="flex-1">
            <Trophy className="h-4 w-4 mr-1" /> Dagens topp
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <Calendar className="h-4 w-4 mr-1" /> Min historik
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <StepLeaderboard userId={user?.id} />
        </TabsContent>

        <TabsContent value="history">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Laddar...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Ingen historik ännu.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Steg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{new Date(entry.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</TableCell>
                    <TableCell className="text-right font-semibold">{entry.step_count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
