package com.incometax.common;

import java.util.UUID;

/** Per-request correlation id echoed in every API response and audit log entry. */
public final class TraceContext {

    private static final ThreadLocal<String> TRACE_ID = new ThreadLocal<>();

    private TraceContext() {
    }

    public static String start(String incoming) {
        String traceId = (incoming == null || incoming.isBlank()) ? UUID.randomUUID().toString() : incoming;
        TRACE_ID.set(traceId);
        return traceId;
    }

    public static String current() {
        String traceId = TRACE_ID.get();
        return traceId == null ? "-" : traceId;
    }

    public static void clear() {
        TRACE_ID.remove();
    }
}
