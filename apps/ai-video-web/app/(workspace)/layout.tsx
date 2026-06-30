"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FilmIcon, KeyIcon } from "@/components/icons";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-cinema flex">
      <aside className="w-16 lg:w-64 bg-panel-deep border-r border-divider flex flex-col fixed h-full transition-all duration-300">
        <div className="h-16 border-b border-divider flex items-center px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <FilmIcon className="w-6 h-6 text-anime-purple flex-shrink-0" />
            <span className="font-display text-xl font-bold text-white hidden lg:block">AI 漫剧</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link href="/projects" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all", pathname==="/projects"||pathname?.startsWith("/projects/")?"bg-anime-purple/10 text-anime-purple font-medium border border-anime-purple/20":"text-text-secondary hover:bg-panel-mid hover:text-white")}>
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span className="hidden lg:block">项目</span>
          </Link>
        </nav>
        <div className="p-3 lg:p-4 border-t border-divider">
          <Link href="/settings/models" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", pathname?.startsWith("/settings")?"bg-anime-purple/10 text-anime-purple font-medium":"text-text-secondary hover:bg-panel-mid hover:text-white")}>
            <KeyIcon className="w-5 h-5 flex-shrink-0" /><span className="hidden lg:block">模型中心</span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 ml-16 lg:ml-64 overflow-auto">{children}</main>
    </div>
  );
}
