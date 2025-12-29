'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { Circle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const statusMap = {
  online: { label: 'Online', color: 'text-green-500' },
  busy: { label: 'Ocupado', color: 'text-yellow-500' },
  offline: { label: 'Offline', color: 'text-slate-400' },
};

export function UserProfileNav() {
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleStatusChange = (status: 'online' | 'busy' | 'offline') => {
    // Mock de atualização - Futuro PATCH /api/v1/profile
    toast.info(`Status alterado para ${status}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/login');
  };

  if (!session?.user) return null;

  const user = session.user;
  const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'User';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="p-4 border-t border-slate-800 flex items-center space-x-3 hover:bg-slate-800 transition-colors cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-600 text-white text-xs">
              {userName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm text-left flex-1 overflow-hidden">
            <p className="text-white font-medium truncate">{userName}</p>
            <p className="text-xs text-slate-500 flex items-center">
              <Circle size={8} className={`mr-1 fill-current text-green-500`} />
              Online
            </p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" side="right">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleStatusChange('online')}>
          <Circle size={8} className="mr-2 fill-green-500 text-green-500" /> Online
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
          <Circle size={8} className="mr-2 fill-yellow-500 text-yellow-500" /> Ocupado
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
          <Circle size={8} className="mr-2 fill-slate-400 text-slate-400" /> Offline
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
