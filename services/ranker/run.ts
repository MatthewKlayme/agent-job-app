import { handler } from "./handler";
handler().then(r => console.log("ranker:", r)).catch(e => (console.error(e), process.exit(1)));