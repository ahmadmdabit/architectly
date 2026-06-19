import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const __dirname = import.meta.dirname;

// Paths
const publicDir = join(__dirname, "../public");
const envPath = join(__dirname, "../.env");

// Function to compute SHA1 hash of content (handles binary/text)
function computeHash(content) {
  return createHash("sha1").update(content).digest("hex").slice(0, 8); // 40-char hex; slice(0,10) for shorter if needed
}

// Hash all other public files (recursive, binary-safe)
function hashPublicAssets() {
  let hash = createHash("sha1");
  const hashPublicFile = (filePath) => {
    if (!existsSync(filePath)) return;

    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      // Recurse into subdirs (e.g., data/, sd-favicon/)
      readdirSync(filePath).forEach((child) => hashPublicFile(join(filePath, child)));
    } else if (stats.isFile() && !filePath.includes("locales")) {
      // Exclude locales
      try {
        const content = readFileSync(filePath);
        hash.update(content);
      } catch (err) {
        console.warn(`Warning: Could not read ${filePath}: ${err.message}`);
      }
    }
  };

  // Start from public/ root
  readdirSync(publicDir).forEach((child) => hashPublicFile(join(publicDir, child)));
  return hash.digest("hex").slice(0, 8); // 40-char hex
}

// Compute hashes
console.log("Computing SHA1 hashes...");
const assetsHash = hashPublicAssets();

console.log(`Public Assets SHA1 Hash: ${assetsHash}`);

// Read/update .env
let envContent = "";
if (existsSync(envPath)) {
  envContent = readFileSync(envPath, "utf8");
} else {
  console.log("Creating new .env file.");
}

const envLines = envContent.split("\n").filter((line) => line.trim());
const assetsLine = `VITE_ASSET_HASH=${assetsHash}`;
let updatedLines = envLines.filter((line) => !line.startsWith("VITE_ASSET_HASH="));
updatedLines.unshift(assetsLine);

// Write back
writeFileSync(envPath, updatedLines.join("\n") + "\n");
console.log("\nUpdated .env:");
console.log(`VITE_ASSET_HASH=${assetsHash}`);
