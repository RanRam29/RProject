async function main() {
    const url = 'https://rproject-mocha.vercel.app/assets/index-D0MtkCBC.js';
    const res = await fetch(url);
    const text = await res.text();
    const match = text.match(/https:\/\/[^"']*\.onrender\.com/i);
    console.log("Matched API URL:", match ? match[0] : "Not found");
}
main().catch(console.error);
