import { getSheetData } from '@/libs/sheets';
import { sendLineMessage } from '@/libs/line';

function parseTime(time: string | number): number | null {
  if (typeof time === 'string') {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  } else if (typeof time === 'number') {
    const h = Math.floor(time);
    const m = Math.round((time - h) * 100);
    return h * 60 + m;
  }
  return null;
}

export async function GET() {
    try {
      const schedule = await getSheetData('Schedule');
      const users = await getSheetData('Users');
  
      const userIds = users.slice(1).map(r => r[1]).filter(Boolean);
  
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const dayMap = ["SU", "M", "T", "W", "TH", "F", "SA"];
      const today = dayMap[now.getDay()];
  
      for (let i = 9; i < schedule.length; i++) {
        const [day, period, start, end, subject, teacher] = schedule[i];
        if (!subject || subject === "None" || day.toUpperCase() !== today) continue;
  
        const classStart = parseTime(start);
        const classEnd = parseTime(end);
        if (classStart == null || classEnd == null) continue;
  
        let message = null;
        if (currentTime === classStart - 10) {
          message = `📚 วิชา "${subject}" จะเริ่มใน 10 นาที\n🕘 เวลา ${start}\n👨‍🏫 ${teacher || "ไม่ระบุ"}\n📍 คาบที่ ${period}`;
        } else if (currentTime === classStart - 5) {
          message = `⏰ วิชา "${subject}" ใกล้เริ่มใน 5 นาที!\nเตรียมตัวให้พร้อม 🔔`;
        } else if (currentTime === classStart) {
          message = `✅ วิชา "${subject}" เริ่มแล้ว\n👨‍🏫 ${teacher}\n📍 คาบที่ ${period}\n‼️ หยุดเล่นเกมได้แล้ว‼️`;
        } else if (currentTime === classEnd) {
          message = `⛔ วิชา "${subject}" จบแล้ว\n👨‍🏫 ${teacher}\n📍 คาบที่ ${period}`;
        }
  
        if (message) {
          for (const id of userIds) {
            await sendLineMessage(id, message);
          }
        }
      }
  
      return new Response('OK', { status: 200 });
    } catch (err) {
        console.error('❌ SCHEDULE ERROR:', err);
        const message = err instanceof Error ? err.message : 'unknown error';
        return new Response(
          JSON.stringify({ error: true, message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }        
  }
  