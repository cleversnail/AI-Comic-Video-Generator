"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SparklesIcon, ChevronRightIcon, FilmIcon } from "@/components/icons";
import { projectsApi, storyboardApi } from "@/lib/api";

const STYLES = [
  { id: "anime", label: "动漫", description: "日系动漫风格" },
  { id: "realistic", label: "写实", description: "真实照片风格" },
  { id: "comic", label: "漫画", description: "漫画分镜风格" },
  { id: "cyberpunk", label: "赛博朋克", description: "未来科技风格" },
  { id: "ancient", label: "古风", description: "中国古风风格" },
];

const CHARACTER_TEMPLATES = [
  { id: "student", name: "高中生", description: "青春活力的高中生角色" },
  { id: "warrior", name: "战士", description: "英勇善战的战士角色" },
  { id: "mage", name: "魔法师", description: "神秘强大的魔法师角色" },
  { id: "detective", name: "侦探", description: "聪明机智的侦探角色" },
];

type Step = "character" | "story" | "generating" | "preview";

export default function QuickCreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("character");
  const [projectName, setProjectName] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characterDescription, setCharacterDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [storyText, setStoryText] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string>("anime");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [shots, setShots] = useState<any[]>([]);

  // 创建项目 mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; style: string }) =>
      projectsApi.createProject(data),
    onSuccess: (project) => {
      setProjectId(project.id);
      setCurrentStep("story");
    },
  });

  // 生成分镜 mutation
  const generateStoryboardMutation = useMutation({
    mutationFn: (data: { prompt: string }) =>
      storyboardApi.generate(projectId!, data),
    onSuccess: (storyboard) => {
      setShots(storyboard.shots || []);
      setCurrentStep("preview");
    },
  });

  // 处理角色模板选择
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = CHARACTER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setCharacterName(template.name);
      setCharacterDescription(template.description);
    }
  };

  // 进入下一步
  const handleNext = () => {
    if (currentStep === "character") {
      if (!projectName.trim()) {
        alert("请输入项目名称");
        return;
      }
      createProjectMutation.mutate({
        name: projectName,
        style: selectedStyle,
      });
    } else if (currentStep === "story") {
      if (!storyText.trim()) {
        alert("请输入故事内容");
        return;
      }
      setCurrentStep("generating");
      generateStoryboardMutation.mutate({
        prompt: `角色：${characterName}，${characterDescription}\n\n故事：${storyText}`,
      });
    }
  };

  // 前往 Studio 精修
  const handleGoToStudio = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/studio`);
    }
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { id: "character", label: "角色" },
      { id: "story", label: "故事" },
      { id: "generating", label: "生成" },
      { id: "preview", label: "预览" },
    ];

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step.id
                  ? "bg-anime-purple text-white"
                  : steps.findIndex((s) => s.id === currentStep) > index
                  ? "bg-neon-cyan text-white"
                  : "bg-panel-mid text-text-secondary"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                currentStep === step.id ? "text-white" : "text-text-secondary"
              }`}
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRightIcon className="w-4 h-4 text-text-disabled mx-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // 渲染角色步骤
  const renderCharacterStep = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">
        创建你的角色
      </h2>

      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">项目名称</label>
        <Input
          placeholder="给你的漫剧起个名字..."
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">选择角色模板</label>
        <div className="grid grid-cols-2 gap-3">
          {CHARACTER_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedTemplate === template.id
                  ? "border-anime-purple bg-anime-purple/10"
                  : "border-divider bg-panel-deep hover:border-anime-purple/50"
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <h3 className="text-white font-medium mb-1">{template.name}</h3>
              <p className="text-text-secondary text-xs">{template.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">角色名称</label>
        <Input
          placeholder="输入角色名称..."
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">角色描述</label>
        <Textarea
          placeholder="描述角色的外貌、性格特点..."
          value={characterDescription}
          onChange={(e) => setCharacterDescription(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="mb-8">
        <label className="block text-sm text-text-secondary mb-2">选择风格</label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((style) => (
            <Badge
              key={style.id}
              variant={selectedStyle === style.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedStyle(style.id)}
            >
              {style.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );

  // 渲染故事步骤
  const renderStoryStep = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">
        输入你的故事
      </h2>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-panel-deep border border-divider">
          <div className="w-10 h-10 rounded-full bg-anime-purple/10 flex items-center justify-center">
            <FilmIcon className="w-5 h-5 text-anime-purple" />
          </div>
          <div>
            <p className="text-white font-medium">{characterName || "未命名角色"}</p>
            <p className="text-text-secondary text-xs">{characterDescription || "暂无描述"}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-text-secondary mb-2">故事内容</label>
        <Textarea
          placeholder="输入你的故事、剧情或对话...&#10;&#10;例如：&#10;在教室里，小明正在发呆。突然，门被推开了，一个陌生的女孩走了进来。他们的目光相遇了..."
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
          className="min-h-[200px]"
        />
      </div>

      <div className="mb-6">
        <p className="text-text-secondary text-sm">
          💡 提示：输入 50-500 字的故事内容，AI 会自动拆分成 4-8 个分镜
        </p>
      </div>
    </div>
  );

  // 渲染生成中步骤
  const renderGeneratingStep = () => (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="w-16 h-16 rounded-full border-4 border-anime-purple border-t-transparent animate-spin mx-auto mb-6" />
      <h2 className="font-display text-2xl font-bold text-white mb-4">
        AI 正在创作中...
      </h2>
      <p className="text-text-secondary mb-8">
        正在将你的故事拆分成专业分镜，请稍候
      </p>
      <div className="flex justify-center gap-2">
        {["分析故事", "拆分场景", "生成提示词", "创建分镜"].map((step, index) => (
          <Badge key={index} variant="outline" className="animate-pulse">
            {step}
          </Badge>
        ))}
      </div>
    </div>
  );

  // 渲染预览步骤
  const renderPreviewStep = () => (
    <div className="max-w-4xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-white mb-6 text-center">
        🎉 你的漫剧草稿已生成！
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {shots.map((shot, index) => (
          <div
            key={shot.id}
            className="aspect-[3/4] rounded-xl overflow-hidden bg-panel-deep border border-divider"
          >
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 bg-gradient-to-br from-anime-purple/10 to-panel-mid flex items-center justify-center">
                {shot.imageUrl ? (
                  <img
                    src={shot.imageUrl}
                    alt={`Shot ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">🎬</span>
                )}
              </div>
              <div className="p-2 bg-panel-deep">
                <p className="text-xs text-white font-medium truncate">
                  {shot.prompt?.substring(0, 30) || `分镜 ${index + 1}`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => setCurrentStep("character")}>
          重新创作
        </Button>
        <Button className="gap-2" onClick={handleGoToStudio}>
          <SparklesIcon className="w-4 h-4" /> 前往精修
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          极速模式
        </h1>
        <p className="text-text-secondary">
          3 分钟完成第一条漫剧草稿
        </p>
      </div>

      {renderStepIndicator()}

      <Card className="mb-8">
        <CardContent className="p-6">
          {currentStep === "character" && renderCharacterStep()}
          {currentStep === "story" && renderStoryStep()}
          {currentStep === "generating" && renderGeneratingStep()}
          {currentStep === "preview" && renderPreviewStep()}
        </CardContent>
      </Card>

      {currentStep !== "generating" && currentStep !== "preview" && (
        <div className="flex justify-center">
          <Button
            size="lg"
            className="gap-2"
            onClick={handleNext}
            disabled={createProjectMutation.isPending || generateStoryboardMutation.isPending}
          >
            {currentStep === "character" ? "下一步：输入故事" : "开始生成"}
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
