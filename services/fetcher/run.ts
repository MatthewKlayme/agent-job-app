import { handler } from "./handler";
handler().then(r => console.log("fetcher:", r)).catch(e => (console.error(e), process.exit(1)));