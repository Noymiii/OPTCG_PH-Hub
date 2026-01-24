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

export default function CardGroup({ card }: Props) {
  // 1. ALWAYS CALL HOOKS AT THE TOP (Before any return statement)
  const variants = useMemo(() => {
    // Safety check inside useMemo to prevent crash
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
  const [imgSrc, setImgSrc] = useState('https://placehold.co/400x560/png?text=No+Image');

  // Get the active variant's image URL in a stable way
  const activeVariantImageUrl = useMemo(() => {
    if (variants.length === 0) return '';
    const activeVariant = variants.find((v) => v.variant_id === selectedId) || variants[0];
    return (activeVariant?.image_url || '').trim();
  }, [variants, selectedId]);

  useEffect(() => {
    if (variants.length > 0 && !variants.some(v => v.variant_id === selectedId)) {
      const firstVariant = variants[0];
      if (firstVariant?.variant_id) {
        setSelectedId(firstVariant.variant_id);
      }
    }
  }, [variants, selectedId]);

  // Update image source when variant changes
  useEffect(() => {
    const newUrl = activeVariantImageUrl || 'https://placehold.co/400x560/png?text=No+Image';
    setImgSrc(newUrl);
  }, [activeVariantImageUrl]);

  // 2. NOW WE CAN DO SAFETY CHECKS (After hooks are done)
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

  const handleImageError = () => {
    setImgSrc('https://placehold.co/400x560/png?text=No+Image');
  };

  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 h-full">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className="font-mono text-xs font-medium text-slate-600">{card.card_code}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
          activeVariant.rarity.includes('P-') 
            ? 'bg-indigo-100 text-indigo-700' 
            : 'bg-slate-100 text-slate-600'
        }`}>
          {activeVariant.rarity}
        </span>
      </div>

      {/* Image Container */}
      <div className="relative w-full aspect-[2.5/3.5] bg-slate-50 flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={`${baseName} - ${activeVariant.variant_name}`}
            className="w-full h-full object-contain transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
            onError={handleImageError}
          />
        </div>
        {variants.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-slate-900/75 text-white text-[10px] px-2 py-0.5 rounded font-medium">
            {variants.length}x
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2.5 justify-between flex-grow bg-white h-[140px]">
        <div className="h-[45px] flex flex-col justify-start overflow-hidden">
          <h3 className="text-sm font-semibold text-slate-900 leading-tight line-clamp-2 mb-1 h-[32px] overflow-hidden text-ellipsis" title={baseName}>
            {baseName}
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium h-[14px]">{card.set}</p>
        </div>

        <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-100 h-[60px]">
          {variants.length > 1 ? (
            <select
              className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white hover:bg-slate-50 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer text-slate-700 transition-colors h-[28px]"
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
            <div className="text-[10px] text-slate-500 h-[28px] flex items-center">
              {activeVariant.variant_name}
            </div>
          )}

          <div className="flex justify-between items-center h-[24px]">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Price</span>
            <span className="text-sm font-bold text-indigo-600 truncate max-w-[60%] text-right">
              {displayPrice}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}