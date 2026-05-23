import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/utils";

// ─── Företagsuppgifter ─────────────────────────────────────────────────────────
const CO = {
  name:     "Utby Snabb Bilservice",
  addr1:    "Vagnmakaregatan 2",
  addr2:    "415 07 Göteborg",
  tel:      "076-422 10 51",
  mobil:    "072-004 09 36",
  email:    "info@utbysnabbbilservice.se",
  web:      "www.utbysnabbbilservice.se",
  bankgiro: "5930-0897",
  momsreg:  "SE000520655201",
  orgNr:    "000520-6552",
};

const BLACK  = "#000000";
const DGREY  = "#444444";
const GREY   = "#777777";
const LGREY  = "#aaaaaa";
const BORDER = "#cccccc";
const DBORDER = "#333333";

const S = StyleSheet.create({
  page: {
    fontFamily:        "Helvetica",
    fontSize:          8.5,
    color:             BLACK,
    backgroundColor:   "#ffffff",
    paddingTop:        28,
    paddingBottom:     56,
    paddingHorizontal: 36,
  },

  // ── HEADER ──────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection:  "row",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    marginBottom:   0,
  },
  coBlock: {
    flex: 1,
  },
  coName: {
    fontSize:   17,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
  },
  coSub: {
    fontSize:  7.5,
    color:     GREY,
    marginTop: 2,
  },
  titleBlock: {
    alignItems: "flex-end",
  },
  titleText: {
    fontSize:   24,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
  },

  // ── META (höger, under titeln) ───────────────────────────────────────────────
  metaOuter: {
    flexDirection: "row",
    marginTop:     4,
    marginBottom:  6,
  },
  metaSpacer: {
    flex: 1,
  },
  metaRight: {
    flexDirection:     "row",
    borderTopWidth:    1.2,
    borderTopColor:    BLACK,
    borderBottomWidth: 0.4,
    borderBottomColor: BORDER,
    paddingTop:        3,
    paddingBottom:     3,
    minWidth:          "55%",
  },
  metaCell: {
    flex:         1,
    paddingRight: 6,
  },
  metaLabel: {
    fontSize:     6.5,
    color:        LGREY,
    marginBottom: 1,
  },
  metaVal: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
  },

  // ── ADRESSBLOCK ─────────────────────────────────────────────────────────────
  addrSection: {
    marginBottom: 5,
  },
  addrCoName: {
    fontSize:   9,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
    marginBottom: 4,
  },
  addrRow: {
    flexDirection: "row",
  },
  addrCol: {
    flex: 1,
    paddingRight: 10,
    paddingLeft:  14,
  },
  addrColRight: {
    flex: 1,
    paddingRight: 10,
  },
  addrTag: {
    fontSize:     7,
    color:        LGREY,
    fontStyle:    "italic",
    marginBottom: 3,
  },
  addrName: {
    fontSize:   8.5,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
    marginBottom: 1,
  },
  addrLine: {
    fontSize:   8,
    color:      DGREY,
    lineHeight: 1.45,
  },

  // ── SEPARATOR ──────────────────────────────────────────────────────────────
  sep: {
    borderBottomWidth: 0.4,
    borderBottomColor: BORDER,
    marginVertical:    4,
  },
  sepBold: {
    borderBottomWidth: 0.8,
    borderBottomColor: DBORDER,
    marginVertical:    5,
  },

  // ── INFORADER ─────────────────────────────────────────────────────────────
  infoSection: {
    marginBottom: 3,
  },
  infoRowLine: {
    flexDirection:     "row",
    paddingVertical:   2.2,
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER,
  },
  infoHalf: {
    flex:          1,
    flexDirection: "row",
    paddingRight:  8,
  },
  infoLbl: {
    fontSize: 7.5,
    color:    DGREY,
    fontFamily: "Helvetica-Bold",
    width:    "48%",
  },
  infoVal: {
    fontSize: 7.5,
    color:    BLACK,
    flex:     1,
  },

  // ── TABELL ──────────────────────────────────────────────────────────────────
  table: {
    borderTopWidth: 1,
    borderTopColor: BLACK,
    marginTop:      8,
  },
  tHead: {
    flexDirection:     "row",
    borderBottomWidth: 0.8,
    borderBottomColor: BLACK,
    paddingVertical:   2.5,
    paddingHorizontal: 2,
  },
  th: {
    fontSize:   7,
    fontFamily: "Helvetica-Bold",
    color:      DGREY,
  },
  tRow: {
    flexDirection:     "row",
    paddingVertical:   2.5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER,
  },
  tRowAlt: {
    backgroundColor: "#f8f8f8",
  },
  td: {
    fontSize: 8,
    color:    BLACK,
  },
  tdSmall: {
    fontSize: 7,
    color:    GREY,
    marginTop: 1,
  },
  tdBold: {
    fontSize:   8,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
  },

  // Kolumnbredder — Nr | Beskrivning | Antal+Enhet | Pris | Belopp
  cNr:    { width: "5%"  },
  cDesc:  { flex:  1     },
  cAntalEnh: { width: "13%", textAlign: "right" as const },
  cPris:  { width: "11%", textAlign: "right" as const },
  cBel:   { width: "11%", textAlign: "right" as const },

  // ── SUMMOR ──────────────────────────────────────────────────────────────────
  sumSection: {
    borderTopWidth: 1,
    borderTopColor: BLACK,
  },
  sumRow: {
    flexDirection:     "row",
    paddingVertical:   2.2,
    paddingHorizontal: 2,
    borderBottomWidth: 0.3,
    borderBottomColor: BORDER,
  },
  sumLbl: {
    flex:      1,
    textAlign: "right" as const,
    fontSize:  8,
    color:     GREY,
    paddingRight: 6,
  },
  sumVal: {
    width:     "11%",
    textAlign: "right" as const,
    fontSize:  8,
    color:     BLACK,
  },
  sumGrandRow: {
    flexDirection:     "row",
    paddingVertical:   4,
    paddingHorizontal: 2,
    backgroundColor:   "#e8e8e8",
  },
  sumGrandLbl: {
    flex:      1,
    textAlign: "right" as const,
    fontSize:  9,
    fontFamily: "Helvetica-Bold",
    color:     BLACK,
    paddingRight: 6,
  },
  sumGrandVal: {
    width:     "11%",
    textAlign: "right" as const,
    fontSize:  9,
    fontFamily: "Helvetica-Bold",
    color:     BLACK,
  },

  // ── SIDFOT ──────────────────────────────────────────────────────────────────
  footer: {
    position:      "absolute",
    bottom:        16,
    left:          36,
    right:         36,
    borderTopWidth: 0.6,
    borderTopColor: BORDER,
    paddingTop:    5,
    flexDirection: "row",
  },
  footCol: {
    flex:        1,
    paddingRight: 8,
  },
  footBold: {
    fontSize:   7.5,
    fontFamily: "Helvetica-Bold",
    color:      BLACK,
    marginBottom: 1,
  },
  footLbl: {
    fontSize:     6.5,
    color:        LGREY,
    marginTop:    2.5,
    marginBottom: 0.5,
  },
  footVal: {
    fontSize: 7.5,
    color:    DGREY,
  },
});

