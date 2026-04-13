import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const fullMessage = `${formattedTime} [${source}] ${message}`;
  console.log(fullMessage);

  /* 
  // Disable file logging to improve performance as per user request
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${source}] ${message}\n`;
    fs.appendFileSync(path.join(process.cwd(), "socket_debug.log"), logMessage);
  } catch (err) {
    // Ignore log errors
  }
  */
}
