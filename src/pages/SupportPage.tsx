import { Mail, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-xl">
        <Card className="border-border">
          <CardContent className="pt-8 pb-10 px-6 text-center space-y-6">
            <h1 className="text-3xl font-display font-bold text-foreground">Kontakta oss</h1>
            <p className="text-muted-foreground text-lg">
              Har du frågor, buggar eller feedback?
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              <a href="mailto:sverigekampen@kampen.app" className="font-semibold underline underline-offset-4 hover:opacity-80">
                sverigekampen@kampen.app
              </a>
            </div>
            <p className="text-muted-foreground">Vi svarar inom 1–2 dagar.</p>
            <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
              Tack för att du spelar Kampen Sverige! <Trophy className="h-5 w-5 text-sweden-gold" />
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportPage;
