package com.incometax.util;

/** Sensitive identifiers are returned masked unless the caller holds PII_READ_FULL. */
public final class MaskingUtil {

    private MaskingUtil() {
    }

    public static String maskPan(String pan) {
        return keepLast(pan, 4);
    }

    public static String maskAadhaar(String aadhaarLastFour) {
        if (aadhaarLastFour == null || aadhaarLastFour.isBlank()) {
            return null;
        }
        return "XXXX XXXX " + aadhaarLastFour;
    }

    public static String maskGstin(String gstin) {
        return keepLast(gstin, 4);
    }

    public static String maskAccountNumber(String accountNumber) {
        return keepLast(accountNumber, 4);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return email;
        }
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String visible = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visible + "***@" + parts[1];
    }

    public static String maskPhone(String phone) {
        return keepLast(phone, 4);
    }

    private static String keepLast(String value, int visible) {
        if (value == null || value.isBlank()) {
            return value;
        }
        if (value.length() <= visible) {
            return "*".repeat(value.length());
        }
        return "*".repeat(value.length() - visible) + value.substring(value.length() - visible);
    }
}
