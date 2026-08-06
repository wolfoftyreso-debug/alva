// ALVA-SPEC-060 · Português.
//
// Português europeu (pt-PT), sem o Acordo aplicado às formas em que as
// duas normas divergem de maneira visível para um técnico: «contacto»,
// «registo», «conta-quilómetros». Se surgir um mercado brasileiro, é uma
// entrada nova no catálogo — «pt-BR» — e não uma emenda a esta.
//
// `granskat: false`: a interface está traduzida, o texto dos
// procedimentos não foi revisto por um especialista. Ver index.mjs.

export const PT = {
  // ---- Graus de evidência -------------------------------------------------
  "evidens.E1": "Observação",
  "evidens.E2": "Fotografia",
  "evidens.E3": "Vídeo com som",
  "evidens.E4": "Medição, instrumento calibrado",
  "evidens.E5": "Documento",
  "evidens.ej_kalibrerad": "calibração em falta ou expirada",
  "evidens.ej_angivet": "instrumento não indicado",
  "evidens.ej_fotograferad": "introduzido, não fotografado",

  // ---- O controlo de encerramento -----------------------------------------
  "grind.objekt": "Identificação do veículo ou do objeto verificada",
  "grind.historik": "Histórico do veículo verificado ou justificado",
  "grind.historik.nekad": "Uma verificação de histórico recusada exige um motivo indicado.",
  "grind.historik.saknas": "Nenhuma verificação de histórico documentada.",
  "grind.matarstallning.ingaende": "Quilometragem à entrada fotografada",
  "grind.matarstallning.utgaende": "Quilometragem à saída fotografada",
  "grind.matarstallning.saknas": "Nenhuma quilometragem documentada.",
  "grind.matarstallning.ej_foto":
    "A quilometragem está introduzida mas não fotografada. Fotografar o conta-quilómetros, ou indicar por que motivo não é possível.",
  "grind.reproducering": "Verificação do sintoma: reproduzido, ou documentado como não reproduzível",
  "grind.felorsak": "Análise da causa raiz documentada",
  "grind.atgard": "Ação corretiva documentada ou justificada",
  "grind.atgard.saknas": "Não está documentada nem uma ação realizada nem um motivo para a sua ausência.",
  "grind.kundbeslut": "Decisão do cliente sobre a proposta registada",
  "grind.kundbeslut.avbojt": "Trabalho realizado apesar de uma proposta recusada",
  "grind.kundbeslut.avbojt.detalj": "O cliente recusou a proposta, mas há trabalho documentado como realizado.",
  "grind.kvalitetskontroll": "Controlo de qualidade efetuado — sintoma verificado",
  "grind.kontroller": "Pontos de controlo da metodologia: evidência, ou uma exceção documentada",
  "grind.foton": "Fotografias presentes nos controlos que as exigem",
  "grind.slutsats": "Conclusão (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Habilitação de alta tensão confirmada",
  "grind.hogvolt.spanningslos": "Veículo colocado fora de tensão segundo o procedimento do fabricante",
  "grind.regelpaket": "A assinatura do pacote de regras não corresponde — encerramento bloqueado.",
  "grind.regelpaket.osignerat":
    "Está a ser utilizado um pacote de regras externo sem assinatura — encerramento bloqueado.",
  "grind.evidens": "Nível de evidência superior a E0",
  "grind.evidens.saknas": "Não existe qualquer evidência no registo.",
  "grind.foton.detalj": "{kontroller} controlos exigem fotografia, {foton} fotografias no registo.",
  "grind.sparr.ej_uppfyllt": "O requisito de segurança não está cumprido.",
  "grind.arendetyp.okant": "Requisito desconhecido no pacote de regras: {krav}",
  "grind.arendetyp.krav": "Requisito para este tipo de processo: {krav}",


  // ---- A conclusão (ALVA-RULE-200) ----------------------------------------
  "slutsats.rubrik": "Conclusão",
  "slutsats.konstaterat": "O que foi estabelecido",
  "slutsats.evidens": "Que evidência o sustenta",
  "slutsats.avfardat": "Que hipóteses foram afastadas, e porquê",
  "slutsats.osakert": "O que permanece incerto",
  "slutsats.ickesvar": "Isso não é uma conclusão. Indicar o que foi estabelecido e que evidência o sustenta.",
  "slutsats.falt.motivering": "Fundamentação",
  "slutsats.falt.motivering_ej": "Motivo pelo qual a causa não pôde ser estabelecida",
  "slutsats.falt.uteslutet": "Alternativas afastadas",
  "slutsats.falt.kvarstaende": "Incerteza remanescente",
  "slutsats.falt.atgardsval": "Escolha da ação",
  "slutsats.saknas": "Falta {falt}.",
  "slutsats.ickesvar.falt": "{falt}: «{text}» não é uma fundamentação. Indicar o que se aplica realmente, e porquê.",
  "slutsats.for_kort": "{falt} é demasiado curto ({langd} de pelo menos {minsta} caracteres) para poder ser verificado posteriormente.",
  "slutsats.utan_varfor": "{falt} indica o quê, mas não o porquê. Ligar a conclusão à evidência — o que nela faz com que isto decorra?",
  "slutsats.utan_slutsats": "O processo não pode ser encerrado sem uma conclusão. Indicar por que motivo a conclusão decorre da evidência.",
  "slutsats.hypotes_obemott": "A hipótese «{text}» consta do registo mas não é tratada. Indicar por que motivo foi afastada, ou por que motivo permanece em aberto.",


  // ---- Fluxo do processo --------------------------------------------------
  "arende.nytt": "Novo processo",
  "arende.oppna": "Processos abertos",
  "arende.avslutade": "Processos encerrados",
  "arende.avsluta": "Encerrar o processo",
  "arende.avslutat": "Processo encerrado",
  "arende.kan_ej_avslutas": "O processo ainda não pode ser encerrado",
  "arende.hinder": "Pendente antes do encerramento",
  "arende.overlamna": "Transferir",
  "arende.ansvarig": "Responsável",

  // ---- Verificação prévia -------------------------------------------------
  "pre.rubrik": "Verificação prévia — antes do início do trabalho",
  "pre.historik.fraga":
    "O histórico do veículo foi verificado? (trabalhos anteriores, avarias recorrentes, TSB, campanhas)",
  "pre.historik.ja": "Sim — verificado",
  "pre.historik.nej": "Não",
  "pre.historik.skal": "Motivo pelo qual o histórico não foi verificado (obrigatório)",
  "pre.historik.relevant": "Trabalhos anteriores relevantes (opcional — cadeia causal)",
  "pre.matarstallning": "Quilometragem",
  "pre.fotografera": "Fotografar o painel de instrumentos",
  "pre.felbeskrivning": "Descrição da avaria pelo cliente verificada",
  "pre.observationer": "Mais alguma coisa na receção?",

  // ---- Ações --------------------------------------------------------------
  "handling.spara": "Guardar",
  "handling.avbryt": "Cancelar",
  "handling.fortsatt": "Continuar",
  "handling.tillbaka": "Voltar",
  "handling.dokumentera": "Documentar",
  "handling.fotografera": "Fotografar",
  "handling.spela_in": "Gravar vídeo",
  "handling.undantag": "Documentar uma exceção",
  "handling.undantag.skal": "Motivo da exceção (obrigatório)",
  "handling.exportera": "Exportar",
  "handling.skriv_ut": "Imprimir",

  // ---- Medição ------------------------------------------------------------
  "matning.varde": "Valor",
  "matning.enhet": "Unidade",
  "matning.matdon": "Instrumento",
  "matning.matdon.valj": "Selecionar instrumento",
  "matning.matdon.okant": "Instrumento desconhecido. Registá-lo antes de guardar a medição.",
  "matning.kalibrerad_till": "Calibrado até",

  // ---- Relatório ----------------------------------------------------------
  "rapport.rubrik": "Relatório do processo",
  "rapport.sammanfattning": "Resumo",
  "rapport.evidens": "Evidência",
  "rapport.atgarder": "Ações",
  "rapport.harledd":
    "Derivado do registo do processo. As observações e as medições são apresentadas sem conclusões que careçam de fundamento.",

  // ---- Idioma -------------------------------------------------------------
  "sprak.valj": "Idioma",
  "sprak.granskat": "Revisto",
  "sprak.ogranskat": "Não revisto",
  "sprak.tackning": "{procent} % da interface",

  "metodik.ogranskad":
    "O texto dos procedimentos não foi revisto por um especialista técnico em {sprak}. Os passos e os pontos de controlo são apresentados em inglês onde não existe tradução revista — uma tradução não revista de uma instrução de segurança é pior do que uma em língua estrangeira, porque não parece estrangeira.",
  "metodik.pa_engelska": "Apresentado em inglês — sem tradução revista em {sprak}",
};
