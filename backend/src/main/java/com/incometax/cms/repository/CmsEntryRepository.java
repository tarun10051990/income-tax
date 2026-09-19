package com.incometax.cms.repository;

import com.incometax.cms.entity.CmsEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CmsEntryRepository extends JpaRepository<CmsEntry, String> {

    List<CmsEntry> findByCollectionOrderBySortOrderAscCreatedAtAsc(String collection);

    List<CmsEntry> findByStatusOrderByCollectionAscSortOrderAscCreatedAtAsc(CmsEntry.Status status);

    Optional<CmsEntry> findByCollectionAndSlug(String collection, String slug);

    boolean existsByCollection(String collection);

    @Query("select e.collection, e.status, count(e) from CmsEntry e group by e.collection, e.status")
    List<Object[]> countByCollectionAndStatus();
}
