import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/libs/sheets';
import { sendLineMessage } from '@/libs/line';

function parseTime(time: string | number): number | null {
  if (typeof time === 'string') {
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  } else if (typeof time === 'number') {
    const h = Math.floor(time);
    const m = Math.round((time - h) * 100);
    return h * 60 + m;
  }
  return null;
}

function isCurrentTimeMatch(currentTime: number, classStart: number, classEnd: number) {
  if (classEnd < classStart) {
    const adjustedEnd = classEnd + 24 * 60;
    let adjustedCurrent = currentTime;
    if (currentTime < classStart) adjustedCurrent += 24 * 60;

    return {
      before10: adjustedCurrent === classStart - 10,
      before5: adjustedCurrent === classStart - 5,
      start: adjustedCurrent === classStart,
      end: adjustedCurrent === adjustedEnd,
    };
  }
  return {
    before10: currentTime === classStart - 10,
    before5: currentTime === classStart - 5,
    start: currentTime === classStart,
    end: currentTime === classEnd,
  };
}

// ให้เปลี่ยนจาก handler เป็น GET
export async function GET(request: NextRequest) {
  try {
    const schedule = await getSheetData('Schedule');
    const users = await getSheetData('Users');

    const userIds = users.slice(1).map(r => r[1]).filter(Boolean) as string[];

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const dayMap = ['SU', 'M', 'T', 'W', 'TH', 'F', 'SA'];
    const today = dayMap[now.getDay()];

    for (let i = 0; i < schedule.length; i++) {
      const [day, period, start, end, subject, teacher] = schedule[i];
      if (!subject || subject === 'None' || day.toUpperCase() !== today) continue;

      const classStart = parseTime(start);
      const classEnd = parseTime(end);
      if (classStart == null || classEnd == null) continue;

      const timeStatus = isCurrentTimeMatch(currentTime, classStart, classEnd);

      let message = null;
      if (timeStatus.before10) {
        message = `📚 วิชา "${subject}" จะเริ่มใน 10 นาที\n🕘 เวลา ${start}\n👨‍🏫 ${teacher || 'ไม่ระบุ'}\n📍 คาบที่ ${period}`;
      } else if (timeStatus.before5) {
        message = `⏰ วิชา "${subject}" ใกล้เริ่มใน 5 นาที!\nเตรียมตัวให้พร้อม 🔔`;
      } else if (timeStatus.start) {
        message = `✅ วิชา "${subject}" เริ่มแล้ว\n👨‍🏫 ${teacher}\n📍 คาบที่ ${period}\n‼️ หยุดเล่นเกมได้แล้ว‼️`;
      } else if (timeStatus.end) {
        message = `⛔ วิชา "${subject}" จบแล้ว\n👨‍🏫 ${teacher}\n📍 คาบที่ ${period}`;
      }

      if (message) {
        for (const userId of userIds) {
          await sendLineMessage(userId, message);
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Schedule API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
