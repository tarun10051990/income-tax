package com.incometax.security;

import com.incometax.entity.User;
import com.incometax.exception.ApiException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CurrentUser {

    public Optional<User> find() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return Optional.empty();
        }
        return Optional.of(user);
    }

    public User require() {
        return find().orElseThrow(() -> ApiException.unauthorized("Authentication required"));
    }
}
