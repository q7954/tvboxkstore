/**
 * Cloudflare Pages Function
 * 路径: /download/1/tvbox/source.json
 *
 * 逻辑：
 * - 浏览器访问（Accept 包含 text/html）→ 302 跳转 QQ 群
 * - TVBox App / 程序请求（Accept 为 application/json 或无 text/html）→ 透传原始 JSON 文件
 */

const QQ_GROUP_URL =
  "https://qm.qq.com/cgi-bin/qm/qr?k=dEBGYbmu1lIRp7bAgHFim0W1uDsYl9v5&jump_from=webapi&authKey=fmTG96MhfqDQ5KARA/OvnuWAigCAloClvYhtSiEQd0jQneXmGons54BwlAh1+bUi";

export async function onRequest(context) {
  const { request, env } = context;
  const acceptHeader = request.headers.get("Accept") || "";

  // 浏览器请求特征：Accept 包含 text/html
  const isBrowser = acceptHeader.includes("text/html");

  if (isBrowser) {
    // 浏览器访问：跳转到 QQ 群
    return Response.redirect(QQ_GROUP_URL, 302);
  }

  // TVBox App 或程序请求：透传静态 JSON 文件
  // 从 ASSETS 中获取原始文件（Cloudflare Pages 静态资源绑定）
  const assetUrl = new URL(request.url);
  const asset = await env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      headers: { Accept: "application/json" },
    })
  );

  // 克隆响应并确保正确的 Content-Type
  const response = new Response(asset.body, {
    status: asset.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
    },
  });

  return response;
}
