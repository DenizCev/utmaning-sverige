import { UserSearch } from '@/components/UserSearch';
import { Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-6">
        <Search className="h-8 w-8 text-sweden-gold mx-auto mb-2" />
        <h1 className="text-3xl font-display font-bold">Sök spelare</h1>
        <p className="text-muted-foreground">Hitta andra deltagare och se deras profil</p>
      </div>
      <UserSearch />
    </div>
  );
}
