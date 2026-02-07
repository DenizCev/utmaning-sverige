import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, Trash2, Trophy, Gem, Users, Zap, Clock, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

const typeIcons: Record<string, typeof Bell> = {
  competition: Trophy,
  diamond: Gem,
  team: Users,
  challenge: Zap,
  streak: Clock,
  info: Info,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Du måste vara inloggad för att se notiser.</p>
        <Button className="mt-4" onClick={() => navigate('/auth')}>Logga in</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Notiser</h1>
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground">{unreadCount}</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" /> Markera alla som lästa
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laddar...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Inga notiser ännu.</p>
          <p className="text-xs text-muted-foreground mt-1">Du får notiser om tävlingar, utmaningar och mer!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => {
            const IconComp = typeIcons[notif.type] || Bell;
            return (
              <Card
                key={notif.id}
                className={`transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5 border-primary/20' : ''}`}
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                  if (notif.link) navigate(notif.link);
                }}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  <div className={`mt-0.5 rounded-full p-1.5 ${!notif.read ? 'bg-primary/10' : 'bg-muted'}`}>
                    <IconComp className={`h-4 w-4 ${!notif.read ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: sv })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
