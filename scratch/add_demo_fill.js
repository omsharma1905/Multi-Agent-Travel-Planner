const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/features/auth/components/AuthCard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace Forgot? button with Demo Fill + Forgot?
const findStr = '<button\r\n                      type="button"\r\n                      onClick={() =>\r\n                        toast.info("Password Recovery", "Instructions sent to registered email.")\r\n                      }\r\n                      className="font-mono text-[10px] text-[#E9C349] hover:underline tracking-wider"\r\n                    >\r\n                      Forgot?\r\n                    </button>';

const replaceStr = '<div className="flex items-center gap-3">\r\n                      <button\r\n                        type="button"\r\n                        onClick={() => {\r\n                          setSignInData({ email: "demo@safarix.travel", password: "Password123!" });\r\n                          setSignInErrors({});\r\n                        }}\r\n                        className="font-mono text-[10px] text-[#E9C349]/80 hover:text-[#E9C349] tracking-wider underline underline-offset-2"\r\n                      >\r\n                        Demo Fill\r\n                      </button>\r\n                      <button\r\n                        type="button"\r\n                        onClick={() =>\r\n                          toast.info("Password Recovery", "Instructions sent to registered email.")\r\n                        }\r\n                        className="font-mono text-[10px] text-[#E9C349] hover:underline tracking-wider"\r\n                      >\r\n                        Forgot?\r\n                      </button>\r\n                    </div>';

if (!content.includes(findStr)) {
  console.log("CRLF not matched, trying normalized LF");
  const normalized = content.replace(/\r\n/g, '\n');
  const findLF = findStr.replace(/\r\n/g, '\n');
  const replaceLF = replaceStr.replace(/\r\n/g, '\n');
  if (!normalized.includes(findLF)) {
    console.error("Target pattern not found!");
    process.exit(1);
  }
  content = normalized.replace(findLF, replaceLF).replace(/\n/g, '\r\n');
} else {
  content = content.replace(findStr, replaceStr);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated AuthCard.tsx with Demo Fill button");
