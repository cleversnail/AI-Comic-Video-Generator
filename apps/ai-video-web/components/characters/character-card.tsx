"use client";
import { motion } from "framer-motion";
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

export function CharacterCard({ character, isSelected, onClick }: CharacterCardProps) {
  const lockConfig = lockLevelConfig[character.lockLevel || "medium"];
  const viewCount = character.viewImages
    ? Object.values(character.viewImages).filter(Boolean).length
    : 0;
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
      {/* Character Image */}
      <div className="aspect-square bg-gradient-to-br from-anime-purple/10 to-panel-mid relative">
        {character.mainImage ? (
          <img
            src={character.mainImage}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
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
          {viewCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
              {viewCount} 视图
            </span>
          )}
          {variantCount > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
              {variantCount} 变体
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
