const crypto = require("crypto");
const { ENCRYPTION_KEY_INPUT } = require("../config");

const ALGO = "aes-256-gcm";
const IV_LENGTH = 16; // 128-bit IV

let KEY = null;
if (ENCRYPTION_KEY_INPUT) {
	if (/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_INPUT)) {
		// Parse encryption key as raw hex
		KEY = Buffer.from(ENCRYPTION_KEY_INPUT, "hex");
	} else {
		// Store encrpytion key as UTF-8 string for password-based key derivation
		KEY = ENCRYPTION_KEY_INPUT;
	}
}

// Derive a 256-bit AES key from a password and salt
function deriveKeyFromPassword(password, salt) {
	return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

async function encryptData(data) {
	if (!KEY) {
		return null;
	}

	let key;
	let salt = null;

	if (Buffer.isBuffer(KEY)) {
		// Direct key
		key = KEY;
	} else {
		// Derive key
		salt = crypto.randomBytes(16);
		key = deriveKeyFromPassword(KEY, salt);
	}

	const iv = crypto.randomBytes(IV_LENGTH);
	const cipher = crypto.createCipheriv(ALGO, key, iv);
	let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
	encrypted += cipher.final("hex");
	const authTag = cipher.getAuthTag().toString("hex");

	return {
		iv: iv.toString("hex"),
		salt: salt ? salt.toString("hex") : null,
		authTag,
		data: encrypted,
	};
}

async function decryptData(encryptedObject) {
	if (!KEY) {
		return null;
	}

	const { iv, salt, authTag, data } = encryptedObject;

	let key;
	if (Buffer.isBuffer(KEY) && !salt) {
		key = KEY;
	} else {
		key = deriveKeyFromPassword(KEY, Buffer.from(salt, "hex"));
	}

	const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, "hex"));
	decipher.setAuthTag(Buffer.from(authTag, "hex"));

	let decrypted = decipher.update(data, "hex", "utf8");
	decrypted += decipher.final("utf8");

	return JSON.parse(decrypted);
}

module.exports = {
	encryptData,
	decryptData,
};
