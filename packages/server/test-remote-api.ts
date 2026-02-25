async function main() {
    console.log('Logging in...');
    const loginRes = await fetch('https://pm-server-4mm1.onrender.com/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
            email: 'ranramidf@gmail.com',
            password: 'Ran12345!'
        })
    });

    if (!loginRes.ok) {
        const text = await loginRes.text();
        console.log('Login failed with status', loginRes.status);
        console.log('Body:', text);
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.tokens?.accessToken || loginData.data?.accessToken;
    console.log('Got token:', token ? token.substring(0, 15) + '...' : 'undefined');
    console.log('Login data:', JSON.stringify(loginData, null, 2));

    if (!token) {
        return;
    }

    console.log('Fetching notifications...');
    const notifRes = await fetch('https://pm-server-4mm1.onrender.com/api/v1/notifications?page=1&limit=50&unreadOnly=false', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const notifResText = await notifRes.text();
    console.log('Raw text response:', notifResText);
}

main().catch(console.error);
