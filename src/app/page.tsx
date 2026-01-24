"use client";

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Layers, CheckSquare, Square, Plus, Minus, Wallet, Trash2, PenTool, X, ChevronDown, ChevronRight } from 'lucide-react';
import CardGroup from '@/components/CardGroup'; 
import cardRawData from '@/src/data/cards.json'; 

// --- TYPES ---
interface FlatCard {
  card_code: string;
  set: string;
  variant_name: string;
  rarity: string;
  price_jpy: number;
  image_url: string;
  finish: string;
  is_high_demand: boolean;
  unique_id: string;
  base_name?: string;
  name?: string;
  is_custom?: boolean;
  // FIX: Added missing properties to prevent Typescript errors
  qty?: number;
  subtotal?: number;
}

type Portfolio = Record<string, number>;

// Cast data safely
const flatCardData = (cardRawData as unknown as FlatCard[]) ?? [];

// CONFIGURATION
const JPY_TO_PHP_RATE = 0.35  ;

const RARITY_KEYS = [
  "P-SEC", "SP", "SEC", "P-SR", "SR", "P-R", "R", "P-L", "L", "P-UC", "P-C", "OTHERS"
];

const RARITY_HEADERS: Record<string, string> = {
  "P-SEC": "SEC PARALLEL",
  "SP": "SPECIAL / MANGA",
  "SEC": "SECRET RARE",
  "P-SR": "SR PARALLEL",
  "SR": "SUPER RARE",
  "P-R": "RARE PARALLEL",
  "R": "RARE",
  "P-L": "LEADER PARALLEL",
  "L": "LEADER", 
  "P-UC": "UNCOMMON PARALLEL", 
  "P-C": "COMMON PARALLEL",     
  "OTHERS": "PROMOS & OTHERS"
};

const SET_CATEGORIES = {
    "Boosters": ["OP"],
    "Extra/Premium": ["EB", "PRB"],
    "Starters": ["ST"],
    "Promos": ["P"]
};

