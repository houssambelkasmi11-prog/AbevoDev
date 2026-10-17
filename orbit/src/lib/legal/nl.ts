import type { LegalDocs } from "./types";

export const nl: LegalDocs = {
  terms: {
    title: "Algemene voorwaarden",
    summary: "De afspraken tussen jou en ORBIT: wie het mag gebruiken, wat je van ons mag verwachten, wat wij van jou verwachten en hoe betaalde abonnementen, AI-functies en geschillen werken.",
    sections: [
      { id: "about", h: "1. Over deze voorwaarden", body: [
        "Deze algemene voorwaarden (\"Voorwaarden\") vormen een overeenkomst tussen jou en {{operator}}, handelend onder de naam ORBIT, ingeschreven bij de Kamer van Koophandel onder nummer {{kvk}}, {{address}} (\"ORBIT\", \"wij\", \"ons\").",
        "Ze gelden voor de website en webapplicatie van ORBIT (de \"Dienst\"). Door een account aan te maken of de Dienst te gebruiken ga je akkoord met deze Voorwaarden en bevestig je dat je onze Privacyverklaring hebt gelezen. Ga je niet akkoord, gebruik de Dienst dan niet.",
      ] },
      { id: "eligibility", h: "2. Wie ORBIT mag gebruiken", body: [
        "Je moet minimaal 13 jaar oud zijn om ORBIT te gebruiken.",
        "Ben je 13, 14 of 15 jaar, dan mag je ORBIT alleen gebruiken met toestemming van een ouder of wettelijk vertegenwoordiger, die namens jou ook akkoord gaat met deze Voorwaarden en verantwoordelijk is voor jouw gebruik van de Dienst. We kunnen om een bevestiging van die toestemming vragen.",
        "Als we ontdekken dat een account toebehoort aan iemand onder de 13, of aan iemand van 13–15 zonder toestemming van een ouder, sluiten we het account en verwijderen we de gegevens.",
      ] },
      { id: "account", h: "3. Je account", body: [
        "Geef bij het aanmelden juiste gegevens op en houd ze actueel. Houd je wachtwoord geheim — je bent verantwoordelijk voor wat er met je account gebeurt. Laat het ons direct weten via {{email}} als je denkt dat je account wordt misbruikt.",
        "Je mag één persoonlijk account hebben. Accounts zijn niet overdraagbaar.",
      ] },
      { id: "service", h: "4. De Dienst", body: [
        "ORBIT is een studiewerkruimte voor notities, bronnen, leren met AI, huiswerkplanning, oefenen en focustools. We verbeteren de Dienst voortdurend, waardoor functies kunnen veranderen, bijkomen of verdwijnen. Verwijderen we een functie die een kernonderdeel is van een betaald abonnement, dan laten we dat vooraf weten en mag je opzeggen.",
        "We streven ernaar dat de Dienst altijd beschikbaar is, maar kunnen niet garanderen dat hij ononderbroken of foutloos werkt. We kunnen onderhoud uitvoeren, bij voorkeur op rustige momenten.",
      ] },
      { id: "ai", h: "5. AI-functies en je eigen API-sleutels", body: [
        "De AI-functies van ORBIT draaien bij externe AI-aanbieders (zoals OpenAI, Anthropic, Google, OpenRouter of DeepSeek) met een API-sleutel die jij opgeeft. Wanneer je een AI-actie start, wordt de benodigde inhoud (je bericht, relevante fragmenten uit je bronnen, bijlagen) naar de door jou gekozen aanbieder gestuurd.",
        "Op je gebruik van een aanbieder is je eigen overeenkomst met die aanbieder van toepassing, inclusief diens voorwaarden, gebruiksbeleid, privacybeleid en prijzen. Kosten voor AI-gebruik worden rechtstreeks door de aanbieder aan jou gefactureerd. Wij zijn niet verantwoordelijk voor de beschikbaarheid, uitvoer, gegevensverwerking of kosten van een aanbieder.",
        "Koppel alleen sleutels die je mag gebruiken. Je sleutels worden versleuteld opgeslagen en alleen gebruikt voor acties die jij vraagt.",
      ] },
      { id: "output", h: "6. AI-uitvoer", body: [
        "Door AI gemaakte inhoud ontstaat automatisch en kan onjuist, onvolledig, verouderd of bevooroordeeld zijn — ook als die zelfverzekerd klinkt of een bron noemt. Controleer belangrijke informatie altijd.",
        "AI-uitvoer is geen professioneel advies (bijvoorbeeld medisch, juridisch, financieel of psychologisch advies) en mag niet als zodanig worden gebruikt.",
        "ORBIT markeert door AI gemaakte inhoud en houdt die zichtbaar gescheiden van je eigen werk.",
      ] },
      { id: "integrity", h: "7. Academische integriteit", body: [
        "ORBIT is bedoeld om je te helpen leren, niet om je werk voor je te doen. Je bent zelf verantwoordelijk voor het naleven van de regels van je school, onderwijsinstelling of examencommissie, ook die over het gebruik van AI. Lever door AI gemaakt werk niet in als je eigen werk waar dat niet mag.",
      ] },
      { id: "content", h: "8. Jouw inhoud", body: [
        "Je behoudt alle rechten op de notities, bestanden, berichten en ander materiaal dat je aan ORBIT toevoegt (\"Jouw Inhoud\").",
        "Je geeft ons een beperkte, niet-exclusieve licentie om Jouw Inhoud op te slaan, te kopiëren, te verwerken en te tonen, uitsluitend voor zover nodig om de Dienst aan jou te leveren — inclusief het versturen naar de AI-aanbieder die je kiest wanneer je een actie start. Deze licentie eindigt wanneer je de inhoud of je account verwijdert, met uitzondering van kopieën in back-ups die in hun normale cyclus worden verwijderd.",
        "We verkopen Jouw Inhoud niet, gebruiken haar niet voor advertenties en niet om AI-modellen te trainen.",
        "Je bevestigt dat je het recht hebt om Jouw Inhoud te uploaden en dat die geen inbreuk maakt op rechten van anderen (bijvoorbeeld auteursrecht op lesmateriaal dat niet van jou is).",
      ] },
      { id: "use", h: "9. Toegestaan gebruik", body: [
        "Je gaat ermee akkoord dat je niet:",
        "• de wet overtreedt of anderen daarbij helpt;",
        "• inhoud uploadt of laat genereren die illegaal is, inbreuk maakt op intellectueel eigendom of privacy, anderen intimideert of bedreigt, of minderjarigen seksualiseert;",
        "• probeert zonder toestemming toegang te krijgen tot de Dienst, andere accounts of onze systemen, of de beveiliging of werking ervan verstoort (bijvoorbeeld met malware, overbelastingsaanvallen, scraping of geautomatiseerde massale toegang);",
        "• de Dienst reverse-engineert, behalve voor zover de wet dat uitdrukkelijk toestaat;",
        "• toegang tot de Dienst doorverkoopt, in sublicentie geeft of commercieel exploiteert zonder onze schriftelijke toestemming;",
        "• je voordoet als iemand anders of een onjuiste band met iemand suggereert.",
      ] },
      { id: "paid", h: "10. Betaalde abonnementen", body: [
        "ORBIT is op dit moment gratis te gebruiken (AI-gebruik betaal je rechtstreeks aan je AI-aanbieder). We kunnen betaalde abonnementen invoeren. Dan geldt het volgende, naast wat bij het afrekenen wordt getoond:",
        "• Prijzen worden vóór aankoop getoond in euro's, inclusief btw. Betalingen worden afgehandeld door een betaaldienstverlener; wij slaan je volledige kaartgegevens niet op.",
        "• Abonnementen worden automatisch verlengd voor dezelfde periode tot je opzegt. Je kunt altijd opzeggen in je account; de opzegging gaat in aan het einde van de lopende periode en tot dan houd je toegang. Na een eventuele eerste looptijd kun je altijd opzeggen met een opzegtermijn van maximaal één maand.",
        "• Herroepingsrecht: als consument in de EU kun je een aankoop binnen 14 dagen zonder opgave van redenen herroepen. Vraag je ons om de betaalde dienst binnen die termijn al te leveren, dan betaal je een evenredig deel voor wat al is geleverd. We betalen binnen 14 dagen na ontvangst van je herroeping terug via de oorspronkelijke betaalmethode.",
        "• Prijswijzigingen kondigen we minimaal 30 dagen van tevoren aan. Ben je het er niet mee eens, dan kun je opzeggen voordat de nieuwe prijs ingaat.",
        "• Gebruikers van 13–15 jaar mogen alleen een aankoop doen met toestemming van een ouder of voogd.",
      ] },
      { id: "ip", h: "11. Ons intellectueel eigendom", body: [
        "De Dienst — waaronder de software, het ontwerp, teksten, afbeeldingen en de naam en het logo ORBIT — is van ons of onze licentiegevers. Je krijgt een persoonlijk, niet-overdraagbaar recht om de Dienst te gebruiken onder deze Voorwaarden; andere rechten worden niet verleend.",
        "Stuur je ons feedback of ideeën, dan mogen we die gebruiken zonder verplichting jegens jou.",
      ] },
      { id: "termination", h: "12. Einde van de overeenkomst", body: [
        "Je kunt op elk moment stoppen met ORBIT en je account verwijderen via Instellingen → Gegevens & privacy. Het verwijderen van je account verwijdert Jouw Inhoud definitief.",
        "We kunnen je account opschorten of sluiten als je deze Voorwaarden ernstig of herhaaldelijk schendt, als de wet dat vereist, of om andere gebruikers of de Dienst te beschermen. Waar redelijk waarschuwen we je eerst en leggen we uit waarom. Sluiten we een betaald account zonder dat jou iets te verwijten valt, dan betalen we het ongebruikte deel van je abonnement terug.",
      ] },
      { id: "liability", h: "13. Aansprakelijkheid", body: [
        "Niets in deze Voorwaarden beperkt of sluit aansprakelijkheid uit die volgens het toepasselijke recht niet kan worden beperkt, waaronder aansprakelijkheid voor opzet of bewuste roekeloosheid, voor overlijden of letsel, of je dwingende rechten als consument.",
        "Voor zover de wet dat toestaat, zijn wij niet aansprakelijk voor indirecte schade of gevolgschade; voor beslissingen die je neemt op basis van AI-uitvoer; voor het handelen, de uitvoer of de beschikbaarheid van externe AI-aanbieders; of voor verlies van inhoud dat je redelijkerwijs had kunnen voorkomen door zelf kopieën te bewaren (je kunt je gegevens altijd exporteren). Onze totale aansprakelijkheid per gebeurtenis is beperkt tot het bedrag dat je ons in de 12 maanden daarvoor hebt betaald, of € 100 als je ons niets hebt betaald.",
      ] },
      { id: "changes", h: "14. Wijzigingen van deze voorwaarden", body: [
        "We kunnen deze Voorwaarden aanpassen, bijvoorbeeld als de Dienst of de wet verandert. Bij wezenlijke wijzigingen laten we je dat minimaal 30 dagen vóór de ingangsdatum weten per e-mail of in de app. Ben je het er niet mee eens, dan kun je vóór die datum stoppen met de Dienst en je account verwijderen (en een abonnement opzeggen).",
      ] },
      { id: "law", h: "15. Toepasselijk recht en geschillen", body: [
        "Op deze Voorwaarden is Nederlands recht van toepassing. Woon je als consument in een ander EU-land, dan behoud je ook de bescherming van het dwingende recht van dat land.",
        "Neem eerst contact met ons op via {{email}} — de meeste problemen zijn snel op te lossen. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland; als consument kun je ook naar de rechter in het land waar je woont.",
      ] },
      { id: "contact", h: "16. Contact", body: [
        "{{operator}} (ORBIT) · {{address}} · KvK {{kvk}} · {{email}}",
      ] },
    ],
  },
  privacy: {
    title: "Privacyverklaring",
    summary: "Welke persoonsgegevens ORBIT verwerkt, waarom, met wie ze worden gedeeld, hoe lang ze worden bewaard en hoe je je rechten onder de AVG uitoefent.",
    sections: [
      { id: "controller", h: "1. Wie is verantwoordelijk", body: [
        "{{operator}}, handelend onder de naam ORBIT ({{address}}, KvK {{kvk}}), is verwerkingsverantwoordelijke voor je persoonsgegevens onder de Algemene verordening gegevensbescherming (AVG). Vragen of verzoeken: {{email}}.",
      ] },
      { id: "data", h: "2. Welke gegevens we verzamelen", body: [
        "• Accountgegevens: e-mailadres, weergavenaam (optioneel), een veilig gehasht wachtwoord, je leeftijdsbevestiging (16+ of 13–15 met toestemming van een ouder) en wanneer je onze Voorwaarden en Privacyverklaring hebt geaccepteerd.",
        "• Jouw inhoud: notities, geüploade bestanden en de daaruit gehaalde tekst, gesprekken met AI-assistenten, flashcards en quizzen, opdrachten, agenda-items, studiesessies, vakken en de verbanden in je kenniskaart.",
        "• Sleutels van AI-aanbieders: de API-sleutels die je koppelt, versleuteld opgeslagen (AES-256-GCM). We tonen alleen een gemaskeerde versie.",
        "• Technische gegevens: IP-adres, browser- en apparaatinformatie en serverlogs die ontstaan wanneer je de Dienst gebruikt; sessiecookies die je ingelogd houden.",
        "• Voorkeuren: taal, thema en vergelijkbare instellingen, grotendeels alleen opgeslagen op je eigen apparaat.",
        "• Betaalgegevens (zodra er betaalde abonnementen zijn): abonnement, betaalstatus en facturen. Kaart- of bankgegevens worden door de betaaldienstverlener verwerkt, niet door ons.",
        "• Berichten die je ons stuurt, bijvoorbeeld supportvragen.",
      ] },
      { id: "purposes", h: "3. Waarvoor we ze gebruiken en op welke grondslag", body: [
        "• Om de Dienst te leveren — je account aanmaken, je inhoud opslaan en ordenen, doorzoeken en de functies uitvoeren die je gebruikt (uitvoering van een overeenkomst, art. 6 lid 1 sub b AVG).",
        "• Om AI-acties uit te voeren die jij start — de benodigde inhoud naar de door jou gekozen AI-aanbieder sturen (uitvoering van een overeenkomst, op jouw instructie).",
        "• Om de Dienst en accounts te beveiligen, misbruik te voorkomen en fouten op te lossen (gerechtvaardigd belang, art. 6 lid 1 sub f).",
        "• Om toestemming van een ouder te verkrijgen en vast te leggen voor gebruikers van 13–15 jaar (art. 8 AVG).",
        "• Om noodzakelijke serviceberichten te sturen, zoals e-mailbevestiging en wachtwoordherstel (uitvoering van een overeenkomst).",
        "• Om betalingen af te handelen en de door de Nederlandse belastingwet vereiste administratie te bewaren (wettelijke verplichting, art. 6 lid 1 sub c), zodra er betaalde abonnementen zijn.",
        "We verkopen geen persoonsgegevens, tonen geen advertenties, gebruiken je inhoud niet om AI-modellen te trainen en sturen geen marketingmail zonder je toestemming. We nemen geen geautomatiseerde besluiten met rechtsgevolgen of vergelijkbare aanzienlijke gevolgen voor jou.",
      ] },
      { id: "ai", h: "4. AI-aanbieders die je koppelt", body: [
        "Wanneer je een AI-functie gebruikt, wordt de inhoud die voor die actie nodig is verstuurd naar de aanbieder van wie je de sleutel hebt gekoppeld (bijvoorbeeld OpenAI, Anthropic, Google, OpenRouter, DeepSeek of een eigen endpoint). Die aanbieder verwerkt deze onder jouw eigen overeenkomst en zijn privacybeleid, en kan buiten de EU gevestigd zijn — DeepSeek verwerkt gegevens bijvoorbeeld in China. Bekijk het beleid van een aanbieder voordat je die koppelt; je kunt een sleutel altijd verwijderen.",
      ] },
      { id: "processors", h: "5. Dienstverleners die we inschakelen", body: [
        "We werken met zorgvuldig gekozen verwerkers die gegevens alleen volgens onze instructies mogen verwerken:",
        "• Supabase — database, authenticatie, verzending van accountmails en bestandsopslag. Gegevens worden opgeslagen in de EU (Frankfurt, Duitsland).",
        "• Vercel — hosting en levering van de website. Serverfuncties draaien in Frankfurt; Vercel is een Amerikaans bedrijf en kan beperkte technische gegevens in de VS verwerken onder het EU-VS Data Privacy Framework en standaardcontractbepalingen.",
        "• Indian Type Foundry (Fontshare) — levert een van de lettertypen van de website. Je browser vraagt het lettertype op bij hun server, waardoor je IP-adres met hen wordt gedeeld (gerechtvaardigd belang bij een consistent ontwerp).",
        "• Een betaaldienstverlener, zodra er betaalde abonnementen zijn — we noemen die voordat je iets kunt kopen.",
        "We kunnen gegevens verstrekken als de wet dat vereist, bijvoorbeeld op last van een rechter.",
      ] },
      { id: "transfers", h: "6. Doorgifte buiten de EU", body: [
        "Waar onze verwerkers gegevens buiten de Europese Economische Ruimte verwerken, baseren we ons op een adequaatheidsbesluit (zoals het EU-VS Data Privacy Framework) of standaardcontractbepalingen. Kies je een AI-aanbieder buiten de EER, dan worden gegevens op jouw verzoek daarheen doorgegeven om de gevraagde actie uit te voeren.",
      ] },
      { id: "retention", h: "7. Hoe lang we gegevens bewaren", body: [
        "• Accountgegevens en jouw inhoud: zolang je account bestaat. Verwijder je inhoud of je account, dan wordt die direct uit onze actieve systemen verwijderd; back-ups worden binnen 30 dagen overschreven.",
        "• Server- en beveiligingslogs: korte tijd, normaal niet langer dan 30 dagen.",
        "• Financiële administratie: 7 jaar, zoals de Nederlandse belastingwet vereist.",
        "• Supportberichten: tot 2 jaar na afronding van het contact.",
      ] },
      { id: "rights", h: "8. Je rechten", body: [
        "Je hebt het recht op inzage, rectificatie, verwijdering, beperking van en bezwaar tegen de verwerking van je persoonsgegevens, het recht op gegevensoverdraagbaarheid en het recht om toestemming op elk moment in te trekken.",
        "Veel daarvan kun je zelf regelen: via Instellingen → Gegevens & privacy download je al je gegevens en verwijder je je account. Voor de rest mail je naar {{email}}. We reageren binnen één maand.",
        "Je hebt ook het recht een klacht in te dienen bij een toezichthouder — in Nederland de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl), of de toezichthouder in je eigen land.",
      ] },
      { id: "children", h: "9. Kinderen", body: [
        "ORBIT is niet bedoeld voor kinderen onder de 13. Gebruikers van 13–15 jaar hebben toestemming nodig van een ouder of voogd. Ouders en voogden kunnen via {{email}} contact opnemen om de gegevens van hun kind in te zien of te laten verwijderen. Ontdekken we dat we gegevens hebben van een kind onder de 13, dan verwijderen we die.",
      ] },
      { id: "security", h: "10. Beveiliging", body: [
        "We beschermen je gegevens met versleuteling tijdens verzending (HTTPS), versleutelde opslag van API-sleutels, gehashte wachtwoorden, row-level security in de database die de gegevens van elk account gescheiden houdt, en beperkte toegang. Geen enkel systeem is volledig veilig; treft een datalek jouw gegevens, dan informeren we jou en de toezichthouder zoals de wet vereist.",
      ] },
      { id: "cookies", h: "11. Cookies", body: [
        "We gebruiken alleen strikt noodzakelijke cookies en opslag op je apparaat. Zie ons Cookiebeleid voor details.",
      ] },
      { id: "changes", h: "12. Wijzigingen", body: [
        "We passen deze verklaring aan wanneer onze verwerkingen veranderen. Over wezenlijke wijzigingen informeren we je vooraf per e-mail of in de app.",
      ] },
    ],
  },
  cookies: {
    title: "Cookiebeleid",
    summary: "ORBIT gebruikt alleen wat strikt nodig is om te werken — geen analytische, advertentie- of trackingcookies.",
    sections: [
      { id: "what", h: "1. Wat cookies en lokale opslag zijn", body: [
        "Cookies zijn kleine bestanden die een website in je browser opslaat. Lokale opslag lijkt daarop, maar blijft op je apparaat en wordt niet naar onze servers gestuurd.",
      ] },
      { id: "necessary", h: "2. Strikt noodzakelijke cookies", body: [
        "• Inlogcookies (namen die beginnen met \"sb-\", of \"orbit_session\" wanneer ORBIT lokaal draait) houden je veilig ingelogd. Ze blijven bestaan tot je uitlogt of de sessie verloopt.",
        "• \"orbit-locale\" onthoudt de taal die je hebt gekozen. Wordt één jaar bewaard.",
        "Volgens de Telecommunicatiewet (art. 11.7a) is voor deze cookies geen toestemming nodig, omdat de Dienst zonder ze niet werkt, maar we willen dat je ervan weet.",
      ] },
      { id: "local", h: "3. Opslag op je apparaat", body: [
        "Om je voorkeuren te onthouden slaan we kleine instellingen alleen in je browser op: thema (orbit-theme), beweging en effecten (orbit-fx), zijbalkstand (orbit-sidebar), universumweergave (orbit-universe-view), of je de AI-uitleg en deze cookiemelding hebt gezien (orbit-ai-invited, orbit-cookie-notice) en een tijdelijke markering voor paginaovergangen (orbit-warp-pending). Niets hiervan wordt naar ons of derden gestuurd.",
      ] },
      { id: "none", h: "4. Wat we niet gebruiken", body: [
        "Geen analytische, advertentie-, social-media- of andere trackingcookies, en geen cookies van derden. Een van onze lettertypen wordt geladen vanaf de server van Fontshare; die plaatst geen cookies maar ontvangt wel je IP-adres (zie de Privacyverklaring). Willen we ooit niet-noodzakelijke cookies toevoegen, dan vragen we eerst je toestemming.",
      ] },
      { id: "control", h: "5. Zelf bepalen", body: [
        "Je kunt cookies op elk moment verwijderen of blokkeren via je browserinstellingen. Blokkeer je de inlogcookies, dan kun je je account niet gebruiken.",
      ] },
    ],
  },
  imprint: {
    title: "Colofon",
    summary: "Gegevens over de aanbieder van ORBIT, zoals vereist door Nederlands en Europees recht.",
    sections: [
      { id: "operator", h: "Aanbieder", body: [
        "{{operator}}, handelend onder de naam {{tradeName}}",
        "{{address}}",
        "Kamer van Koophandel (KvK): {{kvk}}",
        "Btw-identificatienummer: {{vat}}",
        "E-mail: {{email}}",
        "Website: {{website}}",
      ] },
      { id: "disputes", h: "Klachten en geschillen", body: [
        "Neem eerst contact met ons op via {{email}}; we proberen elke klacht binnen 14 dagen op te lossen. Zie artikel 15 van onze Algemene voorwaarden voor het toepasselijk recht en de bevoegde rechter.",
      ] },
    ],
  },
};