// ─── Hjälpfunktioner ──────────────────────────────────────────────────────────
function fmt(n: number): string {
  return n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InfoRow({
  left, right,
}: {
  left:  [string, string | undefined | null];
  right?: [string, string | undefined | null];
}) {
  return (
    <View style={S.infoRowLine}>
      <View style={S.infoHalf}>
        <Text style={S.infoLbl}>{left[0]}</Text>
        <Text style={S.infoVal}>{left[1] || "–"}</Text>
      </View>
      {right ? (
        <View style={S.infoHalf}>
          <Text style={S.infoLbl}>{right[0]}</Text>
          <Text style={S.infoVal}>{right[1] || "–"}</Text>
        </View>
      ) : <View style={S.infoHalf} />}
    </View>
  );
}

// ─── Typer ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: number;
  itemType: string;
  articleNumber?: string | null;
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  lineTotal: number;
}

export type DocumentType =
  | "faktura"
  | "offert"
  | "paminnelse1"
  | "paminnelse2"
  | "paminnelse3";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  faktura:     "Faktura",
  offert:      "Offert",
  paminnelse1: "Påminnelse 1",
  paminnelse2: "Påminnelse 2",
  paminnelse3: "Påminnelse 3",
};

interface Props {
  isDraft?: boolean;
  documentType?: DocumentType;
  invoice: {
    invoiceNumber: string;
    orderNumber?: string | null;
    offerNumber?: string | null;
    invoiceDate: string;
    dueDate?: string | null;
    paymentTerms?: string | null;
    customerName?: string | null;
    customerOrgNumber?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerPostalCode?: string | null;
    customerCity?: string | null;
    registrationNumber?: string | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleYear?: number | null;
    vin?: string | null;
    mileage?: number | null;
    mechanic?: string | null;
    internalReference?: string | null;
    workshopNotes?: string | null;
    subtotal: number;
    vatAmount: number;
    total: number;
  };
  items: InvoiceItem[];
}

