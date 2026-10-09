// Italian strings, typed against the English file: a missing, extra or misspelt key is a type
// error. Terms marked "glossary" follow the school's electronic register. Placeholders in {braces}
// must be kept as they are (a unit test compares them with the English ones).
import type { Messages } from './en';

export const it: Messages = {
	app: {
		name: 'class-tally'
	},
	common: {
		back: 'Indietro',
		cancel: 'Indietro', // pulsante di un dialogo; "Annulla" è riservato a undo e annulla evento
		close: 'Chiudi',
		save: 'Salva',
		add: 'Aggiungi',
		edit: 'Modifica',
		done: 'Fatto',
		remove: 'Rimuovi',
		loading: 'Caricamento…',
		undo: 'Annulla',
		days: { one: '{count} giorno', other: '{count} giorni' },
		classes: { one: '{count} classe', other: '{count} classi' },
		students: { one: '{count} studente', other: '{count} studenti' },
		events: { one: '{count} evento', other: '{count} eventi' }
	},
	nav: {
		label: 'Navigazione principale',
		classView: 'Classe',
		toTranscribe: 'Da trascrivere', // glossary
		history: 'Storico',
		settings: 'Impostazioni',
		badge: { one: '{count} voce da trascrivere', other: '{count} voci da trascrivere' },
		update: 'Aggiornamento disponibile'
	},
	categories: {
		behaviour: 'Comportamento', // glossary
		homework: 'Compiti', // glossary
		materials: 'Materiale' // glossary
	},
	actions: {
		verbal: 'Avviso verbale', // glossary
		register: 'Richiamo sul registro', // glossary
		note: 'Nota disciplinare' // glossary
	},
	levels: {
		// Lettera mostrata nel badge: V = verbale, R = richiamo, N = nota
		verbal: 'V',
		register: 'R',
		note: 'N'
	},
	quickNotes: {
		behaviour: {
			talking: 'Chiacchiera',
			phone: 'Telefono',
			outOfSeat: 'Fuori posto',
			disrespect: 'Poco rispetto'
		},
		homework: {
			notDone: 'Non fatti',
			incomplete: 'Incompleti',
			forgotAtHome: 'Dimenticati a casa'
		},
		materials: {
			noTextbook: 'Senza libro',
			noCalculator: 'Senza calcolatrice',
			noNotebook: 'Senza quaderno',
			noPen: 'Senza penna'
		}
	},
	home: {
		switchClass: 'Cambia classe',
		manageClasses: 'Gestisci le classi',
		noClasses: {
			title: 'Ancora nessuna classe',
			body: 'Importa un elenco o crea una classe per iniziare.'
		},
		noStudents: 'Questa classe non ha ancora studenti.',
		importRoster: 'Importa elenco',
		newClass: 'Nuova classe',
		badgeAria: '{category}: {count}, prossimo: {action}',
		backupNever: 'Non hai ancora esportato un backup.',
		backupOld: 'L’ultimo backup risale a {age} fa.',
		backupAction: 'Fai il backup ora'
	},
	sheet: {
		title: 'Segna per {student}',
		next: '{category} – prossimo: {action}',
		nextLabel: 'Prossimo',
		inWindow: '{count} negli ultimi {window}'
	},
	toast: {
		logged: '{student} – {category} n. {count} – {action}',
		undo: 'Annulla', // undo, come su iOS
		addNote: 'Aggiungi nota',
		saveFailed: 'Salvataggio non riuscito. Riprova.',
		dismiss: 'Chiudi'
	},
	note: {
		title: 'Nota per {student}',
		placeholder: 'Nota breve (facoltativa)',
		counter: '{count} / {max}',
		quick: 'Note rapide',
		saved: 'Nota salvata'
	},
	classes: {
		title: 'Classi',
		newClass: 'Nuova classe',
		className: 'Nome della classe',
		rename: 'Rinomina',
		archive: 'Archivia',
		restore: 'Ripristina',
		archived: 'Archiviata',
		students: 'Studenti',
		addStudent: 'Aggiungi studente',
		studentName: 'Nome',
		studentSurname: 'Cognome',
		sortKey: 'Chiave di ordinamento (facoltativa)',
		hideStudent: 'Nascondi dalla griglia',
		showStudent: 'Mostra nella griglia',
		hidden: 'Nascosto',
		empty: 'Ancora nessuna classe.',
		nameRequired: 'Scrivi il nome della classe.',
		studentRequired: 'Scrivi un nome o un cognome.',
		openClass: 'Apri la classe'
	},
	import: {
		title: 'Importa elenco',
		hint: 'Incolla l’elenco (JSON, oppure un "Cognome Nome" per riga) o scegli un file. Niente lascia questo dispositivo.',
		pasteLabel: 'Testo dell’elenco',
		chooseFile: 'Scegli un file',
		preview: 'Anteprima',
		classNameLabel: 'Nome della classe',
		target: 'Importa in',
		newClass: 'Nuova classe',
		surname: 'Cognome',
		name: 'Nome',
		label: 'Etichetta',
		swap: 'Scambia nome e cognome',
		removeRow: 'Rimuovi questo studente',
		alreadyThere: 'Già nella classe',
		confirm: { one: 'Importa {count} studente', other: 'Importa {count} studenti' },
		done: { one: 'Importato {count} studente', other: 'Importati {count} studenti' },
		nothingNew: 'Niente di nuovo da importare.',
		errors: {
			empty: 'Niente da importare.',
			invalidJson: 'Questo non è un JSON valido.',
			noStudents: 'Nessuno studente trovato in questo testo.',
			isBackup: 'Questo è un file di backup. Usa Impostazioni, Importa backup.',
			classNameMissing: 'Dai un nome a ogni classe.',
			failed: 'Importazione non riuscita.'
		}
	},
	transcribe: {
		title: 'Da trascrivere', // glossary
		pending: { one: '{count} evento da trascrivere', other: '{count} eventi da trascrivere' },
		empty: 'Niente da trascrivere. Bene così!',
		checkRegister: 'Controlla il registro',
		checkRegisterHint:
			'L’azione di questa voce è cambiata dopo l’annullamento di un evento. Controlla il registro.',
		checked: 'Controllato',
		markTranscribed: 'Segna come trascritto', // glossary: Trascritto
		markAll: 'Segna tutto come trascritto',
		marked: {
			one: '{count} evento segnato come trascritto',
			other: '{count} eventi segnati come trascritti'
		},
		item: '{student} – {category} – {action}',
		today: 'Oggi',
		yesterday: 'Ieri'
	},
	history: {
		title: 'Storico',
		byStudent: 'Per studente',
		byClass: 'Per classe',
		student: 'Studente',
		class: 'Classe',
		from: 'Dal',
		to: 'Al',
		last7: 'Ultimi 7 giorni',
		last30: 'Ultimi 30 giorni',
		empty: 'Nessun evento in questo periodo.',
		allCategories: 'Tutte le categorie',
		category: 'Categoria',
		transcribed: 'Trascritto', // glossary
		toTranscribe: 'Da trascrivere', // glossary
		voided: 'Annullato',
		editNote: 'Modifica nota',
		noNote: 'Nessuna nota',
		count: 'N. {count}',
		pickStudent: 'Scegli uno studente.'
	},
	void: {
		action: 'Annulla evento', // glossary: Annulla (con il nome, per distinguerlo dall’undo)
		title: 'Annullare questo evento?',
		body: 'Resta nello storico, barrato, e non viene più conteggiato.',
		transcribedWarning: 'È già sul registro ufficiale. Toglilo anche da lì.',
		confirm: 'Annulla evento',
		done: 'Evento annullato',
		recomputed: {
			one: '{count} evento successivo aggiornato',
			other: '{count} eventi successivi aggiornati'
		}
	},
	settings: {
		title: 'Impostazioni',
		language: 'Lingua',
		languages: {
			en: 'English',
			it: 'Italiano'
		},
		about: 'Tutti i dati restano su questo dispositivo.',
		categories: {
			title: 'Categorie',
			hint: 'Le modifiche valgono solo per i nuovi eventi. Gli eventi già registrati restano come sono.',
			label: 'Etichetta',
			window: 'Finestra (giorni)', // glossary
			ladder: 'Scala',
			ladderFrom: 'Dall’evento n.',
			ladderAction: 'Azione',
			addStep: 'Aggiungi gradino',
			removeStep: 'Rimuovi gradino',
			quickNotes: 'Note rapide',
			quickNote: 'Nota rapida',
			addQuickNote: 'Aggiungi nota rapida',
			removeQuickNote: 'Rimuovi nota rapida',
			save: 'Salva categoria',
			saved: 'Salvato',
			reset: 'Ripristina i valori predefiniti',
			resetTitle: 'Ripristinare {category} ai valori predefiniti?',
			resetBody:
				'Etichetta, finestra, scala e note rapide tornano ai valori predefiniti. Gli eventi già registrati non cambiano.',
			resetConfirm: 'Ripristina'
		},
		issues: {
			window: {
				integer: 'La finestra deve essere un numero intero di giorni.',
				range: 'La finestra deve essere tra {min} e {max} giorni.'
			},
			ladder: {
				empty: 'Aggiungi almeno un gradino.',
				notInteger: 'Ogni gradino richiede un numero intero.',
				fromRange: 'I numeri dei gradini vanno da 1 a {max}.',
				firstNotOne: 'Il primo gradino deve partire da 1.',
				notIncreasing: 'I gradini devono crescere: questo deve essere maggiore di {previous}.',
				badAction: 'Scegli un’azione.'
			},
			label: {
				empty: 'Scrivi un’etichetta.',
				tooLong: 'Al massimo {max} caratteri.'
			},
			quickNote: {
				empty: 'Una nota rapida non può essere vuota.',
				tooLong: 'Al massimo {max} caratteri.',
				tooMany: 'Al massimo {max} note rapide.'
			},
			backup: {
				interval: 'Scrivi un numero di giorni da 0 a {max}.'
			},
			categories: {
				invalid: 'Le impostazioni delle categorie sono incomplete.'
			},
			locale: {
				invalid: 'Lingua sconosciuta.'
			}
		},
		backup: {
			title: 'Backup',
			interval: 'Ricordami il backup ogni (giorni)',
			intervalHelp: '0 disattiva il promemoria.',
			lastExport: 'Ultima esportazione: {date}',
			never: 'Nessuna esportazione finora.',
			exportJson: 'Esporta backup (JSON)',
			exportCsv: 'Esporta eventi (CSV)',
			exported: 'Esportazione pronta',
			exportFailed: 'L’esportazione non è riuscita.',
			importTitle: 'Importa backup',
			chooseFile: 'Scegli il file di backup',
			contents: 'Backup del {date}: {classes}, {students}, {events}.',
			modeLabel: 'Come importare',
			merge: 'Unisci ai dati attuali',
			mergeHelp:
				'I record si abbinano per id e vince la modifica più recente. Non si cancella nulla.',
			replace: 'Sostituisci i dati attuali',
			replaceHelp:
				'Tutto ciò che c’è su questo dispositivo viene sostituito dal backup. Esporta prima, se hai dubbi.',
			willChange: 'Nuovi: {added}, aggiornati: {updated}, rimossi: {removed}.',
			importMerge: 'Unisci',
			importReplace: 'Sostituisci',
			done: 'Importato. Nuovi: {added}, aggiornati: {updated}, rimossi: {removed}.',
			errors: {
				notJson: 'Questo file non è un JSON valido.',
				badFormat: 'Questo non è un backup di class-tally.',
				newerSchema:
					'Questo backup viene da una versione più recente dell’app. Aggiorna prima l’app.',
				invalid: 'Il file è danneggiato o incompleto.',
				integrity: 'Il file rimanda a record che mancano.',
				failed: 'Importazione non riuscita.'
			}
		},
		app: {
			title: 'App',
			offlineReady: 'Pronta per l’uso senza rete.',
			offlineNotReady: 'L’uso senza rete non è ancora pronto. Apri l’app una volta con la rete.',
			updateReady: 'È pronta una nuova versione.',
			apply: 'Ricarica per aggiornare'
		},
		storage: {
			title: 'Memoria',
			persisted: 'Protetta: il browser non cancella questi dati da solo.',
			notPersisted:
				'Non protetta: il browser potrebbe cancellare questi dati se lo spazio scarseggia. Fai dei backup.',
			unsupported: 'Questo browser non sa dire se i dati sono protetti.',
			request: 'Chiedi la protezione',
			granted: 'Protezione concessa.',
			denied:
				'Il browser non ha concesso la protezione. È normale in una scheda qualsiasi o su localhost.',
			hint: 'Decide il browser. Chrome di solito accetta solo per le app installate o nei preferiti, Safari per le app aggiunte alla schermata Home. Il vero salvagente sono i backup regolari.'
		},
		delete: {
			title: 'Elimina tutti i dati',
			body: 'Toglie da questo dispositivo ogni classe, studente ed evento. Esporta prima un backup. Non si può annullare.',
			word: 'ELIMINA',
			typeWord: 'Scrivi {word} per confermare',
			button: 'Elimina tutto',
			done: 'Tutti i dati sono stati eliminati.'
		}
	},
	errors: {
		generic: 'Qualcosa è andato storto.',
		storage: 'La memoria non è disponibile in questo browser. I dati non possono essere salvati.'
	}
};
