package com.incometax.marketplace.repository;

import com.incometax.marketplace.entity.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, String> {
    Optional<Coupon> findByCodeIgnoreCase(String code);
    List<Coupon> findAllByOrderByCodeAsc();
}
