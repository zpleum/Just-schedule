import { NextRequest } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const events = body.events || [];

  // สร้าง JWT client ด้วย service account
  const authClient = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL!,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await authClient.authorize();

  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const spreadsheetId = process.env.SPREADSHEET_ID!;
  const sheetName = 'Users';

  // อ่านข้อมูล userId ที่มีอยู่แล้ว
  const existingData = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const userIds = (existingData.data.values || []).map(row => row[1]);

  for (const event of events) {
    if (event.type === 'message') {
      const userId = event.source.userId;
      if (userId && !userIds.includes(userId)) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: sheetName,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[new Date().toISOString(), userId]],
          },
        });
      }
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
