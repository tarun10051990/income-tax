package com.incometax.finance.entity;

/** Client-entered records are PENDING until staff confirm them against proofs/challans. */
public enum VerificationStatus {
    PENDING,
    VERIFIED,
    REJECTED
}
