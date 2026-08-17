import { useState, useEffect } from 'react';
import { PharmacyModule } from '../components/PharmacyModule';
import { useAuth } from '../contexts/AuthContext';

export function PharmacyDashboard() {
  const { user } = useAuth();
  const [initialSubTab, setInitialSubTab] = useState<'quick-sale' | 'prescriptions' | 'stock' | 'stock-entries' | 'alerts' | 'history'>('quick-sale');

  // Écouteur navigation globale via la sidebar
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const path = event.detail;
      if (path === 'quick-sale' || path === '/dashboard/quick-sale') setInitialSubTab('quick-sale');
      else if (path === 'prescriptions' || path === '/dashboard/prescriptions') setInitialSubTab('prescriptions');
      else if (path === 'stock' || path === '/dashboard/stock') setInitialSubTab('stock');
      else if (path === 'stock-entries' || path === '/dashboard/stock-entries') setInitialSubTab('stock-entries');
      else if (path === 'alerts' || path === '/dashboard/alerts') setInitialSubTab('alerts');
      else if (path === 'history' || path === '/dashboard/history') setInitialSubTab('history');
      else setInitialSubTab('quick-sale');
    };

    window.addEventListener('changeTab', handleTabChange as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChange as EventListener);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Espace Pharmacie &amp; Stocks</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Bienvenue, {user?.firstName} {user?.lastName} — Ventes rapides au scanner, gestion des lots et péremptions
          </p>
        </div>
      </div>

      <PharmacyModule initialTab={initialSubTab} />
    </div>
  );
}
