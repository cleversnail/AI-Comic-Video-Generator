"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { templatesApi, Template } from "@/lib/api";
import { useRouter } from "next/navigation";

interface TemplateMarketProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  { id: "all", label: "全部", icon: "📦" },
  { id: "story", label: "故事", icon: "📖" },
  { id: "character", label: "角色", icon: "👤" },
  { id: "style", label: "风格", icon: "🎨" },
  { id: "education", label: "教育", icon: "📚" },
  { id: "marketing", label: "营销", icon: "📢" },
];

export function TemplateMarket({ isOpen, onClose }: TemplateMarketProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", selectedCategory, search],
    queryFn: () => templatesApi.list(selectedCategory === "all" ? undefined : selectedCategory, search || undefined),
    enabled: isOpen,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["templateFavorites"],
    queryFn: () => templatesApi.getFavorites(),
    enabled: isOpen,
  });

  const cloneMutation = useMutation({
    mutationFn: (templateId: string) => templatesApi.clone(templateId),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      alert(`项目「${project.name}」创建成功！`);
      onClose();
      router.push(`/projects/${project.id}/studio`);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (templateId: string) => templatesApi.toggleFavorite(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["templateFavorites"] });
    },
  });

  const handleClone = (templateId: string) => {
    if (confirm("确定要使用此模板创建新项目吗？")) {
      cloneMutation.mutate(templateId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl max-h-[85vh] bg-panel-deep border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-divider">
              <div>
                <h3 className="font-display text-lg font-bold text-white">模板市场</h3>
                <p className="text-xs text-text-secondary">选择模板快速开始创作</p>
              </div>
              <button onClick={onClose} className="text-text-secondary hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-4 border-b border-divider">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="搜索模板..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-anime-purple text-white"
                          : "bg-panel-mid text-text-secondary hover:text-white"
                      }`}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-48 rounded-xl bg-panel-mid animate-pulse" />
                  ))}
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full bg-panel-mid flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="text-text-secondary">暂无模板</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-panel-mid border border-divider overflow-hidden hover:border-anime-purple/50 transition-colors"
                    >
                      {/* Cover */}
                      <div className="h-32 bg-gradient-to-br from-anime-purple/20 to-panel-deep flex items-center justify-center">
                        {template.coverUrl ? (
                          <img src={template.coverUrl} alt={template.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-12 h-12 text-text-disabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-white">{template.name}</h4>
                            <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                              {template.description || "暂无描述"}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              favoriteMutation.mutate(template.id);
                            }}
                            className="text-text-disabled hover:text-warm-orange transition-colors"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={favorites.some(f => f.id === template.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="default" className="text-[10px]">
                            {template.category}
                          </Badge>
                          {template.tags?.slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="default" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs text-text-disabled">
                          <span>❤️ {template.favoriteCount}</span>
                          <span>📋 {template.usageCount} 次使用</span>
                        </div>

                        <Button
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleClone(template.id)}
                          isLoading={cloneMutation.isPending}
                        >
                          使用此模板
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
