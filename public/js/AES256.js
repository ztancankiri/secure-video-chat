class AES256 {
	constructor(pbkdf2_iteration) {
		this.BLOCK_SIZE = 16;
		this.PBKDF2_ITERATION = pbkdf2_iteration;
	}

	encrypt(msgString, passphrase) {
		// msgString is expected to be Utf8 encoded
		const salt = CryptoJS.lib.WordArray.random(this.BLOCK_SIZE);

		const key = CryptoJS.PBKDF2(passphrase, salt, {
			keySize: this.BLOCK_SIZE / 4, // 4 words = 16 bytes
			iterations: this.PBKDF2_ITERATION,
			hasher: CryptoJS.algo.SHA256
		});

		let lastMsg = salt.clone();

		const iv = CryptoJS.lib.WordArray.random(this.BLOCK_SIZE);
		lastMsg = lastMsg.concat(iv);
		const encrypted = CryptoJS.AES.encrypt(msgString, key, { iv: iv });
		lastMsg = lastMsg.concat(encrypted.ciphertext);
		return lastMsg.toString(CryptoJS.enc.Base64);
	}

	decrypt(ciphertextStr, passphrase) {
		const ciphertext = CryptoJS.enc.Base64.parse(ciphertextStr);

		const salt = ciphertext.clone();
		salt.sigBytes = this.BLOCK_SIZE;
		salt.clamp();

		ciphertext.words.splice(0, this.BLOCK_SIZE / 4); // delete 4 words = 16 bytes
		ciphertext.sigBytes -= this.BLOCK_SIZE;

		const iv = ciphertext.clone();
		iv.sigBytes = this.BLOCK_SIZE;
		iv.clamp();

		ciphertext.words.splice(0, this.BLOCK_SIZE / 4); // delete 4 words = 16 bytes
		ciphertext.sigBytes -= this.BLOCK_SIZE;

		const key = CryptoJS.PBKDF2(passphrase, salt, {
			keySize: this.BLOCK_SIZE / 4,  // 4 words = 16 bytes
			iterations: this.PBKDF2_ITERATION,
			hasher: CryptoJS.algo.SHA256
		});

		// decryption
		const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, { iv: iv });
		return decrypted.toString(CryptoJS.enc.Utf8);
	}
}