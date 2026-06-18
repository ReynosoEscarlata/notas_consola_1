1.	Spec	antes	de	código.	Cada	feature	arranca	con	un	
.md	que	describe	qué	se	va	a	construir,	qué	endpoints,	qué
validaciones,	qué	errores.	Claude	Code	no	escribe	nada	hasta	que	la	spec	está	clara.
2.	Code	review	obligatorio	del	diff.	Leer	línea	por	línea	antes	de	aceptar.	Si	no	entiende	algo,	le	pregunta	a	Claude
qué	hace	y	por	qué	—	no	acepta	a	ciegas.
3.	"Explícamelo	de	vuelta".	Al	cerrar	cada	feature,	el	junior	la	explica	en	voz	alta	o	por	escrito	sin	tener	el	código
abierto.	Si	no	puede,	no	terminó.
4.	Un	día	a	la	semana	sin	IA.	Refactor,	bugfix	o	test	escrito	a	mano.	Esto	mantiene	viva	la	habilidad	base.
5.	ADRs	ligeros.	Cada	decisión	arquitectónica	importante	se	documenta	en	una	página	(contexto,	opciones,	decisión,
tradeoffs).	Plantilla	al	final	del	documento.