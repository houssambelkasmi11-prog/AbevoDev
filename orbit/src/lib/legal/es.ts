import type { LegalDocs } from "./types";

export const es: LegalDocs = {
  terms: {
    title: "Términos del servicio",
    summary: "El acuerdo entre tú y ORBIT: quién puede usarlo, qué puedes esperar de nosotros, qué esperamos de ti y cómo funcionan los planes de pago, las funciones de IA y las disputas.",
    sections: [
      { id: "about", h: "1. Sobre estos términos", body: [
        "Estos Términos del servicio (los «Términos») son un acuerdo entre tú y {{operator}}, que opera con el nombre ORBIT, inscrito en la Cámara de Comercio neerlandesa (KvK) con el número {{kvk}}, {{address}} («ORBIT», «nosotros»).",
        "Se aplican al sitio web y a la aplicación web de ORBIT (el «Servicio»). Al crear una cuenta o usar el Servicio aceptas estos Términos y confirmas que has leído nuestra Política de privacidad. Si no estás de acuerdo, no uses el Servicio.",
      ] },
      { id: "eligibility", h: "2. Quién puede usar ORBIT", body: [
        "Debes tener al menos 13 años para usar ORBIT.",
        "Si tienes 13, 14 o 15 años, solo puedes usar ORBIT con permiso de tu madre, padre o tutor legal, que también acepta estos Términos en tu nombre y es responsable de tu uso del Servicio. Podemos pedir confirmación de ese permiso.",
        "Si descubrimos que una cuenta pertenece a alguien menor de 13 años, o a alguien de 13 a 15 años sin permiso parental, la cerraremos y eliminaremos sus datos.",
      ] },
      { id: "account", h: "3. Tu cuenta", body: [
        "Proporciona información exacta al registrarte y mantenla actualizada. Mantén tu contraseña en secreto: eres responsable de la actividad de tu cuenta. Avísanos de inmediato en {{email}} si crees que se ha usado indebidamente.",
        "Puedes tener una cuenta personal. Las cuentas no son transferibles.",
      ] },
      { id: "service", h: "4. El Servicio", body: [
        "ORBIT es un espacio de estudio para notas, fuentes, aprendizaje con IA, planificación de deberes, práctica y concentración. Lo mejoramos continuamente, por lo que las funciones pueden cambiar, añadirse o eliminarse. Si eliminamos una función esencial de un plan de pago, te avisaremos con antelación y podrás cancelar.",
        "Intentamos que el Servicio esté siempre disponible, pero no podemos garantizar que funcione sin interrupciones ni errores. Podemos realizar tareas de mantenimiento, preferiblemente en horas de poco uso.",
      ] },
      { id: "ai", h: "5. Funciones de IA y tus propias claves de API", body: [
        "Las funciones de IA de ORBIT se ejecutan en proveedores externos (como OpenAI, Anthropic, Google, OpenRouter o DeepSeek) con una clave de API que tú proporcionas. Cuando inicias una acción de IA, el contenido necesario (tu mensaje, fragmentos relevantes de tus fuentes, archivos adjuntos) se envía al proveedor que elegiste.",
        "Tu uso de un proveedor se rige por tu propio acuerdo con él, incluidos sus términos, políticas de uso, política de privacidad y precios. El proveedor te factura directamente el uso de la IA. No somos responsables de la disponibilidad, las respuestas, las prácticas de datos ni los costes de un proveedor.",
        "Conecta solo claves que tengas derecho a usar. Tus claves se guardan cifradas y solo se usan para las acciones que solicitas.",
      ] },
      { id: "output", h: "6. Contenido generado por IA", body: [
        "El contenido generado por IA se produce automáticamente y puede ser inexacto, incompleto, desactualizado o sesgado, incluso cuando parece seguro o cita una fuente. Comprueba siempre la información importante.",
        "Las respuestas de la IA no son asesoramiento profesional (por ejemplo médico, jurídico, financiero o psicológico) y no deben usarse como tal.",
        "ORBIT marca el contenido generado por IA y lo mantiene visiblemente separado de tu propio trabajo.",
      ] },
      { id: "integrity", h: "7. Integridad académica", body: [
        "ORBIT está pensado para ayudarte a aprender, no para hacer tu trabajo. Eres responsable de cumplir las normas de tu centro educativo o tribunal de examen, incluidas las relativas al uso de IA. No entregues como propio un trabajo generado por IA cuando no esté permitido.",
      ] },
      { id: "content", h: "8. Tu contenido", body: [
        "Conservas todos los derechos sobre las notas, archivos, mensajes y demás material que añadas a ORBIT («Tu Contenido»).",
        "Nos concedes una licencia limitada y no exclusiva para almacenar, copiar, procesar y mostrar Tu Contenido solo en la medida necesaria para prestarte el Servicio, incluido enviarlo al proveedor de IA que elijas al iniciar una acción. Esta licencia termina cuando eliminas el contenido o tu cuenta, salvo las copias de seguridad que se eliminan en su ciclo normal.",
        "No vendemos Tu Contenido ni lo usamos para publicidad ni para entrenar modelos de IA.",
        "Confirmas que tienes derecho a subir Tu Contenido y que no infringe derechos de terceros (por ejemplo, los derechos de autor de materiales de clase que no son tuyos).",
      ] },
      { id: "use", h: "9. Uso aceptable", body: [
        "Te comprometes a no:",
        "• infringir la ley ni ayudar a otros a hacerlo;",
        "• subir o generar contenido ilegal, que vulnere la propiedad intelectual o la privacidad, que acose o amenace a otros, o que sexualice a menores;",
        "• intentar acceder sin autorización al Servicio, a otras cuentas o a nuestros sistemas, ni interferir en su seguridad o funcionamiento (por ejemplo con malware, ataques de denegación de servicio, scraping o acceso masivo automatizado);",
        "• aplicar ingeniería inversa al Servicio, salvo cuando la ley lo permita expresamente;",
        "• revender, sublicenciar o explotar comercialmente el acceso al Servicio sin nuestro permiso por escrito;",
        "• suplantar a otra persona o falsear tu relación con alguien.",
      ] },
      { id: "paid", h: "10. Planes de pago", body: [
        "Actualmente ORBIT es gratuito (el uso de la IA lo pagas directamente a tu proveedor). Podemos introducir planes de pago. En ese caso, además de lo indicado al pagar, se aplica lo siguiente:",
        "• Los precios se muestran en euros, IVA incluido, antes de la compra. Los pagos los gestiona un proveedor de pagos; no guardamos los datos completos de tu tarjeta.",
        "• Las suscripciones se renuevan automáticamente por el mismo periodo hasta que las canceles. Puedes cancelar en cualquier momento desde tu cuenta; la cancelación surte efecto al final del periodo en curso y mantienes el acceso hasta entonces. Tras un posible periodo inicial, siempre podrás cancelar con un preaviso máximo de un mes.",
        "• Derecho de desistimiento: como consumidor en la UE puedes desistir de una compra en un plazo de 14 días sin dar explicaciones. Si nos pides que empecemos a prestar el servicio de pago durante ese plazo, deberás un importe proporcional a lo ya prestado. Reembolsamos en un plazo de 14 días desde la recepción de tu desistimiento, por el medio de pago original.",
        "• Anunciaremos los cambios de precio con al menos 30 días de antelación. Si no estás de acuerdo, puedes cancelar antes de que se aplique el nuevo precio.",
        "• Los usuarios de 13 a 15 años solo pueden comprar con permiso de su madre, padre o tutor.",
      ] },
      { id: "ip", h: "11. Nuestra propiedad intelectual", body: [
        "El Servicio, incluidos su software, diseño, textos, gráficos y el nombre y logotipo ORBIT, nos pertenece a nosotros o a nuestros licenciantes. Recibes un derecho personal e intransferible para usar el Servicio conforme a estos Términos; no se concede ningún otro derecho.",
        "Si nos envías comentarios o ideas, podemos usarlos sin obligación alguna hacia ti.",
      ] },
      { id: "termination", h: "12. Fin del acuerdo", body: [
        "Puedes dejar de usar ORBIT y eliminar tu cuenta en cualquier momento en Ajustes → Datos y privacidad. Eliminar la cuenta borra Tu Contenido de forma permanente.",
        "Podemos suspender o cerrar tu cuenta si incumples estos Términos de forma grave o reiterada, si la ley lo exige o para proteger a otros usuarios o al Servicio. Cuando sea razonable, te avisaremos antes y explicaremos el motivo. Si cerramos una cuenta de pago sin culpa tuya, reembolsaremos la parte no utilizada de tu suscripción.",
      ] },
      { id: "liability", h: "13. Responsabilidad", body: [
        "Nada en estos Términos limita ni excluye una responsabilidad que no pueda limitarse según la ley aplicable, incluida la responsabilidad por dolo o imprudencia grave, por muerte o lesiones personales, ni tus derechos imperativos como consumidor.",
        "En la medida permitida por la ley, no somos responsables de daños indirectos o consecuentes; de las decisiones que tomes basándote en respuestas de la IA; de los actos, respuestas o disponibilidad de proveedores de IA externos; ni de la pérdida de contenido que podrías haber evitado razonablemente guardando tus propias copias (puedes exportar tus datos en cualquier momento). Nuestra responsabilidad total por cualquier reclamación se limita al importe que nos hayas pagado en los 12 meses anteriores al hecho, o a 100 € si no nos has pagado nada.",
      ] },
      { id: "changes", h: "14. Cambios en estos términos", body: [
        "Podemos actualizar estos Términos, por ejemplo cuando cambie el Servicio o la ley. Si los cambios son importantes, te avisaremos por correo o en la aplicación al menos 30 días antes de que entren en vigor. Si no estás de acuerdo, puedes dejar de usar el Servicio y eliminar tu cuenta (y cancelar cualquier suscripción) antes de esa fecha.",
      ] },
      { id: "law", h: "15. Ley aplicable y disputas", body: [
        "Estos Términos se rigen por la ley neerlandesa. Si eres consumidor y resides en otro país de la UE, conservas además la protección de las normas imperativas de ese país.",
        "Contáctanos primero en {{email}}: la mayoría de los problemas se resuelven rápido. Las disputas se someterán al tribunal competente de los Países Bajos; como consumidor también puedes acudir a los tribunales del país donde resides.",
      ] },
      { id: "contact", h: "16. Contacto", body: [
        "{{operator}} (ORBIT) · {{address}} · KvK {{kvk}} · {{email}}",
      ] },
    ],
  },
  privacy: {
    title: "Política de privacidad",
    summary: "Qué datos personales trata ORBIT, por qué, con quién se comparten, cuánto tiempo se conservan y cómo ejercer tus derechos según el RGPD.",
    sections: [
      { id: "controller", h: "1. Responsable del tratamiento", body: [
        "{{operator}}, que opera con el nombre ORBIT ({{address}}, KvK {{kvk}}), es el responsable del tratamiento de tus datos personales según el Reglamento General de Protección de Datos (RGPD). Preguntas o solicitudes: {{email}}.",
      ] },
      { id: "data", h: "2. Qué datos recogemos", body: [
        "• Datos de la cuenta: correo electrónico, nombre visible (opcional), una contraseña cifrada de forma segura (hash), tu confirmación de edad (16 o más, o 13–15 con permiso parental) y cuándo aceptaste nuestros Términos y Política de privacidad.",
        "• Tu contenido: notas, archivos subidos y el texto extraído, conversaciones con asistentes de IA, tarjetas y cuestionarios, tareas, eventos del calendario, sesiones de estudio, asignaturas y las conexiones de tu mapa de conocimiento.",
        "• Claves de proveedores de IA: las claves de API que conectas, guardadas cifradas (AES-256-GCM). Solo mostramos una versión enmascarada.",
        "• Datos técnicos: dirección IP, información del navegador y del dispositivo, y registros del servidor generados al usar el Servicio; cookies de sesión que te mantienen conectado.",
        "• Preferencias: idioma, tema y ajustes similares, almacenados principalmente solo en tu propio dispositivo.",
        "• Datos de pago (cuando existan planes de pago): plan, estado del pago y facturas. Los datos de tarjeta o bancarios los trata el proveedor de pagos, no nosotros.",
        "• Los mensajes que nos envías, por ejemplo solicitudes de soporte.",
      ] },
      { id: "purposes", h: "3. Para qué los usamos y con qué base jurídica", body: [
        "• Prestar el Servicio: crear tu cuenta, guardar y organizar tu contenido, buscarlo y ejecutar las funciones que usas (ejecución de un contrato, art. 6.1.b RGPD).",
        "• Ejecutar las acciones de IA que inicias: enviar el contenido necesario al proveedor de IA que elegiste (ejecución de un contrato, siguiendo tus instrucciones).",
        "• Proteger el Servicio y las cuentas, prevenir abusos y corregir errores (interés legítimo, art. 6.1.f).",
        "• Obtener y registrar el permiso parental de los usuarios de 13 a 15 años (art. 8 RGPD).",
        "• Enviar mensajes de servicio imprescindibles, como la confirmación del correo y el restablecimiento de contraseña (ejecución de un contrato).",
        "• Gestionar pagos y conservar la documentación contable exigida por la ley fiscal neerlandesa (obligación legal, art. 6.1.c), cuando existan planes de pago.",
        "No vendemos datos personales, no mostramos publicidad, no usamos tu contenido para entrenar modelos de IA y no enviamos correos de marketing sin tu consentimiento. No tomamos decisiones automatizadas con efectos jurídicos o similares significativos sobre ti.",
      ] },
      { id: "ai", h: "4. Proveedores de IA que conectas", body: [
        "Cuando usas una función de IA, el contenido necesario para esa acción se envía al proveedor cuya clave conectaste (por ejemplo OpenAI, Anthropic, Google, OpenRouter, DeepSeek o un endpoint propio). Ese proveedor lo trata según tu propio acuerdo y su política de privacidad, y puede estar fuera de la UE; DeepSeek, por ejemplo, trata datos en China. Revisa las políticas de un proveedor antes de conectarlo; puedes eliminar una clave en cualquier momento.",
      ] },
      { id: "processors", h: "5. Proveedores de servicios que usamos", body: [
        "Trabajamos con encargados del tratamiento cuidadosamente seleccionados que solo pueden tratar datos siguiendo nuestras instrucciones:",
        "• Supabase: base de datos, autenticación, envío de correos de la cuenta y almacenamiento de archivos. Los datos se guardan en la UE (Fráncfort, Alemania).",
        "• Vercel: alojamiento y entrega del sitio. Las funciones del servidor se ejecutan en Fráncfort; Vercel es una empresa estadounidense y puede tratar datos técnicos limitados en EE. UU. al amparo del Marco de Privacidad de Datos UE-EE. UU. y de cláusulas contractuales tipo.",
        "• Indian Type Foundry (Fontshare): suministra una de las fuentes del sitio. Tu navegador la solicita a su servidor, lo que les comunica tu dirección IP (interés legítimo en un diseño coherente).",
        "• Un proveedor de pagos, cuando existan planes de pago; lo nombraremos antes de que puedas comprar.",
        "Podemos comunicar datos cuando la ley lo exija, por ejemplo por orden judicial.",
      ] },
      { id: "transfers", h: "6. Transferencias fuera de la UE", body: [
        "Cuando nuestros encargados tratan datos fuera del Espacio Económico Europeo, nos basamos en una decisión de adecuación (como el Marco de Privacidad de Datos UE-EE. UU.) o en cláusulas contractuales tipo. Si eliges un proveedor de IA situado fuera del EEE, los datos se transfieren allí a petición tuya para realizar la acción solicitada.",
      ] },
      { id: "retention", h: "7. Cuánto tiempo los conservamos", body: [
        "• Datos de la cuenta y tu contenido: mientras exista tu cuenta. Cuando eliminas contenido o tu cuenta, se retira de inmediato de nuestros sistemas activos; las copias de seguridad se sobrescriben en un plazo de 30 días.",
        "• Registros del servidor y de seguridad: poco tiempo, normalmente no más de 30 días.",
        "• Documentación contable: 7 años, como exige la ley fiscal neerlandesa.",
        "• Mensajes de soporte: hasta 2 años después de terminar la conversación.",
      ] },
      { id: "rights", h: "8. Tus derechos", body: [
        "Tienes derecho de acceso, rectificación, supresión, limitación y oposición al tratamiento de tus datos, derecho a la portabilidad y derecho a retirar tu consentimiento en cualquier momento.",
        "Puedes hacer gran parte tú mismo: en Ajustes → Datos y privacidad puedes descargar todos tus datos y eliminar tu cuenta. Para lo demás, escribe a {{email}}. Respondemos en el plazo de un mes.",
        "También puedes presentar una reclamación ante una autoridad de control: en los Países Bajos, la Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl); en España, la AEPD; o la autoridad de tu país.",
      ] },
      { id: "children", h: "9. Menores", body: [
        "ORBIT no está dirigido a menores de 13 años. Los usuarios de 13 a 15 años necesitan permiso de su madre, padre o tutor. Los padres y tutores pueden escribirnos a {{email}} para revisar o eliminar los datos de su hijo o hija. Si descubrimos que tenemos datos de un menor de 13 años, los eliminamos.",
      ] },
      { id: "security", h: "10. Seguridad", body: [
        "Protegemos tus datos con cifrado en tránsito (HTTPS), almacenamiento cifrado de las claves de API, contraseñas con hash, seguridad a nivel de fila en la base de datos que separa los datos de cada cuenta y acceso restringido. Ningún sistema es totalmente seguro; si una brecha afecta a tus datos, te informaremos a ti y a las autoridades según exige la ley.",
      ] },
      { id: "cookies", h: "11. Cookies", body: [
        "Solo usamos cookies estrictamente necesarias y almacenamiento en tu dispositivo. Consulta nuestra Política de cookies para más detalles.",
      ] },
      { id: "changes", h: "12. Cambios", body: [
        "Actualizaremos esta política cuando cambien nuestros tratamientos. Te informaremos de los cambios importantes por correo o en la aplicación antes de que se apliquen.",
      ] },
    ],
  },
  cookies: {
    title: "Política de cookies",
    summary: "ORBIT solo usa lo estrictamente necesario para funcionar: sin cookies de analítica, publicidad ni rastreo.",
    sections: [
      { id: "what", h: "1. Qué son las cookies y el almacenamiento local", body: [
        "Las cookies son pequeños archivos que un sitio web guarda en tu navegador. El almacenamiento local es similar, pero permanece en tu dispositivo y no se envía a nuestros servidores.",
      ] },
      { id: "necessary", h: "2. Cookies estrictamente necesarias", body: [
        "• Las cookies de inicio de sesión (nombres que empiezan por «sb-», o «orbit_session» cuando ORBIT se ejecuta en local) te mantienen conectado de forma segura. Duran hasta que cierras sesión o caduca la sesión.",
        "• «orbit-locale» recuerda el idioma que elegiste. Se conserva un año.",
        "Según la Ley de Telecomunicaciones neerlandesa (art. 11.7a), estas cookies no requieren consentimiento porque el Servicio no funciona sin ellas, pero queremos que lo sepas.",
      ] },
      { id: "local", h: "3. Almacenamiento en tu dispositivo", body: [
        "Para recordar tus preferencias guardamos pequeños ajustes solo en tu navegador: tema (orbit-theme), animación y efectos (orbit-fx), estado de la barra lateral (orbit-sidebar), vista del universo (orbit-universe-view), si has visto la configuración de la IA y este aviso (orbit-ai-invited, orbit-cookie-notice) y un indicador temporal para las transiciones de página (orbit-warp-pending). Nada de esto se envía a nosotros ni a terceros.",
      ] },
      { id: "none", h: "4. Lo que no usamos", body: [
        "Ninguna cookie de analítica, publicidad, redes sociales u otro tipo de rastreo, ni cookies de terceros. Una de nuestras fuentes se carga desde el servidor de Fontshare, que no instala cookies pero sí recibe tu dirección IP (consulta la Política de privacidad). Si algún día queremos añadir cookies no esenciales, te pediremos antes tu consentimiento.",
      ] },
      { id: "control", h: "5. Tu control", body: [
        "Puedes eliminar o bloquear las cookies en cualquier momento desde los ajustes de tu navegador. Si bloqueas las cookies de inicio de sesión, no podrás usar tu cuenta.",
      ] },
    ],
  },
  imprint: {
    title: "Aviso legal",
    summary: "Información sobre el titular de ORBIT, según exige la legislación neerlandesa y europea.",
    sections: [
      { id: "operator", h: "Titular", body: [
        "{{operator}}, que opera con el nombre {{tradeName}}",
        "{{address}}",
        "Cámara de Comercio (KvK): {{kvk}}",
        "Número de IVA: {{vat}}",
        "Correo electrónico: {{email}}",
        "Sitio web: {{website}}",
      ] },
      { id: "disputes", h: "Reclamaciones y disputas", body: [
        "Contáctanos primero en {{email}}; intentamos resolver cada reclamación en 14 días. Consulta la sección 15 de nuestros Términos del servicio para la ley aplicable y los tribunales competentes.",
      ] },
    ],
  },
};
