"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Shot } from "@/lib/api";

interface StoryboardReaderProps {
  shots: Shot[];
  onClose: () => void;
}

export function StoryboardReader({ shots, onClose }: StoryboardReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortedShots = [...shots].sort((a, b) => a.sequence - b.sequence);
  const currentShot = sortedShots[currentIndex];
  const params = currentShot?.params || {};
  const hasAudio = !!params.audioUrl;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key === "g") {
        setShowGrid((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, sortedShots.length]);

  const goToNext = () => {
    if (currentIndex < sortedShots.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToShot = (index: number) => {
    setCurrentIndex(index);
    setShowGrid(false);
  };

  if (sortedShots.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-cinema flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-lg mb-4">暂无分镜</p>
          <Button onClick={onClose}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-cinema flex flex-col" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-panel-deep/80 backdrop-blur-sm border-b border-divider z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 className="font-display text-lg font-semibold text-white">故事板阅读模式</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            {currentIndex + 1} / {sortedShots.length}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGrid((prev) => !prev)}
            className="gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            网格
          </Button>
        </div>
      </div>

      {/* Grid View */}
      <AnimatePresence>
        {showGrid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 bg-cinema/95 backdrop-blur-md overflow-auto p-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
              {sortedShots.map((shot, index) => {
                const p = shot.params || {};
                return (
                  <motion.div
                    key={shot.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => goToShot(index)}
                    className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      currentIndex === index
                        ? "border-anime-purple shadow-lg shadow-anime-purple/20"
                        : "border-divider hover:border-anime-purple/50"
                    }`}
                  >
                    <div className="aspect-[3/4] bg-panel-mid relative">
                      {shot.imageUrl ? (
                        <img
                          src={shot.imageUrl}
                          alt={`分镜 ${shot.sequence}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl text-text-disabled">#{shot.sequence}</span>
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-black/60 text-white">
                          #{shot.sequence}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-panel-deep">
                      <p className="text-xs text-text-secondary line-clamp-2">
                        {p.title || shot.prompt?.substring(0, 40) || `分镜 ${shot.sequence}`}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Previous Button */}
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="absolute left-4 z-10 w-12 h-12 rounded-full bg-panel-mid/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-anime-purple/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Shot Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentShot.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="flex gap-8 max-w-5xl mx-auto px-20"
          >
            {/* Image */}
            <div className="flex-shrink-0 w-80">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-panel-mid border border-divider shadow-2xl">
                {currentShot.imageUrl ? (
                  <img
                    src={currentShot.imageUrl}
                    alt={`分镜 ${currentShot.sequence}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <svg className="w-16 h-16 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <p className="text-text-disabled text-sm">暂无预览图</p>
                  </div>
                )}
              </div>
              {/* Audio Player */}
              {hasAudio && (
                <div className="mt-4">
                  <audio
                    controls
                    className="w-full"
                    src={params.audioUrl}
                  />
                </div>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="mb-4">
                <span className="text-xs text-text-disabled font-mono">
                  分镜 {currentShot.sequence}
                </span>
                {params.emotion && (
                  <Badge variant="default" className="ml-2 text-[10px]">
                    {params.emotion}
                  </Badge>
                )}
              </div>

              <h3 className="font-display text-2xl font-bold text-white mb-4">
                {params.title || `分镜 ${currentShot.sequence}`}
              </h3>

              {params.description && (
                <p className="text-text-secondary leading-relaxed mb-6">
                  {params.description}
                </p>
              )}

              {/* Dialogue */}
              {params.dialogue && (
                <div className="mb-4 p-4 rounded-xl bg-panel-mid/50 border border-divider">
                  <p className="text-xs text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    台词
                  </p>
                  <p className="text-white font-medium">「{params.dialogue}」</p>
                </div>
              )}

              {/* Narration */}
              {params.narration && (
                <div className="mb-4 p-4 rounded-xl bg-panel-mid/30 border border-divider">
                  <p className="text-xs text-text-secondary mb-2 flex items-center gap-2">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    旁白
                  </p>
                  <p className="text-text-secondary italic">{params.narration}</p>
                </div>
              )}

              {/* Subtitle */}
              {params.subtitle && (
                <div className="mb-4 p-4 rounded-xl bg-black/40 border border-divider">
                  <p className="text-xs text-text-secondary mb-2">字幕</p>
                  <p className="text-white text-lg font-medium text-center">{params.subtitle}</p>
                </div>
              )}

              {/* Camera Info */}
              <div className="flex flex-wrap gap-2 mt-4">
                {params.shotType && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-anime-purple/20 text-anime-purple border border-anime-purple/30">
                    {params.shotType}
                  </span>
                )}
                {params.cameraAngle && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {params.cameraAngle}
                  </span>
                )}
                {params.lighting && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-warm-orange/20 text-warm-orange border border-warm-orange/30">
                    {params.lighting}
                  </span>
                )}
                {currentShot.duration && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-panel-mid text-text-secondary border border-divider">
                    {(currentShot.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Next Button */}
        <button
          onClick={goToNext}
          disabled={currentIndex === sortedShots.length - 1}
          className="absolute right-4 z-10 w-12 h-12 rounded-full bg-panel-mid/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-anime-purple/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-panel-deep/80 backdrop-blur-sm border-t border-divider">
        <div className="flex items-center gap-2">
          {sortedShots.map((shot, index) => (
            <button
              key={shot.id}
              onClick={() => goToShot(index)}
              className={`flex-1 h-2 rounded-full transition-all ${
                currentIndex === index
                  ? "bg-anime-purple"
                  : index < currentIndex
                  ? "bg-anime-purple/30"
                  : "bg-divider hover:bg-anime-purple/20"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-text-disabled">
            按 ← → 键或空格键翻页 · 按 G 键切换网格视图 · 按 ESC 退出
          </p>
          <p className="text-xs text-text-secondary">
            总时长：{(sortedShots.reduce((sum, s) => sum + (s.duration || 3000), 0) / 1000).toFixed(1)}s
          </p>
        </div>
      </div>
    </div>
  );
}
