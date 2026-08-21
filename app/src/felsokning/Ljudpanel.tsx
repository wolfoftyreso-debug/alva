// Ljudpanelen — akustisk diagnos i ärendet.
//
// Ur serverkopians arbete (ALVA-DOC-0012, lyft 3), omsatt i ALVA:s
// komponentspråk. Flödet är metodikens: välj sekvens, följ
// instruktionerna, spela in, läs resultatet MED dess begränsningar,
// dokumentera. Hypoteser dokumenteras bara på teknikerns eget klick
// och alltid som hypotes med nivå — aldrig som konstaterande.
//
// Panelen är hopfälld tills den behövs: diagnosrutan och ärendevyn
// visar arbetet, inte verktygslådan.

import { useEffect, useRef, useState } from "react";
import { Panel, StorKnapp, TextFalt } from "./ui";
import { IkonMik } from "./ikoner";
import type { Handelse } from "./domain";
import { type Ljudjamforelse, jamforLjudprofil, plattformAktiv, tranaLjudprofil } from "./plattform";
import {
  MATSEKVENSER,
  type Sekvens,
  type Spektralresultat,
  type Stoppregel,
  analyseraKanal,
  hypoteshandelse,
  ljudforslag,
  ljudhandelser,
  profilsardrag,
  stoppregler,
} from "./ljuddiagnos";

const ALLVARSFARG: Record<Stoppregel["allvar"], string> = {
  kritisk: "#8B1A1A",
  varning: "#8A5A00",
};

/** Längsta inspelning innan den stoppas automatiskt. */
const MAX_INSPELNING_S = 120;

