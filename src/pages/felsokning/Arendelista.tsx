import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFelsokning, metodikForArende } from "@/felsokning/store";
import { arAvslutat, felbeskrivning, objekt, sistaAktivitet, brief } from "@/felsokning/projektioner";
import { byggDemoArende } from "@/felsokning/demo";
import {
  hamtaAnvandare,
  loggaInPlattform,
  loggaUtPlattform,
  plattformAktiv,
  plattformKonto,
  registreraPlattform,
  skapaAnvandare,
  type PlattformAnvandare,
  type PlattformKonto,
  type PlattformRoll,
} from "@/felsokning/plattform";
import { FelsokningSkal, Panel, StorKnapp, TextFalt } from "@/felsokning/ui";
import { tidDatum, tidKlockslag } from "@/felsokning/format";

type Filter = "alla" | "pagaende" | "klara";

const ROLL_LABEL: Record<PlattformRoll, string> = {
  tekniker: "Tekniker",
  arbetsledare: "Arbetsledare",
  admin: "Systemadministratör",
};

// Självhostat läge: inloggning mot plattformstjänsten i klustret.
// Registrering skapar en ny organisation (tenant) med användaren som
// systemadministratör; övriga användare skapas av admin.
function PlattformInloggning() {
  const [konto, setKonto] = useState<PlattformKonto | null>(plattformKonto());
  const [lage, setLage] = useState<"stangd" | "loggaIn" | "registrera">("stangd");
  const [epost, setEpost] = useState("");
  const [losenord, setLosenord] = useState("");
  const [nyttNamn, setNyttNamn] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [fel, setFel] = useState("");

  if (konto) {
    return (
      <>
        <Panel rubrik="Plattformskonto">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px]">
              <span className="font-semibold">{konto.namn}</span> · {ROLL_LABEL[konto.roll]} ·{" "}
              {konto.organisation} — synk och beslutsstöd aktiva.
            </p>
            <button
              className="whitespace-nowrap rounded border border-[#ADADAD] px-4 py-2 font-semibold text-[#333333] hover:border-[#8FA8C0]"
              onClick={() => {
                loggaUtPlattform();
                setKonto(null);
              }}
            >
              Logga ut
            </button>
          </div>
          {(konto.roll === "arbetsledare" || konto.roll === "admin") && (
            <Link to="/felsokning/oversikt" className="mt-3 block">
              <StorKnapp variant="sekundar">📊 Organisationsöversikt</StorKnapp>
            </Link>
          )}
          {konto.roll === "admin" && (
            <Link to="/felsokning/installningar" className="mt-2 block">
              <StorKnapp variant="sekundar">⚙️ Inställningar för organisationen</StorKnapp>
            </Link>
          )}
        </Panel>
        {konto.roll === "admin" && <AnvandarAdmin />}
      </>
    );
  }

  return (
    <Panel rubrik="Plattformskonto">
      {lage === "stangd" ? (
        <>
          <p className="mb-2 text-[#333333]">
            Logga in för synk mellan enheter, samarbete i ärenden och beslutsstöd. Utan inloggning
            arbetar appen i lokalt läge. Ny organisation? Skapa konto — du blir systemadministratör.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("registrera")}>
              Skapa organisation
            </StorKnapp>
            <StorKnapp onClick={() => setLage("loggaIn")}>Logga in</StorKnapp>
          </div>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setFel("");
            try {
              setKonto(
                lage === "loggaIn"
                  ? await loggaInPlattform(epost, losenord)
                  : await registreraPlattform(epost, losenord, nyttNamn, organisation),
              );
            } catch (misslyckande) {
              setFel(misslyckande instanceof Error ? misslyckande.message : "Något gick fel.");
            }
          }}
        >
          {lage === "registrera" && (
            <>
              <TextFalt label="Organisation" varde={organisation} satt={setOrganisation} platshallare="T.ex. Verkstad Syd AB" />
              <TextFalt label="Ditt namn" varde={nyttNamn} satt={setNyttNamn} platshallare="T.ex. Anna" />
            </>
          )}
          <TextFalt label="E-post" varde={epost} satt={setEpost} platshallare="anna@verkstaden.se" />
          <TextFalt label="Lösenord (minst 8 tecken)" varde={losenord} satt={setLosenord} losenord />
          {fel && <p className="mb-3 font-semibold text-[#8B1A1A]">{fel}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StorKnapp variant="sekundar" onClick={() => setLage("stangd")}>
              Avbryt
            </StorKnapp>
            <StorKnapp
              type="submit"
              disabled={
                !epost.trim() ||
                losenord.length < 8 ||
                (lage === "registrera" && (!nyttNamn.trim() || !organisation.trim()))
              }
            >
              {lage === "loggaIn" ? "Logga in" : "Skapa organisation"}
            </StorKnapp>
          </div>
        </form>
      )}
    </Panel>
  );
}

