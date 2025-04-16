// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  leads;
  currentId;
  leadId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.leads = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.leadId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  async createLead(insertLead) {
    const id = this.leadId++;
    const lead = { ...insertLead, id };
    this.leads.set(id, lead);
    return lead;
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  storeName: text("store_name").notNull(),
  email: text("email"),
  city: text("city"),
  message: text("message"),
  createdAt: text("created_at").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertLeadSchema = createInsertSchema(leads).pick({
  name: true,
  whatsapp: true,
  storeName: true,
  email: true,
  city: true,
  message: true
});

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
async function registerRoutes(app2) {
  app2.post("/api/leads", async (req, res) => {
    try {
      const validatedData = insertLeadSchema.parse(req.body);
      const lead = {
        ...validatedData,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const createdLead = await storage.createLead(lead);
      try {
        console.log("\u{1F680} Enviando lead para o Discord:", lead);
        const webhookUrl = "https://discord.com/api/webhooks/1350725470781440050/Q4et3O6OUh4cjq2a7UwZo0z6P6qJXSw52mkfAL_AOHtXArjUXM5Cseqtzx6pRGh-P5wh";
        const webhookBody = {
          embeds: [{
            title: "Novo Lead Recebido! \u{1F389}",
            color: 1992158,
            fields: [
              { name: "Nome", value: lead.name, inline: true },
              { name: "WhatsApp", value: lead.whatsapp, inline: true },
              { name: "Loja", value: lead.storeName, inline: true },
              { name: "Email", value: lead.email || "N\xE3o informado", inline: true },
              { name: "Cidade", value: lead.city || "N\xE3o informada", inline: true },
              { name: "Mensagem", value: lead.message || "N\xE3o informada" }
            ],
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }]
        };
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookBody)
        });
      } catch (webhookError) {
        console.error("Erro ao enviar para o Discord:", webhookError);
      }
      res.status(201).json({
        message: "Lead submitted successfully",
        lead: createdLead
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({
          message: "Validation error",
          errors: validationError.details
        });
      } else {
        console.error("Error creating lead:", error);
        res.status(500).json({
          message: "Failed to submit lead information"
        });
      }
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import { resolve as resolve2, dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "client", "src"),
      "@shared": resolve(__dirname, "shared"),
      "@assets": resolve(__dirname, "attached_assets")
    }
  },
  root: resolve(__dirname, "client"),
  build: {
    outDir: resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = resolve2(__dirname2, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = resolve2(__dirname2, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(resolve2(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = Number(process.env.PORT) || 5e3;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
