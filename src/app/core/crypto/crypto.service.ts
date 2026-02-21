import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
    private encryptionKey: CryptoKey | null = null;
    private readonly KEY_NAME = 'expense-tracker-aes-key';

    constructor() {
        this.initKey();
    }

    private async initKey(): Promise<void> {
        // In a real mobile app, this key should be generated and stored securely
        // via a Capacitor plugin like cordova-plugin-secure-storage or capacitor-secure-storage-plugin.
        // For the web/PWA interface, we'll store the generated key snippet in localStorage (Not perfectly secure for web, but mimics the Android Keystore behavior requested).

        const storedKey = localStorage.getItem(this.KEY_NAME);
        if (storedKey) {
            this.encryptionKey = await this.importKey(storedKey);
        } else {
            this.encryptionKey = await this.generateKey();
            const exportedKey = await this.exportKey(this.encryptionKey);
            localStorage.setItem(this.KEY_NAME, exportedKey);
        }
    }

    private async generateKey(): Promise<CryptoKey> {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    private async exportKey(key: CryptoKey): Promise<string> {
        const exported = await window.crypto.subtle.exportKey('jwk', key);
        return JSON.stringify(exported);
    }

    private async importKey(jwkString: string): Promise<CryptoKey> {
        const jwk = JSON.parse(jwkString);
        return await window.crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
        );
    }

    private ensureKeyReady(): Promise<void> {
        return new Promise((resolve) => {
            if (this.encryptionKey) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (this.encryptionKey) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            }
        });
    }

    async encrypt(data: object): Promise<string> {
        await this.ensureKeyReady();

        const payload = JSON.stringify(data);
        const encoder = new TextEncoder();
        const encodedPayload = encoder.encode(payload);

        // Generate a 12-byte initialization vector (IV) for AES-GCM
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            this.encryptionKey!,
            encodedPayload
        );

        // Combine IV and ciphertext for storage
        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);

        return this.arrayBufferToBase64(combined.buffer);
    }

    async decrypt(cipherString: string): Promise<object> {
        if (!cipherString) return {};
        await this.ensureKeyReady();

        const combinedBuffer = this.base64ToArrayBuffer(cipherString);
        const combinedArray = new Uint8Array(combinedBuffer);

        // Extract IV and ciphertext
        const iv = combinedArray.slice(0, 12);
        const ciphertext = combinedArray.slice(12);

        try {
            const decryptedArrayBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                this.encryptionKey!,
                ciphertext
            );

            const decoder = new TextDecoder();
            const decryptedString = decoder.decode(decryptedArrayBuffer);
            return JSON.parse(decryptedString);
        } catch (e) {
            console.error('Decryption failed. Data might be corrupted or key changed.', e);
            throw new Error('Encryption Payload Decryption Failed');
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}
