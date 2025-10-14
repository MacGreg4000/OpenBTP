declare global {
  namespace PrismaJson {
    type JsonValue = string | number | boolean | null | JsonObject | JsonArray
    interface JsonObject {
      [key: string]: JsonValue
    }
    type JsonArray = Array<JsonValue>
  }
}

declare module '@prisma/client' {
  interface PrismaClient {
    chat?: unknown;
    chatMessage?: unknown;
    chatParticipant?: unknown;
  }
} 