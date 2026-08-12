import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { 
  ShoppingCart, 
  Package, 
  FileText, 
  AlertTriangle, 
  History,
  Search,
  Plus,
  XCircle,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Truck,
  CreditCard,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../services/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type PharmacyTab = 'dashboard' | 'quick-sale' | 'cart' | 'prescriptions' | 'stock' | 'stock-entries' | 'alerts' | 'history';

interface PharmacyStock {
  id: string;
  medicine_name: string;
  medicine_code: string;
  barcode: string;
  category: string;
  laboratory: string;
  supplier: string;
  quantity_available: number;
  minimum_threshold: number;
  purchase_price: number;
  sale_price: number;
  lot_number: string;
  expiration_date: string;
  location: string;
  is_active: boolean;
}

interface Prescription {
  id: string;
  reference: string;
  patient_id: string;
  doctor_name: string;
  prescription_date: string;
  status: string;
  notes: string;
}

interface CartItem {
  stock_id: string;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export function PharmacyDashboard() {
  const [activeTab, setActiveTab] = useState<PharmacyTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [stock, setStock] = useState<PharmacyStock[]>([]);
  const [, setPrescriptions] = useState<Prescription[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [, setShowNewStockForm] = useState(false);
  const [, setShowStockEntryForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Charger le stock au démarrage
  useEffect(() => {
    loadStock();
    loadPrescriptions();
  }, []);

  const loadStock = async () => {
    try {
      const { data, error } = await supabase.from('pharmacy_stock').select('*').order('medicine_name');
      if (error) throw error;
      setStock(data || []);
    } catch (error) {
      console.error('Error loading stock:', error);
    }
  };

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase.from('prescriptions').select('*').order('prescription_date', { ascending: false });
      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
    }
  };

  const stats = [
    {
      title: 'Ventes du jour',
      value: '0 DH',
      change: '+0%',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: 'Nombre de ventes',
      value: '0',
      change: '+0%',
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Produits en stock',
      value: stock.length.toString(),
      change: '',
      icon: <Package className="w-5 h-5" />,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Alertes stock',
      value: stock.filter(s => s.quantity_available <= s.minimum_threshold).length.toString(),
      change: '',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-red-500 to-orange-500',
    },
  ];

  const getStockStatus = (item: PharmacyStock) => {
    if (item.quantity_available <= 0) return { label: 'Rupture', color: 'bg-red-100 text-red-700' };
    if (item.quantity_available <= item.minimum_threshold) return { label: 'Faible', color: 'bg-yellow-100 text-yellow-700' };
    if (item.expiration_date && new Date(item.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) return { label: 'Expire bientôt', color: 'bg-orange-100 text-orange-700' };
    return { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700' };
  };

  const addToCart = (stockItem: PharmacyStock) => {
    const existingItem = cart.find(item => item.stock_id === stockItem.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.stock_id === stockItem.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setCart([...cart, {
        stock_id: stockItem.id,
        medicine_name: stockItem.medicine_name,
        quantity: 1,
        unit_price: stockItem.sale_price,
        discount: 0,
        subtotal: stockItem.sale_price
      }]);
    }
  };

  const updateCartQuantity = (stockId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.stock_id !== stockId));
    } else {
      setCart(cart.map(item => 
        item.stock_id === stockId 
          ? { ...item, quantity, subtotal: quantity * item.unit_price - item.discount }
          : item
      ));
    }
  };

  const removeFromCart = (stockId: string) => {
    setCart(cart.filter(item => item.stock_id !== stockId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedPatient(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSale = async () => {
    if (cart.length === 0) {
      setSuccessMessage({ show: true, message: 'Le panier est vide' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 3000);
      return;
    }

    try {
      // Générer une référence pour la vente
      const saleReference = 'VTE-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      
      // Créer la vente
      const { data: saleData, error: saleError } = await supabase.from('pharmacy_sales').insert([{
        reference: saleReference,
        patient_id: selectedPatient?.id || null,
        total_amount: cartTotal,
        discount: 0,
        final_amount: cartTotal,
        payment_method: 'cash',
        sold_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'completed'
      }]).select();

      if (saleError) throw saleError;

      // Créer les lignes de vente
      const saleItems = cart.map(item => ({
        sale_id: saleData?.[0]?.id,
        stock_id: item.stock_id,
        medicine_name: item.medicine_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount
      }));

      await supabase.from('pharmacy_sale_items').insert(saleItems);

      setSuccessMessage({ show: true, message: 'Vente enregistrée avec succès !' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 3000);
      clearCart();
      loadStock();
    } catch (error) {
      console.error('Error creating sale:', error);
      setSuccessMessage({ show: true, message: 'Erreur lors de la vente' });
      setTimeout(() => setSuccessMessage({ show: false, message: '' }), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Message */}
      {successMessage.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in ${
          successMessage.message.includes('Erreur') 
            ? 'bg-red-50 border-2 border-red-200 text-red-700' 
            : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700'
        }`}>
          {successMessage.message.includes('Erreur') ? (
            <XCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{successMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Pharmacie</h1>
          <p className="text-slate-500 mt-1">Gestion de la pharmacie et des ventes</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setActiveTab('alerts')}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alertes
          </Button>
          <Button onClick={() => setActiveTab('quick-sale')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Vente Rapide
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {(['dashboard', 'quick-sale', 'prescriptions', 'stock', 'stock-entries', 'alerts', 'history'] as PharmacyTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'dashboard' ? 'Dashboard' : 
             tab === 'quick-sale' ? 'Vente Rapide' :
             tab === 'prescriptions' ? 'Ordonnances' :
             tab === 'stock' ? 'Stock' :
             tab === 'stock-entries' ? 'Entrées Stock' :
             tab === 'alerts' ? 'Alertes' : 'Historique'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.title} className="cursor-pointer">
                <Card className="hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                        <p className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</p>
                        <p className="text-sm text-emerald-600 mt-1">{stat.change}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                        {stat.icon}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventes des 7 derniers jours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Ventes (DH)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition des ventes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[].map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières ventes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Aucune vente récente</p>
                <p className="text-sm mt-2">Les ventes apparaîtront ici</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'quick-sale' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Product Search */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rechercher un médicament</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Rechercher par nom, code-barres ou référence..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Résultats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stock
                    .filter(item => 
                      item.is_active &&
                      item.quantity_available > 0 &&
                      (item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.medicine_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.barcode?.includes(searchQuery))
                    )
                    .slice(0, 10)
                    .map((item) => {
                      const status = getStockStatus(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={() => addToCart(item)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-medium text-slate-800">{item.medicine_name}</p>
                                <p className="text-sm text-slate-500">{item.medicine_code || item.barcode}</p>
                              </div>
                              <span className={cn('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
                                {status.label}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                              <span>Stock: {item.quantity_available}</span>
                              <span className="font-semibold text-blue-600">{item.sale_price} DH</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  {stock.filter(item => 
                    item.is_active &&
                    item.quantity_available > 0 &&
                    (item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     item.medicine_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     item.barcode?.includes(searchQuery))
                  ).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>Aucun médicament trouvé</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Panier</span>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>Panier vide</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.stock_id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.medicine_name}</p>
                          <p className="text-xs text-slate-500">{item.unit_price} DH/unité</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.stock_id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.stock_id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <p className="font-semibold text-blue-600 w-20 text-right">{item.subtotal} DH</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.stock_id)}
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">Total</span>
                        <span className="font-bold text-2xl text-blue-600">{cartTotal} DH</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" onClick={handleSale}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'prescriptions' && (
        <Card>
          <CardHeader>
            <CardTitle>Ordonnances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune ordonnance en attente</p>
              <p className="text-sm mt-2">Les ordonnances envoyées par les médecins apparaîtront ici</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'stock' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Stock de médicaments</span>
              <Button onClick={() => setShowNewStockForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau médicament
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Rechercher un médicament..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {stock
                .filter(item => 
                  item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.medicine_code?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-slate-800">{item.medicine_name}</p>
                            <p className="text-sm text-slate-500">{item.medicine_code || item.barcode} • {item.category}</p>
                          </div>
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Stock</p>
                            <p className="font-medium">{item.quantity_available}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Prix vente</p>
                            <p className="font-medium">{item.sale_price} DH</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Expiration</p>
                            <p className="font-medium">{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString('fr-FR') : 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Emplacement</p>
                            <p className="font-medium">{item.location || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'stock-entries' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Entrées de stock</span>
              <Button onClick={() => setShowStockEntryForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle entrée
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <Truck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune entrée de stock enregistrée</p>
              <p className="text-sm mt-2">Les entrées de stock apparaîtront ici</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertes de stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stock
                  .filter(item => item.quantity_available <= item.minimum_threshold)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-slate-800">{item.medicine_name}</p>
                          <p className="text-sm text-slate-500">Stock: {item.quantity_available} (min: {item.minimum_threshold})</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        Commander
                      </Button>
                    </div>
                  ))}
                {stock.filter(item => item.quantity_available <= item.minimum_threshold).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                    <p>Aucune alerte de stock</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produits expirés ou bientôt expirés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stock
                  .filter(item => item.expiration_date && new Date(item.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                  .map((item) => {
                    const isExpired = new Date(item.expiration_date) < new Date();
                    return (
                      <div key={item.id} className={cn(
                        'flex items-center justify-between p-4 rounded-xl border',
                        isExpired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                      )}>
                        <div className="flex items-center gap-3">
                          <AlertCircle className={cn('w-5 h-5', isExpired ? 'text-red-600' : 'text-orange-600')} />
                          <div>
                            <p className="font-medium text-slate-800">{item.medicine_name}</p>
                            <p className="text-sm text-slate-500">
                              Expiration: {new Date(item.expiration_date).toLocaleDateString('fr-FR')}
                              {isExpired && ' (EXPIRÉ)'}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Retirer
                        </Button>
                      </div>
                    );
                  })}
                {stock.filter(item => item.expiration_date && new Date(item.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                    <p>Aucun produit expiré ou proche de l'expiration</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Historique Pharmacie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucune opération enregistrée</p>
              <p className="text-sm mt-2">L'historique des ventes, entrées et ajustements apparaîtra ici</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
