import React from "react";
import { Link, useLocation } from "wouter";
import { 
  useListOpenaiConversations, 
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare, Terminal, Bug, Zap, Trash2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useListOpenaiConversations();
  const deleteConversation = useDeleteOpenaiConversation();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteConversation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (location === `/c/${id}`) {
          window.location.href = "/";
        }
      }
    });
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "generate": return <Terminal className="h-4 w-4" />;
      case "debug": return <Bug className="h-4 w-4" />;
      case "automation": return <Zap className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground tracking-tight">
          <Terminal className="h-5 w-5 text-primary" />
          CodeCraft
        </div>
      </div>
      
      <div className="p-4">
        <Link href="/new" className="w-full flex items-center justify-start gap-2 shadow-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors">
          <Plus className="h-4 w-4" />
          New Chat
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2 space-y-1">
        <div className="text-xs font-medium text-sidebar-foreground/50 px-2 py-1 mb-1 uppercase tracking-wider">
          History
        </div>
        
        {isLoading ? (
          <div className="px-2 py-4 text-sm text-sidebar-foreground/50 flex justify-center">
            <div className="animate-pulse flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-sidebar-foreground/20 rounded-full" />
              <div className="w-1.5 h-1.5 bg-sidebar-foreground/20 rounded-full" />
              <div className="w-1.5 h-1.5 bg-sidebar-foreground/20 rounded-full" />
            </div>
          </div>
        ) : conversations?.length === 0 ? (
          <div className="px-2 py-4 text-sm text-sidebar-foreground/50 text-center">
            No conversations yet
          </div>
        ) : (
          conversations?.map((conv) => {
            const isActive = location === `/c/${conv.id}`;
            return (
              <Link key={conv.id} href={`/c/${conv.id}`}>
                <div
                  className={cn(
                    "group flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-all hover:bg-sidebar-accent cursor-pointer",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/70"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={cn(
                      "shrink-0",
                      isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}>
                      {getModeIcon(conv.mode)}
                    </span>
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-sidebar-foreground/50 hover:text-destructive transition-colors rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-3 left-3 z-50 bg-background border"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex w-64 flex-col fixed inset-y-0 z-40", className)}>
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleSidebar} />
          <div className="relative w-64 max-w-[80%] flex-col flex animate-in slide-in-from-left-full">
            <SidebarContent />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-sidebar-foreground"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
