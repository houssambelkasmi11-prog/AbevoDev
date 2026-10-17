import type { LegalDocs } from "./types";

export const de: LegalDocs = {
  terms: {
    title: "Nutzungsbedingungen",
    summary: "Die Vereinbarung zwischen dir und ORBIT: wer es nutzen darf, was du von uns erwarten kannst, was wir von dir erwarten und wie kostenpflichtige Tarife, KI-Funktionen und Streitigkeiten geregelt sind.",
    sections: [
      { id: "about", h: "1. Über diese Bedingungen", body: [
        "Diese Nutzungsbedingungen („Bedingungen“) sind eine Vereinbarung zwischen dir und {{operator}}, handelnd unter dem Namen ORBIT, eingetragen bei der niederländischen Handelskammer (KvK) unter der Nummer {{kvk}}, {{address}} („ORBIT“, „wir“, „uns“).",
        "Sie gelten für die Website und Webanwendung ORBIT (der „Dienst“). Indem du ein Konto erstellst oder den Dienst nutzt, stimmst du diesen Bedingungen zu und bestätigst, unsere Datenschutzerklärung gelesen zu haben. Wenn du nicht einverstanden bist, nutze den Dienst bitte nicht.",
      ] },
      { id: "eligibility", h: "2. Wer ORBIT nutzen darf", body: [
        "Du musst mindestens 13 Jahre alt sein, um ORBIT zu nutzen.",
        "Bist du 13, 14 oder 15 Jahre alt, darfst du ORBIT nur mit Zustimmung eines Elternteils oder gesetzlichen Vertreters nutzen, der diesen Bedingungen auch in deinem Namen zustimmt und für deine Nutzung verantwortlich ist. Wir können eine Bestätigung dieser Zustimmung verlangen.",
        "Erfahren wir, dass ein Konto einer Person unter 13 Jahren oder einer Person zwischen 13 und 15 Jahren ohne elterliche Zustimmung gehört, schließen wir es und löschen die Daten.",
      ] },
      { id: "account", h: "3. Dein Konto", body: [
        "Mache bei der Registrierung korrekte Angaben und halte sie aktuell. Halte dein Passwort geheim — du bist für die Aktivitäten in deinem Konto verantwortlich. Informiere uns sofort unter {{email}}, wenn du einen Missbrauch vermutest.",
        "Du darfst ein persönliches Konto haben. Konten sind nicht übertragbar.",
      ] },
      { id: "service", h: "4. Der Dienst", body: [
        "ORBIT ist ein Lernarbeitsbereich für Notizen, Quellen, KI-gestütztes Lernen, Hausaufgabenplanung, Übungen und Fokuswerkzeuge. Wir verbessern ihn laufend; Funktionen können sich ändern, hinzukommen oder wegfallen. Entfernen wir eine Kernfunktion eines kostenpflichtigen Tarifs, informieren wir dich vorab und du kannst kündigen.",
        "Wir streben eine ständige Verfügbarkeit an, können aber keinen unterbrechungs- oder fehlerfreien Betrieb garantieren. Wartungsarbeiten führen wir möglichst zu ruhigen Zeiten durch.",
      ] },
      { id: "ai", h: "5. KI-Funktionen und deine eigenen API-Schlüssel", body: [
        "Die KI-Funktionen von ORBIT laufen bei externen KI-Anbietern (z. B. OpenAI, Anthropic, Google, OpenRouter oder DeepSeek) mit einem API-Schlüssel, den du bereitstellst. Startest du eine KI-Aktion, werden die dafür nötigen Inhalte (deine Nachricht, relevante Auszüge aus deinen Quellen, angehängte Dateien) an den gewählten Anbieter gesendet.",
        "Für die Nutzung eines Anbieters gilt dein eigener Vertrag mit diesem Anbieter, einschließlich seiner Bedingungen, Nutzungsrichtlinien, Datenschutzerklärung und Preise. Kosten für die KI-Nutzung stellt dir der Anbieter direkt in Rechnung. Wir sind nicht verantwortlich für Verfügbarkeit, Ausgaben, Datenpraktiken oder Kosten eines Anbieters.",
        "Verbinde nur Schlüssel, die du nutzen darfst. Deine Schlüssel werden verschlüsselt gespeichert und nur für von dir angeforderte Aktionen verwendet.",
      ] },
      { id: "output", h: "6. KI-Ausgaben", body: [
        "KI-generierte Inhalte entstehen automatisch und können ungenau, unvollständig, veraltet oder voreingenommen sein — auch wenn sie überzeugt klingen oder eine Quelle nennen. Prüfe wichtige Informationen immer.",
        "KI-Ausgaben sind keine professionelle Beratung (z. B. medizinische, rechtliche, finanzielle oder psychologische Beratung) und dürfen nicht als solche verwendet werden.",
        "ORBIT kennzeichnet KI-generierte Inhalte und hält sie sichtbar getrennt von deiner eigenen Arbeit.",
      ] },
      { id: "integrity", h: "7. Akademische Integrität", body: [
        "ORBIT soll dir beim Lernen helfen, nicht deine Arbeit erledigen. Du bist dafür verantwortlich, die Regeln deiner Schule, Hochschule oder Prüfungsstelle einzuhalten, auch zur Nutzung von KI. Reiche KI-generierte Arbeiten nicht als deine eigenen ein, wo das nicht erlaubt ist.",
      ] },
      { id: "content", h: "8. Deine Inhalte", body: [
        "Du behältst alle Rechte an den Notizen, Dateien, Nachrichten und sonstigen Materialien, die du zu ORBIT hinzufügst („Deine Inhalte“).",
        "Du gewährst uns eine beschränkte, nicht-exklusive Lizenz, Deine Inhalte nur so weit zu speichern, zu kopieren, zu verarbeiten und anzuzeigen, wie es für die Bereitstellung des Dienstes nötig ist — einschließlich der Übermittlung an den KI-Anbieter, den du beim Start einer Aktion wählst. Diese Lizenz endet, wenn du die Inhalte oder dein Konto löschst, mit Ausnahme von Kopien in Backups, die im normalen Zyklus gelöscht werden.",
        "Wir verkaufen Deine Inhalte nicht und nutzen sie weder für Werbung noch zum Training von KI-Modellen.",
        "Du bestätigst, dass du Deine Inhalte hochladen darfst und dass sie keine Rechte Dritter verletzen (z. B. Urheberrechte an Lehrmaterialien, die dir nicht gehören).",
      ] },
      { id: "use", h: "9. Zulässige Nutzung", body: [
        "Du verpflichtest dich, nicht:",
        "• gegen Gesetze zu verstoßen oder anderen dabei zu helfen;",
        "• Inhalte hochzuladen oder zu erzeugen, die rechtswidrig sind, geistiges Eigentum oder Privatsphäre verletzen, andere belästigen oder bedrohen oder Minderjährige sexualisieren;",
        "• unbefugt auf den Dienst, andere Konten oder unsere Systeme zuzugreifen oder deren Sicherheit oder Betrieb zu stören (z. B. durch Schadsoftware, Überlastungsangriffe, Scraping oder automatisierten Massenzugriff);",
        "• den Dienst zurückzuentwickeln, außer soweit das Gesetz dies ausdrücklich erlaubt;",
        "• den Zugang zum Dienst ohne unsere schriftliche Zustimmung weiterzuverkaufen, unterzulizenzieren oder kommerziell zu verwerten;",
        "• dich als jemand anderes auszugeben oder eine falsche Verbindung vorzutäuschen.",
      ] },
      { id: "paid", h: "10. Kostenpflichtige Tarife", body: [
        "ORBIT ist derzeit kostenlos (die KI-Nutzung bezahlst du direkt bei deinem KI-Anbieter). Wir können kostenpflichtige Tarife einführen. Dann gilt zusätzlich zu den Angaben beim Bezahlvorgang:",
        "• Preise werden vor dem Kauf in Euro inklusive Mehrwertsteuer angezeigt. Zahlungen wickelt ein Zahlungsdienstleister ab; wir speichern deine vollständigen Kartendaten nicht.",
        "• Abonnements verlängern sich automatisch um denselben Zeitraum, bis du kündigst. Du kannst jederzeit in deinem Konto kündigen; die Kündigung wird zum Ende des laufenden Zeitraums wirksam und du behältst bis dahin den Zugang. Nach einer etwaigen Erstlaufzeit kannst du stets mit einer Frist von höchstens einem Monat kündigen.",
        "• Widerrufsrecht: Als Verbraucher in der EU kannst du einen Kauf innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen. Verlangst du, dass wir den kostenpflichtigen Dienst schon während dieser Frist erbringen, schuldest du einen anteiligen Betrag für das bereits Erbrachte. Wir erstatten innerhalb von 14 Tagen nach Eingang deines Widerrufs über das ursprüngliche Zahlungsmittel.",
        "• Preisänderungen kündigen wir mindestens 30 Tage im Voraus an. Bist du nicht einverstanden, kannst du vor Inkrafttreten des neuen Preises kündigen.",
        "• Nutzer zwischen 13 und 15 Jahren dürfen nur mit Zustimmung eines Elternteils oder Vormunds kaufen.",
      ] },
      { id: "ip", h: "11. Unser geistiges Eigentum", body: [
        "Der Dienst — einschließlich Software, Design, Texte, Grafiken sowie Name und Logo ORBIT — gehört uns oder unseren Lizenzgebern. Du erhältst ein persönliches, nicht übertragbares Recht zur Nutzung des Dienstes nach diesen Bedingungen; weitere Rechte werden nicht eingeräumt.",
        "Sendest du uns Feedback oder Ideen, dürfen wir diese ohne Verpflichtung dir gegenüber verwenden.",
      ] },
      { id: "termination", h: "12. Beendigung", body: [
        "Du kannst ORBIT jederzeit nicht mehr nutzen und dein Konto unter Einstellungen → Daten & Datenschutz löschen. Das Löschen des Kontos löscht Deine Inhalte endgültig.",
        "Wir können dein Konto sperren oder schließen, wenn du schwerwiegend oder wiederholt gegen diese Bedingungen verstößt, wenn das Gesetz es verlangt oder um andere Nutzer oder den Dienst zu schützen. Wo zumutbar, warnen wir dich vorher und nennen den Grund. Schließen wir ein kostenpflichtiges Konto ohne dein Verschulden, erstatten wir den ungenutzten Teil deines Abonnements.",
      ] },
      { id: "liability", h: "13. Haftung", body: [
        "Nichts in diesen Bedingungen beschränkt oder schließt eine Haftung aus, die nach geltendem Recht nicht beschränkt werden kann, einschließlich der Haftung für Vorsatz oder grobe Fahrlässigkeit, für Tod oder Körperverletzung sowie deiner zwingenden Verbraucherrechte.",
        "Soweit gesetzlich zulässig, haften wir nicht für indirekte Schäden oder Folgeschäden, für Entscheidungen, die du auf Grundlage von KI-Ausgaben triffst, für Handlungen, Ausgaben oder Verfügbarkeit externer KI-Anbieter oder für den Verlust von Inhalten, den du durch eigene Kopien zumutbar hättest vermeiden können (du kannst deine Daten jederzeit exportieren). Unsere Gesamthaftung je Ereignis ist auf den Betrag begrenzt, den du uns in den 12 Monaten davor gezahlt hast, oder auf 100 €, wenn du uns nichts gezahlt hast.",
      ] },
      { id: "changes", h: "14. Änderungen dieser Bedingungen", body: [
        "Wir können diese Bedingungen anpassen, z. B. wenn sich der Dienst oder die Rechtslage ändert. Über wesentliche Änderungen informieren wir dich mindestens 30 Tage vor Inkrafttreten per E-Mail oder in der App. Bist du nicht einverstanden, kannst du den Dienst vorher beenden und dein Konto löschen (und ein Abonnement kündigen).",
      ] },
      { id: "law", h: "15. Anwendbares Recht und Streitigkeiten", body: [
        "Es gilt niederländisches Recht. Wohnst du als Verbraucher in einem anderen EU-Land, behältst du zusätzlich den Schutz der zwingenden Vorschriften dieses Landes.",
        "Bitte kontaktiere uns zuerst unter {{email}} — die meisten Probleme lassen sich schnell lösen. Streitigkeiten werden vor das zuständige Gericht in den Niederlanden gebracht; als Verbraucher kannst du auch die Gerichte deines Wohnsitzlandes anrufen.",
      ] },
      { id: "contact", h: "16. Kontakt", body: [
        "{{operator}} (ORBIT) · {{address}} · KvK {{kvk}} · {{email}}",
      ] },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    summary: "Welche personenbezogenen Daten ORBIT verarbeitet, warum, mit wem sie geteilt werden, wie lange sie gespeichert werden und wie du deine Rechte nach der DSGVO ausübst.",
    sections: [
      { id: "controller", h: "1. Verantwortlicher", body: [
        "{{operator}}, handelnd unter dem Namen ORBIT ({{address}}, KvK {{kvk}}), ist Verantwortlicher für deine personenbezogenen Daten im Sinne der Datenschutz-Grundverordnung (DSGVO). Fragen oder Anfragen: {{email}}.",
      ] },
      { id: "data", h: "2. Welche Daten wir erheben", body: [
        "• Kontodaten: E-Mail-Adresse, Anzeigename (optional), ein sicher gehashtes Passwort, deine Altersbestätigung (16+ oder 13–15 mit elterlicher Zustimmung) und der Zeitpunkt, zu dem du unsere Bedingungen und Datenschutzerklärung akzeptiert hast.",
        "• Deine Inhalte: Notizen, hochgeladene Dateien und daraus extrahierter Text, Gespräche mit KI-Assistenten, Karteikarten und Quizze, Aufgaben, Kalendereinträge, Lerneinheiten, Fächer und die Verbindungen in deiner Wissenskarte.",
        "• Schlüssel von KI-Anbietern: die API-Schlüssel, die du verbindest, verschlüsselt gespeichert (AES-256-GCM). Wir zeigen nur eine maskierte Version an.",
        "• Technische Daten: IP-Adresse, Browser- und Geräteinformationen sowie Serverprotokolle, die bei der Nutzung entstehen; Sitzungscookies, die dich angemeldet halten.",
        "• Einstellungen: Sprache, Design und ähnliche Einstellungen, überwiegend nur auf deinem eigenen Gerät gespeichert.",
        "• Zahlungsdaten (sobald es kostenpflichtige Tarife gibt): Tarif, Zahlungsstatus und Rechnungen. Karten- oder Bankdaten verarbeitet der Zahlungsdienstleister, nicht wir.",
        "• Nachrichten, die du uns sendest, z. B. Supportanfragen.",
      ] },
      { id: "purposes", h: "3. Zwecke und Rechtsgrundlagen", body: [
        "• Bereitstellung des Dienstes — Konto anlegen, Inhalte speichern und ordnen, durchsuchen und die genutzten Funktionen ausführen (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).",
        "• Ausführung der von dir gestarteten KI-Aktionen — Übermittlung der nötigen Inhalte an den gewählten KI-Anbieter (Vertragserfüllung, auf deine Anweisung).",
        "• Sicherheit von Dienst und Konten, Missbrauchsverhinderung und Fehlerbehebung (berechtigtes Interesse, Art. 6 Abs. 1 lit. f).",
        "• Einholung und Dokumentation der elterlichen Zustimmung für Nutzer zwischen 13 und 15 Jahren (Art. 8 DSGVO).",
        "• Versand notwendiger Servicenachrichten wie E-Mail-Bestätigung und Passwortzurücksetzung (Vertragserfüllung).",
        "• Abwicklung von Zahlungen und Aufbewahrung der nach niederländischem Steuerrecht vorgeschriebenen Unterlagen (rechtliche Verpflichtung, Art. 6 Abs. 1 lit. c), sobald es kostenpflichtige Tarife gibt.",
        "Wir verkaufen keine personenbezogenen Daten, zeigen keine Werbung, nutzen deine Inhalte nicht zum Training von KI-Modellen und senden keine Marketing-E-Mails ohne deine Einwilligung. Wir treffen keine automatisierten Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung.",
      ] },
      { id: "ai", h: "4. KI-Anbieter, die du verbindest", body: [
        "Nutzt du eine KI-Funktion, werden die dafür nötigen Inhalte an den Anbieter gesendet, dessen Schlüssel du verbunden hast (z. B. OpenAI, Anthropic, Google, OpenRouter, DeepSeek oder ein eigener Endpunkt). Dieser verarbeitet sie nach deinem eigenen Vertrag und seiner Datenschutzerklärung und kann außerhalb der EU sitzen — DeepSeek verarbeitet Daten beispielsweise in China. Prüfe die Richtlinien eines Anbieters, bevor du ihn verbindest; du kannst einen Schlüssel jederzeit löschen.",
      ] },
      { id: "processors", h: "5. Dienstleister, die wir einsetzen", body: [
        "Wir setzen sorgfältig ausgewählte Auftragsverarbeiter ein, die Daten nur nach unseren Weisungen verarbeiten dürfen:",
        "• Supabase — Datenbank, Authentifizierung, Versand von Konto-E-Mails und Dateispeicher. Die Daten werden in der EU gespeichert (Frankfurt, Deutschland).",
        "• Vercel — Hosting und Auslieferung. Serverfunktionen laufen in Frankfurt; Vercel ist ein US-Unternehmen und kann begrenzte technische Daten in den USA auf Grundlage des EU-US Data Privacy Framework und von Standardvertragsklauseln verarbeiten.",
        "• Indian Type Foundry (Fontshare) — liefert eine der Schriftarten der Website. Dein Browser lädt sie von deren Server, wodurch deine IP-Adresse übermittelt wird (berechtigtes Interesse an einem einheitlichen Design).",
        "• Ein Zahlungsdienstleister, sobald es kostenpflichtige Tarife gibt — wir nennen ihn, bevor du kaufen kannst.",
        "Wir können Daten offenlegen, wenn das Gesetz es verlangt, z. B. auf gerichtliche Anordnung.",
      ] },
      { id: "transfers", h: "6. Übermittlungen außerhalb der EU", body: [
        "Verarbeiten unsere Auftragsverarbeiter Daten außerhalb des Europäischen Wirtschaftsraums, stützen wir uns auf einen Angemessenheitsbeschluss (wie das EU-US Data Privacy Framework) oder Standardvertragsklauseln. Wählst du einen KI-Anbieter außerhalb des EWR, werden Daten auf deine Veranlassung dorthin übermittelt, um die gewünschte Aktion auszuführen.",
      ] },
      { id: "retention", h: "7. Speicherdauer", body: [
        "• Kontodaten und deine Inhalte: solange dein Konto besteht. Löschst du Inhalte oder dein Konto, werden sie sofort aus unseren aktiven Systemen entfernt; Backups werden innerhalb von 30 Tagen überschrieben.",
        "• Server- und Sicherheitsprotokolle: kurzzeitig, in der Regel höchstens 30 Tage.",
        "• Buchhaltungsunterlagen: 7 Jahre, wie vom niederländischen Steuerrecht vorgeschrieben.",
        "• Supportnachrichten: bis zu 2 Jahre nach Abschluss des Kontakts.",
      ] },
      { id: "rights", h: "8. Deine Rechte", body: [
        "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Widerspruch, das Recht auf Datenübertragbarkeit sowie das Recht, eine Einwilligung jederzeit zu widerrufen.",
        "Vieles davon kannst du selbst erledigen: Unter Einstellungen → Daten & Datenschutz lädst du alle deine Daten herunter und löschst dein Konto. Für alles andere schreib an {{email}}. Wir antworten innerhalb eines Monats.",
        "Du hast außerdem das Recht, dich bei einer Aufsichtsbehörde zu beschweren — in den Niederlanden bei der Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl) oder bei der Behörde in deinem Land.",
      ] },
      { id: "children", h: "9. Kinder", body: [
        "ORBIT ist nicht für Kinder unter 13 Jahren bestimmt. Nutzer zwischen 13 und 15 Jahren benötigen die Zustimmung eines Elternteils oder Vormunds. Eltern und Vormünder können uns unter {{email}} kontaktieren, um die Daten ihres Kindes einzusehen oder löschen zu lassen. Erfahren wir, dass wir Daten eines Kindes unter 13 Jahren haben, löschen wir sie.",
      ] },
      { id: "security", h: "10. Sicherheit", body: [
        "Wir schützen deine Daten durch Verschlüsselung bei der Übertragung (HTTPS), verschlüsselte Speicherung von API-Schlüsseln, gehashte Passwörter, Row-Level-Security in der Datenbank, die die Daten jedes Kontos trennt, und eingeschränkten Zugriff. Kein System ist vollkommen sicher; betrifft eine Datenpanne deine Daten, informieren wir dich und die Behörden wie gesetzlich vorgeschrieben.",
      ] },
      { id: "cookies", h: "11. Cookies", body: [
        "Wir verwenden nur unbedingt notwendige Cookies und Speicher auf deinem Gerät. Details findest du in unserer Cookie-Richtlinie.",
      ] },
      { id: "changes", h: "12. Änderungen", body: [
        "Wir aktualisieren diese Erklärung, wenn sich unsere Verarbeitung ändert. Über wesentliche Änderungen informieren wir dich vorab per E-Mail oder in der App.",
      ] },
    ],
  },
  cookies: {
    title: "Cookie-Richtlinie",
    summary: "ORBIT verwendet nur, was für den Betrieb unbedingt nötig ist — keine Analyse-, Werbe- oder Tracking-Cookies.",
    sections: [
      { id: "what", h: "1. Was Cookies und lokaler Speicher sind", body: [
        "Cookies sind kleine Dateien, die eine Website in deinem Browser speichert. Lokaler Speicher ist ähnlich, bleibt aber auf deinem Gerät und wird nicht an unsere Server gesendet.",
      ] },
      { id: "necessary", h: "2. Unbedingt notwendige Cookies", body: [
        "• Anmelde-Cookies (Namen, die mit „sb-“ beginnen, oder „orbit_session“, wenn ORBIT lokal läuft) halten dich sicher angemeldet. Sie bestehen, bis du dich abmeldest oder die Sitzung abläuft.",
        "• „orbit-locale“ speichert die gewählte Sprache. Aufbewahrung: ein Jahr.",
        "Nach dem niederländischen Telekommunikationsgesetz (Art. 11.7a) ist für diese Cookies keine Einwilligung nötig, da der Dienst ohne sie nicht funktioniert — wir möchten dich trotzdem darüber informieren.",
      ] },
      { id: "local", h: "3. Speicher auf deinem Gerät", body: [
        "Um deine Einstellungen zu behalten, speichern wir kleine Werte nur in deinem Browser: Design (orbit-theme), Bewegung und Effekte (orbit-fx), Seitenleistenstatus (orbit-sidebar), Universumsansicht (orbit-universe-view), ob du die KI-Einrichtung und diesen Hinweis gesehen hast (orbit-ai-invited, orbit-cookie-notice) und eine vorübergehende Markierung für Seitenübergänge (orbit-warp-pending). Nichts davon wird an uns oder Dritte gesendet.",
      ] },
      { id: "none", h: "4. Was wir nicht verwenden", body: [
        "Keine Analyse-, Werbe-, Social-Media- oder sonstigen Tracking-Cookies und keine Cookies von Drittanbietern. Eine unserer Schriftarten wird vom Server von Fontshare geladen; dieser setzt keine Cookies, erhält aber deine IP-Adresse (siehe Datenschutzerklärung). Sollten wir je nicht notwendige Cookies einsetzen wollen, fragen wir vorher nach deiner Einwilligung.",
      ] },
      { id: "control", h: "5. Deine Kontrolle", body: [
        "Du kannst Cookies jederzeit in deinen Browsereinstellungen löschen oder blockieren. Blockierst du die Anmelde-Cookies, kannst du dein Konto nicht nutzen.",
      ] },
    ],
  },
  imprint: {
    title: "Impressum",
    summary: "Angaben zum Betreiber von ORBIT gemäß niederländischem und europäischem Recht.",
    sections: [
      { id: "operator", h: "Betreiber", body: [
        "{{operator}}, handelnd unter dem Namen {{tradeName}}",
        "{{address}}",
        "Handelskammer (KvK): {{kvk}}",
        "USt-IdNr.: {{vat}}",
        "E-Mail: {{email}}",
        "Website: {{website}}",
      ] },
      { id: "disputes", h: "Beschwerden und Streitigkeiten", body: [
        "Bitte kontaktiere uns zuerst unter {{email}}; wir bemühen uns, jede Beschwerde innerhalb von 14 Tagen zu lösen. Zu anwendbarem Recht und Gerichtsstand siehe Abschnitt 15 der Nutzungsbedingungen.",
      ] },
    ],
  },
};
