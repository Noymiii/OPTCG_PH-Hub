"use client";

import React, { useState, useMemo, useEffect } from 'react';

// --- TYPES ---
interface CardVariant {
  variant_id: string;
  variant_name: string;
  rarity: string;
  finish: string;
  image_url: string;
  price_jpy: number;
  isHighDemand: boolean;
}

interface CardParent {
  card_code: string;
  base_name?: string;
  set: string;
  variants: CardVariant[];
}

interface Props {
  card: CardParent;
}

// ✅ HELPER: Fixes Blurry Images + Fixes Broken Links + Fixes Relative Paths
const getHighResUrl = (url: string) => {
  if (!url) return 'https://placehold.co/400x560/png?text=No+Image';
  
  // 1. Ensure it's a full URL (Fixes missing https://yuyu-tei.jp)
  let fullUrl = url;
  if (url.startsWith('/')) {
      fullUrl = `https://yuyu-tei.jp${url}`;
  }

  // 2. If it's already high res, return it
  if (fullUrl.includes('/400_560/')) return fullUrl;

  // 3. Force High Res (Replace thumbnails like 90_126 with 400_560)
  const fixedUrl = fullUrl.replace(/\/\d+_\d+\//, '/400_560/');
  
  return fixedUrl;
};

export default function CardGroup({ card }: Props) {
  // 1. HOOKS
  const variants = useMemo(() => {
    if (!card || !card.variants) return [];
    return card.variants.map((v, index) => ({
      ...v,
      variant_id: v.variant_id || `${card.card_code}-${index}`,
      image_url: v.image_url || '',
      isHighDemand: !!v.isHighDemand,
      price_jpy: Number(v.price_jpy) || 0,
      rarity: v.rarity || 'Common'
    }));
  }, [card]);

  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    if (variants.length > 0 && !variants.some(v => v.variant_id === selectedId)) {
      setSelectedId(variants[0].variant_id);
    }
  }, [variants, selectedId]);

  // 2. SAFETY CHECK
  if (!card) return null;

  const activeVariant = variants.find((v) => v.variant_id === selectedId) || variants[0];
  if (!activeVariant) return null;

  // 3. RENDER
  const phpPrice = Math.ceil(activeVariant.price_jpy * 0.35);
  const displayPrice = new Intl.NumberFormat('en-PH', { 
    style: 'currency', 
    currency: 'PHP', 
    minimumFractionDigits: 0 
  }).format(phpPrice);
  
  const baseName = card.base_name || card.card_code;
  const highResImageUrl = getHighResUrl(activeVariant.image_url);

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 h-full">
      <div className="flex justify-between items-center px-3 py-2 bg-slate-50 text-[10px] font-mono border-b border-gray-100">
        <span className="font-bold text-slate-700">{card.card_code}</span>
        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${activeVariant.rarity.includes('P-') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-white text-gray-500 border-gray-200'}`}>
          {activeVariant.rarity}
        </span>
      </div>

      <div className="relative w-full aspect-[2.5/3.5] bg-slate-100 group flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full p-2">
            {/* ✅ FIXED IMAGE TAG */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={highResImageUrl}
                alt={`${baseName} - ${activeVariant.variant_name}`}
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md"
                loading="lazy"
                // ⬇️ THIS LINE FIXES THE DEPLOYMENT IMAGE ISSUE ⬇️
                referrerPolicy="no-referrer"
            />
        </div>
        {variants.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full shadow-sm font-bold">
            {variants.length} Ver.
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 justify-between flex-grow bg-white">
        <div>
          <h3 className="text-sm font-bold text-gray-800 leading-snug mb-1" title={baseName}>
            {baseName}
          </h3>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{card.set}</p>
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          {variants.length > 1 ? (
            <select
              className="w-full text-[11px] border border-gray-200 rounded-md p-1.5 bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer text-gray-700"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {variants.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  {v.variant_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[10px] text-gray-400 italic h-[26px] flex items-center px-1">
              Standard Version
            </div>
          )}

          <div className="flex justify-between items-end border-t border-gray-100 pt-2">
            <span className="text-[9px] text-gray-400 font-bold uppercase">MARKET PRICE</span>
            <span className="text-lg font-black text-indigo-600 tracking-tight">
              {displayPrice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
