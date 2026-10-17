import type { LegalDocs } from "./types";

export const fr: LegalDocs = {
  terms: {
    title: "Conditions d'utilisation",
    summary: "L'accord entre vous et ORBIT : qui peut l'utiliser, ce que vous pouvez attendre de nous, ce que nous attendons de vous, et le fonctionnement des offres payantes, des fonctions d'IA et des litiges.",
    sections: [
      { id: "about", h: "1. À propos de ces conditions", body: [
        "Les présentes conditions d'utilisation (les « Conditions ») constituent un accord entre vous et {{operator}}, exerçant sous le nom ORBIT, immatriculé à la Chambre de commerce néerlandaise (KvK) sous le numéro {{kvk}}, {{address}} (« ORBIT », « nous »).",
        "Elles s'appliquent au site et à l'application web ORBIT (le « Service »). En créant un compte ou en utilisant le Service, vous acceptez ces Conditions et confirmez avoir lu notre Politique de confidentialité. Si vous n'êtes pas d'accord, n'utilisez pas le Service.",
      ] },
      { id: "eligibility", h: "2. Qui peut utiliser ORBIT", body: [
        "Vous devez avoir au moins 13 ans pour utiliser ORBIT.",
        "Si vous avez 13, 14 ou 15 ans, vous ne pouvez utiliser ORBIT qu'avec l'autorisation d'un parent ou d'un représentant légal, qui accepte également ces Conditions en votre nom et est responsable de votre utilisation du Service. Nous pouvons demander une confirmation de cette autorisation.",
        "Si nous apprenons qu'un compte appartient à une personne de moins de 13 ans, ou à une personne de 13 à 15 ans sans autorisation parentale, nous le fermons et supprimons ses données.",
      ] },
      { id: "account", h: "3. Votre compte", body: [
        "Fournissez des informations exactes lors de l'inscription et tenez-les à jour. Gardez votre mot de passe confidentiel — vous êtes responsable de l'activité de votre compte. Prévenez-nous immédiatement à {{email}} si vous pensez que votre compte a été utilisé de façon abusive.",
        "Vous pouvez avoir un seul compte personnel. Les comptes ne sont pas transférables.",
      ] },
      { id: "service", h: "4. Le Service", body: [
        "ORBIT est un espace d'étude pour les notes, les sources, l'apprentissage assisté par IA, la planification des devoirs, l'entraînement et la concentration. Nous l'améliorons en continu : des fonctions peuvent évoluer, être ajoutées ou supprimées. Si nous supprimons une fonction essentielle d'une offre payante, nous vous prévenons à l'avance et vous pouvez résilier.",
        "Nous visons une disponibilité permanente mais ne pouvons garantir un Service ininterrompu ou sans erreur. Nous pouvons effectuer des opérations de maintenance, de préférence aux heures creuses.",
      ] },
      { id: "ai", h: "5. Fonctions d'IA et vos propres clés d'API", body: [
        "Les fonctions d'IA d'ORBIT reposent sur des fournisseurs tiers (comme OpenAI, Anthropic, Google, OpenRouter ou DeepSeek) au moyen d'une clé d'API que vous fournissez. Lorsque vous lancez une action d'IA, le contenu nécessaire (votre message, des extraits pertinents de vos sources, les fichiers joints) est envoyé au fournisseur choisi.",
        "Votre utilisation d'un fournisseur est régie par votre propre contrat avec lui, y compris ses conditions, politiques d'utilisation, politique de confidentialité et tarifs. L'usage de l'IA vous est facturé directement par le fournisseur. Nous ne sommes pas responsables de la disponibilité, des réponses, des pratiques en matière de données ou des coûts d'un fournisseur.",
        "Ne connectez que des clés que vous avez le droit d'utiliser. Vos clés sont stockées chiffrées et utilisées uniquement pour les actions que vous demandez.",
      ] },
      { id: "output", h: "6. Contenus générés par l'IA", body: [
        "Le contenu généré par l'IA est produit automatiquement et peut être inexact, incomplet, obsolète ou biaisé — même lorsqu'il paraît sûr de lui ou cite une source. Vérifiez toujours les informations importantes.",
        "Les réponses de l'IA ne constituent pas un conseil professionnel (par exemple médical, juridique, financier ou psychologique) et ne doivent pas être utilisées comme tel.",
        "ORBIT signale le contenu généré par l'IA et le maintient visiblement séparé de votre propre travail.",
      ] },
      { id: "integrity", h: "7. Intégrité académique", body: [
        "ORBIT est conçu pour vous aider à apprendre, pas pour faire le travail à votre place. Vous êtes responsable du respect des règles de votre établissement ou de votre jury d'examen, y compris celles sur l'usage de l'IA. Ne rendez pas un travail généré par l'IA comme le vôtre lorsque ce n'est pas autorisé.",
      ] },
      { id: "content", h: "8. Votre contenu", body: [
        "Vous conservez tous les droits sur les notes, fichiers, messages et autres éléments que vous ajoutez à ORBIT (« Votre Contenu »).",
        "Vous nous accordez une licence limitée et non exclusive pour stocker, copier, traiter et afficher Votre Contenu uniquement dans la mesure nécessaire pour vous fournir le Service — y compris l'envoyer au fournisseur d'IA que vous choisissez lorsque vous lancez une action. Cette licence prend fin lorsque vous supprimez le contenu ou votre compte, à l'exception des copies de sauvegarde supprimées selon leur cycle normal.",
        "Nous ne vendons pas Votre Contenu, ne l'utilisons pas pour de la publicité ni pour entraîner des modèles d'IA.",
        "Vous confirmez avoir le droit de téléverser Votre Contenu et qu'il ne porte pas atteinte aux droits d'autrui (par exemple le droit d'auteur sur des supports de cours qui ne vous appartiennent pas).",
      ] },
      { id: "use", h: "9. Utilisation acceptable", body: [
        "Vous vous engagez à ne pas :",
        "• enfreindre la loi ou aider quiconque à le faire ;",
        "• téléverser ou générer du contenu illégal, portant atteinte à la propriété intellectuelle ou à la vie privée, harcelant ou menaçant autrui, ou sexualisant des mineurs ;",
        "• tenter d'accéder sans autorisation au Service, à d'autres comptes ou à nos systèmes, ou perturber leur sécurité ou leur fonctionnement (logiciels malveillants, déni de service, extraction automatisée ou accès massif automatisé, par exemple) ;",
        "• rétro-concevoir le Service, sauf lorsque la loi l'autorise expressément ;",
        "• revendre, sous-licencier ou exploiter commercialement l'accès au Service sans notre accord écrit ;",
        "• usurper l'identité d'autrui ou présenter faussement vos liens avec une personne ou une organisation.",
      ] },
      { id: "paid", h: "10. Offres payantes", body: [
        "ORBIT est actuellement gratuit (l'usage de l'IA est payé directement à votre fournisseur). Nous pourrons proposer des offres payantes. Dans ce cas, les règles suivantes s'appliquent en plus de ce qui est indiqué lors du paiement :",
        "• Les prix sont affichés en euros, TVA comprise, avant l'achat. Les paiements sont traités par un prestataire de paiement ; nous ne conservons pas vos données de carte complètes.",
        "• Les abonnements se renouvellent automatiquement pour la même durée jusqu'à résiliation. Vous pouvez résilier à tout moment depuis votre compte ; la résiliation prend effet à la fin de la période en cours et vous gardez l'accès jusque-là. Après une éventuelle durée initiale, vous pouvez toujours résilier avec un préavis d'un mois maximum.",
        "• Droit de rétractation : en tant que consommateur dans l'UE, vous pouvez vous rétracter d'un achat dans un délai de 14 jours sans motif. Si vous nous demandez de commencer le service payant pendant ce délai, vous devrez un montant proportionnel à ce qui a déjà été fourni. Nous remboursons dans les 14 jours suivant la réception de votre rétractation, par le moyen de paiement initial.",
        "• Nous annoncerons tout changement de prix au moins 30 jours à l'avance. Si vous n'êtes pas d'accord, vous pouvez résilier avant l'application du nouveau prix.",
        "• Les utilisateurs de 13 à 15 ans ne peuvent acheter qu'avec l'autorisation d'un parent ou tuteur.",
      ] },
      { id: "ip", h: "11. Notre propriété intellectuelle", body: [
        "Le Service — y compris son logiciel, son design, ses textes, ses graphismes ainsi que le nom et le logo ORBIT — nous appartient ou appartient à nos concédants. Vous recevez un droit personnel et non transférable d'utiliser le Service conformément à ces Conditions ; aucun autre droit n'est accordé.",
        "Si vous nous envoyez des commentaires ou des idées, nous pouvons les utiliser sans obligation envers vous.",
      ] },
      { id: "termination", h: "12. Fin du contrat", body: [
        "Vous pouvez cesser d'utiliser ORBIT et supprimer votre compte à tout moment dans Réglages → Données et confidentialité. La suppression du compte efface définitivement Votre Contenu.",
        "Nous pouvons suspendre ou fermer votre compte en cas de manquement grave ou répété à ces Conditions, si la loi l'exige, ou pour protéger d'autres utilisateurs ou le Service. Lorsque c'est raisonnable, nous vous avertissons d'abord et expliquons pourquoi. Si nous fermons un compte payant sans faute de votre part, nous remboursons la partie non utilisée de votre abonnement.",
      ] },
      { id: "liability", h: "13. Responsabilité", body: [
        "Rien dans ces Conditions ne limite ni n'exclut une responsabilité qui ne peut l'être en vertu du droit applicable, notamment en cas de faute intentionnelle ou de faute lourde consciente, de décès ou de dommage corporel, ou vos droits impératifs de consommateur.",
        "Dans les limites permises par la loi, nous ne sommes pas responsables des dommages indirects ou consécutifs ; des décisions prises sur la base de réponses de l'IA ; des actes, réponses ou de la disponibilité des fournisseurs d'IA tiers ; ni de la perte de contenu que vous auriez raisonnablement pu éviter en conservant vos propres copies (vous pouvez exporter vos données à tout moment). Notre responsabilité totale pour toute réclamation est limitée au montant que vous nous avez payé au cours des 12 mois précédant l'événement, ou à 100 € si vous ne nous avez rien payé.",
      ] },
      { id: "changes", h: "14. Modification des conditions", body: [
        "Nous pouvons mettre à jour ces Conditions, par exemple lorsque le Service ou la loi évolue. Pour les changements importants, nous vous prévenons par e-mail ou dans l'application au moins 30 jours avant leur entrée en vigueur. Si vous n'êtes pas d'accord, vous pouvez cesser d'utiliser le Service et supprimer votre compte (et résilier tout abonnement) avant cette date.",
      ] },
      { id: "law", h: "15. Droit applicable et litiges", body: [
        "Ces Conditions sont régies par le droit néerlandais. Si vous êtes un consommateur résidant dans un autre pays de l'UE, vous conservez également la protection des dispositions impératives de ce pays.",
        "Contactez-nous d'abord à {{email}} — la plupart des problèmes se règlent rapidement. Les litiges sont portés devant le tribunal compétent aux Pays-Bas ; en tant que consommateur, vous pouvez aussi saisir les tribunaux de votre pays de résidence.",
      ] },
      { id: "contact", h: "16. Contact", body: [
        "{{operator}} (ORBIT) · {{address}} · KvK {{kvk}} · {{email}}",
      ] },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    summary: "Quelles données personnelles ORBIT traite, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et comment exercer vos droits au titre du RGPD.",
    sections: [
      { id: "controller", h: "1. Responsable du traitement", body: [
        "{{operator}}, exerçant sous le nom ORBIT ({{address}}, KvK {{kvk}}), est responsable du traitement de vos données personnelles au sens du Règlement général sur la protection des données (RGPD). Questions ou demandes : {{email}}.",
      ] },
      { id: "data", h: "2. Données collectées", body: [
        "• Données de compte : adresse e-mail, nom d'affichage (facultatif), mot de passe haché de manière sécurisée, confirmation de votre âge (16 ans et plus, ou 13–15 ans avec autorisation parentale) et date d'acceptation de nos Conditions et de notre Politique de confidentialité.",
        "• Votre contenu : notes, fichiers téléversés et texte extrait, conversations avec les assistants IA, fiches et quiz, devoirs, événements de calendrier, sessions d'étude, matières et liens de votre carte des connaissances.",
        "• Clés des fournisseurs d'IA : les clés d'API que vous connectez, stockées chiffrées (AES-256-GCM). Nous n'en affichons qu'une version masquée.",
        "• Données techniques : adresse IP, informations sur le navigateur et l'appareil, journaux serveur générés lors de l'utilisation du Service ; cookies de session qui vous gardent connecté.",
        "• Préférences : langue, thème et réglages similaires, essentiellement stockés sur votre propre appareil.",
        "• Données de paiement (dès l'existence d'offres payantes) : offre, statut de paiement et factures. Les données de carte ou bancaires sont traitées par le prestataire de paiement, pas par nous.",
        "• Les messages que vous nous envoyez, par exemple des demandes d'assistance.",
      ] },
      { id: "purposes", h: "3. Finalités et bases juridiques", body: [
        "• Fournir le Service — créer votre compte, stocker et organiser votre contenu, le rechercher et exécuter les fonctions que vous utilisez (exécution du contrat, art. 6(1)(b) RGPD).",
        "• Exécuter les actions d'IA que vous lancez — envoyer le contenu nécessaire au fournisseur d'IA choisi (exécution du contrat, sur vos instructions).",
        "• Sécuriser le Service et les comptes, prévenir les abus et corriger les erreurs (intérêt légitime, art. 6(1)(f)).",
        "• Obtenir et enregistrer l'autorisation parentale pour les utilisateurs de 13 à 15 ans (art. 8 RGPD).",
        "• Envoyer les messages de service indispensables, comme la confirmation de l'e-mail et la réinitialisation du mot de passe (exécution du contrat).",
        "• Gérer les paiements et conserver les documents comptables exigés par le droit fiscal néerlandais (obligation légale, art. 6(1)(c)), dès l'existence d'offres payantes.",
        "Nous ne vendons pas de données personnelles, n'affichons pas de publicité, n'utilisons pas votre contenu pour entraîner des modèles d'IA et n'envoyons pas d'e-mails marketing sans votre consentement. Nous ne prenons aucune décision automatisée produisant des effets juridiques ou similaires significatifs à votre égard.",
      ] },
      { id: "ai", h: "4. Fournisseurs d'IA que vous connectez", body: [
        "Lorsque vous utilisez une fonction d'IA, le contenu nécessaire est envoyé au fournisseur dont vous avez connecté la clé (par exemple OpenAI, Anthropic, Google, OpenRouter, DeepSeek ou un point d'accès personnalisé). Ce fournisseur le traite selon votre propre contrat et sa politique de confidentialité, et peut être situé hors de l'UE — DeepSeek, par exemple, traite des données en Chine. Consultez les politiques d'un fournisseur avant de le connecter ; vous pouvez supprimer une clé à tout moment.",
      ] },
      { id: "processors", h: "5. Prestataires auxquels nous faisons appel", body: [
        "Nous faisons appel à des sous-traitants soigneusement sélectionnés qui ne traitent les données que sur nos instructions :",
        "• Supabase — base de données, authentification, envoi des e-mails de compte et stockage des fichiers. Les données sont stockées dans l'UE (Francfort, Allemagne).",
        "• Vercel — hébergement et diffusion. Les fonctions serveur tournent à Francfort ; Vercel est une société américaine et peut traiter des données techniques limitées aux États-Unis dans le cadre du Data Privacy Framework UE–États-Unis et des clauses contractuelles types.",
        "• Indian Type Foundry (Fontshare) — fournit l'une des polices du site. Votre navigateur la demande à leur serveur, ce qui leur transmet votre adresse IP (intérêt légitime à un design cohérent).",
        "• Un prestataire de paiement, dès l'existence d'offres payantes — nous le nommerons avant tout achat.",
        "Nous pouvons communiquer des données lorsque la loi l'exige, par exemple sur décision de justice.",
      ] },
      { id: "transfers", h: "6. Transferts hors de l'UE", body: [
        "Lorsque nos sous-traitants traitent des données hors de l'Espace économique européen, nous nous appuyons sur une décision d'adéquation (comme le Data Privacy Framework UE–États-Unis) ou sur des clauses contractuelles types. Si vous choisissez un fournisseur d'IA situé hors de l'EEE, les données y sont transférées à votre demande pour exécuter l'action demandée.",
      ] },
      { id: "retention", h: "7. Durée de conservation", body: [
        "• Données de compte et votre contenu : tant que votre compte existe. Lorsque vous supprimez un contenu ou votre compte, il est retiré immédiatement de nos systèmes actifs ; les sauvegardes sont écrasées sous 30 jours.",
        "• Journaux serveur et de sécurité : courte durée, normalement 30 jours au maximum.",
        "• Documents comptables : 7 ans, comme l'exige le droit fiscal néerlandais.",
        "• Messages d'assistance : jusqu'à 2 ans après la fin de l'échange.",
      ] },
      { id: "rights", h: "8. Vos droits", body: [
        "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition au traitement de vos données, d'un droit à la portabilité et du droit de retirer votre consentement à tout moment.",
        "Vous pouvez en exercer la plupart vous-même : Réglages → Données et confidentialité permet de télécharger toutes vos données et de supprimer votre compte. Pour le reste, écrivez à {{email}}. Nous répondons dans un délai d'un mois.",
        "Vous pouvez aussi introduire une réclamation auprès d'une autorité de contrôle — aux Pays-Bas, l'Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl), en France la CNIL, ou l'autorité de votre pays.",
      ] },
      { id: "children", h: "9. Enfants", body: [
        "ORBIT n'est pas destiné aux enfants de moins de 13 ans. Les utilisateurs de 13 à 15 ans ont besoin de l'autorisation d'un parent ou tuteur. Les parents et tuteurs peuvent nous contacter à {{email}} pour consulter ou faire supprimer les données de leur enfant. Si nous apprenons détenir des données d'un enfant de moins de 13 ans, nous les supprimons.",
      ] },
      { id: "security", h: "10. Sécurité", body: [
        "Nous protégeons vos données par le chiffrement en transit (HTTPS), le stockage chiffré des clés d'API, des mots de passe hachés, la sécurité au niveau des lignes de la base de données qui sépare les données de chaque compte, et un accès restreint. Aucun système n'est parfaitement sûr ; si une violation touche vos données, nous vous en informerons ainsi que les autorités, comme la loi l'exige.",
      ] },
      { id: "cookies", h: "11. Cookies", body: [
        "Nous n'utilisons que des cookies strictement nécessaires et un stockage sur votre appareil. Consultez notre Politique de cookies pour plus de détails.",
      ] },
      { id: "changes", h: "12. Modifications", body: [
        "Nous mettrons à jour cette politique si nos traitements changent. Nous vous informerons des changements importants par e-mail ou dans l'application avant leur entrée en vigueur.",
      ] },
    ],
  },
  cookies: {
    title: "Politique de cookies",
    summary: "ORBIT n'utilise que ce qui est strictement nécessaire à son fonctionnement — aucun cookie d'analyse, de publicité ou de pistage.",
    sections: [
      { id: "what", h: "1. Cookies et stockage local", body: [
        "Les cookies sont de petits fichiers qu'un site enregistre dans votre navigateur. Le stockage local est similaire mais reste sur votre appareil et n'est pas envoyé à nos serveurs.",
      ] },
      { id: "necessary", h: "2. Cookies strictement nécessaires", body: [
        "• Les cookies de connexion (noms commençant par « sb- », ou « orbit_session » lorsqu'ORBIT fonctionne en local) vous maintiennent connecté en toute sécurité. Ils durent jusqu'à la déconnexion ou l'expiration de la session.",
        "• « orbit-locale » retient la langue choisie. Conservé un an.",
        "En vertu de la loi néerlandaise sur les télécommunications (art. 11.7a), ces cookies ne nécessitent pas de consentement car le Service ne peut pas fonctionner sans eux, mais nous tenons à vous en informer.",
      ] },
      { id: "local", h: "3. Stockage sur votre appareil", body: [
        "Pour retenir vos préférences, nous enregistrons de petits réglages uniquement dans votre navigateur : thème (orbit-theme), animations et effets (orbit-fx), état de la barre latérale (orbit-sidebar), vue de l'univers (orbit-universe-view), si vous avez vu la configuration de l'IA et ce bandeau (orbit-ai-invited, orbit-cookie-notice), et un indicateur temporaire pour les transitions de page (orbit-warp-pending). Rien de cela n'est envoyé à nous ni à des tiers.",
      ] },
      { id: "none", h: "4. Ce que nous n'utilisons pas", body: [
        "Aucun cookie d'analyse, de publicité, de réseaux sociaux ou autre pistage, et aucun cookie tiers. L'une de nos polices est chargée depuis le serveur de Fontshare, qui ne dépose pas de cookie mais reçoit votre adresse IP (voir la Politique de confidentialité). Si nous souhaitons un jour ajouter des cookies non essentiels, nous vous demanderons d'abord votre consentement.",
      ] },
      { id: "control", h: "5. Vos choix", body: [
        "Vous pouvez supprimer ou bloquer les cookies à tout moment dans les réglages de votre navigateur. Si vous bloquez les cookies de connexion, vous ne pourrez pas utiliser votre compte.",
      ] },
    ],
  },
  imprint: {
    title: "Mentions légales",
    summary: "Informations sur l'éditeur d'ORBIT, conformément au droit néerlandais et européen.",
    sections: [
      { id: "operator", h: "Éditeur", body: [
        "{{operator}}, exerçant sous le nom {{tradeName}}",
        "{{address}}",
        "Chambre de commerce (KvK) : {{kvk}}",
        "Numéro de TVA : {{vat}}",
        "E-mail : {{email}}",
        "Site web : {{website}}",
      ] },
      { id: "disputes", h: "Réclamations et litiges", body: [
        "Contactez-nous d'abord à {{email}} ; nous nous efforçons de traiter chaque réclamation sous 14 jours. Voir l'article 15 de nos Conditions d'utilisation pour le droit applicable et les juridictions compétentes.",
      ] },
    ],
  },
};
