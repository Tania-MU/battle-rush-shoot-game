'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Crown,
  Heart,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SectionModal } from '@/components/ui/SectionModal';
import { CUTE_GIRL_PERSONAS, MAX_COMPANION_DAMAGE } from '@/lib/constants';
import { GirlPersonaId, PlayerProfile } from '@/types/game';

interface TopThreeRewardModalProps {
  profile: PlayerProfile;
  placement: number;
  onSelectPersonaAndEquip: (personaId: GirlPersonaId) => void;
  onBonusAffinityEarned: (bonus: number) => void;
  onPlayNextMatch: () => void;
  onReturnToHub: () => void;
}

export function TopThreeRewardModal({
  profile,
  placement,
  onSelectPersonaAndEquip,
  onBonusAffinityEarned,
  onPlayNextMatch,
  onReturnToHub,
}: TopThreeRewardModalProps) {
  const [selectedId, setSelectedId] = useState<GirlPersonaId>(
    profile.selectedGirlPersona || 'aiko'
  );
  const [dateRound, setDateRound] = useState(0);
  const [lastReply, setLastReply] = useState<string | null>(null);
  const [earnedBonusTotal, setEarnedBonusTotal] = useState(0);

  const persona = CUTE_GIRL_PERSONAS[selectedId];
  const currentDialogue = persona.dateResponses[dateRound];

  const handleChoosePersona = (id: GirlPersonaId) => {
    setSelectedId(id);
    setDateRound(0);
    setLastReply(null);
    onSelectPersonaAndEquip(id);
  };

  const handleDateChoice = (reply: string, bonus: number) => {
    setLastReply(reply);
    setEarnedBonusTotal((prev) => prev + bonus);
    onBonusAffinityEarned(bonus);
  };

  return (
    <SectionModal
      kicker={`Top 3 Podium Reward (#${placement} Finish) · Permanent Companion Unlocked`}
      title="Cute Virtual Girl Helper Bot & Virtual Date Lounge"
      maxWidthClass="max-w-4xl"
      headerRight={
        <div className="px-3.5 py-1.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Equipped for All Matches · Max {MAX_COMPANION_DAMAGE} DMG</span>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Cute Virtual Girl Showcase & Persona Selector */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Select Helper Girl Persona</span>
              <span className="font-mono text-rose-400">
                Max {MAX_COMPANION_DAMAGE} DMG
              </span>
            </div>

            {/* Stylized Animated SVG Avatar Portrait of the Cute Virtual Girl */}
            <motion.div
              key={persona.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 flex flex-col items-center text-center mb-4"
            >
              <svg
                viewBox="0 0 160 160"
                className="w-32 h-32 mb-3"
                aria-label={persona.name}
              >
                {/* Floating Starlight Halo */}
                <ellipse
                  cx="80"
                  cy="22"
                  rx="28"
                  ry="7"
                  fill="none"
                  stroke={persona.secondaryColor}
                  strokeWidth="3.5"
                />
                {/* Twin-Tails */}
                <path
                  d="M42 52 C22 65, 18 105, 30 126 C38 112, 44 85, 48 64 Z"
                  fill={persona.hairColor}
                />
                <path
                  d="M118 52 C138 65, 142 105, 130 126 C122 112, 116 85, 112 64 Z"
                  fill={persona.hairColor}
                />
                {/* Hair Crown */}
                <circle cx="80" cy="64" r="34" fill={persona.hairColor} />
                {/* Face */}
                <circle cx="80" cy="68" r="26" fill="#FFEDD5" />
                {/* Expressive Anime Eyes */}
                <ellipse cx="69" cy="68" rx="4.5" ry="6" fill="#0F172A" />
                <ellipse cx="91" cy="68" rx="4.5" ry="6" fill="#0F172A" />
                <circle cx="67.5" cy="65.5" r="1.8" fill="#FFFFFF" />
                <circle cx="89.5" cy="65.5" r="1.8" fill="#FFFFFF" />
                {/* Blush & Smile */}
                <ellipse
                  cx="62"
                  cy="76"
                  rx="4"
                  ry="2"
                  fill={persona.primaryColor}
                  opacity="0.55"
                />
                <ellipse
                  cx="98"
                  cy="76"
                  rx="4"
                  ry="2"
                  fill={persona.primaryColor}
                  opacity="0.55"
                />
                <path
                  d="M74 78 Q80 84 86 78"
                  fill="none"
                  stroke="#BE123C"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Cyber-Idol Outfit */}
                <path
                  d="M52 146 L64 98 L96 98 L108 146 Z"
                  fill={persona.primaryColor}
                />
                <polygon
                  points="80,104 72,118 80,126 88,118"
                  fill={persona.secondaryColor}
                />
              </svg>

              <div className="text-lg font-bold text-white">{persona.name}</div>
              <div className="text-xs text-rose-400 font-medium mb-2">
                {persona.title}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {persona.bio}
              </p>
            </motion.div>

            {/* 3 Persona Switcher Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {(['aiko', 'hana', 'miku'] as GirlPersonaId[]).map((pid) => {
                const pItem = CUTE_GIRL_PERSONAS[pid];
                const isSelected = selectedId === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleChoosePersona(pid)}
                    className={`p-2.5 rounded-xl border text-center transition-colors ${
                      isSelected
                        ? 'bg-rose-600/20 border-rose-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">
                      {pItem.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      50 Max DMG
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Saved to your profile! Visit any Free Vending Machine in-match to
              spawn <strong>{persona.name}</strong> instead of the default Dog
              Bot.
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Virtual Date Lounge */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-semibold text-slate-200">
                  VIP Victory Virtual Date with {persona.name}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-amber-400">
                Affinity Earned: +{earnedBonusTotal} PTS
              </span>
            </div>

            {/* Companion Speech Bubble */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold text-rose-400 mb-1">
                {persona.name}
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                &ldquo;{lastReply || persona.dateOpeningLine}&rdquo;
              </p>
            </div>

            {/* Interactive Date Challenge Prompt */}
            {currentDialogue && (
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentDialogue.prompt}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {currentDialogue.choices.map((choice) => (
                    <button
                      key={choice.text}
                      type="button"
                      onClick={() => {
                        handleDateChoice(choice.reply, choice.affinityBonus);
                        if (dateRound < persona.dateResponses.length - 1) {
                          setDateRound((r) => r + 1);
                        }
                      }}
                      className="p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/60 rounded-xl text-left transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="text-xs font-medium text-slate-100">
                        {choice.text}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-rose-400 shrink-0">
                        +{choice.affinityBonus} Affinity
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Partner Bot Comparison Summary Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-rose-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active: Cute Virtual Girl</span>
              </div>
              <div className="text-slate-400 mt-0.5">
                Starlight Beam · Max {MAX_COMPANION_DAMAGE} Damage · Unlocked via
                Top 3
              </div>
            </div>
            <div>
              <div className="text-slate-300 font-semibold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Backup: Loyal Dog Bot</span>
              </div>
              <div className="text-slate-400 mt-0.5">
                Cyber-Bark Turret · Max {MAX_COMPANION_DAMAGE} Damage · Default
                Partner
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onReturnToHub}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Return to Island Hub
            </button>
            <button
              type="button"
              onClick={onPlayNextMatch}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Drop Into Next Match with {persona.name.split(' ')[0]}</span>
            </button>
          </div>
        </div>
      </div>
    </SectionModal>
  );
}
