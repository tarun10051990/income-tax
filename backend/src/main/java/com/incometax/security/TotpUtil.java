package com.incometax.security;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;

/** RFC 6238 TOTP (SHA-1, 6 digits, 30s step) used for administrator MFA. */
public final class TotpUtil {

    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int DIGITS = 6;
    private static final int STEP_SECONDS = 30;

    private TotpUtil() {
    }

    public static String generateSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        StringBuilder secret = new StringBuilder();
        for (byte value : bytes) {
            secret.append(BASE32.charAt(Math.abs(value) % BASE32.length()));
        }
        return secret.toString();
    }

    public static String code(String base32Secret, Instant at) {
        long counter = at.getEpochSecond() / STEP_SECONDS;
        byte[] key = decodeBase32(base32Secret);
        byte[] data = ByteBuffer.allocate(8).putLong(counter).array();
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);
            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            int otp = binary % (int) Math.pow(10, DIGITS);
            return String.format("%0" + DIGITS + "d", otp);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not generate TOTP code", ex);
        }
    }

    /** Accepts the current step plus one step of clock drift on either side. */
    public static boolean verify(String base32Secret, String code) {
        if (base32Secret == null || code == null) {
            return false;
        }
        Instant now = Instant.now();
        for (int drift = -1; drift <= 1; drift++) {
            if (code.equals(code(base32Secret, now.plusSeconds((long) drift * STEP_SECONDS)))) {
                return true;
            }
        }
        return false;
    }

    private static byte[] decodeBase32(String secret) {
        String normalised = secret.trim().toUpperCase().replace("=", "");
        int buffer = 0;
        int bitsLeft = 0;
        byte[] out = new byte[normalised.length() * 5 / 8];
        int index = 0;
        for (char character : normalised.toCharArray()) {
            int value = BASE32.indexOf(character);
            if (value < 0) {
                throw new IllegalArgumentException("Secret is not valid base32");
            }
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out[index++] = (byte) (buffer >> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        return out;
    }
}