// Användarhantering för systemadministratören: lista och skapa användare
// i den egna organisationen (servern verifierar behörigheten).
function AnvandarAdmin() {
  const [oppen, setOppen] = useState(false);
  const [lista, setLista] = useState<PlattformAnvandare[]>([]);
  const [epost, setEpost] = useState("");
  const [namn, setNamn] = useState("");
  const [losenord, setLosenord] = useState("");
  const [roll, setRoll] = useState<PlattformRoll>("tekniker");
  const [fel, setFel] = useState("");

  const uppdatera = async () => {
    try {
      setLista(await hamtaAnvandare());
    } catch {
      setFel("Kunde inte hämta användare.");
    }
  };

  if (!oppen) {
    return (
      <Panel rubrik="Användare">
        <StorKnapp
          variant="sekundar"
          onClick={() => {
            setOppen(true);
            uppdatera();
          }}
        >
          Hantera användare i organisationen
        </StorKnapp>
      </Panel>
    );
  }

  return (
    <Panel rubrik="Användare">
      {lista.map((anv) => (
        <p key={anv.id} className="border-b border-[#DDDDDD] py-1 text-[14px] last:border-0">
          <span className="font-semibold">{anv.namn}</span> · {ROLL_LABEL[anv.roll]}{" "}
          <span className="text-[#707070]">{anv.epost}</span>
        </p>
      ))}
      <form
        className="mt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setFel("");
          try {
            await skapaAnvandare(epost, losenord, namn, roll);
            setEpost("");
            setNamn("");
            setLosenord("");
            await uppdatera();
          } catch (misslyckande) {
            setFel(misslyckande instanceof Error ? misslyckande.message : "Något gick fel.");
          }
        }}
      >
        <TextFalt label="Namn" varde={namn} satt={setNamn} />
        <TextFalt label="E-post" varde={epost} satt={setEpost} />
        <TextFalt label="Lösenord (minst 8 tecken)" varde={losenord} satt={setLosenord} losenord />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {(Object.keys(ROLL_LABEL) as PlattformRoll[]).map((valbar) => (
            <button
              key={valbar}
              type="button"
              onClick={() => setRoll(valbar)}
              className={`min-h-9 rounded border text-[12px] font-semibold ${
                roll === valbar
                  ? "border-[#00437A] bg-[#00437A] text-white"
                  : "border-[#ADADAD] bg-[#F7F7F7] text-[#333333]"
              }`}
            >
              {ROLL_LABEL[valbar]}
            </button>
          ))}
        </div>
        {fel && <p className="mb-3 font-semibold text-[#8B1A1A]">{fel}</p>}
        <StorKnapp type="submit" disabled={!epost.trim() || !namn.trim() || losenord.length < 8}>
          Skapa användare
        </StorKnapp>
      </form>
    </Panel>
  );
}

