"use client";

import React, { useState, useMemo } from 'react';

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
  const [imgError, setImgError] = useState(false);

  // If selectedId is not found in variants, fall back to the first variant.
  const activeVariant = useMemo(() => {
    if (variants.length === 0) return null;
    return variants.find((v) => v.variant_id === selectedId) || variants[0];
  }, [variants, selectedId]);

  if (!card || !activeVariant) return null;

  const imageUrl = activeVariant.image_url;
  const highResUrl = imageUrl ? imageUrl.replace('100_140', '200_280') : '';

  const displayImage = (!imgError && highResUrl) ? highResUrl : ((!imgError && imageUrl) ? imageUrl : 'https://placehold.co/200x280/png?text=No+Image');

  const phpPrice = Math.ceil(activeVariant.price_jpy * 0.35);
  const displayPrice = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0
  }).format(phpPrice);

  const baseName = card.base_name || card.card_code;

  return (
    <div className="flex flex-col rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300 border border-slate-100 group h-full">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-slate-50">
        <span className="font-mono text-[10px] font-medium text-slate-400 tracking-wider bg-slate-50 px-1.5 py-0.5 rounded">{card.card_code}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${activeVariant.rarity.includes('P-')
          ? 'bg-indigo-50 text-indigo-600'
          : 'bg-slate-100 text-slate-500'
          }`}>
          {activeVariant.rarity}
        </span>
      </div>

      {/* Image Container */}
      <div className="relative w-full aspect-[2.5/3.5] bg-slate-50 flex items-center justify-center overflow-hidden p-4 group-hover:bg-slate-100 transition-colors duration-500">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeVariant.variant_id}
          src={displayImage}
          alt={`${baseName} - ${activeVariant.variant_name}`}
          className="w-full h-full object-contain drop-shadow-sm transform transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1"
          loading="lazy"
          onError={() => setImgError(true)}
          onLoad={() => setImgError(false)}
        />
        {variants.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] px-2 py-1 rounded-full font-bold shadow-sm border border-slate-200">
            +{variants.length - 1} Refs
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-grow bg-white relative z-10">
        <div className="flex flex-col justify-start">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1 truncate">{card.set}</p>
          <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 h-10" title={baseName}>
            {baseName}
          </h3>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {variants.length > 1 ? (
            <div className="relative">
              <select
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none cursor-pointer text-slate-700 transition-all appearance-none font-medium"
                value={activeVariant.variant_id}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setImgError(false);
                }}
              >
                {variants.map((v) => (
                  <option key={v.variant_id} value={v.variant_id}>
                    {v.variant_name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 font-medium px-1 py-2 border-b border-dashed border-slate-100 line-clamp-1">
              {activeVariant.variant_name}
            </div>
          )}

          <div className="flex justify-between items-end pt-1">
            <span className="text-[10px] text-slate-400 font-medium mb-1">Market Price</span>
            <div className="flex flex-col items-end">
              <span className="text-lg font-extrabold text-slate-900 leading-none tracking-tight">
                {displayPrice}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}