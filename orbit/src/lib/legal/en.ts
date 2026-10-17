import type { LegalDocs } from "./types";

export const en: LegalDocs = {
  terms: {
    title: "Terms of Service",
    summary: "The agreement between you and ORBIT: who can use it, what you can expect from us, what we expect from you, and how paid plans, AI features and disputes work.",
    sections: [
      { id: "about", h: "1. About these terms", body: [
        "These Terms of Service (\"Terms\") are an agreement between you and {{operator}}, trading as ORBIT, registered with the Dutch Chamber of Commerce (KvK) under number {{kvk}}, {{address}} (\"ORBIT\", \"we\", \"us\").",
        "They apply to the ORBIT website and web application (the \"Service\"). By creating an account or using the Service you agree to these Terms and confirm you have read our Privacy Policy. If you do not agree, please do not use the Service.",
      ] },
      { id: "eligibility", h: "2. Who can use ORBIT", body: [
        "You must be at least 13 years old to use ORBIT.",
        "If you are 13, 14 or 15, you may only use ORBIT with the permission of a parent or legal guardian, who also agrees to these Terms on your behalf and is responsible for your use of the Service. We may ask for confirmation of that permission.",
        "If we learn that an account belongs to someone under 13, or to someone aged 13–15 without parental permission, we will close it and delete its data.",
      ] },
      { id: "account", h: "3. Your account", body: [
        "Give accurate information when you sign up and keep it up to date. Keep your password confidential — you are responsible for activity on your account. Tell us straight away at {{email}} if you think your account has been misused.",
        "You may have one personal account. Accounts are not transferable.",
      ] },
      { id: "service", h: "4. The Service", body: [
        "ORBIT is a study workspace for notes, sources, AI-assisted learning, homework planning, practice and focus tools. We continuously improve it, which means features can change, be added or be removed. If we remove a feature that is a core part of a paid plan, we will tell you in advance and you may cancel.",
        "We aim for the Service to be available at all times but cannot guarantee it will be uninterrupted or error-free. We may carry out maintenance, preferably at quiet times.",
      ] },
      { id: "ai", h: "5. AI features and your own API keys", body: [
        "ORBIT's AI features run on third-party AI providers (such as OpenAI, Anthropic, Google, OpenRouter or DeepSeek) using an API key that you provide. When you start an AI action, the content needed for it (your message, relevant excerpts from your sources, files you attach) is sent to the provider you chose.",
        "Your use of a provider is governed by your own agreement with that provider, including its terms, usage policies, privacy policy and prices. Charges for AI usage are billed by the provider to you directly. We are not responsible for a provider's availability, output, data practices or costs.",
        "Only connect keys you are entitled to use. Your keys are stored encrypted and are used only to perform actions you request.",
      ] },
      { id: "output", h: "6. AI output", body: [
        "AI-generated content is produced automatically and may be inaccurate, incomplete, outdated or biased — even when it sounds confident or cites a source. Always check important information.",
        "AI output is not professional advice (for example medical, legal, financial or psychological advice) and must not be relied on as such.",
        "ORBIT labels AI-generated content and keeps it visibly separate from your own work.",
      ] },
      { id: "integrity", h: "7. Academic integrity", body: [
        "ORBIT is designed to help you learn, not to do your work for you. You are responsible for following the rules of your school, university or exam board, including rules on the use of AI. Do not submit AI-generated work as your own where that is not allowed.",
      ] },
      { id: "content", h: "8. Your content", body: [
        "You keep all rights to the notes, files, messages and other material you add to ORBIT (\"Your Content\").",
        "You give us a limited, non-exclusive licence to store, copy, process and display Your Content only as needed to provide the Service to you — including sending it to the AI provider you choose when you start an action. This licence ends when you delete the content or your account, apart from copies in backups that are deleted on their normal cycle.",
        "We do not sell Your Content, use it for advertising, or use it to train AI models.",
        "You confirm that you have the right to upload Your Content and that it does not infringe anyone else's rights (for example copyright in course materials you do not own).",
      ] },
      { id: "use", h: "9. Acceptable use", body: [
        "You agree not to:",
        "• break the law or help anyone else do so;",
        "• upload or generate content that is illegal, infringes intellectual property or privacy, harasses or threatens others, or sexualises minors;",
        "• try to gain unauthorised access to the Service, other accounts or our systems, or interfere with their security or operation (for example malware, denial-of-service, scraping or automated bulk access);",
        "• reverse engineer the Service except where the law expressly allows it;",
        "• resell, sublicense or commercially exploit access to the Service without our written permission;",
        "• impersonate anyone or misrepresent your affiliation.",
      ] },
      { id: "paid", h: "10. Paid plans", body: [
        "ORBIT is currently free to use (AI usage is paid directly to your AI provider). We may introduce paid plans. When we do, the following applies in addition to anything shown at checkout:",
        "• Prices are shown in euros, including VAT, before you buy. Payments are handled by a payment provider; we do not store your full card details.",
        "• Subscriptions renew automatically for the same period until you cancel. You can cancel at any time in your account; the cancellation takes effect at the end of the current period and you keep access until then. After any initial term, you can always cancel with at most one month's notice.",
        "• Right of withdrawal: if you are a consumer in the EU, you may withdraw from a purchase within 14 days without giving a reason. If you ask us to start providing the paid service during that period, you will owe a proportionate amount for the part already provided. We refund within 14 days of receiving your withdrawal, using the original payment method.",
        "• We will announce price changes at least 30 days in advance. If you do not agree, you can cancel before the new price applies.",
        "• Users aged 13–15 may only purchase with a parent's or guardian's permission.",
      ] },
      { id: "ip", h: "11. Our intellectual property", body: [
        "The Service — including its software, design, text, graphics and the ORBIT name and logo — belongs to us or our licensors. You receive a personal, non-transferable right to use the Service under these Terms; no other rights are granted.",
        "If you send us feedback or ideas, we may use them without obligation to you.",
      ] },
      { id: "termination", h: "12. Ending the agreement", body: [
        "You can stop using ORBIT and delete your account at any time in Settings → Data & privacy. Deleting your account permanently deletes Your Content.",
        "We may suspend or close your account if you seriously or repeatedly breach these Terms, if required by law, or to protect other users or the Service. Where reasonable we will warn you first and explain why. If we close a paid account without you being at fault, we will refund the unused part of your subscription.",
      ] },
      { id: "liability", h: "13. Liability", body: [
        "Nothing in these Terms limits or excludes liability that cannot be limited under applicable law, including liability for intent or deliberate recklessness, for death or personal injury, or your mandatory rights as a consumer.",
        "To the extent permitted by law: we are not liable for indirect or consequential loss; for decisions you make based on AI output; for the acts, output or availability of third-party AI providers; or for loss of content you could reasonably have prevented by keeping your own copies (you can export your data at any time). Our total liability for any claim is limited to the amount you paid us in the 12 months before the event giving rise to the claim, or €100 if you have not paid us anything.",
      ] },
      { id: "changes", h: "14. Changes to these terms", body: [
        "We may update these Terms, for example when the Service or the law changes. For material changes we will notify you by email or in the app at least 30 days before they take effect. If you do not agree, you can stop using the Service and delete your account (and cancel any subscription) before the changes apply.",
      ] },
      { id: "law", h: "15. Governing law and disputes", body: [
        "These Terms are governed by Dutch law. If you are a consumer living in another EU country, you also keep the protection of the mandatory laws of that country.",
        "Please contact us first at {{email}} — most problems can be solved quickly. Disputes will be submitted to the competent court in the Netherlands; as a consumer you may also bring proceedings in the courts of the country where you live.",
      ] },
      { id: "contact", h: "16. Contact", body: [
        "{{operator}} (ORBIT) · {{address}} · KvK {{kvk}} · {{email}}",
      ] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    summary: "What personal data ORBIT processes, why, who it is shared with, how long it is kept and how you exercise your rights under the GDPR.",
    sections: [
      { id: "controller", h: "1. Who is responsible", body: [
        "{{operator}}, trading as ORBIT ({{address}}, KvK {{kvk}}), is the controller of your personal data under the EU General Data Protection Regulation (GDPR). Questions or requests: {{email}}.",
      ] },
      { id: "data", h: "2. What we collect", body: [
        "• Account data: email address, display name (optional), a securely hashed password, your age confirmation (16+ or 13–15 with parental permission), and when you accepted our Terms and Privacy Policy.",
        "• Your content: notes, uploaded files and the text extracted from them, conversations with AI assistants, flashcards and quizzes, assignments, calendar events, study sessions, subjects and the connections in your knowledge map.",
        "• AI provider keys: the API keys you connect, stored encrypted (AES-256-GCM). We only ever display a masked version.",
        "• Technical data: IP address, browser and device information, and server logs created when you use the Service; session cookies that keep you signed in.",
        "• Preferences: language, theme and similar settings, mostly stored only on your own device.",
        "• Payment data (once paid plans exist): plan, payment status and invoices. Card or bank details are processed by the payment provider, not by us.",
        "• Messages you send us, for example support requests.",
      ] },
      { id: "purposes", h: "3. Why we use it and on what legal basis", body: [
        "• To provide the Service — create your account, store and organise your content, search it and run the features you use (performance of a contract, art. 6(1)(b) GDPR).",
        "• To run AI actions you start — sending the necessary content to the AI provider you selected (performance of a contract, at your instruction).",
        "• To keep the Service and accounts secure and prevent abuse, and to fix errors (legitimate interest, art. 6(1)(f)).",
        "• To obtain and record parental permission for users aged 13–15 (art. 8 GDPR).",
        "• To send essential service messages such as email confirmation and password resets (performance of a contract).",
        "• To handle payments and keep financial records required by Dutch tax law (legal obligation, art. 6(1)(c)), once paid plans exist.",
        "We do not sell personal data, show advertising, use your content to train AI models, or send marketing email without your consent. We make no automated decisions that have legal or similarly significant effects on you.",
      ] },
      { id: "ai", h: "4. AI providers you connect", body: [
        "When you use an AI feature, the content needed for that action is sent to the provider whose key you connected (for example OpenAI, Anthropic, Google, OpenRouter, DeepSeek or a custom endpoint). That provider processes it under your own agreement with them and their privacy policy, and may be located outside the EU — DeepSeek, for example, processes data in China. Please review a provider's policies before connecting it; you can delete a key at any time.",
      ] },
      { id: "processors", h: "5. Service providers we use", body: [
        "We use carefully selected processors who may only process data on our instructions:",
        "• Supabase — database, authentication, email delivery for account messages and file storage. Data is stored in the EU (Frankfurt, Germany).",
        "• Vercel — hosting and content delivery. Server functions run in Frankfurt; Vercel is a US company and may process limited technical data in the US under the EU–US Data Privacy Framework and Standard Contractual Clauses.",
        "• Indian Type Foundry (Fontshare) — delivers one of the website's fonts. Your browser requests the font from their server, which means your IP address is shared with them (legitimate interest in a consistent design).",
        "• A payment provider, once paid plans exist — we will name it before you can buy.",
        "We may disclose data where the law requires it, for example to comply with a court order.",
      ] },
      { id: "transfers", h: "6. Transfers outside the EU", body: [
        "Where our processors handle data outside the European Economic Area, we rely on an adequacy decision (such as the EU–US Data Privacy Framework) or Standard Contractual Clauses. When you choose an AI provider located outside the EEA, data is transferred there at your request to perform the action you asked for.",
      ] },
      { id: "retention", h: "7. How long we keep it", body: [
        "• Account data and your content: for as long as your account exists. When you delete content or your account, it is removed from our live systems immediately; backup copies are overwritten within 30 days.",
        "• Server and security logs: kept for a short period, normally no longer than 30 days.",
        "• Financial records: 7 years, as required by Dutch tax law.",
        "• Support messages: up to 2 years after the conversation ends.",
      ] },
      { id: "rights", h: "8. Your rights", body: [
        "You have the right to access, correct, delete, restrict or object to the processing of your personal data, the right to data portability, and the right to withdraw consent at any time.",
        "You can do most of this yourself: Settings → Data & privacy lets you download all your data and delete your account. For anything else, email {{email}}. We respond within one month.",
        "You also have the right to lodge a complaint with a supervisory authority — in the Netherlands, the Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl), or the authority in your own country.",
      ] },
      { id: "children", h: "9. Children", body: [
        "ORBIT is not for children under 13. Users aged 13–15 need permission from a parent or guardian. Parents and guardians can contact us at {{email}} to review or delete their child's data. If we learn we hold data of a child under 13, we delete it.",
      ] },
      { id: "security", h: "10. Security", body: [
        "We protect your data with encryption in transit (HTTPS), encrypted storage of API keys, hashed passwords, database row-level security that keeps each account's data separate, and restricted access. No system is perfectly secure; if a breach affects your data, we will notify you and the authorities as the law requires.",
      ] },
      { id: "cookies", h: "11. Cookies", body: [
        "We only use strictly necessary cookies and on-device storage. See our Cookie Policy for details.",
      ] },
      { id: "changes", h: "12. Changes", body: [
        "We will update this policy when our processing changes. We will tell you about material changes by email or in the app before they apply.",
      ] },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    summary: "ORBIT uses only what is strictly necessary to work — no analytics, advertising or tracking cookies.",
    sections: [
      { id: "what", h: "1. What cookies and local storage are", body: [
        "Cookies are small files a website stores in your browser. Local storage is similar but stays on your device and is not sent to our servers.",
      ] },
      { id: "necessary", h: "2. Strictly necessary cookies", body: [
        "• Sign-in cookies (names starting with \"sb-\", or \"orbit_session\" when ORBIT runs locally) keep you securely signed in. They last until you sign out or the session expires.",
        "• \"orbit-locale\" remembers the language you chose. Kept for one year.",
        "Under the Dutch Telecommunications Act (art. 11.7a) these cookies do not require consent because the Service cannot work without them, but we want you to know about them.",
      ] },
      { id: "local", h: "3. Storage on your device", body: [
        "To remember your preferences we store small settings only in your browser: theme (orbit-theme), motion and effects (orbit-fx), sidebar state (orbit-sidebar), universe view (orbit-universe-view), whether you've seen the AI setup and this cookie notice (orbit-ai-invited, orbit-cookie-notice), and a temporary flag for page transitions (orbit-warp-pending). None of this is sent to us or to third parties.",
      ] },
      { id: "none", h: "4. What we do not use", body: [
        "No analytics, advertising, social media or other tracking cookies, and no third-party cookies. One of our fonts is loaded from Fontshare's server, which sets no cookies but does receive your IP address (see the Privacy Policy). If we ever want to add non-essential cookies, we will ask for your consent first.",
      ] },
      { id: "control", h: "5. Your control", body: [
        "You can delete or block cookies in your browser settings at any time. If you block the sign-in cookies, you will not be able to use your account.",
      ] },
    ],
  },
  imprint: {
    title: "Legal notice",
    summary: "Information about the operator of ORBIT, as required by Dutch and EU law.",
    sections: [
      { id: "operator", h: "Operator", body: [
        "{{operator}}, trading as {{tradeName}}",
        "{{address}}",
        "Chamber of Commerce (KvK): {{kvk}}",
        "VAT number: {{vat}}",
        "Email: {{email}}",
        "Website: {{website}}",
      ] },
      { id: "disputes", h: "Disputes", body: [
        "Please contact us first at {{email}}; we try to resolve every complaint within 14 days. See section 15 of our Terms of Service for applicable law and competent courts.",
      ] },
    ],
  },
};