// ─── Komponent ────────────────────────────────────────────────────────────────
export function InvoicePdf({ invoice, items, documentType = "faktura" }: Props) {
  const docTitle = DOCUMENT_TYPE_LABELS[documentType];
  const vatByRate: Record<number, number> = {};
  for (const it of items) {
    const net = Number(it.quantity) * Number(it.unitPrice) * (1 - Number(it.discountPercent) / 100);
    vatByRate[it.vatRate] = (vatByRate[it.vatRate] ?? 0) + net * (Number(it.vatRate) / 100);
  }

  const postalCity = [invoice.customerPostalCode, invoice.customerCity].filter(Boolean).join("  ");
  const hasVehicle = !!(invoice.registrationNumber || invoice.vehicleMake);

  return (
    <Document title={`${docTitle} ${invoice.invoiceNumber}`} author={CO.name}>
      <Page size="A4" style={S.page}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={S.headerRow}>
          <View style={S.coBlock}>
            <Text style={S.coName}>{CO.name}</Text>
            <Text style={S.coSub}>{CO.addr1}  ·  {CO.addr2}</Text>
          </View>
          <View style={S.titleBlock}>
            <Text style={S.titleText}>{docTitle}</Text>
          </View>
        </View>

        {/* ── META (placerad till höger, under titeln) ─────────────────────── */}
        <View style={S.metaOuter}>
          <View style={S.metaSpacer} />
          <View style={S.metaRight}>
            <View style={S.metaCell}>
              <Text style={S.metaLabel}>Fakturanr.</Text>
              <Text style={S.metaVal}>{invoice.invoiceNumber || "–"}</Text>
            </View>
            <View style={S.metaCell}>
              <Text style={S.metaLabel}>Ordernr.</Text>
              <Text style={S.metaVal}>{invoice.orderNumber || "–"}</Text>
            </View>
            <View style={S.metaCell}>
              <Text style={S.metaLabel}>Offertnr.</Text>
              <Text style={S.metaVal}>{invoice.offerNumber || "–"}</Text>
            </View>
            <View style={S.metaCell}>
              <Text style={S.metaLabel}>Er referens</Text>
              <Text style={S.metaVal}>{invoice.internalReference || "–"}</Text>
            </View>
            <View style={{ minWidth: 22 }}>
              <Text style={S.metaLabel}>Sida</Text>
              <Text style={S.metaVal}>1</Text>
            </View>
          </View>
        </View>

        {/* ── ADRESSBLOCK ─────────────────────────────────────────────────── */}
        <View style={S.addrSection}>
          <View style={S.addrRow}>
            {/* Vänster: avsändaradress, indenterad */}
            <View style={S.addrCol}>
              <Text style={S.addrTag}>Faktura adress</Text>
              <Text style={S.addrName}>{CO.name}</Text>
              <Text style={S.addrLine}>{CO.addr1}</Text>
              <Text style={S.addrLine}>{CO.addr2}</Text>
              <Text style={[S.addrLine, { marginTop: 3 }]}>Tel: {CO.tel}  ·  Mobil: {CO.mobil}</Text>
              <Text style={S.addrLine}>{CO.email}</Text>
            </View>
            {/* Höger: fakturamottagare */}
            <View style={S.addrColRight}>
              <Text style={S.addrTag}>Kund adress</Text>
              {invoice.customerName
                ? <Text style={S.addrName}>{invoice.customerName}</Text>
                : <Text style={S.addrName}>–</Text>
              }
              {invoice.customerAddress
                ? <Text style={S.addrLine}>{invoice.customerAddress}</Text>
                : null
              }
              {postalCity
                ? <Text style={S.addrLine}>{postalCity}</Text>
                : null
              }
              {invoice.customerOrgNumber
                ? <Text style={[S.addrLine, { marginTop: 2 }]}>Org.nr: {invoice.customerOrgNumber}</Text>
                : null
              }
              {invoice.customerPhone
                ? <Text style={S.addrLine}>Tel: {invoice.customerPhone}</Text>
                : null
              }
              {invoice.customerEmail
                ? <Text style={S.addrLine}>{invoice.customerEmail}</Text>
                : null
              }
            </View>
          </View>
        </View>

        {/* ── INFORADER — datum & betalning ──────────────────────────────── */}
        <View style={S.infoSection}>
          <InfoRow
            left={["Fakturadatum",     formatDate(invoice.invoiceDate)]}
            right={["Förfallodatum",   formatDate(invoice.dueDate)]}
          />
          <InfoRow
            left={["Betalningsvillkor", invoice.paymentTerms || "30 dagar"]}
            right={["Bankgiro",         CO.bankgiro]}
          />
          <InfoRow
            left={["Momsreg.nr",        CO.momsreg]}
            right={invoice.mechanic
              ? ["Vår referens", invoice.mechanic]
              : undefined
            }
          />
        </View>

        {/* ── FORDONSINFORMATION ─────────────────────────────────────────── */}
        {hasVehicle && (
          <View style={[S.infoSection, { marginTop: 2 }]}>
            <View style={S.sep} />
            {invoice.vehicleMake && (
              <InfoRow
                left={["Märkeskod",  invoice.vehicleMake]}
                right={["Reg.nr",    invoice.registrationNumber]}
              />
            )}
            {!invoice.vehicleMake && invoice.registrationNumber && (
              <InfoRow left={["Reg.nr", invoice.registrationNumber]} />
            )}
            {invoice.vehicleModel && (
              <InfoRow
                left={["Modell",     invoice.vehicleModel]}
                right={invoice.vehicleYear
                  ? ["Årsmodell", String(invoice.vehicleYear)]
                  : undefined
                }
              />
            )}
            {(invoice.vin || invoice.mileage) && (
              <InfoRow
                left={["Chassinummer", invoice.vin]}
                right={invoice.mileage
                  ? ["Aktuell mätarställning (km)",
                     Number(invoice.mileage).toLocaleString("sv-SE")]
                  : undefined
                }
              />
            )}
          </View>
        )}

        {/* ── VERKSTADSANTECKNINGAR ─────────────────────────────────────── */}
        {invoice.workshopNotes && (
          <View style={{ marginTop: 3 }}>
            <View style={S.sep} />
            <InfoRow left={["Verkstadsanteckningar", invoice.workshopNotes]} />
          </View>
        )}

        {/* ── ARTIKELTABELL ──────────────────────────────────────────────── */}
        <View style={S.table}>
          {/* Tabellhuvud */}
          <View style={S.tHead}>
            <Text style={[S.th, S.cNr]}>Nr.</Text>
            <Text style={[S.th, S.cDesc]}>Beskrivning</Text>
            <Text style={[S.th, S.cAntalEnh]}>Antal Enhet</Text>
            <Text style={[S.th, S.cPris]}>Pris</Text>
            <Text style={[S.th, S.cBel]}>Belopp</Text>
          </View>

          {/* Rader */}
          {items.map((item, idx) => {
            const net    = Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discountPercent) / 100);
            const inclVat = net + net * (Number(item.vatRate) / 100);
            const isLabor = item.itemType === "labor";
            const unit    = item.unit ?? (isLabor ? "tim" : "st");
            const showArt = item.articleNumber && item.articleNumber.trim().length > 0
                            && item.articleNumber !== item.description;
            return (
              <View key={item.id} style={[S.tRow, idx % 2 === 1 ? S.tRowAlt : {}]} wrap={false}>
                <Text style={[S.td, S.cNr, { color: GREY }]}>{idx + 1}</Text>
                <View style={S.cDesc}>
                  <Text style={[
                    S.td,
                    isLabor ? { fontFamily: "Helvetica-Oblique" } : {},
                  ]}>
                    {item.description}
                    {item.discountPercent > 0 ? `  (−${item.discountPercent}%)` : ""}
                  </Text>
                  {showArt && (
                    <Text style={S.tdSmall}>{item.articleNumber}</Text>
                  )}
                </View>
                <Text style={[S.td, S.cAntalEnh]}>
                  {Number(item.quantity).toLocaleString("sv-SE")} {unit}
                </Text>
                <Text style={[S.td, S.cPris]}>{fmt(Number(item.unitPrice))}</Text>
                <Text style={[S.tdBold, S.cBel]}>{fmt(inclVat)}</Text>
              </View>
            );
          })}

          {/* Summor */}
          <View style={S.sumSection}>
            <View style={S.sumRow}>
              <Text style={S.sumLbl}>Delsumma, SEK</Text>
              <Text style={S.sumVal}>{fmt(invoice.subtotal)}</Text>
            </View>
            {Object.entries(vatByRate)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([rate, vat]) => (
                <View key={rate} style={S.sumRow}>
                  <Text style={S.sumLbl}>Moms {rate}%, SEK</Text>
                  <Text style={S.sumVal}>{fmt(vat)}</Text>
                </View>
              ))}
            {Object.keys(vatByRate).length === 0 && (
              <View style={S.sumRow}>
                <Text style={S.sumLbl}>Moms 25%, SEK</Text>
                <Text style={S.sumVal}>{fmt(invoice.vatAmount)}</Text>
              </View>
            )}
            <View style={S.sumGrandRow}>
              <Text style={S.sumGrandLbl}>Att betala inkl. moms, SEK</Text>
              <Text style={S.sumGrandVal}>{fmt(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── SIDFOT ─────────────────────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <View style={S.footCol}>
            <Text style={S.footBold}>{CO.name}</Text>
            <Text style={S.footVal}>{CO.addr1}</Text>
            <Text style={S.footVal}>{CO.addr2}</Text>
          </View>
          <View style={S.footCol}>
            <Text style={S.footLbl}>Telefon</Text>
            <Text style={S.footVal}>{CO.tel}</Text>
            <Text style={S.footLbl}>E-post</Text>
            <Text style={S.footVal}>{CO.email}</Text>
            <Text style={S.footLbl}>Hemsida</Text>
            <Text style={S.footVal}>{CO.web}</Text>
          </View>
          <View style={S.footCol}>
            <Text style={S.footLbl}>Bankgiro</Text>
            <Text style={S.footVal}>{CO.bankgiro}</Text>
            <Text style={S.footLbl}>Moms reg. nr.</Text>
            <Text style={S.footVal}>{CO.momsreg}</Text>
          </View>
          <View>
            <Text style={S.footLbl}>Org.nr</Text>
            <Text style={S.footVal}>{CO.orgNr}</Text>
            <Text style={[S.footBold, { marginTop: 7 }]}>Godkänd för F-skatt</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
