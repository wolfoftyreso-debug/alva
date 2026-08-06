// ALVA-SPEC-060 · Français.
//
// Les instructions sont à l'infinitif, sans s'adresser à l'utilisateur :
// « Photographier le compteur », et non « Photographiez le compteur ».
// C'est le registre des consignes techniques, et cela respecte
// ALVA-SPEC-001 §7 — le système signale un état, il ne s'adresse pas à
// l'opérateur.
//
// `granskat: false` : l'interface est traduite, le texte de procédure
// n'est pas relu par un spécialiste. Voir index.mjs.

export const FR = {
  // ---- Degrés de preuve ---------------------------------------------------
  "evidens.E1": "Observation",
  "evidens.E2": "Photographie",
  "evidens.E3": "Vidéo avec son",
  "evidens.E4": "Mesure, instrument étalonné",
  "evidens.E5": "Document",
  "evidens.ej_kalibrerad": "étalonnage manquant ou expiré",
  "evidens.ej_angivet": "instrument non indiqué",
  "evidens.ej_fotograferad": "saisi, non photographié",

  // ---- Le contrôle de clôture ---------------------------------------------
  "grind.objekt": "Identification du véhicule ou de l'objet vérifiée",
  "grind.historik": "Historique du véhicule vérifié ou justifié",
  "grind.historik.nekad": "Un contrôle d'historique refusé exige un motif indiqué.",
  "grind.historik.saknas": "Aucun contrôle d'historique documenté.",
  "grind.matarstallning.ingaende": "Kilométrage à la réception photographié",
  "grind.matarstallning.utgaende": "Kilométrage à la restitution photographié",
  "grind.matarstallning.saknas": "Aucun kilométrage documenté.",
  "grind.matarstallning.ej_foto":
    "Le kilométrage est saisi mais non photographié. Photographier le compteur, ou indiquer pourquoi cela n'est pas possible.",
  "grind.reproducering": "Vérification du symptôme : reproduit, ou documenté comme non reproductible",
  "grind.felorsak": "Analyse de la cause racine documentée",
  "grind.atgard": "Action corrective documentée ou justifiée",
  "grind.atgard.saknas": "Ni action réalisée ni motif de son absence n'est documenté.",
  "grind.kundbeslut": "Décision du client sur la proposition enregistrée",
  "grind.kundbeslut.avbojt": "Travaux réalisés malgré une proposition refusée",
  "grind.kundbeslut.avbojt.detalj":
    "Le client a refusé la proposition, mais des travaux sont documentés comme réalisés.",
  "grind.kvalitetskontroll": "Contrôle qualité effectué — symptôme vérifié",
  "grind.kontroller": "Points de contrôle de la méthode : preuve, ou dérogation documentée",
  "grind.foton": "Photographies présentes pour les contrôles qui l'exigent",
  "grind.slutsats": "Conclusion (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Habilitation haute tension confirmée",
  "grind.hogvolt.spanningslos": "Véhicule consigné hors tension selon la procédure du constructeur",
  "grind.regelpaket": "La signature du paquet de règles ne correspond pas — clôture bloquée.",
  "grind.regelpaket.osignerat": "Un paquet de règles externe est utilisé sans signature — clôture bloquée.",
  "grind.evidens": "Niveau de preuve supérieur à E0",
  "grind.evidens.saknas": "Aucune preuve d'aucune sorte ne figure dans le journal.",
  "grind.foton.detalj": "{kontroller} contrôles exigent une photographie, {foton} photographies dans le journal.",
  "grind.sparr.ej_uppfyllt": "L'exigence de sécurité n'est pas satisfaite.",
  "grind.arendetyp.okant": "Exigence inconnue dans le paquet de règles : {krav}",
  "grind.arendetyp.krav": "Exigence pour ce type de dossier : {krav}",


  // ---- La conclusion (ALVA-RULE-200) --------------------------------------
  "slutsats.rubrik": "Conclusion",
  "slutsats.konstaterat": "Ce qui est établi",
  "slutsats.evidens": "Quelles preuves l'étayent",
  "slutsats.avfardat": "Quelles hypothèses ont été écartées, et pourquoi",
  "slutsats.osakert": "Ce qui reste incertain",
  "slutsats.ickesvar": "Ce n'est pas une conclusion. Indiquer ce qui est établi et quelles preuves l'étayent.",
  "slutsats.falt.motivering": "Justification",
  "slutsats.falt.motivering_ej": "Motif pour lequel la cause n'a pas pu être établie",
  "slutsats.falt.uteslutet": "Alternatives écartées",
  "slutsats.falt.kvarstaende": "Incertitude restante",
  "slutsats.falt.atgardsval": "Choix de l'action",
  "slutsats.saknas": "{falt} est absent.",
  "slutsats.ickesvar.falt": "{falt} : « {text} » n'est pas un motif. Indiquer ce qui s'applique réellement, et pourquoi.",
  "slutsats.for_kort": "{falt} est trop court ({langd} sur au moins {minsta} caractères) pour être vérifiable après coup.",
  "slutsats.utan_varfor": "{falt} indique le quoi, mais pas le pourquoi. Relier la conclusion aux preuves — qu'est-ce qui, dans celles-ci, la rend fondée ?",
  "slutsats.utan_slutsats": "Le dossier ne peut pas être clôturé sans conclusion. Indiquer pourquoi la conclusion découle des preuves.",
  "slutsats.hypotes_obemott": "L'hypothèse « {text} » figure dans le journal mais n'est pas traitée. Indiquer pourquoi elle a été écartée, ou pourquoi elle reste ouverte.",


  // ---- Flux du dossier ----------------------------------------------------
  "arende.nytt": "Nouveau dossier",
  "arende.oppna": "Dossiers ouverts",
  "arende.avslutade": "Dossiers clôturés",
  "arende.avsluta": "Clôturer le dossier",
  "arende.avslutat": "Dossier clôturé",
  "arende.kan_ej_avslutas": "Le dossier ne peut pas encore être clôturé",
  "arende.hinder": "Reste avant clôture",
  "arende.overlamna": "Transmettre",
  "arende.ansvarig": "Responsable",

  // ---- Contrôle préalable -------------------------------------------------
  "pre.rubrik": "Contrôle préalable — avant le début des travaux",
  "pre.historik.fraga":
    "L'historique du véhicule a-t-il été vérifié ? (travaux antérieurs, défauts récurrents, TSB, campagnes)",
  "pre.historik.ja": "Oui — vérifié",
  "pre.historik.nej": "Non",
  "pre.historik.skal": "Motif pour lequel l'historique n'a pas été vérifié (obligatoire)",
  "pre.historik.relevant": "Travaux antérieurs pertinents (facultatif — chaîne causale)",
  "pre.matarstallning": "Kilométrage",
  "pre.fotografera": "Photographier le tableau de bord",
  "pre.felbeskrivning": "Description du défaut par le client vérifiée",
  "pre.observationer": "Autre chose à la réception ?",

  // ---- Actions ------------------------------------------------------------
  "handling.spara": "Enregistrer",
  "handling.avbryt": "Annuler",
  "handling.fortsatt": "Continuer",
  "handling.tillbaka": "Retour",
  "handling.dokumentera": "Documenter",
  "handling.fotografera": "Photographier",
  "handling.spela_in": "Enregistrer une vidéo",
  "handling.undantag": "Documenter une dérogation",
  "handling.undantag.skal": "Motif de la dérogation (obligatoire)",
  "handling.exportera": "Exporter",
  "handling.skriv_ut": "Imprimer",

  // ---- Mesure -------------------------------------------------------------
  "matning.varde": "Valeur",
  "matning.enhet": "Unité",
  "matning.matdon": "Instrument",
  "matning.matdon.valj": "Sélectionner un instrument",
  "matning.matdon.okant": "Instrument inconnu. L'enregistrer avant de sauvegarder la mesure.",
  "matning.kalibrerad_till": "Étalonné jusqu'au",

  // ---- Rapport ------------------------------------------------------------
  "rapport.rubrik": "Rapport de dossier",
  "rapport.sammanfattning": "Synthèse",
  "rapport.evidens": "Preuves",
  "rapport.atgarder": "Actions",
  "rapport.harledd":
    "Dérivé du journal du dossier. Les observations et les mesures sont rapportées sans conclusions dépourvues de fondement.",

  // ---- Langue -------------------------------------------------------------
  "sprak.valj": "Langue",
  "sprak.granskat": "Relu",
  "sprak.ogranskat": "Non relu",
  "sprak.tackning": "{procent} % de l'interface",

  "metodik.ogranskad":
    "Le texte de procédure n'a pas été relu par un spécialiste technique en {sprak}. Les étapes et les points de contrôle sont affichés en anglais lorsqu'aucune traduction relue n'existe — une traduction non relue d'une consigne de sécurité est pire qu'une consigne en langue étrangère, parce qu'elle n'a pas l'air étrangère.",
  "metodik.pa_engelska": "Affiché en anglais — aucune traduction relue en {sprak}",
};
