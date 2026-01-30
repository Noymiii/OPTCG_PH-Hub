import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FlatCard {
    unique_id: string;
    card_code: string;
    set: string;
    variant_name: string;
    rarity: string;
    price_jpy: number;
    image_url: string;
    official_image_url?: string;
    finish: string;
    is_high_demand: boolean;
    base_name?: string;
    name?: string;
    qty?: number;
    subtotal?: number;
}

interface CollectionCardProps {
    card: FlatCard;
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
}

export default function CollectionCard({ card, onAdd, onRemove }: CollectionCardProps) {
    const originalUrl = card.image_url || card.official_image_url || '';
    // Attempt high-res replacement
    const highResUrl = originalUrl.replace('100_140', '200_280');

    // Image State: 0 = HighRes, 1 = Original, 2 = Placeholder
    const [imgState, setImgState] = useState<0 | 1 | 2>(0);

    const currentSrc = (() => {
        if (imgState === 0) return highResUrl || 'https://placehold.co/200x280/png?text=No+Image';
        if (imgState === 1) return originalUrl || 'https://placehold.co/200x280/png?text=No+Image';
        return 'https://placehold.co/200x280/png?text=Image+N/A';
    })();

    const handleError = () => {
        if (imgState === 0) setImgState(1); // Try original
        else if (imgState === 1) setImgState(2); // Give up
    };

    const isParallel = card.rarity.includes('P-') || card.rarity === 'SP' || card.rarity === 'L' || card.rarity === 'SEC';

    return (
        <div className="flex flex-col rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300 border border-slate-100 group h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-2.5 bg-white border-b border-slate-50">
                <span className="font-mono text-[10px] font-medium text-slate-400 tracking-wider bg-slate-50 px-1.5 py-0.5 rounded">
                    {card.card_code}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${isParallel ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    {card.rarity}
                </span>
            </div>

            {/* Image Container */}
            <div className="relative w-full aspect-[2.5/3.5] bg-slate-50 flex items-center justify-center overflow-hidden p-4 group-hover:bg-slate-100 transition-colors duration-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={currentSrc}
                    className="w-full h-full object-contain drop-shadow-sm transform transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-y-1"
                    alt={card.variant_name || card.card_code}
                    loading="lazy"
                    onError={handleError}
                />

                {/* Qty Badge */}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] px-2 py-1 rounded-full font-bold shadow-sm border border-slate-200 z-10">
                    x{card.qty}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-3 flex-grow bg-white relative z-10">
                <div className="flex flex-col justify-start">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1 truncate">{card.set}</p>
                    <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2" title={card.base_name || card.name}>
                        {card.base_name || card.name || card.variant_name}
                    </h3>
                    <div className="text-xs text-slate-500 font-medium line-clamp-1 h-5">
                        {card.variant_name}
                    </div>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                    {/* Value Section */}
                    <div className="flex justify-between items-end pt-1 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-medium mb-1">Total Value</span>
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-extrabold text-slate-900 leading-none tracking-tight">
                                ₱{card.subtotal?.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                            onClick={() => onRemove(card.unique_id)}
                            className="bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center border border-slate-100"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={() => onAdd(card.unique_id)}
                            className="bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center border border-slate-100"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
