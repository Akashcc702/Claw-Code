import React, { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { 
  useGetOpenaiConversation, 
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
  useListOpenaiConversations
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Chat() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const conversationId = params.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: isLoadingConversations } = useListOpenaiConversations();

  const { 
    data: conversation, 
    isLoading: isLoadingConversation 
  } = useGetOpenaiConversation(conversationId || 0, {
    query: {
      enabled: !!conversationId,
      queryKey: getGetOpenaiConversationQueryKey(conversationId || 0)
    }
  });

  // Redirect to /new if no conversation is selected and we've loaded conversations
  useEffect(() => {
    if (!conversationId && !isLoadingConversations) {
      if (!conversations || conversations.length === 0) {
        setLocation("/new");
      } else {
        // Just select the first one if we're at /
        setLocation(`/c/${conversations[0].id}`);
      }
    }
  }, [conversationId, conversations, isLoadingConversations, setLocation]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || !conversation) return;

    const userMessage = input.trim();
    const currentMode = conversation.mode;
    
    setInput("");
    setIsSending(true);
    setStreamingText("");

    // Optimistically update UI could be done here, but we'll rely on the stream start
    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage, mode: currentMode }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantText += data.content;
                setStreamingText(assistantText);
                scrollToBottom();
              }
              if (data.done) {
                // Streaming complete
                queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(conversationId) });
                queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
              }
            } catch (e) {
              console.error("Error parsing stream data", e);
            }
          }
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
      setStreamingText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 md:ml-64 relative">
        {/* Header */}
        <header className="h-14 flex items-center px-4 md:px-6 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-3 w-full pl-10 md:pl-0">
            {isLoadingConversation ? (
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <h1 className="font-semibold text-foreground truncate max-w-[60%]">
                  {conversation?.title || "Conversation"}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                  {conversation?.mode}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto w-full pb-32">
            {conversation?.messages?.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                role={msg.role as "user" | "assistant"} 
                content={msg.content} 
              />
            ))}
            
            {/* Optimistic User Message */}
            {isSending && (
              <ChatMessage role="user" content={input || "..."} />
            )}

            {/* Streaming Assistant Message */}
            {isSending && (
              <ChatMessage 
                role="assistant" 
                content={streamingText} 
                isStreaming={!streamingText} 
              />
            )}
            <div ref={messagesEndRef} className="h-px" />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
          <div className="max-w-3xl mx-auto w-full relative">
            <div className="relative flex items-end w-full rounded-lg border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-all">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CodeCraft..."
                className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 focus-visible:outline-none border-0 focus-visible:ring-0 text-sm overflow-hidden"
                rows={1}
                style={{
                  height: "60px",
                  maxHeight: "200px",
                }}
              />
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <Button
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-md transition-all duration-200",
                    input.trim() ? "bg-primary text-primary-foreground opacity-100 scale-100" : "bg-muted text-muted-foreground opacity-50 scale-95"
                  )}
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-center mt-2">
              <p className="text-[11px] text-muted-foreground">
                CodeCraft AI can make mistakes. Verify critical code before deploying.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
