import { createHash } from "node:crypto";
import { google } from "googleapis";

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

export function parseServiceAccountJson(): ServiceAccountCredentials | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;

  const credentials = JSON.parse(json) as ServiceAccountCredentials;
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }

  return credentials;
}

export function getConfiguredSpreadsheetId(): string | null {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  return id || null;
}

async function getSheetsClient() {
  const credentials = parseServiceAccountJson();
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function listSheetTabs(spreadsheetId: string): Promise<string[]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });

  return (
    response.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? []
  );
}

export async function getSheetValues(
  spreadsheetId: string,
  tabName: string,
): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const escapedTab = tabName.replace(/'/g, "''");
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${escapedTab}'!A:L`,
  });

  return (response.data.values ?? []) as string[][];
}

export function hashSheetValues(values: string[][]): string {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

export function sheetValuesToCsv(values: string[][]): string {
  return values
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          if (/[",\n\r]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    )
    .join("\n");
}
