import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import http from "node:http";

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
  plugins: [payuReturnProxy(), react(), tailwindcss()],
});
