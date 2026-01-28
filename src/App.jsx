import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query 
} from "firebase/firestore";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  Wallet, Users, User, PiggyBank, TrendingUp, Plus, Trash2, X, Tag, Banknote, Calculator, Percent, Divide, Loader2, AlertTriangle
} from 'lucide-react';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBIl0NMf2q9ld4Abi2ZiL0OIkMjDhtlzik",
  authDomain: "suivi-budget-53bfa.firebaseapp.com",
  projectId: "suivi-budget-53bfa",
  storageBucket: "suivi-budget-53bfa.firebasestorage.app",
  messagingSenderId: "776847296376",
  appId: "1:776847296376:web:dca45b35c8c83c993a6a8d"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Couleurs Graphiques ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff6b6b'];

// --- Composants UI ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

const StatCard = ({ title, valueMonthly, valueAnnual, icon: Icon, color, textColor }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className={`text-2xl font-bold ${textColor || 'text-slate-900'}`}>{(valueMonthly || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</h3>
          <span className="text-xs text-slate-400">/mois</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-sm font-medium text-slate-600">{(valueAnnual || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
          <span className="text-xs text-slate-400">/an</span>
        </div>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </Card>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex justify-between items-end">
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// --- Composant Modal d'Ajout ---
const AddEntryModal = ({ isOpen, onClose, type, categories, onAdd }) => {
  const [formData, setFormData] = useState({
    owner: 'Romain', label: '', category: '', newCategory: '', monthly: '', annual: '', source: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({ owner: 'Romain', label: '', category: '', newCategory: '', monthly: '', annual: '', source: '' });
    }
  }, [isOpen]);

  const handleMonthlyChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, monthly: val, annual: val ? (parseFloat(val) * 12).toFixed(2) : '' });
  };

  const handleAnnualChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, annual: val, monthly: val ? (parseFloat(val) / 12).toFixed(2) : '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalCategory = formData.category === 'NEW' ? formData.newCategory : formData.category;
    
    if ((type === 'Individuel' || type === 'Commun') && !formData.label) return;
    if (!finalCategory || !formData.monthly) return;

    onAdd({
      owner: formData.owner,
      label: formData.label, 
      category: finalCategory,
      monthly: parseFloat(formData.monthly),
      annual: parseFloat(formData.annual),
      source: formData.source
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Ajouter : {type}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(type === 'Individuel' || type === 'Épargne' || type === 'Revenus') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Personne</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['Romain', 'Hélène'].map(p => (
                  <button type="button" key={p} onClick={() => setFormData({...formData, owner: p})}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.owner === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(type === 'Individuel' || type === 'Commun') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label>
              <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="Ex: Loyer, Course..." required autoFocus />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{type === 'Revenus' ? 'Type de revenu' : 'Catégorie'}</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required>
              <option value="">Sélectionner...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="NEW">+ Créer une nouvelle...</option>
            </select>
          </div>

          {formData.category === 'NEW' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la nouvelle catégorie</label>
              <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.newCategory} onChange={(e) => setFormData({...formData, newCategory: e.target.value})} required />
            </div>
          )}

          {type === 'Épargne' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provenance (Virement depuis)</label>
              <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} placeholder="Ex: Compte Joint, HelloBank..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant Mensuel</label>
              <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.monthly} onChange={handleMonthlyChange} placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Montant Annuel</label>
              <input type="number" step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                value={formData.annual} onChange={handleAnnualChange} placeholder="0.00" />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Plus size={18} /> Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Application Principale ---

export default function BudgetApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [distributionMethod, setDistributionMethod] = useState('50/50');
  
  // États de données (récupérés de Firebase)
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); 

  // --- Connexion Firebase ---
  useEffect(() => {
    const q = query(collection(db, "budget_entries"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError("Erreur de chargement des données.");
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Dérivation des données ---
  const individualExpenses = useMemo(() => expenses.filter(e => e.type === 'Individuel'), [expenses]);
  const commonExpenses = useMemo(() => expenses.filter(e => e.type === 'Commun'), [expenses]);
  const savings = useMemo(() => expenses.filter(e => e.type === 'Épargne'), [expenses]);
  const incomes = useMemo(() => expenses.filter(e => e.type === 'Revenus'), [expenses]);

  // --- Catégories dynamiques ---
  const individualCategories = useMemo(() => [...new Set(individualExpenses.map(i => i.category))].sort(), [individualExpenses]);
  const commonCategories = useMemo(() => [...new Set(commonExpenses.map(i => i.category))].sort(), [commonExpenses]);
  const savingsCategories = useMemo(() => [...new Set(savings.map(i => i.category))].sort(), [savings]);
  const incomeCategories = useMemo(() => {
    const existing = [...new Set(incomes.map(i => i.category))].sort();
    const defaults = ['Salaire', 'Aides sociales', 'Revenus immobilier', 'Autres'];
    return [...new Set([...defaults, ...existing])];
  }, [incomes]);

  const handleAddClick = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  const handleAddSubmit = async (data) => {
    try {
      // Ajout du champ 'type' pour le tri ultérieur
      await addDoc(collection(db, "budget_entries"), { ...data, type: modalType });
    } catch (e) {
      console.error("Erreur ajout:", e);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Supprimer cette entrée ?")) {
      try {
        await deleteDoc(doc(db, "budget_entries", id));
      } catch (e) {
        console.error("Erreur suppression:", e);
      }
    }
  };

  // --- Calculs Totaux ---

  const totals = useMemo(() => {
    const sum = (arr, key) => arr.reduce((acc, curr) => acc + curr[key], 0);

    const romainMonthly = sum(individualExpenses.filter(i => i.owner === 'Romain'), 'monthly');
    const heleneMonthly = sum(individualExpenses.filter(i => i.owner === 'Hélène'), 'monthly');
    const commonMonthly = sum(commonExpenses, 'monthly');
    const savingsMonthly = sum(savings, 'monthly');
    const romainSavingsM = sum(savings.filter(s => s.owner === 'Romain'), 'monthly');
    const heleneSavingsM = sum(savings.filter(s => s.owner === 'Hélène'), 'monthly');
    const romainSavingsA = sum(savings.filter(s => s.owner === 'Romain'), 'annual');
    const heleneSavingsA = sum(savings.filter(s => s.owner === 'Hélène'), 'annual');
    const romainIncomeM = sum(incomes.filter(i => i.owner === 'Romain'), 'monthly');
    const romainIncomeA = sum(incomes.filter(i => i.owner === 'Romain'), 'annual');
    const heleneIncomeM = sum(incomes.filter(i => i.owner === 'Hélène'), 'monthly');
    const heleneIncomeA = sum(incomes.filter(i => i.owner === 'Hélène'), 'annual');

    return {
      romain: { monthly: romainMonthly, annual: sum(individualExpenses.filter(i => i.owner === 'Romain'), 'annual') },
      helene: { monthly: heleneMonthly, annual: sum(individualExpenses.filter(i => i.owner === 'Hélène'), 'annual') },
      common: { monthly: commonMonthly, annual: sum(commonExpenses, 'annual') },
      savings: { 
        monthly: savingsMonthly, 
        annual: sum(savings, 'annual'),
        romain: { monthly: romainSavingsM, annual: romainSavingsA },
        helene: { monthly: heleneSavingsM, annual: heleneSavingsA }
      },
      income: {
        romain: { monthly: romainIncomeM, annual: romainIncomeA },
        helene: { monthly: heleneIncomeM, annual: heleneIncomeA },
        total: { monthly: romainIncomeM + heleneIncomeM, annual: romainIncomeA + heleneIncomeA }
      }
    };
  }, [individualExpenses, commonExpenses, savings, incomes]);

  const commonCategoryData = useMemo(() => {
    const data = commonExpenses.reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) { existing.value += curr.monthly; } 
      else { acc.push({ name: curr.category, value: curr.monthly }); }
      return acc;
    }, []);
    return data.sort((a, b) => b.value - a.value);
  }, [commonExpenses]);

  // --- Rendu des Vues ---

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-red-600 gap-2"><AlertTriangle /> {error}</div>;

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenus Foyer" valueMonthly={totals.income.total.monthly} valueAnnual={totals.income.total.annual} icon={Banknote} color="bg-emerald-600" textColor="text-emerald-700" />
        <StatCard title="Charges Communes" valueMonthly={totals.common.monthly} valueAnnual={totals.common.annual} icon={Users} color="bg-indigo-500" />
        <StatCard title="Dépenses Fixes Romain" valueMonthly={totals.romain.monthly} valueAnnual={totals.romain.annual} icon={User} color="bg-blue-500" />
        <StatCard title="Dépenses Fixes Hélène" valueMonthly={totals.helene.monthly} valueAnnual={totals.helene.annual} icon={User} color="bg-pink-500" />
        <StatCard title="Épargne Romain" valueMonthly={totals.savings.romain.monthly} valueAnnual={totals.savings.romain.annual} icon={PiggyBank} color="bg-cyan-500" />
        <StatCard title="Épargne Hélène" valueMonthly={totals.savings.helene.monthly} valueAnnual={totals.savings.helene.annual} icon={PiggyBank} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Répartition Mensuelle Globale" subtitle="Où va l'argent chaque mois ?" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                  { name: 'Revenus', montant: totals.income.total.monthly, color: '#059669' }, 
                  { name: '', montant: 0, color: 'transparent' },
                  { name: 'Commun', montant: totals.common.monthly, color: '#6366f1' },
                  { name: 'Dép. Romain', montant: totals.romain.monthly, color: '#3b82f6' },
                  { name: 'Dép. Hélène', montant: totals.helene.monthly, color: '#ec4899' },
                  { name: 'Ep. Romain', montant: totals.savings.romain.monthly, color: '#06b6d4' },
                  { name: 'Ep. Hélène', montant: totals.savings.helene.monthly, color: '#f59e0b' },
                ]} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11}} interval={0} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value}€`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(value) => value > 0 ? `${value.toFixed(2)} €` : ''} />
                <Bar dataKey="montant" radius={[4, 4, 0, 0]} barSize={40}>
                  {[{ color: '#059669' }, { color: 'transparent' }, { color: '#6366f1' }, { color: '#3b82f6' }, { color: '#ec4899' }, { color: '#06b6d4' }, { color: '#f59e0b' }].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Répartition Dépenses Communes" subtitle="Par catégorie" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={commonCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {commonCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <RechartsTooltip formatter={(value) => `${value.toFixed(2)} €`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderIncome = () => (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => handleAddClick('Revenus')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={16} /> Ajouter un revenu
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['Romain', 'Hélène'].map((person) => {
          const data = incomes.filter(i => i.owner === person);
          const totalM = totals.income[person === 'Hélène' ? 'helene' : 'romain']?.monthly || 0;
          return (
            <Card key={person}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${person === 'Romain' ? 'text-blue-600' : 'text-pink-600'}`}>{person}</h3>
                <div className="text-right"><span className="block text-xl font-bold text-emerald-600">+{totalM.toFixed(2)} € <span className="text-xs font-normal text-gray-500">/mois</span></span></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-emerald-50 text-emerald-800">
                    <tr>
                      <th className="px-3 py-2 rounded-l-lg">Type</th>
                      <th className="px-3 py-2 text-right">Mensuel</th>
                      <th className="px-3 py-2 text-right">Annuel</th>
                      <th className="px-3 py-2 rounded-r-lg"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-4 text-slate-400 italic">Aucun revenu</td></tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-slate-700">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700"><Tag size={10} className="mr-1" />{item.category}</span>
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-600 font-medium">+{item.monthly.toFixed(2)} €</td>
                          <td className="px-3 py-3 text-right text-slate-500">{item.annual.toFixed(2)} €</td>
                          <td className="px-3 py-3 text-right">
                            <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderIndividual = () => (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => handleAddClick('Individuel')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus size={16} /> Ajouter une dépense individuelle
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['Romain', 'Hélène'].map((person) => {
          const data = individualExpenses.filter(i => i.owner === person);
          const totalM = totals[person === 'Hélène' ? 'helene' : 'romain']?.monthly || 0;
          return (
            <Card key={person}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${person === 'Romain' ? 'text-blue-600' : 'text-pink-600'}`}>{person}</h3>
                <div className="text-right"><span className="block text-xl font-bold">{totalM.toFixed(2)} € <span className="text-xs font-normal text-gray-500">/mois</span></span></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 rounded-l-lg">Libellé</th>
                      <th className="px-3 py-2">Catégorie</th>
                      <th className="px-3 py-2 text-right">Mensuel</th>
                      <th className="px-3 py-2 text-right">Annuel</th>
                      <th className="px-3 py-2 rounded-r-lg"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-4 text-slate-400 italic">Aucune dépense</td></tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-slate-700">{item.label}</td>
                          <td className="px-3 py-3 text-slate-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800"><Tag size={10} className="mr-1" />{item.category}</span>
                          </td>
                          <td className="px-3 py-3 text-right">{item.monthly.toFixed(2)} €</td>
                          <td className="px-3 py-3 text-right text-slate-500">{item.annual.toFixed(2)} €</td>
                          <td className="px-3 py-3 text-right">
                            <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderCommon = () => {
    const totalCommonMonthly = totals.common.monthly || 1;

    return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
           <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Dépenses Communes</h2>
                <button onClick={() => { setModalType('Commun'); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Plus size={18} /> Ajouter
                </button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500">
                 <tr>
                    <th className="px-4 py-3 rounded-l-lg">Libellé</th>
                    <th className="px-4 py-3">Catégorie</th>
                    <th className="px-4 py-3 text-right">Mensuel</th>
                    <th className="px-4 py-3 text-right">Annuel</th>
                    <th className="px-4 py-3 text-right">Part (%)</th>
                    <th className="px-4 py-3 rounded-r-lg"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {commonExpenses.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400 italic">Aucune dépense commune</td></tr>
                 ) : (
                    commonExpenses.map((item) => {
                        const percent = (item.monthly / totalCommonMonthly) * 100;
                        return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-700">{item.label}</td>
                            <td className="px-4 py-3 text-slate-500">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                <Tag size={10} className="mr-1" />{item.category}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">{item.monthly.toLocaleString()} €</td>
                            <td className="px-4 py-3 text-right text-slate-500">{item.annual.toLocaleString()} €</td>
                            <td className="px-4 py-3 text-right">
                                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                                    {percent.toFixed(1)}%
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                        );
                    })
                 )}
               </tbody>
             </table>
           </div>
        </Card>
      </div>
      <div className="lg:col-span-1">
          <Card className="h-full">
            <SectionHeader title="Répartition" subtitle="% du budget commun" />
            <div className="h-64 mt-8">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie data={commonCategoryData} cx="50%" cy="50%" innerRadius={0} outerRadius={100} dataKey="value">
                        {commonCategoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `${value.toFixed(2)} €`} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {commonCategoryData.map((entry, index) => (
                    <div key={index} className="flex items-center text-xs text-slate-600">
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      {entry.name}
                    </div>
                  ))}
                </div>
            </div>
          </Card>
      </div>
    </div>
  )};

  const renderSavings = () => {
    const totalIncome = totals.income.total.monthly || 1; 
    const romainIncome = totals.income.romain.monthly;
    const heleneIncome = totals.income.helene.monthly;
    
    let romainShare, heleneShare, romainPercent, helenePercent;
    if (distributionMethod === 'prorata') {
      romainPercent = (romainIncome / totalIncome) * 100;
      helenePercent = (heleneIncome / totalIncome) * 100;
      romainShare = totals.common.monthly * (romainIncome / totalIncome);
      heleneShare = totals.common.monthly * (heleneIncome / totalIncome);
    } else {
      romainPercent = 50; helenePercent = 50;
      romainShare = totals.common.monthly * 0.5;
      heleneShare = totals.common.monthly * 0.5;
    }
    const romainCapacity = romainIncome - totals.romain.monthly - romainShare;
    const heleneCapacity = heleneIncome - totals.helene.monthly - heleneShare;

    return (
    <div className="space-y-6">
       <div className="flex justify-end items-center mb-2">
         <div className="bg-white p-1 rounded-lg border border-slate-200 flex text-sm shadow-sm">
           <button onClick={() => setDistributionMethod('50/50')} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 ${distributionMethod === '50/50' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Divide size={14} /> 50/50</button>
           <button onClick={() => setDistributionMethod('prorata')} className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 ${distributionMethod === 'prorata' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Percent size={14} /> Prorata revenus</button>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
             <div className="flex justify-between items-start">
                <div><h3 className="text-lg font-bold text-blue-700 flex items-center gap-2"><Calculator size={20} /> Capacité d'Épargne Romain</h3><p className="text-xs text-blue-400 mt-1">Revenus - Charges Fixes - {romainPercent.toFixed(1)}% Charges Communes</p></div>
                <div className="bg-blue-100 p-2 rounded-lg"><User size={20} className="text-blue-600" /></div>
             </div>
             <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Revenus mensuels</span><span className="font-medium text-emerald-600">+{totals.income.romain.monthly.toFixed(2)} €</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Dépenses fixes persos</span><span className="font-medium text-red-500">-{totals.romain.monthly.toFixed(2)} €</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Quote-part foyer ({romainPercent.toFixed(0)}%)</span><span className="font-medium text-red-500">-{romainShare.toFixed(2)} €</span></div>
                <div className="h-px bg-blue-200 my-2"></div>
                <div className="flex justify-between items-end"><span className="font-bold text-slate-700">Capacité Théorique</span><span className={`text-2xl font-bold ${romainCapacity >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{romainCapacity.toFixed(2)} €</span></div>
                 <div className="flex justify-between text-xs mt-1 pt-1 border-t border-dashed border-blue-200"><span className="text-slate-400">Épargne actuelle réelle</span><span className="font-medium text-slate-600">{totals.savings.romain.monthly.toFixed(2)} €</span></div>
             </div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-white border-pink-100">
             <div className="flex justify-between items-start">
                <div><h3 className="text-lg font-bold text-pink-700 flex items-center gap-2"><Calculator size={20} /> Capacité d'Épargne Hélène</h3><p className="text-xs text-pink-400 mt-1">Revenus - Charges Fixes - {helenePercent.toFixed(1)}% Charges Communes</p></div>
                <div className="bg-pink-100 p-2 rounded-lg"><User size={20} className="text-pink-600" /></div>
             </div>
             <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Revenus mensuels</span><span className="font-medium text-emerald-600">+{totals.income.helene.monthly.toFixed(2)} €</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Dépenses fixes persos</span><span className="font-medium text-red-500">-{totals.helene.monthly.toFixed(2)} €</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Quote-part foyer ({helenePercent.toFixed(0)}%)</span><span className="font-medium text-red-500">-{heleneShare.toFixed(2)} €</span></div>
                <div className="h-px bg-pink-200 my-2"></div>
                <div className="flex justify-between items-end"><span className="font-bold text-slate-700">Capacité Théorique</span><span className={`text-2xl font-bold ${heleneCapacity >= 0 ? 'text-pink-700' : 'text-red-600'}`}>{heleneCapacity.toFixed(2)} €</span></div>
                <div className="flex justify-between text-xs mt-1 pt-1 border-t border-dashed border-pink-200"><span className="text-slate-400">Épargne actuelle réelle</span><span className="font-medium text-slate-600">{totals.savings.helene.monthly.toFixed(2)} €</span></div>
             </div>
          </Card>
       </div>

       <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div><h2 className="text-xl font-bold text-slate-800">Gestion de l'Épargne</h2><p className="text-sm text-slate-500">Total Foyer</p></div>
          <div className="flex gap-6">
             <div className="text-right"><span className="text-sm text-slate-500">Mensuel</span><p className="text-2xl font-bold text-emerald-600">{totals.savings.monthly.toFixed(2)} €</p></div>
             <div className="text-right border-l pl-6 border-slate-200"><span className="text-sm text-slate-500">Annuel</span><p className="text-2xl font-bold text-emerald-800">{totals.savings.annual.toLocaleString()} €</p></div>
             <button onClick={() => handleAddClick('Épargne')} className="ml-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm self-center"><Plus size={16} /> Ajouter</button>
          </div>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {['Romain', 'Hélène'].map((person) => {
            const personData = savings.filter(s => s.owner === person);
            const personTotalM = personData.reduce((acc, curr) => acc + curr.monthly, 0);
            return (
              <Card key={person}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold ${person === 'Romain' ? 'text-blue-600' : 'text-pink-600'}`}>{person}</h3>
                  <div className="text-right"><span className="block text-xl font-bold text-emerald-600">{personTotalM.toFixed(2)} € <span className="text-xs font-normal text-gray-500">/mois</span></span></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className={`${person === 'Romain' ? 'bg-blue-50' : 'bg-pink-50'} text-slate-600`}>
                      <tr>
                        <th className="px-3 py-2 rounded-l-lg">Poste</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2 text-right">Mensuel</th>
                        <th className="px-3 py-2 rounded-r-lg"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {personData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-4 text-slate-400 italic">Aucune épargne</td></tr>
                      ) : (
                        personData.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-3 py-3 font-medium text-slate-700">{item.category}</td>
                            <td className="px-3 py-3 text-slate-500 text-xs">{item.source}</td>
                            <td className="px-3 py-3 text-right font-medium">{item.monthly.toLocaleString()} €</td>
                            <td className="px-3 py-3 text-right"><button onClick={() => deleteItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
         })}
       </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div><h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-8 h-8 text-blue-600" /> Suivi Budget & Épargne</h1><p className="text-slate-500 mt-1">Tableau de bord financier foyer</p></div>
          <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-200">
            {[{ id: 'dashboard', label: 'Vue d\'ensemble', icon: TrendingUp }, { id: 'income', label: 'Revenus', icon: Banknote }, { id: 'individual', label: 'Individuel', icon: User }, { id: 'common', label: 'Foyer', icon: Users }, { id: 'savings', label: 'Épargne', icon: PiggyBank }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                <tab.icon size={16} /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="animate-in fade-in duration-300">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'income' && renderIncome()}
          {activeTab === 'individual' && renderIndividual()}
          {activeTab === 'common' && renderCommon()}
          {activeTab === 'savings' && renderSavings()}
        </div>
      </div>
      <AddEntryModal isOpen={modalOpen} onClose={() => setModalOpen(false)} type={modalType}
        categories={modalType === 'Individuel' ? individualCategories : modalType === 'Commun' ? commonCategories : modalType === 'Revenus' ? incomeCategories : savingsCategories} onAdd={handleAddSubmit} />
    </div>
  );
}
