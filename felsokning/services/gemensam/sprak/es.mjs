// ALVA-SPEC-060 · Español.
//
// Las instrucciones van en infinitivo, sin dirigirse al usuario:
// «Fotografiar el cuentakilómetros», no «Fotografíe el cuentakilómetros».
// Es el registro de las instrucciones técnicas y respeta ALVA-SPEC-001 §7
// — el sistema informa de un estado, no se dirige al operario.
//
// `granskat: false`: la interfaz está traducida; el texto de
// procedimiento no está revisado por un especialista. Véase index.mjs.

export const ES = {
  // ---- Grados de evidencia ------------------------------------------------
  "evidens.E1": "Observación",
  "evidens.E2": "Fotografía",
  "evidens.E3": "Vídeo con sonido",
  "evidens.E4": "Medición, instrumento calibrado",
  "evidens.E5": "Documento",
  "evidens.ej_kalibrerad": "calibración ausente o caducada",
  "evidens.ej_angivet": "instrumento no indicado",
  "evidens.ej_fotograferad": "introducido, no fotografiado",

  // ---- El control de cierre -----------------------------------------------
  "grind.objekt": "Identificación del vehículo u objeto verificada",
  "grind.historik": "Historial del vehículo comprobado o justificado",
  "grind.historik.nekad": "Una comprobación de historial rechazada exige un motivo indicado.",
  "grind.historik.saknas": "No hay ninguna comprobación de historial documentada.",
  "grind.matarstallning.ingaende": "Kilometraje de entrada fotografiado",
  "grind.matarstallning.utgaende": "Kilometraje de salida fotografiado",
  "grind.matarstallning.saknas": "No hay ningún kilometraje documentado.",
  "grind.matarstallning.ej_foto":
    "El kilometraje está introducido pero no fotografiado. Fotografiar el cuentakilómetros, o indicar por qué no es posible.",
  "grind.reproducering": "Verificación del síntoma: reproducido, o documentado como no reproducible",
  "grind.felorsak": "Análisis de la causa raíz documentado",
  "grind.atgard": "Acción correctiva documentada o justificada",
  "grind.atgard.saknas": "No está documentada ni una acción realizada ni un motivo de su ausencia.",
  "grind.kundbeslut": "Decisión del cliente sobre la propuesta registrada",
  "grind.kundbeslut.avbojt": "Trabajo realizado pese a una propuesta rechazada",
  "grind.kundbeslut.avbojt.detalj":
    "El cliente rechazó la propuesta, pero hay trabajo documentado como realizado.",
  "grind.kvalitetskontroll": "Control de calidad realizado — síntoma verificado",
  "grind.kontroller": "Puntos de control de la metodología: evidencia, o exención documentada",
  "grind.foton": "Hay fotografías para los controles que las exigen",
  "grind.slutsats": "Conclusión (ALVA-RULE-200)",
  "grind.hogvolt.behorighet": "Habilitación de alta tensión confirmada",
  "grind.hogvolt.spanningslos": "Vehículo sin tensión según el procedimiento del fabricante",
  "grind.regelpaket": "La firma del paquete de reglas no coincide — cierre bloqueado.",
  "grind.regelpaket.osignerat": "Se utiliza un paquete de reglas externo sin firma — cierre bloqueado.",
  "grind.evidens": "Nivel de evidencia superior a E0",
  "grind.evidens.saknas": "No hay ninguna evidencia de ningún tipo en el registro.",
  "grind.foton.detalj": "{kontroller} controles exigen fotografía, {foton} fotografías en el registro.",
  "grind.sparr.ej_uppfyllt": "El requisito de seguridad no se cumple.",
  "grind.arendetyp.okant": "Requisito desconocido en el paquete de reglas: {krav}",
  "grind.arendetyp.krav": "Requisito para este tipo de expediente: {krav}",
  "grind.sakerhet": "Nivel de confianza dentro de lo que sustenta la evidencia",
  "grind.sakerhet.detalj": "La confianza indicada ({niva}) supera lo que sustenta la evidencia ({tak}). Completar la evidencia, o bajar el nivel — la incertidumbre honesta es información.",


  // ---- La conclusión (ALVA-RULE-200) --------------------------------------
  "slutsats.rubrik": "Conclusión",
  "slutsats.konstaterat": "Qué se ha establecido",
  "slutsats.evidens": "Qué evidencia lo sustenta",
  "slutsats.avfardat": "Qué hipótesis se han descartado, y por qué",
  "slutsats.osakert": "Qué sigue siendo incierto",
  "slutsats.ickesvar": "Eso no es una conclusión. Indicar qué se ha establecido y qué evidencia lo sustenta.",
  "slutsats.falt.motivering": "Justificación",
  "slutsats.falt.motivering_ej": "Motivo por el que no se pudo establecer la causa",
  "slutsats.falt.uteslutet": "Alternativas descartadas",
  "slutsats.falt.kvarstaende": "Incertidumbre restante",
  "slutsats.falt.atgardsval": "Elección de la acción",
  "slutsats.saknas": "Falta {falt}.",
  "slutsats.ickesvar.falt": "{falt}: «{text}» no es un motivo. Indicar qué se aplica realmente, y por qué.",
  "slutsats.for_kort": "{falt} es demasiado corto ({langd} de al menos {minsta} caracteres) para poder revisarse después.",
  "slutsats.utan_varfor": "{falt} indica el qué, pero no el porqué. Vincular la conclusión con la evidencia — ¿qué hay en ella que la sustente?",
  "slutsats.utan_slutsats": "El expediente no se puede cerrar sin una conclusión. Indicar por qué la conclusión se desprende de la evidencia.",
  "slutsats.hypotes_obemott": "La hipótesis «{text}» figura en el registro pero no se aborda. Indicar por qué se descartó, o por qué sigue abierta.",


  // ---- Flujo del expediente -----------------------------------------------
  "arende.nytt": "Nuevo expediente",
  "arende.oppna": "Expedientes abiertos",
  "arende.avslutade": "Expedientes cerrados",
  "arende.avsluta": "Cerrar el expediente",
  "arende.avslutat": "Expediente cerrado",
  "arende.kan_ej_avslutas": "El expediente todavía no se puede cerrar",
  "arende.hinder": "Pendiente antes del cierre",
  "arende.overlamna": "Transferir",
  "arende.ansvarig": "Responsable",

  // ---- Comprobación previa ------------------------------------------------
  "pre.rubrik": "Comprobación previa — antes de iniciar el trabajo",
  "pre.historik.fraga":
    "¿Se ha comprobado el historial del vehículo? (trabajos anteriores, fallos recurrentes, TSB, campañas)",
  "pre.historik.ja": "Sí — comprobado",
  "pre.historik.nej": "No",
  "pre.historik.skal": "Motivo por el que no se ha comprobado el historial (obligatorio)",
  "pre.historik.relevant": "Trabajos anteriores relevantes (opcional — cadena causal)",
  "pre.matarstallning": "Kilometraje",
  "pre.fotografera": "Fotografiar el cuadro de instrumentos",
  "pre.felbeskrivning": "Descripción del fallo del cliente verificada",
  "pre.observationer": "¿Algo más en la recepción?",

  // ---- Acciones -----------------------------------------------------------
  "handling.spara": "Guardar",
  "handling.avbryt": "Cancelar",
  "handling.fortsatt": "Continuar",
  "handling.tillbaka": "Atrás",
  "handling.dokumentera": "Documentar",
  "handling.fotografera": "Fotografiar",
  "handling.spela_in": "Grabar vídeo",
  "handling.undantag": "Documentar una exención",
  "handling.undantag.skal": "Motivo de la exención (obligatorio)",
  "handling.exportera": "Exportar",
  "handling.skriv_ut": "Imprimir",

  // ---- Medición -----------------------------------------------------------
  "matning.varde": "Valor",
  "matning.enhet": "Unidad",
  "matning.matdon": "Instrumento",
  "matning.matdon.valj": "Seleccionar instrumento",
  "matning.matdon.okant": "Instrumento desconocido. Registrarlo antes de guardar la medición.",
  "matning.kalibrerad_till": "Calibrado hasta",

  // ---- Informe ------------------------------------------------------------
  "rapport.rubrik": "Informe del expediente",
  "rapport.sammanfattning": "Resumen",
  "rapport.evidens": "Evidencia",
  "rapport.atgarder": "Acciones",
  "rapport.harledd":
    "Derivado del registro del expediente. Las observaciones y las mediciones se presentan sin conclusiones que carezcan de sustento.",

  // ---- Idioma -------------------------------------------------------------
  "sprak.valj": "Idioma",
  "sprak.granskat": "Revisado",
  "sprak.ogranskat": "Sin revisar",
  "sprak.tackning": "{procent} % de la interfaz",

  "metodik.ogranskad":
    "El texto de procedimiento no ha sido revisado por un especialista técnico en {sprak}. Los pasos y los puntos de control se muestran en inglés cuando no existe una traducción revisada — una traducción sin revisar de una instrucción de seguridad es peor que una en lengua extranjera, porque no parece extranjera.",
  "metodik.pa_engelska": "Mostrado en inglés — no hay traducción revisada en {sprak}",
};
