import { z } from "zod";
import { defineTool } from "./base.js";
import { generateJsonWithEscalation, TIER_ORDER } from "../../services/claude.js";
import { mobileAgent } from "../agents/mobile.agent.js";
import { getDb, isDbConfigured } from "../../db/client.js";
import { projects } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { recordAudit } from "../../db/repo.js";

const platforms = ["react_native_expo", "flutter", "ios_swift", "android_kotlin"] as const;

const inputSchema = {
  projectId: z.string().optional(),
  appName: z.string().optional().describe("App name; inferred from the project when omitted."),
  description: z.string().optional().describe("What the app does (required if no projectId)."),
  platform: z.enum(platforms).default("react_native_expo"),
  screens: z.array(z.string()).optional().describe("Screens to include; inferred when omitted."),
  startTier: z
    .enum(["haiku", "sonnet", "opus"])
    .default("haiku")
    .describe("Lowest Claude tier to start from. Lesser models are tried first and escalate."),
  persist: z.boolean().default(true),
};

interface MobileFile {
  path: string;
  language: string;
  description?: string;
  content: string;
}

interface MobileApp {
  appName: string;
  platform: string;
  summary: string;
  dependencies: string[];
  runInstructions: string[];
  files: MobileFile[];
}

// JSON Schema for Claude structured outputs (additionalProperties:false on every object).
const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    appName: { type: "string" },
    platform: { type: "string" },
    summary: { type: "string" },
    dependencies: { type: "array", items: { type: "string" } },
    runInstructions: { type: "array", items: { type: "string" } },
    files: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          language: { type: "string" },
          description: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "language", "content"],
      },
    },
  },
  required: ["appName", "platform", "summary", "dependencies", "runInstructions", "files"],
} as const;

function isMobileApp(data: unknown): data is MobileApp {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.files) && d.files.length > 0 && typeof d.appName === "string";
}

function expoFallback(appName: string, description: string, screens: string[]): MobileApp {
  const screenList = screens.length ? screens : ["Home", "Details", "Settings"];
  const screenFiles: MobileFile[] = screenList.map((name) => ({
    path: `app/screens/${name}Screen.tsx`,
    language: "tsx",
    description: `${name} screen`,
    content:
      `import { View, Text, StyleSheet } from "react-native";\n\n` +
      `export default function ${name}Screen() {\n` +
      `  return (\n    <View style={styles.container}>\n` +
      `      <Text style={styles.title}>${name}</Text>\n    </View>\n  );\n}\n\n` +
      `const styles = StyleSheet.create({\n` +
      `  container: { flex: 1, alignItems: "center", justifyContent: "center" },\n` +
      `  title: { fontSize: 22, fontWeight: "600" },\n});\n`,
  }));

  return {
    appName,
    platform: "react_native_expo",
    summary: description || `Expo mobile app: ${appName}`,
    dependencies: ["expo", "react", "react-native", "@react-navigation/native", "@react-navigation/native-stack"],
    runInstructions: ["npm install", "npx expo start"],
    files: [
      {
        path: "App.tsx",
        language: "tsx",
        description: "App entry with stack navigation",
        content:
          `import { NavigationContainer } from "@react-navigation/native";\n` +
          `import { createNativeStackNavigator } from "@react-navigation/native-stack";\n` +
          screenList
            .map((n) => `import ${n}Screen from "./app/screens/${n}Screen";`)
            .join("\n") +
          `\n\nconst Stack = createNativeStackNavigator();\n\n` +
          `export default function App() {\n  return (\n    <NavigationContainer>\n` +
          `      <Stack.Navigator>\n` +
          screenList
            .map((n) => `        <Stack.Screen name="${n}" component={${n}Screen} />`)
            .join("\n") +
          `\n      </Stack.Navigator>\n    </NavigationContainer>\n  );\n}\n`,
      },
      {
        path: "package.json",
        language: "json",
        description: "Expo project manifest",
        content: JSON.stringify(
          {
            name: appName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            version: "1.0.0",
            main: "node_modules/expo/AppEntry.js",
            scripts: { start: "expo start", android: "expo start --android", ios: "expo start --ios" },
          },
          null,
          2,
        ),
      },
      ...screenFiles,
    ],
  };
}

export const generateMobileApp = defineTool({
  name: "generate_mobile_app",
  title: "Generate Mobile App",
  description:
    "Generate a runnable mobile app codebase (screens, navigation, components, config) using " +
    "Claude with cost-tiered model escalation — lesser models (Haiku) are tried first and only " +
    "escalate to Sonnet/Opus when needed. Defaults to React Native + Expo.",
  inputSchema,
  async handler(args, ctx) {
    let appName = args.appName ?? "MobileApp";
    let description = args.description ?? "";

    if (args.projectId && isDbConfigured()) {
      const [project] = await getDb().select().from(projects).where(eq(projects.id, args.projectId));
      if (project) {
        appName = args.appName ?? project.name;
        description = args.description || project.description;
      }
    }

    const screens = args.screens ?? [];
    const system =
      mobileAgent.systemPrompt +
      " Generate a complete, runnable mobile app. Return only files with real, working code " +
      "(no placeholders or TODOs). Prefer idiomatic, production-quality code for the target platform.";

    const prompt =
      `App name: ${appName}\nPlatform: ${args.platform}\nDescription: ${description || "(none)"}\n` +
      `${screens.length ? `Required screens: ${screens.join(", ")}\n` : ""}` +
      `Produce navigation, screens, reusable components, and project config. Include dependencies ` +
      `and run instructions.`;

    const { data: app, source, tier, model, attempts } = await generateJsonWithEscalation<MobileApp>(
      {
        system,
        prompt,
        schema: outputJsonSchema as unknown as Record<string, unknown>,
        validate: isMobileApp,
        startTier: args.startTier,
      },
      expoFallback(appName, description, screens),
    );

    if (args.persist && args.projectId && isDbConfigured()) {
      await getDb()
        .update(projects)
        .set({ pages: { mobileApp: app }, type: "mobile_app", updatedAt: new Date() })
        .where(eq(projects.id, args.projectId));
      await recordAudit({
        actorId: ctx.actorId,
        action: "generate_mobile_app",
        resourceType: "project",
        resourceId: args.projectId,
        metadata: { platform: args.platform, fileCount: app.files.length, model, source },
      });
    }

    return {
      projectId: args.projectId,
      app,
      generatedBy: source,
      modelTier: tier,
      model,
      escalation: { startTier: args.startTier, order: TIER_ORDER, attempts },
      agent: mobileAgent.role,
    };
  },
});
