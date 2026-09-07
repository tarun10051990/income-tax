package com.incometax.repository;

import com.incometax.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);

    Page<User> findByRole(User.Role role, Pageable pageable);

    Page<User> findByRoleNot(User.Role role, Pageable pageable);

    List<User> findByRoleIn(List<User.Role> roles);

    long countByRole(User.Role role);

    @Query("select u from User u where u.role = ?1 and ("
            + "lower(u.name) like lower(concat('%', ?2, '%')) or "
            + "lower(u.email) like lower(concat('%', ?2, '%')) or "
            + "lower(coalesce(u.pan, '')) like lower(concat('%', ?2, '%')) or "
            + "coalesce(u.phone, '') like concat('%', ?2, '%'))")
    Page<User> searchByRole(User.Role role, String term, Pageable pageable);
    Optional<User> findByPhone(String phone);
    Optional<User> findByPan(String pan);
    boolean existsByEmail(String email);
    boolean existsByPan(String pan);
}
