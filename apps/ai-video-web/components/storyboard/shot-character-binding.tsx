"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { charactersApi } from "@/lib/api";
import type { Shot } from "@/lib/api";

interface ShotCharacterBindingProps {
  projectId: string;
  shot: Shot;
  selectedCharacterIds: string[];
  onChange: (characterIds: string[]) => void;
  readOnly?: boolean;
}

export function ShotCharacterBinding({
  projectId,
  shot,
  selectedCharacterIds,
  onChange,
  readOnly = false,
}: ShotCharacterBindingProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: characters = [], isLoading } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => charactersApi.listCharacters(projectId),
  });

  const selectedCharacters = characters.filter((c) =>
    selectedCharacterIds.includes(c.id)
  );

  const toggleCharacter = (characterId: string) => {
    if (readOnly) return;
    if (selectedCharacterIds.includes(characterId)) {
      onChange(selectedCharacterIds.filter((id) => id !== characterId));
    } else {
      onChange([...selectedCharacterIds, characterId]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-text-secondary mb-1">出场角色</label>

      {/* Selected Characters Display */}
      <div className="flex flex-wrap gap-2">
        {selectedCharacters.length === 0 ? (
          <span className="text-xs text-text-disabled">未绑定角色</span>
        ) : (
          selectedCharacters.map((character) => (
            <motion.span
              key={character.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-anime-purple/20 text-anime-purple text-xs border border-anime-purple/30"
            >
              {character.name}
              {!readOnly && (
                <button
                  onClick={() => toggleCharacter(character.id)}
                  className="ml-1 hover:text-white"
                >
                  ×
                </button>
              )}
            </motion.span>
          ))
        )}
        {!readOnly && characters.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-2 py-1 rounded-full border border-divider text-text-secondary hover:text-white hover:border-anime-purple/50 transition-colors"
          >
            {isExpanded ? "收起" : "+ 添加"}
          </button>
        )}
      </div>

      {/* Character Selector */}
      <AnimatePresence>
        {isExpanded && !readOnly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-2 rounded-lg bg-panel-mid border border-divider mt-2">
              {isLoading ? (
                <div className="text-xs text-text-secondary">加载中...</div>
              ) : characters.length === 0 ? (
                <div className="text-xs text-text-secondary">暂无角色，请先在角色 Tab 创建</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {characters.map((character) => {
                    const isSelected = selectedCharacterIds.includes(character.id);
                    return (
                      <button
                        key={character.id}
                        onClick={() => toggleCharacter(character.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-anime-purple bg-anime-purple/10"
                            : "border-divider hover:border-anime-purple/50 bg-panel-deep"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-panel-mid flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {character.mainImage ? (
                            <img
                              src={character.mainImage}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs">{character.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{character.name}</p>
                          <p className="text-[10px] text-text-secondary truncate">
                            {character.role || character.gender || "角色"}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-anime-purple text-xs">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
