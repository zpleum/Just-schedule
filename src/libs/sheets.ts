import { google } from 'googleapis';
import type { JWT } from 'google-auth-library';

const sheets = google.sheets('v4');

let authClient: JWT | null = null;

async function getAuthClient() {
  if (authClient) return authClient;

  authClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL!,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );

  await authClient.authorize();

  return authClient;
}

export async function getSheetData(sheetName: string) {
  const auth = await getAuthClient();
  const spreadsheetId = process.env.SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range: sheetName,
  });

  return res.data.values || [];
}
