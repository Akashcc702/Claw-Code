import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-4 p-4 md:p-6",
        isUser ? "bg-background" : "bg-card border-y border-border/50"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border shadow-sm mt-1">
        {isUser ? (
          <User className="h-4 w-4 text-foreground/80" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden px-1">
        {isUser ? (
          <div className="prose prose-invert max-w-none text-foreground">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0">
            {content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "text";
                    
                    if (!inline) {
                      return (
                        <CodeBlock
                          language={language}
                          value={String(children).replace(/\n$/, "")}
                        />
                      );
                    }
                    return (
                      <code
                        className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex items-center gap-1 h-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const onCopy = React.useCallback(() => {
    navigator.clipboard.writeText(value);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }, [value]);

  return (
    <div className="relative group rounded-md border border-border/50 bg-[#1E1E1E] my-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/20 bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground lowercase">
          {language}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Copy code"
        >
          {hasCopied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13px] leading-relaxed">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "inherit",
          }}
          wrapLines={true}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
