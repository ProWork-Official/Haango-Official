import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import http from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import {
  createBreadcrumbStructuredData,
  SEO_NO_INDEX_PAGES,
  SEO_PAGES,
  SITE_URL,
} from "./src/lib/seo.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceHeadTag(html, matcher, tag) {
  if (matcher.test(html)) return html.replace(matcher, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function withRouteSeo(template, pathname, metadata) {
  const canonicalUrl = new URL(pathname, SITE_URL).toString();
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  const tags = [
    [`<meta\\s+name=["']description["'][^>]*>`, `<meta name="description" content="${escapeHtml(metadata.description)}" />`],
    [`<meta\\s+name=["']robots["'][^>]*>`, `<meta name="robots" content="${metadata.robots || "index,follow"}" />`],
    [`<meta\\s+property=["']og:type["'][^>]*>`, '<meta property="og:type" content="website" />'],
    [`<meta\\s+property=["']og:locale["'][^>]*>`, '<meta property="og:locale" content="en_IN" />'],
    [`<meta\\s+property=["']og:site_name["'][^>]*>`, '<meta property="og:site_name" content="Haango" />'],
    [`<meta\\s+property=["']og:url["'][^>]*>`, `<meta property="og:url" content="${canonicalUrl}" />`],
    [`<meta\\s+property=["']og:title["'][^>]*>`, `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`],
    [`<meta\\s+property=["']og:description["'][^>]*>`, `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`],
    [`<meta\\s+name=["']twitter:title["'][^>]*>`, `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`],
    [`<meta\\s+name=["']twitter:description["'][^>]*>`, `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`],
  ];

  tags.forEach(([pattern, tag]) => {
    html = replaceHeadTag(html, new RegExp(pattern, "i"), tag);
  });
  html = replaceHeadTag(
    html,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`,
  );

  const breadcrumb = metadata.robots ? null : createBreadcrumbStructuredData(pathname, {
    experience: "Experiences",
    "how-it-works": "How It Works",
    "become-buddy": "Become a Buddy",
    "community-guidelines": "Community Guidelines",
    "buddy-guidelines": "Buddy Guidelines",
    "privacy-policy": "Privacy Policy",
    "cancellation-policy": "Cancellation Policy",
  });
  if (breadcrumb) {
    const jsonLd = JSON.stringify(breadcrumb).replace(/</g, "\\u003c");
    html = html.replace(
      "</head>",
      `    <script type="application/ld+json" data-haango-seo="true">${jsonLd}</script>\n  </head>`,
    );
  }
  return html;
}

function seoRouteHtmlPlugin() {
  return {
    name: "haango-seo-route-html",
    async writeBundle(outputOptions) {
      const outputDirectory = resolve(outputOptions.dir || "dist");
      const template = await readFile(resolve(outputDirectory, "index.html"), "utf8");
      const routes = [
        ...Object.entries(SEO_PAGES),
        ...Object.entries(SEO_NO_INDEX_PAGES),
      ].filter(([pathname]) => pathname !== "/");
      await Promise.all(routes.map(([pathname, metadata]) => writeFile(
        resolve(outputDirectory, `${pathname.slice(1)}.seo.html`),
        withRouteSeo(template, pathname, metadata),
        "utf8",
      )));
    },
  };
}

function payuReturnProxy() {
  const apiBaseUrl = (process.env.VITE_API_URL || "http://localhost:5005/api").replace(/\/$/, "");

  return {
    name: "haango-payu-return-proxy",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url || "/", "http://localhost");
        if (request.method !== "POST" || requestUrl.pathname !== "/booking") return next();

        const redirectToBooking = () => {
          const params = new URLSearchParams();
          const buddyId = requestUrl.searchParams.get("buddyId");
          if (buddyId) params.set("buddyId", buddyId);
          params.set("payment", "verification-failed");
          response.writeHead(303, { Location: `/booking?${params.toString()}` });
          response.end();
        };

        const targetUrl = new URL(`${apiBaseUrl}/bookings/payu/return${requestUrl.search}`);
        const headers = { ...request.headers, host: targetUrl.host };
        delete headers.connection;
        delete headers.origin;
        delete headers.referer;

        const proxyRequest = http.request(targetUrl, { method: "POST", headers }, (proxyResponse) => {
          const isRedirect = proxyResponse.statusCode >= 300
            && proxyResponse.statusCode < 400
            && Boolean(proxyResponse.headers.location);

          if (isRedirect) {
            response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
            proxyResponse.pipe(response);
            return;
          }

          proxyResponse.resume();
          redirectToBooking();
        });

        proxyRequest.on("error", (error) => {
          console.error("PayU return proxy failed:", error.message);
          if (!response.headersSent) redirectToBooking();
          else response.destroy(error);
        });

        request.pipe(proxyRequest);
      });
    },
  };
}

export default defineConfig({
  plugins: [payuReturnProxy(), react(), tailwindcss(), seoRouteHtmlPlugin()],
});