export function Ljudpanel({ skicka, fordon }: { skicka: (h: Handelse) => void; fordon?: string }) {
  const [oppen, setOppen] = useState(false);
  const [sekvens, setSekvens] = useState<Sekvens>("A");
  const [rpmText, setRpmText] = useState("");
  const [reproducerad, setReproducerad] = useState(false);
  const [spelarIn, setSpelarIn] = useState(false);
  const [sekunder, setSekunder] = useState(0);
  const [resultat, setResultat] = useState<Spektralresultat | null>(null);
  const [dokumenterat, setDokumenterat] = useState(false);
  const [fel, setFel] = useState("");
  const [jamforelse, setJamforelse] = useState<Ljudjamforelse | null>(null);
  const [referensSvar, setReferensSvar] = useState("");
  const inspelare = useRef<MediaRecorder | null>(null);
  const bitar = useRef<Blob[]>([]);
  const klocka = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ett byte av sekvens gör föregående resultat inaktuellt.
  useEffect(() => {
    setResultat(null);
    setDokumenterat(false);
    setJamforelse(null);
    setReferensSvar("");
  }, [sekvens]);

  const stoppaKlocka = () => {
    if (klocka.current) clearInterval(klocka.current);
    klocka.current = null;
  };

  /**
   * Varvtalet ur fältet, eller sekvensens fasta värde.
   *
   * Fältet är fritext ("e.g. 850"), så "1500 rpm" eller "~1500" blev
   * NaN. NaN är falskt, så ordningsanalysen tystnade — men NaN är inte
   * undefined, så stoppregeln "varvtal saknas" tystnade OCKSÅ. Teknikern
   * såg varningen slockna och trodde att ordningen räknats. Siffrorna
   * plockas därför ut, och allt som inte blir ett positivt tal räknas
   * som inget värde alls.
   */
  const tolkaRpm = (): number | undefined => {
    const rått = rpmText.trim();
    if (!rått) return MATSEKVENSER[sekvens].rpm;
    const tal = Number(rått.replace(/[^\d.,]/g, "").replace(",", "."));
    return Number.isFinite(tal) && tal > 0 ? tal : undefined;
  };

  // Mikrofonen får aldrig bli kvar på. Utan städningen fortsatte
  // inspelningen (och sekundklockan) när teknikern bytte flik eller
  // lämnade ärendet — lampan lyste och ingenting stoppade den.
  useEffect(() => {
    return () => {
      stoppaKlocka();
      try {
        inspelare.current?.stream?.getTracks?.().forEach((sp) => sp.stop());
        if (inspelare.current?.state === "recording") inspelare.current.stop();
      } catch {
        // Redan stoppad — inget att göra.
      }
      inspelare.current = null;
    };
  }, []);

  const starta = async () => {
    // Dubbeltryck innan omritning startade två inspelare; den första
    // refen skrevs över och gick sedan inte att stoppa.
    if (spelarIn || inspelare.current) return;
    setFel("");
    setResultat(null);
    setDokumenterat(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFel("Microphone access is not available in this environment.");
      return;
    }
    try {
      const strom = await navigator.mediaDevices.getUserMedia({ audio: true });
      bitar.current = [];
      const r = new MediaRecorder(strom);
      r.ondataavailable = (h) => bitar.current.push(h.data);
      r.onstop = async () => {
        strom.getTracks().forEach((sp) => sp.stop());
        stoppaKlocka();
        setSpelarIn(false);
        inspelare.current = null;
        try {
          const buf = await new Blob(bitar.current).arrayBuffer();
          const ctx = new AudioContext();
          const ljud = await ctx.decodeAudioData(buf);
          void ctx.close();
          setResultat(analyseraKanal(ljud.getChannelData(0), ljud.sampleRate, tolkaRpm()));
        } catch {
          setFel("The recording could not be decoded. Try again.");
        }
      };
      inspelare.current = r;
      r.start();
      setSpelarIn(true);
      setSekunder(0);
      // Tak på längden: rå PCM är ~690 MB per timme, och en bortglömd
      // inspelning kraschade fliken vid avkodningen. Sekvenserna är
      // tiotals sekunder långa — två minuter räcker med marginal.
      klocka.current = setInterval(
        () =>
          setSekunder((s) => {
            if (s + 1 >= MAX_INSPELNING_S) {
              try {
                r.stop();
              } catch {
                // Redan stoppad.
              }
            }
            return s + 1;
          }),
        1000,
      );
    } catch (orsak) {
      // Skilj på nekad mikrofon och en inspelare som inte gick att skapa —
      // bägge gav förr samma (felaktiga) besked om nekad åtkomst.
      const nekad = (orsak as { name?: string })?.name === "NotAllowedError";
      setFel(
        nekad
          ? "Microphone access was denied. Allow the microphone and try again."
          : "The recording could not be started in this browser.",
      );
      setSpelarIn(false);
      stoppaKlocka();
      inspelare.current = null;
    }
  };

  const stoppa = () => inspelare.current?.stop();

  if (!oppen) {
    return (
      <Panel rubrik="Acoustic diagnosis">
        <StorKnapp variant="sekundar" onClick={() => setOppen(true)}>
          <IkonMik /> Record and analyze a noise
        </StorKnapp>
      </Panel>
    );
  }

  const rpm = tolkaRpm();
  const stopp = resultat ? stoppregler(sekvens, resultat, rpm, reproducerad) : [];
  const forslag = resultat ? ljudforslag(resultat, reproducerad) : [];
  const s = MATSEKVENSER[sekvens];

  return (
    <Panel rubrik="Acoustic diagnosis">
      <p className="mb-4 text-[14px] text-[#1B1E22]">
        The analysis runs entirely in the browser: averaged spectrum, dominant frequency and — with a
        stated engine speed — the order, which says what rotates in time with the sound. It points at
        where to measure; it never states a cause.
      </p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {(Object.keys(MATSEKVENSER) as Sekvens[]).map((valbar) => (
          <button
            key={valbar}
            type="button"
            onClick={() => setSekvens(valbar)}
            className={`min-h-9 border px-2 text-[12px] font-semibold ${
              sekvens === valbar
                ? "border-[#005CA9] bg-[#005CA9] text-white"
                : "border-[#D7DCE2] bg-[#F6F7F8] text-[#1B1E22]"
            }`}
          >
            {valbar} · {MATSEKVENSER[valbar].namn}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[13px] font-semibold text-[#1B1E22]">{s.beskrivning}</p>
      <ol className="mb-4 list-decimal pl-6 text-[13px] text-[#4D5662]">
        {s.instruktioner.map((rad) => (
          <li key={rad}>{rad}</li>
        ))}
      </ol>

      <TextFalt
        label={`Engine speed during the recording (rpm)${s.rpm ? ` — sequence target ${s.rpm}` : ", if known"}`}
        varde={rpmText}
        satt={setRpmText}
        platshallare={s.rpm ? String(s.rpm) : "e.g. 850"}
      />
      <label className="mb-4 flex items-center gap-2 text-[13px] text-[#1B1E22]">
        <input type="checkbox" checked={reproducerad} onChange={(h) => setReproducerad(h.target.checked)} />
        The reported noise was audible during the recording
      </label>

      {!spelarIn ? (
        <StorKnapp onClick={starta}>
          <IkonMik /> Record ({s.varaktighetS} s)
        </StorKnapp>
      ) : (
        <StorKnapp onClick={stoppa}>Stop — {sekunder} s recorded</StorKnapp>
      )}
      {fel && <p className="mt-2 font-semibold text-[#8B1A1A]">{fel}</p>}

      {resultat && (
        <div className="mt-4 border border-[#D7DCE2] bg-[#F6F7F8] p-4">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">Result</p>
          <p className="mt-2 text-[15px] font-semibold text-[#1B1E22]">
            Dominant {resultat.dominantHz} Hz
            {resultat.ordning !== undefined ? ` · order ${resultat.ordning}` : ""} · SNR {resultat.snrDb} dB
          </p>
          <p className="mt-2 text-[13px] text-[#4D5662]">
            Peaks: {resultat.toppar.map((t) => `${t.hz} Hz (${Math.round(t.rel * 100)}%)`).join(" · ") || "none"}
          </p>

          {stopp.map((regel) => (
            <p key={regel.regel} className="mt-2 text-[13px] font-semibold" style={{ color: ALLVARSFARG[regel.allvar] }}>
              {regel.meddelande} {regel.atgard}
            </p>
          ))}

          {!dokumenterat ? (
            <div className="mt-4">
              <StorKnapp
                onClick={() => {
                  for (const h of ljudhandelser(sekvens, resultat, stopp)) skicka(h);
                  setDokumenterat(true);
                }}
              >
                Document the measurement
              </StorKnapp>
            </div>
          ) : (
            <p className="mt-4 text-[13px] font-semibold text-[#1B1E22]">✓ Documented in the work log.</p>
          )}

          {dokumenterat &&
            forslag.map((f) => (
              <div key={f.text} className="mt-4 border-t border-[#D7DCE2] pt-4">
                <p className="text-[13px] text-[#1B1E22]">{f.text}</p>
                <div className="mt-2">
                  <StorKnapp variant="sekundar" onClick={() => skicka(hypoteshandelse(f))}>
                    Document as hypothesis ({f.niva === "medel" ? "medium" : "low"} confidence)
                  </StorKnapp>
                </div>
              </div>
            ))}

          {/* Referensprofilen — organisationens egen inlärda normalbild
              för fordonstypen. Jämförelsen skickar särdrag, aldrig ljud,
              och träning kräver ett aktivt val: bara en frisk bil får
              lära referensen vad friskt låter som. */}
          {plattformAktiv() && fordon && (
            <div className="mt-4 border-t border-[#D7DCE2] pt-4">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4D5662]">
                Reference profile — {fordon}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StorKnapp
                  variant="sekundar"
                  onClick={async () => {
                    setReferensSvar("");
                    try {
                      setJamforelse(await jamforLjudprofil(fordon, sekvens, profilsardrag(resultat)));
                    } catch (misslyckande) {
                      setReferensSvar(misslyckande instanceof Error ? misslyckande.message : "Failed.");
                    }
                  }}
                >
                  Compare against reference
                </StorKnapp>
                <StorKnapp
                  variant="sekundar"
                  onClick={async () => {
                    setReferensSvar("");
                    try {
                      const svar = await tranaLjudprofil(fordon, sekvens, profilsardrag(resultat));
                      setReferensSvar(
                        `Added. The reference now holds ${svar.antal} recording(s)` +
                          (svar.anvandbar ? "." : " — not yet usable."),
                      );
                    } catch (misslyckande) {
                      setReferensSvar(misslyckande instanceof Error ? misslyckande.message : "Failed.");
                    }
                  }}
                >
                  Add as known-good
                </StorKnapp>
              </div>
              <p className="mt-2 text-[12px] text-[#4D5662]">
                Add a recording only when the vehicle is verified healthy — the reference learns what
                healthy sounds like from your own documented recordings, nothing else.
              </p>
              {referensSvar && <p className="mt-2 text-[13px] font-semibold text-[#1B1E22]">{referensSvar}</p>}
              {jamforelse && (
                <div className="mt-2 text-[13px] text-[#1B1E22]">
                  {jamforelse.anvandbar ? (
                    <>
                      <p className="font-semibold">
                        {jamforelse.bedomning === "avvikande"
                          ? `Deviates from the reference (mean z ${jamforelse.snittZ}, max ${jamforelse.maxZ})`
                          : `Within the reference (mean z ${jamforelse.snittZ})`}
                        {" · "}based on {jamforelse.antalIReferens} recording(s)
                      </p>
                      {(jamforelse.avvikande?.length ?? 0) > 0 && (
                        <p className="mt-2 text-[#4D5662]">Deviating features: {jamforelse.avvikande?.join(", ")}</p>
                      )}
                      <div className="mt-2">
                        <StorKnapp
                          variant="sekundar"
                          onClick={() =>
                            skicka({
                              typ: "observation",
                              text:
                                `Acoustic reference comparison, sequence ${sekvens}, vehicle type "${fordon}": ` +
                                (jamforelse.bedomning === "avvikande"
                                  ? `deviates from the organization's reference (mean z ${jamforelse.snittZ}, max ${jamforelse.maxZ}, features: ${jamforelse.avvikande?.join(", ") || "-"})`
                                  : `within the organization's reference (mean z ${jamforelse.snittZ})`) +
                                `, reference built from ${jamforelse.antalIReferens} documented recording(s).`,
                            })
                          }
                        >
                          Document the comparison
                        </StorKnapp>
                      </div>
                    </>
                  ) : (
                    <p>{jamforelse.orsak}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
