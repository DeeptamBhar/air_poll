export async function sendChatMessage(message) {
    const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error('Failed to fetch response');
    return res.json();
}
