"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquare,
  Users,
  Settings,
  Inbox,
  LogOut,
  Hash,
  Plug
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/useAuthStore";

const menuItems = [
  { icon: MessageSquare, label: "Dashboard", href: "/dashboard" },
  { icon: Inbox, label: "Inboxes", href: "/dashboard/inboxes" },
  { icon: Users, label: "Contatos", href: "/dashboard/contacts" },
  { icon: Plug, label: "Integrações", href: "/dashboard/integrations" },
];

const bottomItems = [
  { icon: Settings, label: "Configurações", href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-20 flex-col items-center border-r border-slate-800 bg-slate-950 py-6 space-y-6">
      {/* Logo */}
      <div className="mb-2">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg shadow-green-600/20">
          <Hash className="h-7 w-7 text-white" />
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col gap-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                        : "text-green-200/60 hover:bg-slate-800 hover:text-green-400"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-slate-800 border-slate-700 text-green-50"
                >
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="flex flex-col gap-3">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-green-600 text-white shadow-lg shadow-green-600/30"
                        : "text-green-200/60 hover:bg-slate-800 hover:text-green-400"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-slate-800 border-slate-700 text-green-50"
                >
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Logout Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex h-12 w-12 items-center justify-center rounded-xl text-red-400/80 hover:bg-red-950/50 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sair</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-slate-800 border-slate-700 text-green-50"
            >
              <p>Sair</p>
            </TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
