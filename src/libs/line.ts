export async function sendLineMessage(userId: string, text: string) {
    if (!userId || !text) {
      console.warn('sendLineMessage: missing userId or text');
      return;
    }
  
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text }],
        }),
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`LINE API error: status ${res.status} - ${errorText}`);
      } else {
        console.log(`LINE message sent to userId: ${userId}`);
      }
    } catch (error) {
      console.error('sendLineMessage fetch error:', error);
    }
  }
  