import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
  GenerateOpenaiImageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

function getSystemPrompt(mode: string): string {
  switch (mode) {
    case "debug":
      return `You are CodeCraft AI in Debug mode. Your job is to help users identify and fix bugs in their code.
When given code with bugs:
1. First identify all syntax and logical errors
2. Explain each bug clearly
3. Provide corrected code with inline comments explaining the fixes
4. Format code in proper markdown code blocks with language tags
Be thorough, precise, and educational.`;
    case "automation":
      return `You are CodeCraft AI in Automation Script mode. Your job is to generate scripts for automating repetitive tasks.
When a user describes a task:
1. Generate a complete, working script (Python, Bash, or JavaScript as appropriate)
2. Add comments explaining each section
3. Include usage instructions at the top
4. Handle edge cases and errors gracefully
Format code in proper markdown code blocks with language tags.`;
    default:
      return `You are CodeCraft AI in Code Generation mode. Your job is to generate clean, working code from user descriptions.
When a user requests code:
1. Generate complete, working code (not pseudocode)
2. Support Python, JavaScript, TypeScript, C, Rust, and other languages
3. Add helpful comments explaining key sections
4. Include usage examples where relevant
Format all code in proper markdown code blocks with the correct language tag.
Be concise in explanations but thorough in the code.`;
  }
}

router.get("/openai/conversations", async (_req, res): Promise<void> => {
  const convs = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(convs);
});

router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .insert(conversations)
    .values({ title: parsed.data.title, mode: parsed.data.mode })
    .returning();

  res.status(201).json(conv);
});

router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json({ ...conv, messages: msgs });
});

router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .delete(conversations)
    .where(eq(conversations.id, params.data.id))
    .returning();

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, params.data.id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const convId = params.data.id;
  const { content, mode } = body.data;

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: convId,
    role: "user",
    content,
  });

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(messages.createdAt);

  const chatMessages = [
    { role: "system" as const, content: getSystemPrompt(mode || conv.mode) },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-5.3-codex",
    max_completion_tokens: 8192,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: convId,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/openai/generate-image", async (req, res): Promise<void> => {
  const parsed = GenerateOpenaiImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const buffer = await generateImageBuffer(parsed.data.prompt, parsed.data.size as "1024x1024" | "512x512" | "256x256" | undefined);
  res.json({ b64_json: buffer.toString("base64") });
});

export default router;
