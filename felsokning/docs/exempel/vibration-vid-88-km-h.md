# Exempelflöde: ”Bilen vibrerar runt 88 km/h”

Det här exemplet illustrerar hur Guidad Felsökning fungerar i praktiken: en digital diagnostikprocess, inte en AI-chat. AI:n hoppar inte direkt till ”det är nog hjulbalansering”, utan följer en reproducerbar metod.

---

## Ärende

**Kundens beskrivning**

> ”Bilen vibrerar runt 88 km/h.”

---

## Steg 1 – Verifiera symptom

Systemet frågar:

- Är vibrationen hastighetsberoende?
- Känns den i ratten, stolen eller hela bilen?
- Sker den vid acceleration, jämn fart eller inbromsning?
- Försvinner den över eller under ett visst hastighetsintervall?

När svaren finns dokumenterade går processen vidare.

---

## Steg 2 – Visuell kontroll

Systemet ber teknikern att fotografera:

- Vänster framhjul
- Höger framhjul
- Vänster bakhjul
- Höger bakhjul

Bildanalysen kan därefter hjälpa till att identifiera sådant som faktiskt går att observera, till exempel:

- däckets DOT-/tillverkningsdatum (via OCR),
- ovanligt eller ojämnt slitage,
- synliga skador eller deformationer,
- saknade eller lösa balanseringsvikter om de är tydligt synliga,
- felaktig däckdimension eller olika däcktyper.

Det viktiga är att systemet skiljer på **observation** och **slutsats**. Exempelvis kan det säga:

> ”En balanseringsvikt verkar saknas på höger framhjul. Kontrollera hjulet manuellt.”

i stället för att slå fast att det är orsaken till felet.

---

## Steg 3 – Rekommenderade kontroller

Därefter föreslår systemet nästa steg, exempelvis:

- kontrollera lufttryck,
- kontrollera hjulmoment,
- kontrollera radial- och sidokast,
- kontrollera hjulbalansering,
- kontrollera bussningar och leder,
- genomför provkörning.

Varje punkt bockas av och dokumenteras.

---

## Steg 4 – Provkörning

Systemet sammanfattar vad som ska verifieras under provkörningen:

- Hastighet där vibration uppstår.
- Förändring vid acceleration.
- Förändring vid motorbroms.
- Förändring vid kurvtagning.
- Om vibration känns i ratt eller kaross.

---

## Steg 5 – Sammanfattning

När teknikern väljer att pausa eller avsluta arbetet genereras automatiskt en rapport, exempelvis:

**Utförda kontroller**

- Fyra hjul fotograferade.
- DOT-koder dokumenterade.
- Däckslitage kontrollerat.
- Lufttryck verifierat.
- Hjulbalansering kontrollerad.
- Provkörning genomförd.

**Resultat**

Observationer och mätvärden sammanfattas utan att systemet drar slutsatser som saknar stöd.

**Rekommenderade nästa steg**

Exempelvis kontroll av drivaxlar, hjullager eller andra komponenter om tidigare kontroller inte identifierat orsaken.
