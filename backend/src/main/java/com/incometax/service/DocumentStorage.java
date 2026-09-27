package com.incometax.service;

import java.io.InputStream;

/** Object storage boundary; the database only ever holds metadata and the storage key. */
public interface DocumentStorage {

    String store(String key, byte[] content);

    InputStream read(String key);

    void delete(String key);
}
