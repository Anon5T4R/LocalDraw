// IA local: conversa com o llama-server (OpenAI-compat em 127.0.0.1).
// Contrato da suíte: a IA só devolve JSON/texto; quem monta o diagrama é o código.

import { parseDiagramSpec, type DiagramSpec } from "./diagram";

interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(port: number, messages: ChatMsg[], maxTokens = 900): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      stream: false,
      // Desliga o "pensar" dos modelos que suportam (resposta direta).
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  if (!res.ok) throw new Error(`IA respondeu ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/** Extrai o 1º bloco JSON de uma resposta (tolerante a ```json e texto solto). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("a IA não devolveu JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

const DIAGRAM_SYSTEM = [
  "Você projeta fluxogramas. A partir do pedido do usuário (em português), responda",
  "SOMENTE com um objeto JSON, sem texto ao redor, no formato:",
  '{"nodes":[{"id":"n1","type":"terminator","label":"Início"}],"edges":[{"from":"n1","to":"n2","label":"sim"}]}',
  "- id: string curta e única por nó.",
  "- type: um de process | decision | terminator | data | database | document.",
  "  process = ação/etapa; decision = pergunta com saídas (use label nas arestas, ex.: sim/não);",
  "  terminator = início/fim; data = entrada/saída; database = armazenamento; document = documento/relatório.",
  "- label do nó: curto (1 a 6 palavras).",
  "- edges: ligações no sentido do fluxo; label é opcional (útil nas saídas de uma decisão).",
  "- Comece por um terminator 'Início' e termine em 'Fim'. Prefira 5 a 12 nós.",
].join("\n");

/** Pedido em linguagem natural → DiagramSpec validado. */
export async function generateDiagram(port: number, prompt: string): Promise<DiagramSpec> {
  const out = await chat(port, [
    { role: "system", content: DIAGRAM_SYSTEM },
    { role: "user", content: prompt },
  ]);
  return parseDiagramSpec(extractJson(out));
}
