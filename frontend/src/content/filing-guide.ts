/**
 * Plain-language guidance for every field a taxpayer fills in the ITR and GST flows, plus the
 * page/button text of those flows. Written for a first-time filer (a shopkeeper, trader or
 * freelancer) rather than an accountant. Every entry here is editable by the super admin from
 * Website content → "Field guides" / "Portal text"; these are only the bundled defaults.
 */

export interface FieldGuide {
  /** Stable id used by the form (never shown to the user). */
  key: string;
  /** Short label shown above the box, in everyday words. */
  label: string;
  /** One line under the box: what to type here. */
  hint: string;
  /** Where the person can find this number (document, page, app). */
  whereToFind?: string;
  /** A realistic example value or sentence. */
  example?: string;
  /** Same idea in Hindi (Roman or Devanagari) for people more comfortable with it. */
  hindi?: string;
}

export const fieldGuides: FieldGuide[] = [
  /* ---------------- ITR: income from business / profession ---------------- */
  {
    key: "itr.business.turnover",
    label: "Total sales in the year (business)",
    hint: "Everything your shop or business sold from 1 April to 31 March, before any expenses.",
    whereToFind: "Your sales register, GST returns (GSTR-1 / GSTR-3B totals) or bank statement credits.",
    example: "If you sold goods worth ₹32,50,000 in the year, type 3250000.",
    hindi: "साल भर की कुल बिक्री (खर्चा घटाने से पहले)। GST रिटर्न या बिक्री रजिस्टर से लें।",
  },
  {
    key: "itr.business.profit",
    label: "Profit from business",
    hint: "Sales minus your business expenses (purchases, rent, salaries, electricity). If you use the simple 'presumptive' scheme, at least 6% of digital sales / 8% of cash sales.",
    whereToFind: "Profit & loss statement from your accountant, or estimate: total sales − total expenses.",
    example: "Sales ₹32,50,000 with expenses ₹28,00,000 → profit ₹4,50,000 → type 450000.",
    hindi: "बिक्री में से खर्चा घटाने के बाद जो बचा, वह मुनाफ़ा। छोटे व्यापारी 6%/8% वाला आसान (presumptive) तरीका भी चुन सकते हैं।",
  },
  {
    key: "itr.profession.receipts",
    label: "Fees received (doctor, lawyer, freelancer, consultant)",
    hint: "Total fees you received for professional work in the year. Leave 0 if you only run a shop / trading business.",
    whereToFind: "Invoices you raised, or Form 26AS / AIS on the income-tax portal (payments where TDS was cut).",
    example: "A freelance designer paid ₹9,00,000 in the year types 900000.",
    hindi: "पेशेवर काम (डॉक्टर, वकील, फ्रीलांस) की कुल फ़ीस। दुकान/व्यापार वाले 0 छोड़ें।",
  },
  {
    key: "itr.profession.profit",
    label: "Profit from profession",
    hint: "Fees minus your work expenses. Under the simple scheme (Section 44ADA) you can declare 50% of fees as profit and skip bookkeeping.",
    example: "Fees ₹9,00,000 → simple scheme profit ₹4,50,000 → type 450000.",
    hindi: "फ़ीस में से खर्चा घटाकर मुनाफ़ा। आसान तरीके में फ़ीस का 50% मुनाफ़ा मान सकते हैं।",
  },
  {
    key: "itr.tax.advanceTax",
    label: "Tax you already paid yourself (advance / self-assessment tax)",
    hint: "Any income tax you paid directly through a bank challan during the year. Leave 0 if you never paid tax yourself.",
    whereToFind: "Form 26AS on incometax.gov.in → 'Part C – Taxes paid', or the challan receipt (Challan 280) from your bank.",
    example: "Paid ₹40,000 in December and ₹35,000 in March → type 75000.",
    hindi: "जो टैक्स आपने खुद बैंक चालान से जमा किया (एडवांस टैक्स)। Form 26AS में दिखता है।",
  },
  {
    key: "itr.tax.tdsOther",
    label: "TDS cut by customers or banks",
    hint: "Tax that others deducted before paying you (customers deducting 1–2% on your bills, banks on FD interest). This is already paid on your behalf and reduces what you owe.",
    whereToFind: "Form 26AS / AIS on incometax.gov.in, or Form 16A certificates given by the payer.",
    example: "Form 26AS shows TDS of ₹18,500 → type 18500.",
    hindi: "ग्राहकों या बैंक ने भुगतान से पहले जो टैक्स काटा (TDS)। Form 26AS में देखें।",
  },

  /* ---------------- ITR: interest income ---------------- */
  {
    key: "itr.interest.savings",
    label: "Interest from savings bank account",
    hint: "Interest the bank added to your savings account in the year (all banks together).",
    whereToFind: "Bank passbook / statement — look for lines called 'Int.Pd' or 'Interest credit', usually every 3 months. Or your AIS on the income-tax portal.",
    example: "₹1,240 + ₹1,310 + ₹1,190 + ₹1,400 across the year → type 5140.",
    hindi: "बचत खाते पर बैंक ने जो ब्याज दिया (सारे बैंक जोड़कर)। पासबुक में 'Int' लाइन देखें।",
  },
  {
    key: "itr.interest.fd",
    label: "Interest from fixed deposits (FD)",
    hint: "Interest earned on FDs this year, even if the FD has not matured yet.",
    whereToFind: "Bank's 'Interest certificate' (downloadable from net banking) or Form 26AS / AIS.",
    example: "FD of ₹5,00,000 at 7% → about ₹35,000 → type 35000.",
    hindi: "FD पर मिला ब्याज (चाहे FD अभी पूरी न हुई हो)। बैंक का interest certificate देखें।",
  },
  {
    key: "itr.interest.rd",
    label: "Interest from recurring deposits (RD) or post office",
    hint: "Interest on RDs, post-office schemes (NSC, KVP, MIS). Leave 0 if none.",
    whereToFind: "RD passbook or post-office statement.",
    hindi: "RD या पोस्ट ऑफिस योजनाओं का ब्याज। न हो तो 0 छोड़ें।",
  },

  /* ---------------- ITR: capital gains ---------------- */
  {
    key: "itr.gains.short",
    label: "Profit on shares / mutual funds sold within 1 year",
    hint: "Money you gained by selling shares, mutual funds or property you held for a short time. Only the profit, not the sale amount.",
    whereToFind: "'Capital gains statement' from your broker (Zerodha, Groww, etc.) or mutual fund house (CAMS / KFintech).",
    example: "Bought shares for ₹1,00,000, sold for ₹1,20,000 after 6 months → gain ₹20,000 → type 20000.",
    hindi: "1 साल के अंदर बेचे गए शेयर/म्यूचुअल फंड पर हुआ मुनाफ़ा (सिर्फ़ मुनाफ़ा, बिक्री रकम नहीं)।",
  },
  {
    key: "itr.gains.long",
    label: "Profit on shares / mutual funds / property held over 1 year",
    hint: "Profit from selling things you held for more than a year (2 years for property). Gains up to ₹1.25 lakh on shares are tax-free.",
    whereToFind: "Same capital gains statement from the broker / fund house; for property, the sale deed and purchase deed.",
    hindi: "1 साल से ज़्यादा रखे शेयर/फंड या 2 साल से ज़्यादा रखी प्रॉपर्टी बेचने पर मुनाफ़ा।",
  },

  /* ---------------- ITR: other income ---------------- */
  {
    key: "itr.other.rent",
    label: "Rent you received (whole year)",
    hint: "Total rent from a house or shop you own and let out. Type the yearly amount, not monthly.",
    whereToFind: "Rent agreement or bank credits from the tenant.",
    example: "₹15,000 a month → type 180000.",
    hindi: "अपनी दुकान/मकान किराये पर देकर साल भर में मिला कुल किराया (मासिक नहीं, सालाना)।",
  },
  {
    key: "itr.other.misc",
    label: "Any other income",
    hint: "Anything else: commission, lottery, cash gifts over ₹50,000 from non-relatives, family pension, dividend from shares.",
    whereToFind: "Your bank statement; dividends appear in AIS on the income-tax portal.",
    hindi: "बाकी कोई आय: कमीशन, डिविडेंड, ₹50,000 से ऊपर के गिफ्ट, लॉटरी आदि।",
  },

  /* ---------------- ITR: house rent ---------------- */
  {
    key: "itr.hra.rentPaid",
    label: "Rent you paid for your home (whole year)",
    hint: "Only if you live in a rented house AND your salary includes HRA. Business owners without salary can leave 0.",
    whereToFind: "Rent receipts or bank transfers to your landlord. Landlord PAN is needed if rent is over ₹1,00,000 a year.",
    example: "₹12,000 a month → type 144000.",
    hindi: "अगर आप किराये के घर में रहते हैं और सैलरी में HRA मिलता है, तो साल भर का दिया किराया।",
  },

  /* ---------------- ITR: deductions (old regime) ---------------- */
  {
    key: "itr.ded.80c",
    label: "Savings that reduce tax — LIC, PPF, ELSS, child school fees, home-loan principal (80C)",
    hint: "Add up what you paid this year into these: life-insurance premium, PPF, ELSS mutual funds, tax-saver FD, NSC, children's tuition fees, home-loan principal. Maximum benefit ₹1,50,000.",
    whereToFind: "Premium receipts, PPF passbook, school fee receipts, home-loan statement ('principal repaid').",
    example: "LIC ₹36,000 + PPF ₹50,000 + school fees ₹40,000 → type 126000.",
    hindi: "LIC, PPF, ELSS, बच्चों की स्कूल फ़ीस, होम लोन का मूल (principal) — सब जोड़कर। अधिकतम ₹1.5 लाख का फ़ायदा।",
  },
  {
    key: "itr.ded.nps",
    label: "Money put into NPS pension account (80CCD(1B))",
    hint: "Your own NPS deposits this year. Extra ₹50,000 benefit over and above 80C. Leave 0 if you don't have NPS.",
    whereToFind: "NPS statement from the NSDL / Protean CRA app or SMS.",
    hindi: "NPS पेंशन खाते में डाला पैसा। 80C के ऊपर ₹50,000 तक अलग से फ़ायदा।",
  },
  {
    key: "itr.ded.80d",
    label: "Health insurance premium (mediclaim) for family and parents (80D)",
    hint: "Premium paid for health insurance of you, spouse, children and parents. Up to ₹25,000 for family, plus ₹50,000 for senior-citizen parents.",
    whereToFind: "Policy premium receipt or the '80D certificate' from your insurer's app.",
    example: "Family policy ₹18,000 + parents' policy ₹32,000 → type 50000.",
    hindi: "अपने परिवार और माता-पिता के हेल्थ इंश्योरेंस (मेडिक्लेम) का प्रीमियम।",
  },
  {
    key: "itr.ded.80tta",
    label: "Savings-account interest benefit (80TTA)",
    hint: "Type the same savings-account interest you entered above, up to ₹10,000 — that much is tax-free. Senior citizens get ₹50,000 (80TTB).",
    hindi: "ऊपर लिखा बचत खाते का ब्याज यहाँ दोबारा लिखें (₹10,000 तक टैक्स-फ्री)।",
  },
  {
    key: "itr.ded.homeLoanInterest",
    label: "Interest paid on home loan (Section 24)",
    hint: "Only the interest part of your home-loan EMIs this year (not the principal). Maximum ₹2,00,000 for a self-occupied house.",
    whereToFind: "'Provisional interest certificate' from your bank's net banking / app.",
    example: "Certificate shows interest ₹1,86,000 → type 186000.",
    hindi: "होम लोन की EMI में ब्याज (interest) वाला हिस्सा। बैंक का interest certificate देखें।",
  },
  {
    key: "itr.ded.other",
    label: "Other deductions (donations, education-loan interest, disability)",
    hint: "Donations to approved charities (80G), interest on an education loan (80E), disability (80U). Leave 0 if none.",
    whereToFind: "Donation receipt with the charity's 80G registration number; education-loan interest certificate.",
    hindi: "दान (80G), एजुकेशन लोन का ब्याज (80E), दिव्यांगता (80U) आदि।",
  },

  /* ---------------- GST: registration ---------------- */
  {
    key: "gst.profile.gstin",
    label: "Your GST number (GSTIN)",
    hint: "The 15-character number on your GST registration certificate. It starts with your state code (e.g. 27 for Maharashtra) and contains your PAN.",
    whereToFind: "GST registration certificate (Form REG-06), or on any invoice you have issued. Also on gst.gov.in after login.",
    example: "27ABCDE1234F1Z5",
    hindi: "आपका 15 अंकों का GST नंबर, GST सर्टिफिकेट या अपने बिल पर लिखा होता है।",
  },
  {
    key: "gst.profile.legalName",
    label: "Legal name (as on PAN)",
    hint: "The name printed on your PAN card / GST certificate — for a proprietor this is your own name.",
    whereToFind: "GST certificate, 'Legal Name of Business' line.",
    example: "Ramesh Kumar Gupta",
    hindi: "PAN कार्ड / GST सर्टिफिकेट पर लिखा नाम। प्रोप्राइटर के लिए आपका अपना नाम।",
  },
  {
    key: "gst.profile.tradeName",
    label: "Shop / brand name (trade name)",
    hint: "The name on your shop board or bills, if different from the legal name.",
    example: "Gupta General Store",
    hindi: "दुकान के बोर्ड या बिल पर लिखा नाम, अगर कानूनी नाम से अलग है।",
  },
  {
    key: "gst.profile.businessType",
    label: "Type of business",
    hint: "Proprietorship (single owner), Partnership, LLP, Private Limited, HUF, etc.",
    whereToFind: "GST certificate, 'Constitution of Business' line.",
    example: "Proprietorship",
    hindi: "व्यवसाय का प्रकार: प्रोप्राइटरशिप, पार्टनरशिप, प्राइवेट लिमिटेड आदि।",
  },
  {
    key: "gst.profile.state",
    label: "State of registration",
    hint: "The state where your business is registered — decides whether a sale is 'within state' (CGST + SGST) or 'to another state' (IGST).",
    example: "Maharashtra",
    hindi: "जिस राज्य में GST रजिस्ट्रेशन है।",
  },
  {
    key: "gst.profile.address",
    label: "Registered business address",
    hint: "Address printed on the GST certificate ('Principal Place of Business').",
    hindi: "GST सर्टिफिकेट पर लिखा मुख्य कारोबार का पता।",
  },
  {
    key: "gst.profile.signatory",
    label: "Person who signs the return",
    hint: "The owner or partner responsible for filing — usually you.",
    example: "Ramesh Kumar Gupta",
    hindi: "रिटर्न पर हस्ताक्षर करने वाला व्यक्ति — आम तौर पर मालिक।",
  },
  {
    key: "gst.profile.designation",
    label: "Their role",
    hint: "Proprietor, Partner, Director, Manager…",
    example: "Proprietor",
    hindi: "उनका पद: प्रोप्राइटर, पार्टनर, डायरेक्टर…",
  },

  /* ---------------- GST: starting a return ---------------- */
  {
    key: "gst.return.type",
    label: "Which return?",
    hint: "GSTR-1 = list of your sales (monthly/quarterly). GSTR-3B = summary where you pay the tax. GSTR-4 = yearly return for composition-scheme shops. GSTR-9 = yearly summary.",
    whereToFind: "Most regular shops file GSTR-1 and GSTR-3B every month; if you opted for the composition scheme, file GSTR-4.",
    hindi: "GSTR-1 = बिक्री की सूची, GSTR-3B = टैक्स भरने वाला सारांश, GSTR-4 = कंपोज़िशन स्कीम का सालाना रिटर्न।",
  },
  {
    key: "gst.return.period",
    label: "Month the return is for",
    hint: "Pick the month whose sales/purchases you are reporting — not the month you are filing in.",
    example: "Filing in May for April's sales → pick April.",
    hindi: "जिस महीने की बिक्री/खरीद बता रहे हैं वह महीना चुनें (फाइल करने का महीना नहीं)।",
  },

  /* ---------------- GST: invoices ---------------- */
  {
    key: "gst.invoice.documentType",
    label: "What is this document?",
    hint: "Sales = bill you gave a customer. Purchase = bill a supplier gave you. Credit note = you reduced a customer's bill / took goods back. Debit note = you charged extra.",
    hindi: "Sales = आपने ग्राहक को दिया बिल। Purchase = सप्लायर से मिला बिल। Credit note = बिल घटाया/सामान वापस लिया।",
  },
  {
    key: "gst.invoice.supplyType",
    label: "Does GST apply to it?",
    hint: "Taxable = normal GST bill. Exempt / Nil-rated = items with no GST (fresh vegetables, milk, books). Zero-rated = exports. Reverse charge = the buyer pays the GST (e.g. transporter, lawyer bills).",
    hindi: "Taxable = सामान्य GST बिल। Exempt/Nil = जिन पर GST नहीं (सब्ज़ी, दूध)। Zero-rated = एक्सपोर्ट।",
  },
  {
    key: "gst.invoice.number",
    label: "Bill number",
    hint: "The invoice number printed on the bill. Sales bills must be in a running series for the year.",
    example: "INV/2024-25/0147",
    hindi: "बिल पर छपा इनवॉइस नंबर।",
  },
  {
    key: "gst.invoice.date",
    label: "Bill date",
    hint: "Date printed on the bill.",
    hindi: "बिल की तारीख।",
  },
  {
    key: "gst.invoice.counterpartyGstin",
    label: "Customer's / supplier's GST number",
    hint: "The other party's GSTIN, if they are GST-registered (B2B). Leave blank for walk-in customers without GST (B2C).",
    whereToFind: "Printed on their bill or letterhead; verify on gst.gov.in → 'Search Taxpayer'.",
    example: "07AAACX9999Q1Z3",
    hindi: "दूसरी पार्टी का GST नंबर (अगर है)। बिना GST वाले ग्राहक के लिए खाली छोड़ें।",
  },
  {
    key: "gst.invoice.counterpartyName",
    label: "Customer's / supplier's name",
    hint: "Name on their bill. For walk-in cash sales you can write 'Cash sale'.",
    example: "Sharma Traders",
    hindi: "ग्राहक/सप्लायर का नाम। नकद बिक्री के लिए 'Cash sale' लिख सकते हैं।",
  },
  {
    key: "gst.invoice.placeOfSupply",
    label: "Where the goods were delivered (state)",
    hint: "The state where the buyer received the goods or service. Same state as yours → CGST + SGST. Another state → IGST.",
    example: "Maharashtra",
    hindi: "जिस राज्य में सामान/सेवा पहुँची। अपना राज्य → CGST+SGST; दूसरा राज्य → IGST।",
  },
  {
    key: "gst.invoice.hsn",
    label: "HSN / SAC code of the item",
    hint: "The government's item code: HSN for goods, SAC for services. Businesses under ₹5 crore need 4 digits; above that 6 digits.",
    whereToFind: "On your supplier's bill, in your billing software, or search 'HSN code <item>' on cbic-gst.gov.in.",
    example: "Rice = 1006, Mobile phones = 8517, Accounting services = 9982.",
    hindi: "सामान का सरकारी कोड (HSN) या सेवा का कोड (SAC)। सप्लायर के बिल पर मिल जाता है।",
  },
  {
    key: "gst.invoice.taxableValue",
    label: "Bill amount before GST",
    hint: "Value of the goods/services only, without adding GST.",
    example: "Item ₹10,000 + 18% GST ₹1,800 = bill ₹11,800 → type 10000.",
    hindi: "GST जोड़ने से पहले की रकम।",
  },
  {
    key: "gst.invoice.cgst",
    label: "CGST (central GST) on the bill",
    hint: "For sales within your own state, GST is split into two equal halves — this is the central half.",
    example: "18% GST on ₹10,000 → CGST ₹900.",
    hindi: "अपने राज्य में बिक्री पर GST का आधा हिस्सा (केंद्र)।",
  },
  {
    key: "gst.invoice.sgst",
    label: "SGST (state GST) on the bill",
    hint: "The state's half — always equal to CGST for within-state sales.",
    example: "18% GST on ₹10,000 → SGST ₹900.",
    hindi: "अपने राज्य में बिक्री पर GST का आधा हिस्सा (राज्य)। CGST के बराबर।",
  },
  {
    key: "gst.invoice.igst",
    label: "IGST (for sales to another state)",
    hint: "Used instead of CGST + SGST when the buyer is in a different state. Leave 0 for within-state bills.",
    example: "18% GST on ₹10,000 sold to Delhi from Mumbai → IGST ₹1,800.",
    hindi: "दूसरे राज्य में बिक्री पर पूरा GST यहाँ। अपने राज्य के बिल के लिए 0।",
  },
];

