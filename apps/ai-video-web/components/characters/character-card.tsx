"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Character } from "@/lib/api";

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onClick?: () => void;
}

const lockLevelConfig = {
  loose: { label: "宽松", color: "bg-green-500/20 text-green-400", description: "允许较大变化" },
  medium: { label: "中等", color: "bg-yellow-500/20 text-yellow-400", description: "保持基本特征" },
  strict: { label: "严格", color: "bg-red-500/20 text-red-400", description: "高度一致" },
};

const viewLabels: Record<string, string> = {
  front: "正",
  three_quarter: "侧",
  side: "侧",
  back: "背",
};

export function CharacterCard({ character, isSelected, onClick }: CharacterCardProps) {
  const lockConfig = lockLevelConfig[character.lockLevel || "medium"];
  const viewImages = character.viewImages || {};
  const hasViews = Object.values(viewImages).some(Boolean);
  const variantCount = character.variants?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
        isSelected
          ? "border-anime-purple shadow-lg shadow-anime-purple/20"
          : "border-divider hover:border-anime-purple/50"
      }`}
      onClick={onClick}
    >
      {/* Character Image / Views Grid */}
      <div className="aspect-square bg-gradient-to-br from-anime-purple/10 to-panel-mid relative">
        {hasViews ? (
          // Show 4-view grid when views exist
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            {["front", "three_quarter", "side", "back"].map((viewKey) => (
              <div key={viewKey} className="relative overflow-hidden bg-panel-deep">
                {viewImages[viewKey as keyof typeof viewImages] ? (
                  <Image
                    src={viewImages[viewKey as keyof typeof viewImages] as string}
                    alt={viewLabels[viewKey]}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[10px] text-text-disabled">{viewLabels[viewKey]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : character.mainImage ? (
          // Show main image if no views
          <Image
            src={character.mainImage}
            alt={character.name}
            width={200}
            height={200}
            className="w-full h-full object-cover"
          />
        ) : (
          // Show placeholder icon
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-text-disabled"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        {/* Lock Level Badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-2 py-1 rounded-full ${lockConfig.color}`}>
            {lockConfig.label}
          </span>
        </div>

        {/* Stats Badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {hasViews && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 backdrop-blur-sm">
              4视图
            </span>
          )}
          {variantCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 backdrop-blur-sm">
              {variantCount}变体
            </span>
          )}
        </div>
      </div>

      {/* Character Info */}
      <div className="p-3 bg-panel-mid">
        <h3 className="font-medium text-white truncate">{character.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          {character.gender && (
            <span className="text-xs text-text-secondary">{character.gender}</span>
          )}
          {character.age && (
            <span className="text-xs text-text-disabled">{character.age}岁</span>
          )}
          {character.role && (
            <Badge variant="default" className="text-[10px]">
              {character.role}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