const getRarityBucket = (rarity: string) => {
  const r = (rarity || "").toUpperCase();
  if (r === "P-SEC") return "P-SEC";
  if (r.includes("SP") || r.includes("MANGA") || r.includes("COMIC") || r.includes("SUPER")) return "SP";
  if (r === "P-SR") return "P-SR";
  if (r === "P-R") return "P-R";
  if (r === "P-L") return "P-L";
  if (r === "P-UC") return "P-UC";
  if (r === "P-C") return "P-C";
  if (r === "SEC") return "SEC";
  if (r === "SR") return "SR";
  if (r === "R") return "R";
  if (r === "UC") return "OTHERS";
  if (r === "C") return "OTHERS";
  if (r === "L" || r.includes("LEADER")) return "L";
  return "OTHERS";
};

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'collection'>('market');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSet, setSelectedSet] = useState('All');
  const [activeRarities, setActiveRarities] = useState<Set<string>>(new Set(RARITY_KEYS));
  
  const [portfolio, setPortfolio] = useState<Portfolio>({});
  const [customCards, setCustomCards] = useState<FlatCard[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
      "Boosters": true, "Extra/Premium": true, "Starters": false, "Promos": false
  });

  const [newCard, setNewCard] = useState<Partial<FlatCard>>({
    set: "OP01", rarity: "P-SEC", price_jpy: 0, finish: "Foil"
  });

  // FIX: Added dependency array [] to stop the infinite loop error
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedPort = localStorage.getItem('user_portfolio');
      if (savedPort) try { setPortfolio(JSON.parse(savedPort)); } catch {}
      
      const savedCustom = localStorage.getItem('user_custom_cards');
      if (savedCustom) try { setCustomCards(JSON.parse(savedCustom)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (isClient) localStorage.setItem('user_portfolio', JSON.stringify(portfolio));
  }, [portfolio, isClient]);

  useEffect(() => {
    if (isClient) localStorage.setItem('user_custom_cards', JSON.stringify(customCards));
  }, [customCards, isClient]);

  // --- ACTIONS ---
  const addToCollection = (id: string) => {
    setPortfolio(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCollection = (id: string) => {
    setPortfolio(prev => {
      const next = { ...prev };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  };

  const clearCollection = () => {
    if (confirm("Reset your portfolio?")) setPortfolio({});
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.card_code || !newCard.base_name) return;

    const createdCard: FlatCard = {
        card_code: newCard.card_code.toUpperCase(),
        set: newCard.set?.toUpperCase() || "PROMO",
        variant_name: newCard.variant_name || "Manual Entry",
        rarity: newCard.rarity || "P-SEC",
        price_jpy: Number(newCard.price_jpy) || 0,
        image_url: newCard.image_url || "https://placehold.co/400x560/png?text=No+Image",
        finish: newCard.finish || "Foil",
        is_high_demand: true,
        base_name: newCard.base_name,
        name: newCard.base_name,
        unique_id: `${newCard.card_code}-CUSTOM-${Date.now()}`,
        is_custom: true
    };

    setCustomCards([...customCards, createdCard]);
    setIsModalOpen(false);
    setNewCard({ set: "OP01", rarity: "P-SEC", price_jpy: 0, finish: "Foil" });
  };

  const deleteCustomCard = (id: string) => {
      if(confirm("Delete this custom card?")) {
          setCustomCards(prev => prev.filter(c => c.unique_id !== id));
      }
  }

  const toggleCategory = (cat: string) => {
      setExpandedCategories(prev => ({...prev, [cat]: !prev[cat]}));
  };

  const toggleRarity = (key: string) => {
    const next = new Set(activeRarities);
    if (next.has(key)) next.delete(key); else next.add(key);
    setActiveRarities(next);
  };

  // --- DATA PROCESSING ---
  const allCards = useMemo(() => [...customCards, ...flatCardData], [customCards]);

  const organizedSets = useMemo(() => {
      const uniqueSets = Array.from(new Set(allCards.map(c => c.set))).sort();
      const grouped: Record<string, string[]> = { "Others": [] };
      Object.keys(SET_CATEGORIES).forEach(k => grouped[k] = []);

      uniqueSets.forEach(setId => {
          let placed = false;
          for (const [cat, prefixes] of Object.entries(SET_CATEGORIES)) {
              if (prefixes.some(p => setId.startsWith(p))) {
                  grouped[cat].push(setId);
                  placed = true;
                  break;
              }
          }
          if (!placed) grouped["Others"].push(setId);
      });
      return grouped;
  }, [allCards]);

  const filteredCards = useMemo(() => {
    const seen = new Set<string>();
    return allCards.filter((card) => {
      if (!card.is_custom && (card.rarity === "C" || card.rarity === "UC")) return false;
      if (selectedSet !== 'All' && card.set !== selectedSet) return false;

      const dedupKey = `${card.card_code}-${card.price_jpy}-${card.rarity}`;
      if (seen.has(dedupKey) && !card.is_custom) return false; 
      seen.add(dedupKey);

      const searchLower = searchTerm.toLowerCase();
      const code = (card.card_code || '').toLowerCase();
      const name = (card.variant_name || '').toLowerCase();
      const base = (card.base_name || '').toLowerCase();
      
      const matchesSearch = !searchTerm || code.includes(searchLower) || name.includes(searchLower) || base.includes(searchLower);
      if (!matchesSearch) return false;

      const bucket = getRarityBucket(card.rarity);
      if (!activeRarities.has(bucket)) return false;

      return true;
    });
  }, [allCards, searchTerm, selectedSet, activeRarities]);

  const groupedByRarity = useMemo(() => {
    const groups: Record<string, FlatCard[]> = {};
    RARITY_KEYS.forEach(k => groups[k] = []);

    filteredCards.forEach(card => {
        const bucket = getRarityBucket(card.rarity);
        if (groups[bucket]) groups[bucket].push(card);
        else {
            if (!groups["OTHERS"]) groups["OTHERS"] = [];
            groups["OTHERS"].push(card);
        }
    });
    return groups;
  }, [filteredCards]);

  const portfolioStats = useMemo(() => {
    let totalCards = 0;
    let totalValueYen = 0;
    const priceMap = new Map(allCards.map(c => [c.unique_id, c.price_jpy]));

    Object.entries(portfolio).forEach(([id, qty]) => {
        totalCards += qty;
        totalValueYen += (priceMap.get(id) || 0) * qty;
    });
    
    return { 
        totalCards, 
        totalValuePhp: Math.ceil(totalValueYen * JPY_TO_PHP_RATE) 
    };
  }, [portfolio, allCards]);

  const groupedPortfolio = useMemo(() => {
      const ids = Object.keys(portfolio);
      const collectionList = allCards.filter(c => ids.includes(c.unique_id)).map(c => ({
          ...c,
          qty: portfolio[c.unique_id],
          subtotal: Math.ceil(c.price_jpy * JPY_TO_PHP_RATE) * portfolio[c.unique_id]
      }));

      const groups: Record<string, FlatCard[]> = {};
      RARITY_KEYS.forEach(k => groups[k] = []);

      collectionList.forEach(card => {
          const bucket = getRarityBucket(card.rarity);
          if (groups[bucket]) groups[bucket].push(card);
          else {
              if (!groups["OTHERS"]) groups["OTHERS"] = [];
              groups["OTHERS"].push(card);
          }
      });
      return groups;
  }, [portfolio, allCards]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-16">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex justify-between items-center">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2.5">
                    <Layers className="text-indigo-600" size={22} />
                    <h1 className="text-xl font-bold text-slate-900">
                      OPTCG <span className="text-indigo-600">PH Hub</span>
                    </h1>
                </div>
                <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    <button 
                      onClick={() => setActiveTab('market')} 
                      className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                        activeTab === 'market' 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Market
                    </button>
                    <button 
                      onClick={() => setActiveTab('collection')} 
                      className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                        activeTab === 'collection' 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Collection 
                      {portfolioStats.totalCards > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                          {portfolioStats.totalCards}
                        </span>
                      )}
                    </button>
                </nav>
            </div>
            <div className="hidden md:flex items-center gap-5">
                <div className="text-right pr-5 border-r border-slate-200">
                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Portfolio Value</div>
                    <div className="font-semibold text-lg text-slate-900">₱{portfolioStats.totalValuePhp.toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <PenTool size={14} /> Add Missing
                </button>
            </div>
        </div>
      </header>

      {/* --- MARKET TAB --- */}
      {activeTab === 'market' && (
        <div className="max-w-[1800px] mx-auto p-6 flex flex-col md:flex-row gap-6 mt-4">
            <aside className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2.5 tracking-wide">Search</h3>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Name, Code, or Rarity..." 
                          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white transition-colors" 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-200 bg-slate-50">
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Sets</h3>
                    </div>
                    <div className="flex flex-col h-[40vh] overflow-y-auto custom-scrollbar">
                        <button 
                          onClick={() => setSelectedSet('All')} 
                          className={`text-left px-4 py-2.5 text-sm font-medium border-b border-slate-100 transition-colors ${
                            selectedSet === 'All' 
                              ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-600 font-semibold' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          All Sets
                        </button>
                        {Object.entries(organizedSets).map(([category, sets]) => {
                            if (sets.length === 0) return null;
                            const isExpanded = expandedCategories[category];
                            return (
                                <div key={category} className="border-b border-slate-100">
                                    <button 
                                      onClick={() => toggleCategory(category)} 
                                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 uppercase transition-colors"
                                    >
                                      {category} {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    {isExpanded && (
                                        <div className="bg-white flex flex-col">
                                            {sets.map(set => (
                                                <button 
                                                  key={set} 
                                                  onClick={() => setSelectedSet(set)} 
                                                  className={`text-left px-8 py-2 text-sm border-l-4 transition-colors ${
                                                    selectedSet === set 
                                                      ? 'border-l-indigo-500 bg-indigo-50 text-indigo-700 font-semibold' 
                                                      : 'border-l-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {set}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-700 uppercase mb-3 tracking-wide flex items-center gap-2">
                      <Filter size={13} /> Rarity
                    </h3>
                    <div className="flex flex-col gap-1.5 h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                        {RARITY_KEYS.map((key) => {
                            const isActive = activeRarities.has(key);
                            return (
                                <button 
                                  key={key} 
                                  onClick={() => toggleRarity(key)} 
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                                    isActive 
                                      ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                                      : 'text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                    {isActive ? (
                                      <CheckSquare size={16} className="text-indigo-600" />
                                    ) : (
                                      <Square size={16} className="text-slate-300" />
                                    )}
                                    {RARITY_HEADERS[key] || key}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </aside>
            <section className="flex-1 min-w-0">
               {filteredCards.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-96 text-slate-400 bg-white rounded-lg border border-slate-200">
                      <Layers size={48} className="mb-3 opacity-40 text-slate-400" />
                      <p className="text-base font-medium text-slate-600">No cards found</p>
                      <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
                   </div>
               ) : (
                   <div className="flex flex-col gap-12">
                      {RARITY_KEYS.map((rarityKey) => {
                          const cards = groupedByRarity[rarityKey];
                          if (!cards || cards.length === 0) return null;
                          return (
                            <div key={rarityKey}>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{RARITY_HEADERS[rarityKey] || rarityKey}</h2>
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                                      {cards.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-stretch">
                                    {cards.map((flatCard) => {
                                        const qty = portfolio[flatCard.unique_id] || 0;
                                        return (
                                            <div key={flatCard.unique_id} className="relative group flex h-full">
                                                <div className="absolute top-2 right-2 z-30 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                      onClick={() => addToCollection(flatCard.unique_id)} 
                                                      className="w-8 h-8 bg-indigo-600 text-white rounded-md shadow-md flex items-center justify-center hover:bg-indigo-700 transition-colors"
                                                    >
                                                      <Plus size={16} />
                                                    </button>
                                                    {qty > 0 && (
                                                      <button 
                                                        onClick={() => removeFromCollection(flatCard.unique_id)} 
                                                        className="w-8 h-8 bg-white text-red-600 border border-red-200 rounded-md shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                                                      >
                                                        <Minus size={16} />
                                                      </button>
                                                    )}
                                                    {flatCard.is_custom && (
                                                      <button 
                                                        onClick={() => deleteCustomCard(flatCard.unique_id)} 
                                                        className="w-8 h-8 bg-slate-700 text-white rounded-md shadow-md flex items-center justify-center hover:bg-slate-800 transition-colors"
                                                      >
                                                        <X size={14} />
                                                      </button>
                                                    )}
                                                </div>
                                                {qty > 0 && (
                                                  <div className="absolute top-2 left-2 z-30 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded shadow-md flex items-center gap-1">
                                                    <CheckSquare size={10} /> {qty}
                                                  </div>
                                                )}
                                                <div className={`flex-1 ${qty > 0 ? 'ring-2 ring-green-500/30 rounded-lg' : ''}`}>
                                                    <CardGroup card={{ card_code: flatCard.card_code, base_name: flatCard.base_name || flatCard.name || flatCard.card_code, set: flatCard.set, variants: [{ variant_id: flatCard.unique_id, variant_name: flatCard.variant_name, rarity: flatCard.rarity, finish: flatCard.finish, image_url: flatCard.image_url, price_jpy: flatCard.price_jpy, isHighDemand: flatCard.is_high_demand }] }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                          );
                      })}
                   </div>
               )}
            </section>
        </div>
      )}

      {/* --- COLLECTION TAB --- */}
      {activeTab === 'collection' && (
          <div className="max-w-[1400px] mx-auto p-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-indigo-600 rounded-lg p-6 text-white shadow-sm">
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 text-indigo-100">Total Value</h3>
                      <div className="text-3xl font-bold">
                        ₱{portfolioStats.totalValuePhp.toLocaleString()}
                      </div>
                      <p className="text-xs text-indigo-100 mt-1">Market Value</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Total Cards</h3>
                      <div className="text-3xl font-bold text-slate-900">{portfolioStats.totalCards}</div>
                      <p className="text-xs text-slate-500 mt-1">In Collection</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Actions</h3>
                      <button 
                        onClick={clearCollection} 
                        className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-2 border border-red-200 px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} /> Reset
                      </button>
                  </div>
              </div>

              {portfolioStats.totalCards === 0 ? (
                  <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
                      <Wallet size={48} className="mx-auto text-slate-300 mb-4" />
                      <h2 className="text-xl font-semibold text-slate-700 mb-2">Your collection is empty</h2>
                      <p className="text-sm text-slate-500 mb-6">Go to the Market tab to start adding cards!</p>
                      <button 
                        onClick={() => setActiveTab('market')} 
                        className="bg-indigo-600 text-white px-6 py-2.5 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Browse Market
                      </button>
                  </div>
              ) : (
                  <div className="flex flex-col gap-12">
                      {RARITY_KEYS.map((rarityKey) => {
                          const cards = groupedPortfolio[rarityKey];
                          if (!cards || cards.length === 0) return null;
                          return (
                            <div key={rarityKey}>
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{RARITY_HEADERS[rarityKey] || rarityKey}</h2>
                                    <div className="h-px flex-1 bg-slate-200"></div>
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                                      {cards.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 items-stretch">
                                    {cards.map((card) => {
                                        const highResUrl = card.image_url?.replace(/\/\d+_\d+\//, '/400_560/') || 'https://placehold.co/400x560/png?text=No+Image';
                                        const originalUrl = card.image_url || 'https://placehold.co/400x560/png?text=No+Image';
                                        return (
                                        <div key={card.unique_id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
                                            <div className="relative aspect-[2.5/3.5] bg-slate-50 p-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img 
                                                  src={highResUrl} 
                                                  className="w-full h-full object-contain" 
                                                  alt={card.name || card.card_code}
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== originalUrl && originalUrl !== highResUrl) {
                                                      target.src = originalUrl;
                                                    } else {
                                                      target.src = 'https://placehold.co/400x560/png?text=No+Image';
                                                    }
                                                  }}
                                                />
                                                <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded shadow-sm">
                                                  x{card.qty}
                                                </div>
                                            </div>
                                            <div className="p-3 flex flex-col flex-grow justify-between min-h-[140px]">
                                                <div className="min-h-[50px]">
                                                    <div className="text-xs font-medium text-slate-400 mb-1 font-mono">{card.card_code}</div>
                                                    <div className="font-semibold text-slate-800 text-sm line-clamp-2 mb-2 leading-snug">{card.variant_name}</div>
                                                </div>
                                                <div className="flex flex-col gap-2 mt-auto">
                                                    <div className="flex justify-between items-center border-t border-slate-100 pt-2 min-h-[24px]">
                                                        <div className="text-xs text-slate-500">Unit: ₱{Math.ceil(card.price_jpy * JPY_TO_PHP_RATE).toLocaleString()}</div>
                                                        <div className="text-sm font-bold text-indigo-600 truncate max-w-[50%] text-right">₱{card.subtotal?.toLocaleString()}</div>
                                                    </div>
                                                    <div className="flex gap-2 mt-3">
                                                        <button 
                                                          onClick={() => removeFromCollection(card.unique_id)} 
                                                          className="flex-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 py-2 rounded-md text-xs font-semibold transition-colors"
                                                        >
                                                          <Minus size={14} className="mx-auto" />
                                                        </button>
                                                        <button 
                                                          onClick={() => addToCollection(card.unique_id)} 
                                                          className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-md text-xs font-semibold transition-colors"
                                                        >
                                                          <Plus size={14} className="mx-auto" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              )}
          </div>
      )}

      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setIsModalOpen(false)}>
              <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 border border-slate-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Add Custom Card</h2>
                        <p className="text-sm text-slate-500">Manually add a card that wasn&apos;t scraped.</p>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <X size={18} />
                      </button>
                  </div>
                  <form onSubmit={handleCreateCard} className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Card Code</label>
                            <input 
                              required 
                              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-colors" 
                              placeholder="e.g. OP01-120" 
                              value={newCard.card_code || ""} 
                              onChange={e => setNewCard({...newCard, card_code: e.target.value})} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Card Name</label>
                            <input 
                              required 
                              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-colors" 
                              placeholder="e.g. Shanks" 
                              value={newCard.base_name || ""} 
                              onChange={e => setNewCard({...newCard, base_name: e.target.value})} 
                            />
                          </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Set</label>
                            <input 
                              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-colors" 
                              placeholder="e.g. OP01" 
                              value={newCard.set || ""} 
                              onChange={e => setNewCard({...newCard, set: e.target.value})} 
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price (JPY)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-400 text-sm">¥</span>
                              <input 
                                type="number" 
                                className="w-full border border-slate-200 rounded-md pl-8 pr-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono bg-white transition-colors" 
                                value={newCard.price_jpy || ""} 
                                onChange={e => setNewCard({...newCard, price_jpy: Number(e.target.value)})} 
                              />
                            </div>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rarity</label>
                          <select 
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                            value={newCard.rarity} 
                            onChange={e => setNewCard({...newCard, rarity: e.target.value})}
                          >
                            {Object.keys(RARITY_HEADERS).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Variant</label>
                          <input 
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition-colors" 
                            placeholder="e.g. Parallel" 
                            value={newCard.variant_name || ""} 
                            onChange={e => setNewCard({...newCard, variant_name: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Image URL</label>
                        <input 
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-slate-600 bg-white transition-colors" 
                          placeholder="https://..." 
                          value={newCard.image_url || ""} 
                          onChange={e => setNewCard({...newCard, image_url: e.target.value})} 
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-md transition-colors"
                      >
                        Save Card
                      </button>
                  </form>
              </div>
          </div>
      )}
    </main>
  );
}