import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface CharacterAvatarProps {
  username?: string;
  avatarUrl?: string | null;
  equippedSkin?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const skinSizes = {
  sm: 'text-xs -top-1 -right-1 h-4 w-4',
  md: 'text-sm -top-1 -right-1 h-5 w-5',
  lg: 'text-base -top-1 -right-1 h-6 w-6',
  xl: 'text-lg -top-2 -right-2 h-8 w-8',
};

const defaultCharacter = '🧑';

export function CharacterAvatar({
  username,
  avatarUrl,
  equippedSkin,
  size = 'md',
  className,
}: CharacterAvatarProps) {
  const initials = username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className={cn('gradient-sweden text-primary-foreground', textSizes[size])}>
          {avatarUrl ? initials : defaultCharacter}
        </AvatarFallback>
      </Avatar>
      {equippedSkin && (
        <span
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-background shadow-sm border',
            skinSizes[size]
          )}
          title="Utrustad skin"
        >
          {equippedSkin.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
