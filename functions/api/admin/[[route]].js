/**
 * Cloudflare Pages Function - Admin API
 * 管理自定义接口：读取、添加、删除
 * 使用 KV 存储自定义接口数据
 */

export const config = { runtime: "edge" };

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Password validation
function verifyAuth(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const adminPass = typeof ADMIN_PASSWORD !== "undefined" ? ADMIN_PASSWORD : "tvbox2024";

  if (authHeader === "Bearer " + adminPass) {
    return true;
  }
  return false;
}

// Simple hash for session token (not crypto-grade, but sufficient for this use case)
async function hashToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + (typeof ADMIN_PASSWORD !== "undefined" ? ADMIN_PASSWORD : "tvbox2024"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet(context) {
  const { request } = context;

  // Handle OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!verifyAuth(request)) {
    return jsonResponse({ error: "未授权" }, 401);
  }

  try {
    // Try to read from KV first
    if (typeof context.env !== "undefined" && context.env.TVBOX_KV) {
      const data = await context.env.TVBOX_KV.get("custom_sources", "json");
      return jsonResponse({
        success: true,
        sources: data || [],
        storage: "kv",
      });
    }

    // Fallback: read from custom_sources.json via fetch
    const baseUrl = new URL(request.url).origin;
    const res = await fetch(baseUrl + "/custom_sources.json");
    if (res.ok) {
      const data = await res.json();
      return jsonResponse({
        success: true,
        sources: data || [],
        storage: "file",
      });
    }

    return jsonResponse({ success: true, sources: [], storage: "none" });
  } catch (e) {
    return jsonResponse({ success: true, sources: [], storage: "error: " + e.message });
  }
}

export async function onRequestPost(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (!verifyAuth(request)) {
    return jsonResponse({ error: "未授权" }, 401);
  }

  try {
    const body = await request.json();
    const { action, name, url, id } = body;

    if (action === "login") {
      // Already verified by verifyAuth, generate session token
      const token = crypto.randomUUID();
      const tokenHash = await hashToken(token);
      return jsonResponse({ success: true, token });
    }

    if (action === "add") {
      if (!name || !url) {
        return jsonResponse({ error: "名称和地址不能为空" }, 400);
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return jsonResponse({ error: "地址格式不正确" }, 400);
      }

      const newSource = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: name.trim(),
        url: url.trim(),
        created_at: new Date().toISOString(),
      };

      // Try KV storage
      if (typeof context.env !== "undefined" && context.env.TVBOX_KV) {
        const existing = (await context.env.TVBOX_KV.get("custom_sources", "json")) || [];
        existing.push(newSource);
        await context.env.TVBOX_KV.put("custom_sources", JSON.stringify(existing));
        return jsonResponse({ success: true, source: newSource, storage: "kv" });
      }

      // Fallback response (file-based needs GitHub API or manual edit)
      return jsonResponse({
        success: true,
        source: newSource,
        storage: "memory",
        message: "KV未绑定，数据仅存储在内存中。请绑定 KV 命名空间实现持久化存储。",
      });
    }

    if (action === "delete") {
      if (!id) {
        return jsonResponse({ error: "缺少接口ID" }, 400);
      }

      if (typeof context.env !== "undefined" && context.env.TVBOX_KV) {
        const existing = (await context.env.TVBOX_KV.get("custom_sources", "json")) || [];
        const filtered = existing.filter((s) => s.id !== id);
        if (filtered.length === existing.length) {
          return jsonResponse({ error: "未找到该接口" }, 404);
        }
        await context.env.TVBOX_KV.put("custom_sources", JSON.stringify(filtered));
        return jsonResponse({ success: true, remaining: filtered.length });
      }

      return jsonResponse({
        success: false,
        error: "KV未绑定，无法删除",
      });
    }

    return jsonResponse({ error: "未知操作" }, 400);
  } catch (e) {
    return jsonResponse({ error: "请求处理失败: " + e.message }, 500);
  }
}
