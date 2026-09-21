package com.incometax.service;

import com.incometax.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

/** Development/self-hosted storage; swap for an S3-backed implementation in production. */
@Service
public class LocalFileDocumentStorage implements DocumentStorage {

    private final Path root;

    public LocalFileDocumentStorage(@Value("${documents.storage-dir:./data/documents}") String storageDir) {
        this.root = Path.of(storageDir);
    }

    @Override
    public String store(String key, byte[] content) {
        try {
            Path target = resolve(key);
            Files.createDirectories(target.getParent());
            Files.write(target, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            return key;
        } catch (IOException ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "DOCUMENT_STORAGE_ERROR", "Could not store the document");
        }
    }

    @Override
    public InputStream read(String key) {
        try {
            return Files.newInputStream(resolve(key));
        } catch (IOException ex) {
            throw ApiException.notFound("Document content", key);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ex) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "DOCUMENT_STORAGE_ERROR", "Could not delete the document");
        }
    }

    private Path resolve(String key) {
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root.normalize())) {
            throw ApiException.badRequest("INVALID_STORAGE_KEY", "Storage key escapes the storage root");
        }
        return resolved;
    }
}
