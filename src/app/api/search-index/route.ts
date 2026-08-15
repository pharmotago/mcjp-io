import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

function parseMarkdown(fileContent: string) {
  const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {} as any };
  const yaml = match[1];
  const data: any = {};
  yaml.split("\n").forEach(line => {
    const parts = line.split(":");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(":").trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val.startsWith("[") && val.endsWith("]")) {
        const inner = val.slice(1, -1);
        const matches = inner.match(/"([^"]+)"|'([^']+)'|([^,]+)/g);
        if (matches) {
          data[key] = matches.map(m => m.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
        } else {
          data[key] = [];
        }
      } else {
        data[key] = val;
      }
    }
  });
  return { data };
}

export async function GET() {
  try {
    const postsDir = path.join(process.cwd(), "content", "posts");
    const files = await fs.readdir(postsDir);
    const todayStr = new Date().toISOString().split("T")[0];

    const results = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const id = file.replace(/\.md$/, "");
      const fullPath = path.join(postsDir, file);
      const content = await fs.readFile(fullPath, "utf8");
      const { data } = parseMarkdown(content);

      const isPublished = data.published === "true" || data.published === true;
      if (!isPublished || (data.date && data.date > todayStr)) continue;

      results.push({
        id,
        title: data.title || id,
        category: data.category || "discipline",
        date: data.date || "",
        description: data.description || "",
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
      });
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