/** Page headings, sentences and button labels of the ITR / GST flows, keyed so admins can edit any word. */
export const portalText: Array<{ key: string; text: string }> = [
  // Filing stepper
  { key: "itr.steps.upload", text: "Start" },
  { key: "itr.steps.review", text: "Check salary details" },
  { key: "itr.steps.additional_income", text: "Business & other income" },
  { key: "itr.steps.deductions", text: "Tax-saving expenses" },
  { key: "itr.steps.compute", text: "Your tax" },
  { key: "itr.steps.suggestions", text: "Ways to save tax" },
  { key: "itr.steps.generate", text: "Prepare return" },
  { key: "itr.steps.summary", text: "Done" },

  // Upload / start page
  { key: "itr.upload.title", text: "Let's file your income tax return" },
  { key: "itr.upload.subtitle", text: "Answer a few simple questions. We will pick the right form and work out your tax — no accountant language." },
  { key: "itr.upload.salaried.title", text: "I get a salary (I have Form 16)" },
  { key: "itr.upload.salaried.body", text: "Upload the Form 16 PDF your employer gave you. We read it and fill everything for you." },
  { key: "itr.upload.business.title", text: "I run a business, shop or work for myself" },
  { key: "itr.upload.business.body", text: "No Form 16 needed. You'll just tell us your total sales, profit and any tax already paid." },
  { key: "itr.upload.business.button", text: "Start without Form 16" },
  { key: "itr.upload.drop", text: "Drop your Form 16 PDF here" },
  { key: "itr.upload.sample.title", text: "Just looking around?" },
  { key: "itr.upload.sample.body", text: "Try the flow with a sample Form 16 to see how it works." },

  // Income page
  { key: "itr.income.title", text: "Your income & tax-saving expenses" },
  { key: "itr.income.subtitle", text: "Fill only what applies to you — leave the rest as 0. Tap the ⓘ next to any box to see where the number comes from." },
  { key: "itr.income.business.title", text: "Business or professional income" },
  { key: "itr.income.business.body", text: "For shopkeepers, traders, contractors, doctors, freelancers. Round figures are fine — we'll refine them at review." },
  { key: "itr.income.interest.title", text: "Interest from banks" },
  { key: "itr.income.interest.body", text: "Banks report this to the tax department, so include it even if it's small." },
  { key: "itr.income.gains.title", text: "Profit from selling shares, mutual funds or property" },
  { key: "itr.income.gains.body", text: "Skip if you didn't sell any investments this year." },
  { key: "itr.income.other.title", text: "Rent and other income" },
  { key: "itr.income.hra.title", text: "Rent you pay for your home (salaried with HRA only)" },
  { key: "itr.income.hra.metro", text: "I live in Delhi, Mumbai, Chennai or Kolkata" },
  { key: "itr.income.hra.nonMetro", text: "I live in another city or town" },
  { key: "itr.income.taxPaid.title", text: "Tax already paid" },
  { key: "itr.income.taxPaid.body", text: "Tax cut by others or paid by you during the year. We subtract this so you only pay the balance (or get a refund)." },
  { key: "itr.income.deductions.title", text: "Expenses that reduce your tax (old regime)" },
  { key: "itr.income.deductions.body", text: "Insurance, savings, school fees, home loan — the government lets you subtract these from income. We'll also check if the new regime (no deductions, lower rates) is better for you." },
  { key: "itr.income.back", text: "Back" },
  { key: "itr.income.next", text: "Calculate my tax" },

  // GST pages
  { key: "gst.returns.title", text: "GST returns" },
  { key: "gst.returns.subtitle", text: "Step 1: start a return for a month. Step 2: add your bills. Step 3: check and send it for filing." },
  { key: "gst.returns.start.title", text: "Start a return" },
  { key: "gst.returns.start.body", text: "Pick your GST number, the return type and the month. The due date is shown automatically." },
  { key: "gst.returns.registration", text: "Your GST number" },
  { key: "gst.returns.create", text: "Start this return" },
  { key: "gst.invoices.title", text: "Your bills for this return" },
  { key: "gst.invoices.subtitle", text: "Add every sales bill you issued and every purchase bill you received for the month. Tap ⓘ on any box for help." },
  { key: "gst.invoices.add.title", text: "Add a bill" },
  { key: "gst.invoices.add.body", text: "Same-state bill: fill CGST and SGST (equal halves). Other-state bill: fill only IGST." },
  { key: "gst.invoices.add.button", text: "Save bill" },
  { key: "gst.invoices.import.title", text: "Have bills in Excel / Tally?" },
  { key: "gst.invoices.import.body", text: "Export as CSV and upload — we read the columns by name (document type, invoice number, date, taxable value, CGST, SGST, IGST, GSTIN, place of supply). Duplicates are skipped." },
  { key: "gst.invoices.list.title", text: "Bills added so far" },
  { key: "gst.profile.title", text: "Your GST registration" },
  { key: "gst.profile.subtitle", text: "Copy these details from your GST certificate once; every return will use them." },
];
