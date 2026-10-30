'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Crown,
  Heart,
  MessageSquare,
  Play,
  Send,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  COMPATIBILITY_QUIZ_QUESTIONS,
  CUTE_GIRL_PERSONAS,
  MAX_COMPANION_DAMAGE,
  MAX_MATCH_CONTENDERS,
  MAX_PLAYER_HP,
  SYNERGY_BUFFS,
} from '@/lib/constants';
import { formatNumber } from '@/lib/game-utils';
import {
  ChatMessage,
  GirlPersonaId,
  HubTab,
  LeaderboardEntry,
  PlayerProfile,
  SynergyBuffId,
} from '@/types/game';

interface BottomControlDockProps {
  profile: PlayerProfile;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
  onStartMatch: () => void;
  onOpenDateLounge: () => void;
  leaderboard: LeaderboardEntry[];
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onlineCount: number;
  maxPoolSize: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

const ARMOR_SWATCHES = [
  { label: 'Crimson Rose', hex: '#F43F5E' },
  { label: 'Solar Amber', hex: '#F59E0B' },
  { label: 'Electric Sky', hex: '#38BDF8' },
  { label: 'Emerald Vital', hex: '#10B981' },
  { label: 'Royal Violet', hex: '#A855F7' },
];

const VISOR_SWATCHES = [
  { label: 'Cyan Beam', hex: '#22D3EE' },
  { label: 'Neon Gold', hex: '#FACC15' },
  { label: 'Hot Pink', hex: '#F472B6' },
  { label: 'Pure White', hex: '#F8FAFC' },
];

export function BottomControlDock({
  profile,
  onUpdateProfile,
  onStartMatch,
  onOpenDateLounge,
  leaderboard,
  chatMessages,
  onSendChat,
  onlineCount,
  maxPoolSize,
  isMuted,
  onToggleMute,
}: BottomControlDockProps) {
  const [activeTab, setActiveTab] = useState<HubTab>(HubTab.PLAY);
  const [collapsed, setCollapsed] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [quizStep, setQuizStep] = useState(0);

  const activeBuff = SYNERGY_BUFFS[profile.activeSynergyBuff];
  const activePersona = CUTE_GIRL_PERSONAS[profile.selectedGirlPersona];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const handleQuizAnswer = (buffId: SynergyBuffId, trait: string) => {
    onUpdateProfile((prev) => ({
      ...prev,
      activeSynergyBuff: buffId,
      titleBadge: trait,
      quizCompleted: true,
      compatibilityScore: prev.compatibilityScore + 25,
    }));
    if (quizStep < COMPATIBILITY_QUIZ_QUESTIONS.length - 1) {
      setQuizStep((s) => s + 1);
    } else {
      setQuizStep(0);
      setActiveTab(HubTab.PLAY);
    }
  };

  return (
    <div
      className="fixed z-30 left-1/2 -translate-x-1/2 bottom-5 w-full max-w-[min(940px,94vw)] pointer-events-auto transition-transform duration-200"
      style={{
        transform: collapsed
          ? 'translate(-50%, calc(100% - 38px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Top Collapse / Expand Handle Bar */}
      <div className="flex items-center justify-between px-2 mb-1.5">
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-300 flex items-center gap-2">
          <span className="font-semibold text-rose-400">
            {profile.displayName}
          </span>
          <span aria-hidden="true">·</span>
          <span>{profile.titleBadge}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-amber-400">
            {profile.wins} Wins
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-400">
            Partner:{' '}
            <strong className="text-slate-100">
              {profile.unlockedCuteGirl && profile.selectedCompanion === 'girl'
                ? `${activePersona.name} (Girl Bot)`
                : 'Bolt (Dog Bot)'}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="px-2.5 py-1 bg-slate-950/90 border border-slate-800 rounded-lg text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isMuted ? 'Muted' : 'Audio'}</span>
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="px-3 py-1 bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            {collapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Consolidated Dock Surface */}
      <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl">
        {/* Segmented Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab(HubTab.PLAY)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === HubTab.PLAY
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Solo Arena (10P)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(HubTab.QUIZ)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === HubTab.QUIZ
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Compatibility Challenge</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(HubTab.PROFILE)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === HubTab.PROFILE
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Partner Bot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(HubTab.LEADERBOARD)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === HubTab.LEADERBOARD
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(HubTab.CHAT)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === HubTab.CHAT
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live Chat ({chatMessages.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onStartMatch}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Match (Enter / Space)</span>
          </button>
        </div>

        {/* TAB 1: PLAY / MATCH BRIEFING */}
        {activeTab === HubTab.PLAY && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Match Format · Solo Queue
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {MAX_MATCH_CONTENDERS} Contenders · {MAX_PLAYER_HP} Max HP
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Scavenge world weapons, outrun the shrinking storm wall, and
                  place Top 3 to win the Cute Virtual Girl companion.
                </p>
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800 font-mono tabular-nums">
                Active Pool: {onlineCount}/{maxPoolSize} Connected · AI Backfill Ready
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Vending Machine Partner Bot
                </div>
                <div className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {profile.unlockedCuteGirl &&
                    profile.selectedCompanion === 'girl'
                      ? `${activePersona.name} (Cute Girl)`
                      : 'Bolt (Loyal Dog Bot)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {profile.unlockedCuteGirl
                    ? 'Unlocked! Visit any Love-Vend machine in-match to summon your Cute Girl or Dog bot (up to 50 Max DMG).'
                    : 'Finish in the Top 3 to unlock the Cute Virtual Girl! Until then, summon your Loyal Dog Bot (up to 50 Max DMG) at any Vending Machine.'}
                </p>
              </div>
              {profile.unlockedCuteGirl && (
                <button
                  type="button"
                  onClick={onOpenDateLounge}
                  className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold transition-colors text-center"
                >
                  Open Virtual Date Lounge
                </button>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">
                  Active Compatibility Synergy
                </div>
                <div className="text-sm font-bold text-amber-400">
                  {activeBuff.name}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeBuff.description}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
                <span>Compatibility Score</span>
                <span className="font-mono tabular-nums font-bold text-slate-100">
                  {profile.compatibilityScore} PTS
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPATIBILITY QUIZ */}
        {activeTab === HubTab.QUIZ && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-rose-400">
                Pre-Match Compatibility Calibration · Question {quizStep + 1} of{' '}
                {COMPATIBILITY_QUIZ_QUESTIONS.length}
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                Current Buff: {activeBuff.name}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-3">
              {COMPATIBILITY_QUIZ_QUESTIONS[quizStep].question}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {COMPATIBILITY_QUIZ_QUESTIONS[quizStep].options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handleQuizAnswer(opt.buffId, opt.trait)}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/60 rounded-xl text-left transition-colors flex flex-col justify-between gap-2"
                >
                  <span className="text-xs font-medium text-slate-100">
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-rose-400 font-mono">
                    Trait: {opt.trait} · {SYNERGY_BUFFS[opt.buffId].name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE & COMPANION CUSTOMIZATION */}
        {activeTab === HubTab.PROFILE && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Contender Display Name
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={profile.displayName}
                  onChange={(e) =>
                    onUpdateProfile((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Armor Finish</div>
                  <div className="flex items-center gap-1.5">
                    {ARMOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() =>
                          onUpdateProfile((prev) => ({
                            ...prev,
                            avatarColor: sw.hex,
                          }))
                        }
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          profile.avatarColor === sw.hex
                            ? 'border-white scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                        title={sw.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Visor Glow</div>
                  <div className="flex items-center gap-1.5">
                    {VISOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        onClick={() =>
                          onUpdateProfile((prev) => ({
                            ...prev,
                            visorColor: sw.hex,
                          }))
                        }
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          profile.visorColor === sw.hex
                            ? 'border-white scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: sw.hex }}
                        title={sw.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">
                    Vending Machine Helper Bot (Max {MAX_COMPANION_DAMAGE} DMG)
                  </span>
                  <span className="text-rose-400 font-semibold">
                    {profile.unlockedCuteGirl
                      ? 'Cute Girl Unlocked!'
                      : 'Top 3 Unlocks Cute Girl'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateProfile((prev) => ({
                        ...prev,
                        selectedCompanion: 'dog',
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      profile.selectedCompanion === 'dog' ||
                      !profile.unlockedCuteGirl
                        ? 'bg-slate-800 border-amber-400 text-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold">Bolt — Dog Bot</div>
                    <div className="text-[11px] text-slate-400">
                      Always Available · 50 Max DMG
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!profile.unlockedCuteGirl}
                    onClick={() =>
                      onUpdateProfile((prev) => ({
                        ...prev,
                        selectedCompanion: 'girl',
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      !profile.unlockedCuteGirl
                        ? 'bg-slate-950/50 border-slate-800 text-slate-500 cursor-not-allowed'
                        : profile.selectedCompanion === 'girl'
                          ? 'bg-rose-950/60 border-rose-400 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cute Virtual Girl</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {profile.unlockedCuteGirl
                        ? 'Ready · 50 Max DMG'
                        : 'Place Top 3 to Unlock'}
                    </div>
                  </button>
                </div>
              </div>

              {profile.unlockedCuteGirl && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">Girl Persona:</span>
                  <div className="flex items-center gap-1.5">
                    {(['aiko', 'hana', 'miku'] as GirlPersonaId[]).map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() =>
                          onUpdateProfile((prev) => ({
                            ...prev,
                            selectedGirlPersona: pid,
                            selectedCompanion: 'girl',
                          }))
                        }
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          profile.selectedGirlPersona === pid
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {CUTE_GIRL_PERSONAS[pid].name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEADERBOARD */}
        {activeTab === HubTab.LEADERBOARD && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-2 px-3 font-medium">Rank</th>
                  <th className="py-2 px-3 font-medium">Contender</th>
                  <th className="py-2 px-3 font-medium text-right">Wins</th>
                  <th className="py-2 px-3 font-medium text-right">Top 3</th>
                  <th className="py-2 px-3 font-medium text-right">Kills</th>
                  <th className="py-2 px-3 font-medium text-right">Damage</th>
                  <th className="py-2 px-3 font-medium text-right">Partner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {leaderboard.map((row, idx) => (
                  <tr
                    key={row.playerId}
                    className={
                      row.playerId === profile.id
                        ? 'bg-rose-950/30 text-white'
                        : 'text-slate-200'
                    }
                  >
                    <td className="py-2 px-3 font-mono tabular-nums font-bold text-amber-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-semibold">{row.displayName}</span>
                      <span className="text-slate-500 ml-1.5">
                        · {row.titleBadge}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                      {row.wins}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {row.top3Finishes}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-rose-400">
                      {row.kills}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">
                      {formatNumber(row.damageDealt)}
                    </td>
                    <td className="py-2 px-3 text-right text-[11px]">
                      {row.unlockedCuteGirl ? (
                        <span className="text-rose-400 font-medium">
                          Cute Girl
                        </span>
                      ) : (
                        <span className="text-slate-400">Dog Bot</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: LIVE MULTIPLAYER CHAT */}
        {activeTab === HubTab.CHAT && (
          <div className="flex flex-col gap-2.5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto flex flex-col gap-1.5">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="text-xs leading-relaxed">
                  <span className="font-semibold text-rose-400">
                    {msg.senderName}
                  </span>
                  <span className="text-slate-500 mx-1">
                    · {msg.senderBadge}:
                  </span>
                  <span
                    className={
                      msg.isSystem
                        ? 'text-amber-300 font-medium'
                        : 'text-slate-200'
                    }
                  >
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={180}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send message to lobby & contenders..."
                className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
