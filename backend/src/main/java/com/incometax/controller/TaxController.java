package com.incometax.controller;

import com.incometax.dto.TaxComputeRequest;
import com.incometax.service.TaxComputeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/tax")
@RequiredArgsConstructor
public class TaxController {

    private final TaxComputeService taxComputeService;

    @PostMapping("/compute")
    public ResponseEntity<Map<String, Object>> computeTax(@RequestBody TaxComputeRequest request) {
        return ResponseEntity.ok(taxComputeService.computeTax(request));
    }

    @GetMapping("/slabs")
    public ResponseEntity<Map<String, Object>> getTaxSlabs() {
        Map<String, Object> slabs = Map.of(
            "oldRegime", Map.of(
                "fy", "2024-25",
                "slabs", new Object[]{
                    Map.of("min", 0, "max", 250000, "rate", 0),
                    Map.of("min", 250001, "max", 500000, "rate", 5),
                    Map.of("min", 500001, "max", 1000000, "rate", 20),
                    Map.of("min", 1000001, "max", Integer.MAX_VALUE, "rate", 30)
                }
            ),
            "newRegime", Map.of(
                "fy", "2024-25",
                "slabs", new Object[]{
                    Map.of("min", 0, "max", 300000, "rate", 0),
                    Map.of("min", 300001, "max", 700000, "rate", 5),
                    Map.of("min", 700001, "max", 1000000, "rate", 10),
                    Map.of("min", 1000001, "max", 1200000, "rate", 15),
                    Map.of("min", 1200001, "max", 1500000, "rate", 20),
                    Map.of("min", 1500001, "max", Integer.MAX_VALUE, "rate", 30)
                }
            )
        );
        return ResponseEntity.ok(slabs);
    }
}
