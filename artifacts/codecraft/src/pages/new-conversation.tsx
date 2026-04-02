import React, { useState } from "react";
import { useLocation } from "wouter";
import { useCreateOpenaiConversation, getListOpenaiConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Terminal, Bug, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

const MODES = [
  {
    id: "generate",
    title: "Generate Code",
    description: "Build new features, components, and scripts from scratch. Best for starting new work.",
    icon: Terminal,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    id: "debug",
    title: "Debug Code",
    description: "Paste errors, stack traces, and broken code. Get root causes and exact fixes.",
    icon: Bug,
    color: "text-rose-400",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
  },
  {
    id: "automation",
    title: "Automation Script",
    description: "Create bash, python, or Node scripts for data processing and dev ops tasks.",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  }
] as const;

export default function NewConversation() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createConversation = useCreateOpenaiConversation();
  const [selectedMode, setSelectedMode] = useState<string>("generate");

  const handleCreate = () => {
    const modeObj = MODES.find((m) => m.id === selectedMode);
    if (!modeObj) return;

    createConversation.mutate(
      {
        data: {
          title: `New ${modeObj.title}`,
          mode: selectedMode,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          setLocation(`/c/${data.id}`);
        },
      }
    );
  };

  return (
    <div className="flex h-screen bg-background selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 relative overflow-y-auto">
        <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
          <div className="max-w-3xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-card border border-border shadow-sm mb-2">
                <Terminal className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Start a new session
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Select an operational mode for this conversation. CodeCraft will adapt its context and behavior accordingly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {MODES.map((mode) => {
                const isSelected = selectedMode === mode.id;
                const Icon = mode.icon;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={cn(
                      "group text-left p-6 rounded-xl border-2 transition-all duration-200 flex flex-col items-start gap-4 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected 
                        ? "border-primary bg-card/80 shadow-[0_0_20px_rgba(var(--primary),0.1)]" 
                        : "border-border/50 bg-card hover:border-border hover:bg-card/80"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-lg border transition-colors",
                      mode.bg, mode.border
                    )}>
                      <Icon className={cn("h-6 w-6", mode.color)} />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {mode.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {mode.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)] animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center">
              <Button 
                size="lg" 
                className="px-8 font-semibold text-primary-foreground h-12 text-base group"
                onClick={handleCreate}
                disabled={createConversation.isPending}
              >
                {createConversation.isPending ? "Initializing..." : "Initialize Session"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
