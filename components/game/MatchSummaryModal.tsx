'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Clock,
  Crosshair,
  Crown,
  Flame,
  Heart,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { SectionModal } from '@/components/ui/SectionModal';
import { StatCard } from '@/components/ui/StatCard';
import {
  formatNumber,
  formatTimeMMSS,
  getOrdinalPlacement,
} from '@/lib/game-utils';
import { MatchSummaryStats } from '@/types/game';

interface MatchSummaryModalProps {
  summary: MatchSummaryStats;
  unlockedCuteGirlAlready: boolean;
  onProceedToTop3Reward: () => void;
  onPlayAgain: () => void;
  onReturnToHub: () => void;
}

export function MatchSummaryModal({
  summary,
  unlockedCuteGirlAlready,
  onProceedToTop3Reward,
  onPlayAgain,
  onReturnToHub,
}: MatchSummaryModalProps) {
  const [animKills, setAnimKills] = useState(0);
  const [animDamage, setAnimDamage] = useState(0);
  const [animSurvival, setAnimSurvival] = useState(0);

  // Smooth count-up animation for kills, damage dealt, and survival time
  useEffect(() => {
    const durationMs = 850;
    const startTime = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimKills(Math.round(summary.kills * eased));
      setAnimDamage(Math.round(summary.damageDealt * eased));
      setAnimSurvival(Math.round(summary.survivalTimeSec * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [summary.damageDealt, summary.kills, summary.survivalTimeSec]);

  const isTop3 = summary.placement <= 3;

  return (
    <SectionModal
      kicker={
        isTop3
          ? 'Top 3 Podium Finish — Grand Reward Unlocked'
          : 'Solo Battle Royale Match Complete'
      }
      title={
        summary.placement === 1
          ? 'Victory Royale — #1 Champion!'
          : `Placed ${getOrdinalPlacement(summary.placement)} of ${summary.totalPlayers} Contenders`
      }
      headerRight={
        <div className="text-right">
          <div className="text-xs text-slate-400">Final Rank</div>
          <div className="text-3xl font-extrabold font-mono tabular-nums text-amber-400">
            #{summary.placement}
          </div>
        </div>
      }
    >
      {/* Animated Stat Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6"
      >
        <StatCard
          label="Eliminations (Kills)"
          value={animKills}
          sublabel="Confirmed arena knockouts"
          accentColor="rose"
          icon={<Crosshair className="w-4 h-4" />}
        />
        <StatCard
          label="Total Damage Dealt"
          value={formatNumber(animDamage)}
          sublabel={`Partner Bot contributed ${formatNumber(summary.companionDamageDealt)} DMG`}
          accentColor="amber"
          icon={<Flame className="w-4 h-4" />}
        />
        <StatCard
          label="Survival Time"
          value={formatTimeMMSS(animSurvival)}
          sublabel="Time survived inside safe zone"
          accentColor="sky"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Compatibility Bonus"
          value={`+${summary.compatibilityBonus} PTS`}
          sublabel={`${summary.vendingItemsClaimed} Vending items claimed`}
          accentColor="emerald"
          icon={<Heart className="w-4 h-4" />}
        />
      </motion.div>

      {/* Top 3 vs Outside Top 3 Partner Bot Status Callout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, delay: 0.12 }}
        className={`rounded-xl p-5 border mb-6 ${
          isTop3
            ? 'bg-rose-950/40 border-rose-500/60'
            : 'bg-slate-950 border-slate-800'
        }`}
      >
        {isTop3 ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-600/20 text-rose-400 shrink-0">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Top 3 Podium Reward Unlocked: Cute Virtual Girl!</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Congratulations on finishing #{summary.placement}! You have
                  earned the{' '}
                  <strong className="text-rose-300">Cute Virtual Girl</strong>{' '}
                  helper bot reward. You can now spawn her at any Free Vending
                  Machine in all matches to deal up to{' '}
                  <strong className="text-amber-300">50 maximum damage</strong>!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onProceedToTop3Reward}
              className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Claim Top 3 Reward & Date</span>
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-slate-800 text-amber-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {unlockedCuteGirlAlready
                  ? 'Your Cute Virtual Girl Companion Remains Unlocked'
                  : 'Place in the Top 3 Next Match to Unlock the Cute Virtual Girl!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {unlockedCuteGirlAlready
                  ? 'Even though this match ended outside the Top 3, your previously unlocked Cute Virtual Girl (50 Max DMG) is still available at every Vending Machine.'
                  : 'You can still summon your loyal Dog Helper Bot (50 Max DMG) from any Free Vending Machine, and finishing #1, #2, or #3 will permanently unlock the Cute Virtual Girl helper bot!'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Bottom Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onReturnToHub}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
        >
          Return to Island Lobby
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="px-5 py-2.5 bg-slate-100 hover:bg-white text-slate-950 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Drop Into Next Match</span>
          </button>

          {isTop3 && (
            <button
              type="button"
              onClick={onProceedToTop3Reward}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>View Cute Virtual Girl Reward</span>
            </button>
          )}
        </div>
      </div>
    </SectionModal>
  );
}
