"use client";

import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Layers, CheckSquare, Square, Plus, Minus, Wallet, Trash2, PenTool, X, ChevronDown, ChevronRight } from 'lucide-react';
import CardGroup from '@/src/components/CardGroup';
import cardRawData from '@/src/data/cards.json';

// --- TYPES ---
interface FlatCard {
  card_code: string;
  set: string;
  variant_name: string;
  rarity: string;
  price_jpy: number;
  image_url: string;
  official_image_url?: string;
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
const JPY_TO_PHP_RATE = 0.35;

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
    "Boosters": true, "Extra/Premium": true, "Starters": true, "Promos": true, "Others": true
  });

  const [newCard, setNewCard] = useState<Partial<FlatCard>>({
    set: "OP01", rarity: "P-SEC", price_jpy: 0, finish: "Foil"
  });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // FIX: Added dependency array [] to stop the infinite loop error
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const savedPort = localStorage.getItem('user_portfolio');
      let loadedPortfolio: Portfolio = {};
      if (savedPort) {
        try {
          loadedPortfolio = JSON.parse(savedPort);
        } catch (e) {
          console.error("Failed to load portfolio:", e);
        }
      }

      const savedCustom = localStorage.getItem('user_custom_cards');
      if (savedCustom) {
        try {
          setCustomCards(JSON.parse(savedCustom));
        } catch (e) {
          console.error("Failed to load custom cards:", e);
        }
      }

      // --- PORTFOLIO HEALING & MIGRATION ---
      // 1. Migration (Old Price IDs -> New Stable IDs) - Kept for legacy support
      // 2. Healing (Re-binding IDs if Index shifted due to new scrapes)

      const flatCards = (cardRawData as unknown as FlatCard[]);
      const newPortfolio: Portfolio = {};
      let changesMade = false;

      Object.entries(loadedPortfolio).forEach(([id, qty]) => {
        // Check if ID still exists in current data
        const exactMatch = flatCards.find(c => c.unique_id === id);

        if (exactMatch) {
          // ID is valid, keep it
          newPortfolio[id] = (newPortfolio[id] || 0) + qty;
        } else {
          // ID is broken/stale. Attempt to Heal.
          changesMade = true;
          console.warn(`[Portfolio Healing] ID '${id}' not found. Attempting to re-bind...`);

          // Extract Code and Variant info from the stale ID if possible
          // Format: CODE-SLUG-INDEX
          // We can try to match by CODE and SLUG
          const pieces = id.split('-');
          if (pieces.length >= 3) {
            // Try to reconstruction Code and Slug
            // This is tricky if Code has dashes.
            // Heuristic: Last part is index. Middle part is slug. First part(s) is Code.

            // Better approach: Since we know the previous logic
            // Try finding a card with same code?
            // Let's assume CODE is standard format OP01-001 or P-001

            // Simplest robust heal: Search all cards for "closest string match"? No, too slow.
            // let match = flatCards.find(c => id.startsWith(c.card_code)); // Weak

            // Let's rely on the assumption that we haven't changed the SLUG generation logic.
            // ID: OP01-001-PARALLELAA-2
            // remove the last -{digit}
            const idBase = id.replace(/-\d+$/, '');

            // Look for any card whose unique_id starts with this base
            const heuristicsMatch = flatCards.find(c => c.unique_id.startsWith(idBase));

            if (heuristicsMatch) {
              console.log(`[Portfolio Healing] Re-bound '${id}' to '${heuristicsMatch.unique_id}'`);
              newPortfolio[heuristicsMatch.unique_id] = (newPortfolio[heuristicsMatch.unique_id] || 0) + qty;
            } else {
              // Fallback: If it's an old-old ID (Price based), run old migration logic
              const parts = id.split('-');
              let isOld = false;
              let code = "";
              let index = -1;

              if (id.startsWith("DON")) {
                if (parts.length === 5 && !isNaN(Number(parts[3]))) {
                  isOld = true;
                  code = `${parts[0]}-${parts[1]}-${parts[2]}`;
                  index = Number(parts[4]);
                }
              } else {
                if (parts.length === 4 && !isNaN(Number(parts[2]))) {
                  isOld = true;
                  code = `${parts[0]}-${parts[1]}`;
                  index = Number(parts[3]);
                }
              }

              if (isOld) {
                const siblings = flatCards.filter(c => c.card_code === code);
                const match = siblings.find(c => c.unique_id.endsWith(`-${index}`));
                if (match) {
                  newPortfolio[match.unique_id] = (newPortfolio[match.unique_id] || 0) + qty;
                } else {
                  // Can't heal, keep as orphan (will be hidden but preserved in storage)
                  console.error(`[Portfolio Healing] Failed to heal '${id}'`);
                  newPortfolio[id] = qty;
                }
              } else {
                // Just an unknown ID. Keep it.
                newPortfolio[id] = qty;
              }
            }
          } else {
            newPortfolio[id] = qty;
          }
        }
      });

      if (changesMade) {
        console.log("Portfolio updated with healed IDs:", newPortfolio);
        setPortfolio(newPortfolio);
        localStorage.setItem('user_portfolio', JSON.stringify(newPortfolio));
      } else {
        setPortfolio(loadedPortfolio);
      }
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
    addToCollection(createdCard.unique_id);
    setIsModalOpen(false);
    setNewCard({ set: "OP01", rarity: "P-SEC", price_jpy: 0, finish: "Foil" });
  };



  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
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
    const res = allCards.filter((card) => {
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

    // Sort by Card Code (OP01-001 < OP01-002)
    return res.sort((a, b) => {
      // Split into parts: ID and Number
      const [setA, numA] = a.card_code.split('-');
      const [setB, numB] = b.card_code.split('-');

      if (setA !== setB) return setA.localeCompare(setB);

      // Compare numbers if possible
      const nA = parseInt(numA || '0');
      const nB = parseInt(numB || '0');

      if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
      return a.card_code.localeCompare(b.card_code);
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

    console.log("DEBUG: Calculating Portfolio", {
      entries: Object.entries(portfolio).length,
      priceMapSize: priceMap.size,
      firstPortfolioItem: Object.entries(portfolio)[0]
    });

    Object.entries(portfolio).forEach(([id, qty]) => {
      const price = priceMap.get(id);
      if (price === undefined) {
        console.warn(`DEBUG: Missing price for ID: ${id}`);
      }
      totalCards += qty;
      totalValueYen += (price || 0) * qty;
    });

    console.log("DEBUG: Result", {
      totalCards,
      totalValueYen,
      php: Math.ceil(totalValueYen * JPY_TO_PHP_RATE)
    });

    return {
      totalCards,
      uniqueCards: Object.keys(portfolio).length,
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

    // Sort collection list too
    collectionList.sort((a, b) => {
      const [setA, numA] = a.card_code.split('-');
      const [setB, numB] = b.card_code.split('-');
      if (setA !== setB) return setA.localeCompare(setB);
      const nA = parseInt(numA || '0');
      const nB = parseInt(numB || '0');
      if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
      return a.card_code.localeCompare(b.card_code);
    });

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
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm transition-all">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-16 flex justify-between items-center gap-4">

          {/* Logo & Nav */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-indigo-200 shadow-lg">
                <Layers size={20} className="stroke-[2.5]" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 hidden sm:block">
                OPTCG<span className="text-indigo-600">Hub</span>
              </h1>
              {/* Mobile Logo Compact */}
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:hidden">
                <span className="text-indigo-600">Hub</span>
              </h1>
            </div>

            {/* Desktop Nav - Hidden on Mobile */}
            <nav className="hidden md:flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setActiveTab('market')}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${activeTab === 'market'
                  ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                Market
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === 'collection'
                  ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                  }`}
              >
                Collection
                {portfolioStats.totalCards > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${activeTab === 'collection' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {portfolioStats.totalCards}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">Portfolio Value</span>
              {/* Mobile Value - Always Visible */}
              <span className="font-mono text-sm sm:text-lg font-bold text-slate-900 leading-none">₱{portfolioStats.totalValuePhp.toLocaleString()}</span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl shadow-lg flex items-center gap-2 transition-transform active:scale-95"
            >
              <PenTool size={14} /> <span className="hidden sm:inline">New Card</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- CONTENT --- */}
      <div className="pt-24 max-w-[1920px] mx-auto px-4 sm:px-6">

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* MOBILE FILTER TOGGLE */}
            <div className="w-full lg:hidden mb-2">
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="w-full flex items-center justify-between bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-slate-700 active:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-2"><Filter size={16} /> Filters & Search</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* SIDEBAR FILTER (Responsive Modal) */}
            {/* On Mobile: Fixed Modal. On Desktop: Sticky Sidebar. */}
            <div className={`
                fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity duration-300
                ${isMobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `} onClick={() => setIsMobileFiltersOpen(false)} />

            <aside className={`
                flex-col gap-6 
                lg:w-72 xl:w-80 flex-shrink-0 
                lg:flex lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:custom-scrollbar lg:pr-2 lg:bg-transparent lg:shadow-none lg:p-0
                
                fixed inset-y-0 right-0 w-[85vw] max-w-sm bg-white shadow-2xl z-[70] p-6 overflow-y-auto transition-transform duration-300 ease-out
                ${isMobileFiltersOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
              <div className="flex items-center justify-between lg:hidden mb-6">
                <h2 className="text-xl font-black text-slate-900">Filters</h2>
                <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>


              {/* Search */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search cards..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all placeholder:text-slate-400 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Browse Sets */}
              {/* Browse Sets */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Browse Sets</h3>
                  <button onClick={() => setSelectedSet('All')} className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Reset</button>
                </div>

                <div className="divide-y divide-slate-50">
                  {Object.entries(organizedSets).map(([category, sets]) => {
                    if (sets.length === 0) return null;
                    const isExpanded = expandedCategories[category];
                    return (
                      <div key={category} className="group">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <span className="uppercase tracking-wide flex items-center gap-2">
                            {category}
                            <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md text-[9px]">{sets.length}</span>
                          </span>
                          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        </button>
                        {isExpanded && (
                          <div className="bg-slate-50/30 px-3 pb-3 pt-1 grid grid-cols-3 gap-2">
                            {sets.map(set => (
                              <button
                                key={set}
                                onClick={() => setSelectedSet(set)}
                                className={`text-center px-1 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${selectedSet === set
                                  ? 'bg-white border-indigo-200 text-indigo-700 shadow-sm ring-1 ring-indigo-50'
                                  : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-900 hover:border-slate-200'
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

              {/* Rarity Filter */}
              <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Rarity</h3>
                <div className="grid grid-cols-2 gap-2">
                  {RARITY_KEYS.map((key) => {
                    const isActive = activeRarities.has(key);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleRarity(key)}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] font-bold transition-all border ${isActive
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                          }`}
                      >
                        {isActive ? <CheckSquare size={12} className="text-indigo-600" /> : <Square size={12} className="text-slate-300" />}
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* MAIN GRID */}
            <section className="flex-1 min-w-0 pb-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                    {selectedSet === 'All' ? 'Marketplace' : `Set: ${selectedSet}`}
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Showing {filteredCards.length.toLocaleString()} cards &bull; {activeRarities.size} rarities selected
                  </p>
                </div>
              </div>

              {filteredCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Layers size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No cards found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mt-2">Try searching for a different name or checking your filters.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-16">
                  {RARITY_KEYS.map((rarityKey) => {
                    const cards = groupedByRarity[rarityKey];
                    if (!cards || cards.length === 0) return null;
                    return (
                      <div key={rarityKey} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3 mb-6">
                          <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">{RARITY_HEADERS[rarityKey] || rarityKey}</h2>
                          <div className="h-px flex-1 bg-slate-200"></div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-100 px-2.5 py-1 rounded">
                            {cards.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 sm:gap-6">
                          {cards.map((flatCard) => {
                            const qty = portfolio[flatCard.unique_id] || 0;
                            return (
                              <div key={flatCard.unique_id} className="relative group h-full">
                                {/* Card Actions Overlay (Hover) */}
                                <div className="absolute -top-2 -right-2 z-30 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 scale-100 lg:scale-95 lg:group-hover:scale-100">
                                  <button
                                    onClick={() => addToCollection(flatCard.unique_id)}
                                    className="w-8 h-8 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center hover:bg-indigo-700 transition-colors"
                                  >
                                    <Plus size={16} strokeWidth={3} />
                                  </button>
                                  {qty > 0 && (
                                    <button
                                      onClick={() => removeFromCollection(flatCard.unique_id)}
                                      className="w-8 h-8 bg-white text-rose-500 border border-slate-100 rounded-full shadow-lg flex items-center justify-center hover:bg-rose-50 transition-colors"
                                    >
                                      <Minus size={16} strokeWidth={3} />
                                    </button>
                                  )}
                                </div>

                                {/* Collection Badge */}
                                {qty > 0 && (
                                  <div className="absolute -top-2 -left-2 z-30 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg ring-2 ring-white flex items-center gap-1">
                                    <CheckSquare size={10} strokeWidth={3} /> Owned: {qty}
                                  </div>
                                )}

                                <div className={`${qty > 0 ? 'ring-2 ring-emerald-400 ring-offset-2 rounded-xl' : ''} h-full`}>
                                  <CardGroup card={{
                                    card_code: flatCard.card_code,
                                    base_name: flatCard.base_name || flatCard.name || flatCard.card_code,
                                    set: flatCard.set,
                                    variants: [{
                                      variant_id: flatCard.unique_id,
                                      variant_name: flatCard.variant_name,
                                      rarity: flatCard.rarity,
                                      finish: flatCard.finish,
                                      image_url: flatCard.image_url || flatCard.official_image_url || '',
                                      price_jpy: flatCard.price_jpy,
                                      isHighDemand: flatCard.is_high_demand
                                    }]
                                  }} />
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

        {/* COLLECTION TAB (Clean) */}
        {activeTab === 'collection' && (
          <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl shadow-indigo-200">
                <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-2">Total Value</h3>
                <div className="text-4xl font-black tracking-tight">₱{portfolioStats.totalValuePhp.toLocaleString()}</div>
                <p className="text-xs font-medium text-indigo-200 mt-2 opacity-80">Estimated Market Value (JPY to PHP)</p>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col justify-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Cards Owned</h3>
                <div className="text-4xl font-black text-slate-900">{portfolioStats.totalCards.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex items-center justify-center">
                <button onClick={clearCollection} className="group flex flex-col items-center gap-2 text-rose-500 hover:text-rose-600 transition-colors">
                  <div className="p-4 rounded-full bg-rose-50 group-hover:bg-rose-100 transition-colors">
                    <Trash2 size={24} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Reset Collection</span>
                </button>
              </div>
            </div>

            {portfolioStats.totalCards === 0 ? (
              <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200">
                <Wallet size={64} className="mx-auto text-slate-300 mb-6" strokeWidth={1.5} />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Your collection is empty</h2>
                <p className="text-slate-500 mb-8 font-medium">Start building your dream deck today.</p>
                <button onClick={() => setActiveTab('market')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-12">
                {RARITY_KEYS.map((rarityKey) => {
                  const cards = groupedPortfolio[rarityKey];
                  if (!cards || cards.length === 0) return null;
                  return (
                    <div key={rarityKey}>
                      <div className="flex items-center gap-4 mb-6">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{RARITY_HEADERS[rarityKey] || rarityKey}</h3>
                        <span className="h-px bg-slate-200 flex-1"></span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                        {cards.map(card => {
                          const originalUrl = card.image_url || card.official_image_url || 'https://placehold.co/400x560/png?text=No+Image';
                          const highResUrl = originalUrl.replace('100_140', '400_560');

                          return (
                            <div key={card.unique_id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                              <div className="relative aspect-[2.5/3.5] bg-slate-50 p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={highResUrl}
                                  className="w-full h-full object-contain drop-shadow-md"
                                  alt={card.name}
                                  loading="lazy"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes(originalUrl)) {
                                      target.src = originalUrl;
                                    } else {
                                      target.src = 'https://placehold.co/400x560/png?text=Image+N/A';
                                    }
                                  }}
                                />
                                <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">x{card.qty}</div>
                              </div>
                              <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <div className="text-[10px] font-mono font-bold text-slate-400">{card.card_code}</div>
                                    <div className="text-xs font-bold text-slate-800 line-clamp-1">{card.variant_name}</div>
                                  </div>
                                </div>
                                <div className="flex items-end justify-between border-t border-slate-50 pt-3 mt-2">
                                  <div className="text-[10px] text-slate-400 font-medium">Total Value</div>
                                  <div className="font-bold text-indigo-600">₱{card.subtotal?.toLocaleString()}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => removeFromCollection(card.unique_id)} className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                    <Minus size={14} className="mx-auto" />
                                  </button>
                                  <button onClick={() => addToCollection(card.unique_id)} className="bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                    <Plus size={14} className="mx-auto" />
                                  </button>
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


        {/* --- MOBILE BOTTOM NAV --- */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex md:hidden justify-around items-center h-16 z-[40] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center gap-1 w-full h-full justify-center active:scale-95 transition-transform ${activeTab === 'market' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'market' ? 'bg-indigo-50' : ''}`}>
              <Layers size={20} strokeWidth={activeTab === 'market' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold">Market</span>
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`relative flex flex-col items-center gap-1 w-full h-full justify-center active:scale-95 transition-transform ${activeTab === 'collection' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'collection' ? 'bg-indigo-50' : ''}`}>
              <Wallet size={20} strokeWidth={activeTab === 'collection' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-bold">Collection</span>
            {portfolioStats.totalCards > 0 && (
              <span className="absolute top-2 right-[25%] bg-rose-500 text-white text-[9px] font-black min-w-[1rem] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                {portfolioStats.totalCards > 99 ? '99+' : portfolioStats.totalCards}
              </span>
            )}
          </button>
        </div>


        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add Custom Card</h2>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors text-slate-500">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateCard} className="flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Card Code</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="OP01-001" value={newCard.card_code || ""} onChange={e => setNewCard({ ...newCard, card_code: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name</label>
                    <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Luffy" value={newCard.base_name || ""} onChange={e => setNewCard({ ...newCard, base_name: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Set</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={newCard.set || "OP01"} onChange={e => setNewCard({ ...newCard, set: e.target.value })}>
                      {Array.from(new Set(allCards.map(c => c.set))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rarity</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none" value={newCard.rarity || "P-SEC"} onChange={e => setNewCard({ ...newCard, rarity: e.target.value })}>
                      {RARITY_KEYS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Price (JPY)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={newCard.price_jpy || ""} onChange={e => setNewCard({ ...newCard, price_jpy: Number(e.target.value) })} />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 text-center">Custom cards are saved to your local browser storage.</p>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95">
                  Create & Add to Collection
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}