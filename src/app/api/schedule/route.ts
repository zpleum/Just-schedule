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
      console.log('Schedule API started');
  
      const schedule = await getSheetData('Schedule');
      console.log(`Fetched schedule, rows: ${schedule.length}`);
  
      const users = await getSheetData('Users');
      console.log(`Fetched users, rows: ${users.length}`);
  
      const userIds = users.slice(1).map(r => r[1]).filter(Boolean) as string[];
      console.log(`User IDs: ${userIds.join(', ')}`);
  
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      console.log(`Current time (minutes): ${currentTime}`);
  
      const dayMap = ['SU', 'M', 'T', 'W', 'TH', 'F', 'SA'];
      const today = dayMap[now.getDay()];
      console.log(`Today is: ${today}`);
  
      for (let i = 0; i < schedule.length; i++) {
        const [day, period, start, end, subject, teacher] = schedule[i];
        console.log(`Checking row ${i}: day=${day}, subject=${subject}`);
  
        if (!subject || subject === 'None' || day.toUpperCase() !== today) {
          console.log('Skipped this row');
          continue;
        }
  
        const classStart = parseTime(start);
        const classEnd = parseTime(end);
        console.log(`Parsed times: start=${classStart}, end=${classEnd}`);
  
        if (classStart == null || classEnd == null) {
          console.warn(`Invalid time for subject ${subject} at row ${i}`);
          continue;
        }
  
        const timeStatus = isCurrentTimeMatch(currentTime, classStart, classEnd);
        console.log(`Time status: ${JSON.stringify(timeStatus)}`);
  
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
          console.log(`Sending message: ${message}`);
          for (const userId of userIds) {
            console.log(`Sending to userId: ${userId}`);
            await sendLineMessage(userId, message);
          }
        }
      }
  
      console.log('Schedule API completed successfully');
      return NextResponse.json({ status: 'ok' });
    } catch (error) {
      console.error('Schedule API error:', error);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
  