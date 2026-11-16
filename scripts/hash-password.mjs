// 產生後台管理密碼的雜湊，貼到 .env.local（本機）或部署平台的環境變數 ADMIN_PASSWORD_HASH。
// 用法：npm run admin:hash   （接著輸入密碼，畫面不會顯示）
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

const N = 2 ** 15;

function ask(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(prompt)) rl.output.write(s);
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const pw = process.stdin.isTTY ? await ask("管理密碼（至少 12 字元）：") : (await new Response(process.stdin).text()).trim();
if (!pw || pw.length < 12) {
  console.error("密碼至少需要 12 個字元。");
  process.exit(1);
}
const salt = randomBytes(16);
const hash = scryptSync(pw.normalize("NFKC"), salt, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
console.log(`ADMIN_PASSWORD_HASH=scrypt:${N}:${salt.toString("base64")}:${hash.toString("base64")}`);
