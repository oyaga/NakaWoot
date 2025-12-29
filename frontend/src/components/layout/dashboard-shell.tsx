"use client";

import React from 'react';
import { SidebarMain } from './sidebar-main';
import { SidebarContext } from './sidebar-context';

export function DashboardShell({ children }: { children: React.ReactNode }) {
return (
<div className="flex h-screen w-full overflow-hidden bg-white">
{/* 1. Sidebar Global (Fina) */}
<SidebarMain />

{/* 2. Sidebar de Contexto (Larga) */}
<SidebarContext />

{/* 3. Área de Trabalho Principal */}
<main className="flex flex-1 flex-col overflow-hidden relative">
{children}
</main>
</div>
);
}