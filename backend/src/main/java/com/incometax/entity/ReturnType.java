package com.incometax.entity;

public enum ReturnType {
    ITR_1(TaxType.INCOME_TAX),
    ITR_2(TaxType.INCOME_TAX),
    ITR_3(TaxType.INCOME_TAX),
    ITR_4(TaxType.INCOME_TAX),
    GSTR_1(TaxType.GST),
    GSTR_3B(TaxType.GST);

    private final TaxType taxType;

    ReturnType(TaxType taxType) {
        this.taxType = taxType;
    }

    public TaxType getTaxType() {
        return taxType;
    }
}