// Dashboard enligt direktivet: endast det viktigaste — mina ärenden,
// pågående, klara och starta nytt ärende.
export default function Arendelista() {
  const { anvandare, arenden, sattAnvandare, laggInArende, nastaNummer } = useFelsokning();
  const [namn, setNamn] = useState("");
  const [filter, setFilter] = useState<Filter>("alla");

  // Inloggad användare tillfrågas aldrig om namn — kontot vet redan.
  const kontoNamn = plattformKonto()?.namn;
  useEffect(() => {
    if (!anvandare && kontoNamn) sattAnvandare(kontoNamn);
  }, [anvandare, kontoNamn, sattAnvandare]);

  if (!anvandare) {
    return (
      <FelsokningSkal rubrik="Guidad Felsökning">
        <Panel rubrik="Vem arbetar?">
          <p className="mb-3 text-[14px] text-[#333333]">
            Allt arbete loggas med användare och tidpunkt. Ange ditt namn för att börja.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (namn.trim()) sattAnvandare(namn);
            }}
          >
            <TextFalt label="Namn" varde={namn} satt={setNamn} platshallare="T.ex. Anna" />
            <StorKnapp type="submit" disabled={!namn.trim()}>
              Fortsätt
            </StorKnapp>
          </form>
        </Panel>
      </FelsokningSkal>
    );
  }

  const alla = Object.values(arenden).sort((a, b) => b.skapad.localeCompare(a.skapad));
  const pagaende = alla.filter((a) => !arAvslutat(a));
  const klara = alla.filter((a) => arAvslutat(a));
  const lista = filter === "pagaende" ? pagaende : filter === "klara" ? klara : alla;

  const FILTER: { id: Filter; label: string; antal: number }[] = [
    { id: "alla", label: "Alla", antal: alla.length },
    { id: "pagaende", label: "Pågående", antal: pagaende.length },
    { id: "klara", label: "Klara", antal: klara.length },
  ];

  return (
    <FelsokningSkal
      rubrik="Guidad Felsökning"
      hoger={<span className="text-[12px] font-semibold text-[#A9C3DE]">{anvandare}</span>}
    >
      <Link to="/felsokning/nytt">
        <StorKnapp className="mb-4">+ Nytt ärende</StorKnapp>
      </Link>

      {alla.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-1 rounded border border-[#C6C6C6] bg-[#F7F7F7] p-1">
          {FILTER.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`min-h-9 rounded text-[13px] font-semibold transition-colors ${
                filter === f.id ? "bg-[#00437A] text-white" : "text-[#333333] hover:bg-[#E4E9EE]"
              }`}
            >
              {f.label} · {f.antal}
            </button>
          ))}
        </div>
      )}

      {alla.length === 0 && (
        <Panel rubrik="Kom igång">
          <p className="mb-3 text-[14px] text-[#333333]">
            Inga ärenden ännu. Starta med att identifiera ett objekt — eller utforska ett färdigt demoärende
            med komplett arbetslogg, brief och kundrapport.
          </p>
          <StorKnapp variant="sekundar" onClick={() => laggInArende(byggDemoArende(nastaNummer, anvandare))}>
            Skapa demoärende (Volvo XC60, vibration)
          </StorKnapp>
        </Panel>
      )}

      {lista.length === 0 && alla.length > 0 && (
        <p className="text-center text-[14px] text-[#4A5560]">Inga ärenden i det här filtret.</p>
      )}

      {plattformAktiv() && <PlattformInloggning />}

      {!plattformKonto() && (
        <Link to="/felsokning/installningar" className="mb-4 block">
          <StorKnapp variant="sekundar">⚙️ Inställningar</StorKnapp>
        </Link>
      )}

      <Panel rubrik="Beslutsstöd">
        <p className="text-[#333333]">
          När du är inloggad hjälper systemet dig medan du arbetar: föreslår nästa steg utifrån det du
          dokumenterar, granskar hela ärendet på begäran och skriver utkast till överlämningen. Den
          skiljer alltid på verifierat och hypotes — och slår aldrig fast en felorsak som inte är
          bekräftad. Inget att installera eller ställa in; allt ingår i tjänsten. Utan inloggning
          guidar checklistan dig steg för steg.
        </p>
      </Panel>

      {lista.map((arende) => {
        const o = objekt(arende);
        const fel = felbeskrivning(arende);
        const sista = sistaAktivitet(arende);
        const avslutat = arAvslutat(arende);
        const b = brief(arende, metodikForArende(arende), new Date().toISOString());
        return (
          <Link key={arende.id} to={`/felsokning/arende/${arende.id}`} className="block">
            <div className="mb-3 rounded border border-[#C6C6C6] bg-[#F7F7F7] p-4 transition-colors hover:border-[#00437A]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-[#4A5560]">
                  Ärende #{arende.nummer}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                    avslutat ? "bg-[#8A94A0] text-white" : "bg-[#00437A] text-white"
                  }`}
                >
                  {avslutat ? "Avslutat" : "Pågående"}
                </span>
              </div>
              <p className="mt-1 text-[15px] font-semibold">{o ? o.beskrivning : "Okänt objekt"}</p>
              {o && <p className="text-[12px] font-semibold text-[#4A5560]">{o.identifierare}{o.kund ? ` · ${o.kund}` : ""}</p>}
              {fel && <p className="mt-2 text-[14px] text-[#333333]">”{fel}”</p>}
              <p className="mt-2 text-[12px] text-[#707070]">
                {sista ? `Senaste aktivitet ${tidDatum(sista.tidpunkt)} ${tidKlockslag(sista.tidpunkt)}` : ""}
                {" · "}
                {b.totalArbetstid}
              </p>
            </div>
          </Link>
        );
      })}
    </FelsokningSkal>
  );
}
