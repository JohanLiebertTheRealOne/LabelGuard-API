import { HttpErrors } from "../utils/http.js";

export interface CursorData {
  lastId: number;
  lastScore?: number;
}

/**
 * Encode cursor data to base64url string
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString("base64url");
}

/**
 * Decode base64url cursor string to cursor data
 * @throws HttpError 400 if cursor is invalid
 */
export function decodeCursor(cursor: string): CursorData {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const data = JSON.parse(json) as CursorData;
    
    if (typeof data.lastId !== "number" || (data.lastScore !== undefined && typeof data.lastScore !== "number")) {
      throw new Error("Invalid cursor structure");
    }
    
    return data;
  } catch (error) {
    throw HttpErrors.badRequest("Invalid cursor format", "The provided cursor is malformed or invalid");
  }
}
