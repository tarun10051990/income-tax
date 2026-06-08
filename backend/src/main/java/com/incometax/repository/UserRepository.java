package com.incometax.repository;

import com.incometax.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    Optional<User> findByPan(String pan);
    boolean existsByEmail(String email);
    boolean existsByPan(String pan);
}
