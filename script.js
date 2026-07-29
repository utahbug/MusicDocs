"use strict";

const PDFJS_VERSION = "3.11.174";
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const APP_STORAGE_SCOPE = getAppStorageScope();
const STORAGE_KEYS = {
  deletedItems: storageKey("deletedItems"),
  favorites: storageKey("favorites"),
  importedItems: storageKey("importedItems"),
  itemEdits: storageKey("itemEdits"),
  itemMetadataRepairVersion: storageKey("itemMetadataRepairVersion"),
  lastOpened: storageKey("lastOpened"),
  lists: storageKey("lists"),
  listEditSort: storageKey("listEditSort"),
  pdfPages: storageKey("pdfPages"),
  quickIndexes: storageKey("quickIndexes"),
  recents: storageKey("recents"),
  settings: storageKey("settings"),
  metronome: storageKey("metronome"),
  piano: storageKey("piano"),
  tuner: storageKey("tuner"),
  pitch: storageKey("pitch"),
  welcomeSeen: storageKey("welcomeSeen"),
  starterDataVersion: storageKey("starterDataVersion"),
  starterFavorites: storageKey("starterFavorites"),
  starterFavoritesLayoutVersion: storageKey("starterFavoritesLayoutVersion"),
  starterListAlphabeticalVersion: storageKey("starterListAlphabeticalVersion"),
  starterLists: storageKey("starterLists"),
  setlists: storageKey("setlists"),
  quickChecks: storageKey("quickChecks")
};

const IMPORT_DB_NAME = `${APP_STORAGE_SCOPE}.imports`;
const IMPORT_DB_VERSION = 1;
const PDF_STORE_NAME = "pdfFiles";
const RICH_TOGGLE_COMMANDS = ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
const CARD_FONT_FACES = ["Verdana", "system-ui", "Arial", "Trebuchet MS", "Georgia", "Atkinson Hyperlegible"];
const CARD_READING_SCALES = [0.82, 0.9, 1, 1.12, 1.25, 1.4];
const METRONOME_SOUNDS = new Set(["wood", "classic", "pulse", "bell", "marimba", "bubble", "water"]);
const PDF_TIPS_REMINDER_MS = 3000;
const FAVORITE_DIVIDER_PREFIX = "favorite-divider:";
const TUNER_INSTRUMENTS = {
  chromatic: { label: "Chromatic", targets: [] },
  guitar: {
    label: "Guitar",
    targets: [
      { label: "E2", frequency: 82.41 },
      { label: "A2", frequency: 110 },
      { label: "D3", frequency: 146.83 },
      { label: "G3", frequency: 196 },
      { label: "B3", frequency: 246.94 },
      { label: "E4", frequency: 329.63 }
    ]
  },
  ukulele: {
    label: "Ukulele",
    targets: [
      { label: "G4", frequency: 392 },
      { label: "C4", frequency: 261.63 },
      { label: "E4", frequency: 329.63 },
      { label: "A4", frequency: 440 }
    ]
  },
  clarinet: { label: "Clarinet", targets: [] },
  violin: {
    label: "Violin",
    targets: [
      { label: "G3", frequency: 196 },
      { label: "D4", frequency: 293.66 },
      { label: "A4", frequency: 440 },
      { label: "E5", frequency: 659.25 }
    ]
  },
  flute: { label: "Flute", targets: [] }
};
const TUNER_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PITCH_PRESETS = {
  chromatic: { label: "Chromatic", midiStart: 48, midiEnd: 84, defaultNote: "A4" },
  guitar: { label: "Guitar", notes: TUNER_INSTRUMENTS.guitar.targets, defaultNote: "E2" },
  ukulele: { label: "Ukulele", notes: TUNER_INSTRUMENTS.ukulele.targets, defaultNote: "C4" },
  clarinet: { label: "Clarinet", midiStart: 52, midiEnd: 84, defaultNote: "G4" },
  violin: { label: "Violin", notes: TUNER_INSTRUMENTS.violin.targets, defaultNote: "A4" },
  flute: { label: "Flute", midiStart: 60, midiEnd: 96, defaultNote: "A4" }
};
const STARTER_DATA_VERSION = "musicdocs-categories-v2";
const ITEM_METADATA_REPAIR_VERSION = "musicdocs-metadata-v1";
const STARTER_FAVORITES_LAYOUT_VERSION = "musicdocs-empty-v1";
const STARTER_LIST_ALPHABETICAL_VERSION = "starter-lists-alphabetical-v1";
const STARTER_LIST_ORDER = [];
const RETIRED_LYRIC_PDF_REPLACEMENTS = {};
const RETIRED_STARTER_LISTS = [];
const FILE_ITEM_TYPES = new Set(["pdf", "image", "note", "index"]);
const LIBRARY_CONTENT_TYPES = new Set(["pdf", "image", "note", "index", "card", "link"]);
const BATCH_DELETE_SECTIONS = ["library", "cards", "links"];
let shouldApplyStarterListOrder = false;

const BUILT_IN_LINKS = [];

function storageKey(name) {
  return `${APP_STORAGE_SCOPE}.${name}`;
}

function getAppStorageScope() {
  const pathParts = window.location.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const repoOrFolder = pathParts[0] || "local";
  return `musicDocs.${repoOrFolder}`;
}

const DEFAULT_LIBRARY_DATA = {
  "items": [],
  "favorites": [],
  "quickIndexes": [],
  "setlists": []
};

const APP_THEME = {
  primary: "#2B5F9E",
  dark: "#214A78",
  light: "#EAF2FB",
  hover: "#D8E7F7",
  border: "#B7CCE0"
};

const state = {
  data: { items: [], quickIndexes: [], setlists: [] },
  itemsById: new Map(),
  favorites: new Set(),
  lists: [],
  armedPdfListId: "",
  listEditMode: false,
  listPickerOpen: false,
  listPickerMessage: "",
  listEditSort: normalizeListEditSort(localStorage.getItem(STORAGE_KEYS.listEditSort)),
  listEditView: "current",
  favoriteReorderMode: false,
  listReorderMode: false,
  editingListId: "",
  editingItemId: null,
  importContext: "library",
  importReturnSection: "",
  modalDrag: null,
  cardEditorRange: null,
  cardReadingScale: normalizeCardReadingScale(readJson(STORAGE_KEYS.settings, {}).cardReadingScale),
  activeSection: "lists",
  previousSection: "library",
  previousScrollY: 0,
  activeListId: "",
  expandedListIds: [],
  batchDeleteMode: {
    library: false,
    cards: false,
    links: false
  },
  batchDeleteSelections: {
    library: new Set(),
    cards: new Set(),
    links: new Set()
  },
  swipe: {
    row: null,
    startX: 0,
    startY: 0,
    wasSwipe: false,
    suppressClick: false
  },
  favoriteDrag: {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  },
  listDrag: {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  },
  listItemDrag: {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false,
    listId: ""
  },
  currentPdf: {
    item: null,
    doc: null,
    objectUrl: null,
    sequenceListId: "",
    sequenceSourceListId: "",
    sequenceTransitioning: false,
    pageNumber: 1,
    pageCount: 0,
    rendering: false,
    pendingPage: null,
    touchStartX: 0,
    touchStartY: 0,
    touchMode: "",
    touchMoved: false,
    touchStartDistance: 0,
    touchStartCenterX: 0,
    touchStartCenterY: 0,
    touchStartZoom: 1,
    touchStartPanX: 0,
    touchStartPanY: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    suppressClick: false,
    tipsTimer: null,
    tipsMode: ""
  },
  metronome: {
    bpm: 90,
    beatsPerMeasure: 4,
    sound: "wood",
    running: false,
    currentBeat: 0,
    audioContext: null,
    schedulerId: null,
    nextNoteTime: 0,
    tapTimes: []
  },
  tuner: {
    instrument: "guitar",
    running: false,
    audioContext: null,
    analyser: null,
    source: null,
    stream: null,
    buffer: null,
    rafId: null,
    lastAnalysisAt: 0,
    lastFrequency: 0
  },
  pitch: {
    preset: "guitar",
    note: "E2",
    playing: false,
    audioContext: null,
    oscillator: null,
    gain: null
  },
  piano: {
    sound: "grand-piano",
    volume: 0.58,
    audioContext: null,
    masterGain: null,
    compressor: null,
    voices: new Map(),
    pointerNotes: new Map(),
    pointerTokens: new Map()
  }
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  collectElements();
  applyAppSettings();
  wireEvents();
  configurePdfJs();
  await loadLibrary();
  loadLocalState();
  loadMetronomeSettings();
  loadTunerSettings();
  loadPitchSettings();
  loadPianoSettings();
  setupInitialSelections();
  renderMetronome();
  renderTuner();
  renderPitch();
  renderPiano();
  renderAll();
  openInitialSection();
  setupServiceWorker();
}

function collectElements() {
  el.appShell = document.getElementById("appShell");
  el.backgroundToggleButton = document.getElementById("backgroundToggleButton");
  el.homeTitleButton = document.getElementById("homeTitleButton");
  el.welcomeSection = document.getElementById("welcomeSection");
  el.welcomeButtons = Array.from(document.querySelectorAll("[data-welcome-section]"));
  el.navButtons = Array.from(document.querySelectorAll(".nav-button[data-section]"));
  el.overflowMenuButton = document.getElementById("overflowMenuButton");
  el.overflowMenu = document.getElementById("overflowMenu");
  el.infoMenuButton = document.getElementById("infoMenuButton");
  el.infoMenu = document.getElementById("infoMenu");

  el.sections = {
    welcome: document.getElementById("welcomeSection"),
    library: document.getElementById("librarySection"),
    lists: document.getElementById("listsSection"),
    cards: document.getElementById("cardsSection"),
    links: document.getElementById("linksSection"),
    favorites: document.getElementById("favoritesSection"),
    search: document.getElementById("searchSection"),
    metronome: document.getElementById("metronomeSection"),
    tuner: document.getElementById("tunerSection"),
    pitch: document.getElementById("pitchSection"),
    piano: document.getElementById("pianoSection"),
    detail: document.getElementById("detailSection")
  };

  el.libraryContent = document.getElementById("libraryContent");
  el.librarySearch = document.getElementById("librarySearch");
  el.librarySort = document.getElementById("librarySort");
  el.libraryTopAddButton = document.getElementById("libraryTopAddButton");
  el.libraryAddButton = document.getElementById("libraryAddButton");
  el.libraryBatchEditButton = document.getElementById("libraryBatchEditButton");
  el.libraryBatchBar = document.getElementById("libraryBatchBar");
  el.libraryBatchStatus = document.getElementById("libraryBatchStatus");
  el.libraryBatchDeleteButton = document.getElementById("libraryBatchDeleteButton");
  el.libraryBatchCancelButton = document.getElementById("libraryBatchCancelButton");
  el.exportBackupButton = document.getElementById("exportBackupButton");
  el.importBackupButton = document.getElementById("importBackupButton");
  el.backupFileInput = document.getElementById("backupFileInput");

  el.listSelect = document.getElementById("listSelect");
  el.listTabs = document.getElementById("listTabs");
  el.listTopAddButton = document.getElementById("listTopAddButton");
  el.listReorderButton = document.getElementById("listReorderButton");
  el.listEditButton = document.getElementById("listEditButton");
  el.listMoreButton = document.getElementById("listMoreButton");
  el.listMoreMenu = document.getElementById("listMoreMenu");
  el.listEditorPanel = document.getElementById("listEditorPanel");
  el.listContent = document.getElementById("listContent");
  el.listItemAddButton = document.getElementById("listItemAddButton");
  el.listPickerPanel = document.getElementById("listPickerPanel");

  el.cardsContent = document.getElementById("cardsContent");
  el.cardTopAddButton = document.getElementById("cardTopAddButton");
  el.cardAddButton = document.getElementById("cardAddButton");
  el.cardBatchEditButton = document.getElementById("cardBatchEditButton");
  el.cardBatchBar = document.getElementById("cardBatchBar");
  el.cardBatchStatus = document.getElementById("cardBatchStatus");
  el.cardBatchDeleteButton = document.getElementById("cardBatchDeleteButton");
  el.cardBatchCancelButton = document.getElementById("cardBatchCancelButton");
  el.linksContent = document.getElementById("linksContent");
  el.linkTopAddButton = document.getElementById("linkTopAddButton");
  el.linkAddButton = document.getElementById("linkAddButton");
  el.linkBatchEditButton = document.getElementById("linkBatchEditButton");
  el.linkBatchBar = document.getElementById("linkBatchBar");
  el.linkBatchStatus = document.getElementById("linkBatchStatus");
  el.linkBatchDeleteButton = document.getElementById("linkBatchDeleteButton");
  el.linkBatchCancelButton = document.getElementById("linkBatchCancelButton");
  el.favoritesContent = document.getElementById("favoritesContent");
  el.favoritesReorderButton = document.getElementById("favoritesReorderButton");
  el.favoriteDividerAddButton = document.getElementById("favoriteDividerAddButton");
  el.globalSearch = document.getElementById("globalSearch");
  el.searchContent = document.getElementById("searchContent");
  el.metronomeStatus = document.getElementById("metronomeStatus");
  el.metronomeBpm = document.getElementById("metronomeBpm");
  el.metronomeBpmOutput = document.getElementById("metronomeBpmOutput");
  el.metronomeMinusButton = document.getElementById("metronomeMinusButton");
  el.metronomePlusButton = document.getElementById("metronomePlusButton");
  el.metronomeStartButton = document.getElementById("metronomeStartButton");
  el.metronomeTapButton = document.getElementById("metronomeTapButton");
  el.metronomeBeats = document.getElementById("metronomeBeats");
  el.metronomeSound = document.getElementById("metronomeSound");
  el.metronomeBeatDots = document.getElementById("metronomeBeatDots");
  el.tunerStatus = document.getElementById("tunerStatus");
  el.tunerInstrument = document.getElementById("tunerInstrument");
  el.tunerNote = document.getElementById("tunerNote");
  el.tunerFrequency = document.getElementById("tunerFrequency");
  el.tunerTarget = document.getElementById("tunerTarget");
  el.tunerNeedle = document.getElementById("tunerNeedle");
  el.tunerStrings = document.getElementById("tunerStrings");
  el.tunerStartButton = document.getElementById("tunerStartButton");
  el.tunerMessage = document.getElementById("tunerMessage");
  el.pitchStatus = document.getElementById("pitchStatus");
  el.pitchPreset = document.getElementById("pitchPreset");
  el.pitchNote = document.getElementById("pitchNote");
  el.pitchNoteName = document.getElementById("pitchNoteName");
  el.pitchFrequency = document.getElementById("pitchFrequency");
  el.pitchQuickButtons = document.getElementById("pitchQuickButtons");
  el.pitchPlayButton = document.getElementById("pitchPlayButton");
  el.pitchStopButton = document.getElementById("pitchStopButton");
  el.pianoSound = document.getElementById("pianoSound");
  el.pianoVolume = document.getElementById("pianoVolume");
  el.pianoSoundStatus = document.getElementById("pianoSoundStatus");
  el.pianoSustainHint = document.getElementById("pianoSustainHint");

  el.detailContent = document.getElementById("detailContent");

  el.pdfViewer = document.getElementById("pdfViewer");
  el.pdfTopHomeButton = document.getElementById("pdfTopHomeButton");
  el.pdfHomeButton = document.getElementById("pdfHomeButton");
  el.pdfTipsButton = document.getElementById("pdfTipsButton");
  el.pdfFollowButton = document.getElementById("pdfFollowButton");
  el.pdfRestartListButton = document.getElementById("pdfRestartListButton");
  el.pdfMetronomeButton = document.getElementById("pdfMetronomeButton");
  el.pdfTempoInput = document.getElementById("pdfTempoInput");
  el.pdfTempoUpButton = document.getElementById("pdfTempoUpButton");
  el.pdfTempoDownButton = document.getElementById("pdfTempoDownButton");
  el.pdfTitle = document.getElementById("pdfTitle");
  el.pdfPageStatus = document.getElementById("pdfPageStatus");
  el.pdfStage = document.getElementById("pdfStage");
  el.pdfZoneTips = document.getElementById("pdfZoneTips");
  el.pdfTipsShowOnOpen = document.getElementById("pdfTipsShowOnOpen");
  el.pdfLoading = document.getElementById("pdfLoading");
  el.pdfCanvas = document.getElementById("pdfCanvas");
  el.pdfTapLeft = document.getElementById("pdfTapLeft");
  el.pdfTapRight = document.getElementById("pdfTapRight");

  el.importModal = document.getElementById("importModal");
  el.modalPanel = document.getElementById("modalPanel");
  el.modalHeading = document.getElementById("modalHeading");
  el.importForm = document.getElementById("importForm");
  el.importCloseButton = document.getElementById("importCloseButton");
  el.importType = document.getElementById("importType");
  el.importTypeRow = document.getElementById("importTypeRow");
  el.pdfImportFields = document.getElementById("pdfImportFields");
  el.importFileLabel = document.getElementById("importFileLabel");
  el.cardImportFields = document.getElementById("cardImportFields");
  el.linkImportFields = document.getElementById("linkImportFields");
  el.importPdfFile = document.getElementById("importPdfFile");
  el.importPdfFileName = document.getElementById("importPdfFileName");
  el.importCardContent = document.getElementById("importCardContent");
  el.importCardEditor = document.getElementById("importCardEditor");
  el.inlineCardImageInput = document.getElementById("inlineCardImageInput");
  el.importPlainContent = document.getElementById("importPlainContent");
  el.richCardContentRow = document.getElementById("richCardContentRow");
  el.plainCardContentRow = document.getElementById("plainCardContentRow");
  el.cardFormatToolbar = document.getElementById("cardFormatToolbar");
  el.cardFontPicker = document.getElementById("cardFontPicker");
  el.importCardImageRow = document.getElementById("importCardImageRow");
  el.importCardImage = document.getElementById("importCardImage");
  el.importCardImageName = document.getElementById("importCardImageName");
  el.importUrl = document.getElementById("importUrl");
  el.importTitleRow = document.getElementById("importTitleRow");
  el.importTitleLabel = document.getElementById("importTitleLabel");
  el.importTitleField = document.getElementById("importTitleField");
  el.importCategoryRow = document.getElementById("importCategoryRow");
  el.importCategory = document.getElementById("importCategory");
  el.importBookRow = document.getElementById("importBookRow");
  el.importBook = document.getElementById("importBook");
  el.importComposerRow = document.getElementById("importComposerRow");
  el.importComposer = document.getElementById("importComposer");
  el.importPageRow = document.getElementById("importPageRow");
  el.importPage = document.getElementById("importPage");
  el.importTagsRow = document.getElementById("importTagsRow");
  el.importTags = document.getElementById("importTags");
  el.importNotesRow = document.getElementById("importNotesRow");
  el.importNotes = document.getElementById("importNotes");
  el.importStatus = document.getElementById("importStatus");
  el.importDialogTitle = document.getElementById("importTitle");
  el.importSaveButton = document.getElementById("importSaveButton");
  el.importDeleteButton = document.getElementById("importDeleteButton");

  el.listEditModal = document.getElementById("listEditModal");
  el.listEditPanel = document.getElementById("listEditPanel");
  el.listEditForm = document.getElementById("listEditForm");
  el.listEditCloseButton = document.getElementById("listEditCloseButton");
  el.listEditDeleteButton = document.getElementById("listEditDeleteButton");
  el.listEditTitle = document.getElementById("listEditTitle");
  el.listEditTitleField = document.getElementById("listEditTitleField");
  el.listEditItems = document.getElementById("listEditItems");
  el.listEditCurrentSection = document.getElementById("listEditCurrentSection");
  el.listEditAddSection = document.getElementById("listEditAddSection");
  el.listEditCurrentCount = document.getElementById("listEditCurrentCount");
  el.listEditSearch = document.getElementById("listEditSearch");
  el.listEditSort = document.getElementById("listEditSort");
  el.listEditStatus = document.getElementById("listEditStatus");
  el.listEditResults = document.getElementById("listEditResults");


  el.helpModal = document.getElementById("helpModal");
  el.helpPanel = document.getElementById("helpPanel");
  el.helpCloseButton = document.getElementById("helpCloseButton");

  el.aboutModal = document.getElementById("aboutModal");
  el.aboutPanel = document.getElementById("aboutPanel");
  el.aboutCloseButton = document.getElementById("aboutCloseButton");

  el.batchDeleteControls = {
    library: {
      editButton: el.libraryBatchEditButton,
      bar: el.libraryBatchBar,
      status: el.libraryBatchStatus,
      deleteButton: el.libraryBatchDeleteButton,
      cancelButton: el.libraryBatchCancelButton
    },
    cards: {
      editButton: el.cardBatchEditButton,
      bar: el.cardBatchBar,
      status: el.cardBatchStatus,
      deleteButton: el.cardBatchDeleteButton,
      cancelButton: el.cardBatchCancelButton
    },
    links: {
      editButton: el.linkBatchEditButton,
      bar: el.linkBatchBar,
      status: el.linkBatchStatus,
      deleteButton: el.linkBatchDeleteButton,
      cancelButton: el.linkBatchCancelButton
    }
  };
}

function wireEvents() {
  el.backgroundToggleButton.addEventListener("click", toggleBackgroundMode);
  el.homeTitleButton.addEventListener("click", goHome);

  el.navButtons.forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });
  el.welcomeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem(STORAGE_KEYS.welcomeSeen, "1");
      showSection(button.dataset.welcomeSection);
    });
  });

  el.libraryAddButton.addEventListener("click", () => openImportModal(null, "pdf", "library"));
  el.libraryTopAddButton.addEventListener("click", () => openImportModal(null, "pdf", "library"));
  el.cardAddButton.addEventListener("click", () => openImportModal(null, "card", "cards"));
  el.cardTopAddButton.addEventListener("click", () => openImportModal(null, "card", "cards"));
  el.linkAddButton.addEventListener("click", () => openImportModal(null, "link", "links"));
  el.linkTopAddButton.addEventListener("click", () => openImportModal(null, "link", "links"));
  Object.entries(el.batchDeleteControls).forEach(([section, controls]) => {
    controls.editButton?.addEventListener("click", () => enterBatchDeleteMode(section));
    controls.deleteButton?.addEventListener("click", () => deleteBatchSelectedItems(section));
    controls.cancelButton?.addEventListener("click", () => cancelBatchDeleteMode(section));
  });
  el.favoritesReorderButton.addEventListener("click", toggleFavoriteReorderMode);
  el.favoriteDividerAddButton.addEventListener("click", addFavoriteDivider);
  el.overflowMenuButton.addEventListener("click", toggleOverflowMenu);
  el.infoMenuButton.addEventListener("click", toggleInfoMenu);
  el.exportBackupButton.addEventListener("click", () => {
    closeOverflowMenu();
    closeInfoMenu();
    exportBackup();
  });
  el.importBackupButton.addEventListener("click", () => {
    closeOverflowMenu();
    closeInfoMenu();
    el.backupFileInput.click();
  });
  el.backupFileInput.addEventListener("change", importBackupFromFile);
  el.importCloseButton.addEventListener("click", closeImportModal);
  el.importDeleteButton.addEventListener("click", handleDeleteItemFromForm);
  el.importType.addEventListener("change", updateImportTypeFields);
  el.importPdfFile.addEventListener("change", () => {
    updateFilePickerName(el.importPdfFile, el.importPdfFileName);
    fillTitleFromPdfFile();
  });
  el.importCardImage.addEventListener("change", () => updateFilePickerName(el.importCardImage, el.importCardImageName, "No image selected"));
  el.inlineCardImageInput.addEventListener("change", handleInlineCardImageSelected);
  el.cardFormatToolbar.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) event.preventDefault();
  });
  el.cardFormatToolbar.addEventListener("click", handleRichToolbarClick);
  el.cardFontPicker.addEventListener("pointerdown", saveCardEditorSelection);
  el.cardFontPicker.addEventListener("change", handleCardFontChange);
  ["keyup", "mouseup", "focus", "input"].forEach((eventName) => {
    el.importCardEditor.addEventListener(eventName, updateRichToolbarState);
  });
  el.importCardEditor.addEventListener("click", handleCardEditorClick);
  el.importCardEditor.addEventListener("input", syncCardEditorToHiddenField);
  el.importForm.addEventListener("submit", handleImportSubmit);
  el.listEditCloseButton.addEventListener("click", closeListEditModal);
  el.listEditDeleteButton.addEventListener("click", handleDeleteListFromForm);
  el.listEditForm.addEventListener("submit", saveListEditModal);
  el.listEditSort.addEventListener("change", () => {
    state.listEditSort = normalizeListEditSort(el.listEditSort.value);
    localStorage.setItem(STORAGE_KEYS.listEditSort, state.listEditSort);
    renderListEditResults();
  });
  el.helpCloseButton.addEventListener("click", closeHelpModal);
  el.aboutCloseButton.addEventListener("click", closeAboutModal);
  el.metronomeMinusButton.addEventListener("click", () => setMetronomeBpm(state.metronome.bpm - 1));
  el.metronomePlusButton.addEventListener("click", () => setMetronomeBpm(state.metronome.bpm + 1));
  el.metronomeBpm.addEventListener("input", () => setMetronomeBpm(Number(el.metronomeBpm.value)));
  el.metronomeStartButton.addEventListener("click", toggleMetronome);
  el.metronomeTapButton.addEventListener("click", tapMetronomeTempo);
  el.metronomeBeats.addEventListener("change", () => setMetronomeBeats(Number(el.metronomeBeats.value)));
  el.metronomeSound.addEventListener("change", () => setMetronomeSound(el.metronomeSound.value));
  el.tunerInstrument.addEventListener("change", () => setTunerInstrument(el.tunerInstrument.value));
  el.tunerStartButton.addEventListener("click", toggleTuner);
  el.pitchPreset.addEventListener("change", () => setPitchPreset(el.pitchPreset.value));
  el.pitchNote.addEventListener("change", () => setPitchNote(el.pitchNote.value));
  el.pitchPlayButton.addEventListener("click", playPitch);
  el.pitchStopButton.addEventListener("click", stopPitch);
  el.pitchQuickButtons.addEventListener("click", handlePitchQuickButtonClick);
  el.pianoSound.addEventListener("change", handlePianoSoundChange);
  el.pianoVolume.addEventListener("input", handlePianoVolumeChange);
  document.querySelectorAll(".piano-note").forEach((button) => {
    button.addEventListener("pointerdown", handlePianoPointerDown);
    button.addEventListener("pointermove", handlePianoPointerMove);
    button.addEventListener("pointerup", handlePianoPointerUp);
    button.addEventListener("pointercancel", handlePianoPointerUp);
    button.addEventListener("lostpointercapture", handlePianoPointerUp);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopMetronome();
      stopTuner();
      stopPitch();
      stopAllPianoVoices();
    }
  });
  window.addEventListener("beforeunload", () => {
    stopMetronome();
    stopTuner();
    stopPitch();
    stopAllPianoVoices();
  });
  el.modalHeading.addEventListener("pointerdown", startModalDrag);
  window.addEventListener("pointermove", moveModalDrag);
  window.addEventListener("pointerup", endModalDrag);

  el.librarySearch.addEventListener("input", renderLibrary);
  el.librarySort.addEventListener("change", renderLibrary);
  el.listSelect.addEventListener("change", () => {
    state.activeListId = el.listSelect.value;
    state.listPickerOpen = false;
    state.listPickerMessage = "";
    state.listEditMode = false;
    renderLists();
  });
  el.listTopAddButton.addEventListener("click", () => {
    closeListMoreMenu();
    createList();
  });
  el.listReorderButton.addEventListener("click", toggleListReorderMode);
  el.listEditButton.addEventListener("click", toggleListEditMode);
  el.listItemAddButton.addEventListener("click", toggleListPicker);
  el.globalSearch.addEventListener("input", renderSearch);
  document.body.addEventListener("click", handleBodyClick);
  document.body.addEventListener("input", handleBodyInput);
  document.body.addEventListener("change", handleBodyChange);
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("selectionchange", updateRichToolbarState);
  document.body.addEventListener("pointerdown", handleFavoriteDragPointerDown);
  document.body.addEventListener("pointermove", handleFavoriteDragPointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleFavoriteDragPointerUp);
  document.body.addEventListener("pointercancel", handleFavoriteDragPointerCancel);
  document.body.addEventListener("pointerdown", handleListDragPointerDown);
  document.body.addEventListener("pointermove", handleListDragPointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleListDragPointerUp);
  document.body.addEventListener("pointercancel", handleListDragPointerCancel);
  document.body.addEventListener("pointerdown", handleListItemDragPointerDown);
  document.body.addEventListener("pointermove", handleListItemDragPointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleListItemDragPointerUp);
  document.body.addEventListener("pointercancel", handleListItemDragPointerCancel);
  document.body.addEventListener("pointerdown", handleSwipePointerDown);
  document.body.addEventListener("pointermove", handleSwipePointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleSwipePointerUp);
  document.body.addEventListener("pointercancel", handleSwipePointerUp);

  el.pdfTopHomeButton.addEventListener("click", returnFromPdfViewer);
  el.pdfHomeButton.addEventListener("click", returnFromPdfViewer);
  el.pdfTipsButton.addEventListener("click", togglePdfTips);
  el.pdfFollowButton.addEventListener("click", togglePdfFollow);
  el.pdfRestartListButton.addEventListener("click", restartPdfList);
  el.pdfZoneTips.addEventListener("click", handlePdfZoneTipsClick);
  el.pdfTipsShowOnOpen.addEventListener("change", savePdfTipsPreference);
  el.pdfMetronomeButton.addEventListener("click", toggleMetronome);
  el.pdfTempoUpButton.addEventListener("click", () => setMetronomeBpm(state.metronome.bpm + 1));
  el.pdfTempoDownButton.addEventListener("click", () => setMetronomeBpm(state.metronome.bpm - 1));
  el.pdfTempoInput.addEventListener("change", () => setMetronomeBpm(Number(el.pdfTempoInput.value)));
  el.pdfTempoInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      setMetronomeBpm(Number(el.pdfTempoInput.value));
      el.pdfTempoInput.blur();
    }
  });
  el.pdfTapLeft.addEventListener("click", (event) => handlePdfTapZoneClick(event, "previous"));
  el.pdfTapRight.addEventListener("click", (event) => handlePdfTapZoneClick(event, "next"));

  el.pdfStage.addEventListener("touchstart", handlePdfTouchStart, { passive: false });
  el.pdfStage.addEventListener("touchmove", handlePdfTouchMove, { passive: false });
  el.pdfStage.addEventListener("touchend", handlePdfTouchEnd, { passive: false });
  el.pdfStage.addEventListener("touchcancel", handlePdfTouchEnd, { passive: false });
  window.addEventListener("hashchange", showSectionFromHash);
  window.addEventListener("scroll", updateIdentityBar, { passive: true });
  const handleViewportChange = debounce(() => {
    if (!el.pdfViewer.classList.contains("hidden") && state.currentPdf.doc) {
      renderPdfPage(state.currentPdf.pageNumber);
    }
    fitOpenMobileModals();
  }, 150);
  window.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("resize", handleViewportChange);
  window.visualViewport?.addEventListener("scroll", handleViewportChange);
}

function toggleOverflowMenu(event) {
  event?.stopPropagation();
  const isOpening = el.overflowMenu.classList.contains("hidden");
  if (isOpening) {
    el.overflowMenu.classList.remove("hidden");
    el.overflowMenuButton.setAttribute("aria-expanded", "true");
    clearNavHighlight();
    el.overflowMenuButton.classList.add("active");
    closeInfoMenu({ restoreActive: false });
  } else {
    closeOverflowMenu();
  }
  closeListMoreMenu();
}

function closeOverflowMenu({ restoreActive = true } = {}) {
  el.overflowMenu.classList.add("hidden");
  el.overflowMenuButton.setAttribute("aria-expanded", "false");
  if (restoreActive) {
    setNavHighlight(state.activeSection);
  }
}

function toggleInfoMenu(event) {
  event?.stopPropagation();
  const isOpening = el.infoMenu.classList.contains("hidden");
  if (isOpening) {
    el.infoMenu.classList.remove("hidden");
    el.infoMenuButton.setAttribute("aria-expanded", "true");
    clearNavHighlight();
    el.infoMenuButton.classList.add("active");
    closeOverflowMenu({ restoreActive: false });
    closeListMoreMenu();
  } else {
    closeInfoMenu();
  }
}

function closeInfoMenu({ restoreActive = true } = {}) {
  el.infoMenu.classList.add("hidden");
  el.infoMenuButton.setAttribute("aria-expanded", "false");
  el.infoMenuButton.classList.remove("active");
  if (restoreActive) setNavHighlight(state.activeSection);
}

function openHelpModal() {
  closeOverflowMenu();
  closeInfoMenu();
  el.helpModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeHelpModal() {
  el.helpModal.classList.add("hidden");
  fitOpenMobileModals();
}

function openAboutModal() {
  closeOverflowMenu();
  closeInfoMenu();
  el.aboutModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeAboutModal() {
  el.aboutModal.classList.add("hidden");
  fitOpenMobileModals();
}

async function refreshAppShell() {
  closeOverflowMenu();
  closeInfoMenu();
  closeListMoreMenu();

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    if (navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    }
  } catch {
    // Refresh should still reload the page even if cache cleanup is unavailable.
  }

  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString(36));
  window.location.replace(url.toString());
}

function toggleBackgroundMode() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  const nextSettings = {
    ...settings,
    darkBackground: !settings.darkBackground
  };
  writeJson(STORAGE_KEYS.settings, nextSettings);
  applyAppSettings(nextSettings);
}

function applyAppSettings(settings = readJson(STORAGE_KEYS.settings, {})) {
  const theme = APP_THEME;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-dark", theme.dark);
  root.style.setProperty("--color-primary-light", theme.light);
  root.style.setProperty("--color-primary-hover", theme.hover);
  root.style.setProperty("--color-border", theme.border);
  document.body.classList.toggle("dark-background", Boolean(settings.darkBackground));
  updateBackgroundToggle(Boolean(settings.darkBackground));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.primary);
  updateNavPlacement();
}

function updateBackgroundToggle(isDark) {
  if (!el.backgroundToggleButton) return;
  el.backgroundToggleButton.setAttribute("aria-pressed", isDark ? "true" : "false");
  el.backgroundToggleButton.setAttribute("aria-label", isDark ? "Use white background" : "Use black background");
  el.backgroundToggleButton.title = isDark ? "Use white background" : "Use black background";
}

function updateNavPlacement() {
  document.body.classList.remove("nav-bottom");
  const settings = readJson(STORAGE_KEYS.settings, {});
  if (settings.menuPlacement) {
    const { menuPlacement, ...nextSettings } = settings;
    writeJson(STORAGE_KEYS.settings, nextSettings);
  }
}

function clearNavHighlight() {
  el.navButtons.forEach((button) => button.classList.remove("active"));
  el.overflowMenuButton.classList.remove("active");
  el.infoMenuButton.classList.remove("active");
}

function setNavHighlight(sectionName) {
  el.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });
  el.overflowMenuButton.classList.toggle("active", ["metronome", "tuner", "pitch", "piano"].includes(sectionName));
  el.infoMenuButton.classList.remove("active");
}

function toggleListMoreMenu(event) {
  event?.stopPropagation();
  const isOpening = el.listMoreMenu.classList.contains("hidden");
  el.listMoreMenu.classList.toggle("hidden", !isOpening);
  el.listMoreButton.setAttribute("aria-expanded", String(isOpening));
  closeOverflowMenu();
  closeInfoMenu();
}

function closeListMoreMenu() {
  el.listMoreMenu.classList.add("hidden");
  el.listMoreButton.setAttribute("aria-expanded", "false");
}

function handleDocumentKeydown(event) {
  if (handlePdfPageTurnKey(event)) return;

  const dragHandle = event.target.closest?.("[data-favorite-drag], [data-list-drag], [data-list-item-drag]");
  if (dragHandle && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? "up" : "down";
    if (dragHandle.dataset.favoriteDrag) {
      moveFavoriteOrderStep(dragHandle.dataset.favoriteDrag, direction);
    } else if (dragHandle.dataset.listDrag) {
      moveListOrderStep(dragHandle.dataset.listDrag, direction);
    } else if (dragHandle.dataset.listItemDrag) {
      moveListItem(`${dragHandle.dataset.dragListId}:${dragHandle.dataset.dragIndex}:${direction}`);
      if (dragHandle.closest("#listEditModal")) renderListEditModal();
    }
    return;
  }
  if (event.key !== "Escape") return;
  closeOverflowMenu();
  closeInfoMenu();
  closeListMoreMenu();
  closeListEditModal();
  closeHelpModal();
  closeAboutModal();
}

function handlePdfPageTurnKey(event) {
  if (el.pdfViewer?.classList.contains("hidden") || !state.currentPdf.doc) return false;
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return false;
  if (event.target.closest?.("button, input, select, textarea, [contenteditable='true']")) return false;

  const nextKeys = new Set(["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"]);
  const previousKeys = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);
  let action = null;
  if (nextKeys.has(event.key)) action = nextPdfPage;
  if (previousKeys.has(event.key)) action = previousPdfPage;
  if (event.key === "Home") action = firstPdfPage;
  if (event.key === "End") action = lastPdfPage;
  if (!action) return false;

  event.preventDefault();
  action();
  return true;
}

function favoriteIconHtml(id) {
  return state.favorites.has(id) ? "&#9733;" : "&#9734;";
}

function isFavoriteDividerId(id) {
  return typeof id === "string" && id.startsWith(FAVORITE_DIVIDER_PREFIX);
}

function setFavoriteIcons(container) {
  container.querySelectorAll(".favorite-toggle").forEach((button) => {
    button.innerHTML = favoriteIconHtml(button.dataset.favorite);
  });
}

function hydrateLocalImages(container) {
  container.querySelectorAll("[data-image-file-id]").forEach(async (slot) => {
    if (slot.dataset.loaded) return;
    slot.dataset.loaded = "true";
    try {
      const file = await getLocalFile(slot.dataset.imageFileId);
      if (!file) {
        slot.innerHTML = `<p class="quick-meta">Image not found on this device.</p>`;
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.alt = slot.dataset.imageAlt || "Card image";
      img.onload = () => URL.revokeObjectURL(url);
      img.src = url;
      slot.replaceChildren(img);
    } catch {
      slot.innerHTML = `<p class="quick-meta">Image could not be loaded.</p>`;
    }
  });
}

function configurePdfJs() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  } else {
    window.addEventListener("load", () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
    });
  }
}

async function loadLibrary() {
  let libraryData = null;
  try {
    const response = await fetch("library.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`library.json returned ${response.status}`);
    }
    libraryData = await response.json();
  } catch (error) {
    // Some browsers block fetch("library.json") when index.html is opened directly
    // from a folder. Keep a small starter copy here so extracted ZIPs still work.
    libraryData = cloneData(DEFAULT_LIBRARY_DATA);
  }

  state.data = mergeDefaultStarterData(libraryData || cloneData(DEFAULT_LIBRARY_DATA));
  const importedItems = cleanupImportedItemDuplicates();
  const baseItems = [
    ...(state.data.items || []),
    ...BUILT_IN_LINKS,
    ...importedItems
  ].filter((item) => item?.id && !deletedItemIds().has(item.id));
  state.data.items = applyLocalItemEdits(baseItems);
  state.itemsById = new Map(state.data.items.map((item) => [item.id, item]));
}

function mergeDefaultStarterData(libraryData) {
  const merged = cloneData(libraryData || {});
  const defaults = cloneData(DEFAULT_LIBRARY_DATA);
  const lyricCards = cloneData(window.MUSICDOCS_STARTER_CARDS || []);
  const lyricLists = cloneData(window.MUSICDOCS_STARTER_LISTS || []);

  merged.items = mergeById(mergeById(merged.items || [], defaults.items || []), lyricCards);
  merged.quickIndexes = mergeById(merged.quickIndexes || [], defaults.quickIndexes || []);
  merged.setlists = sortStarterLists(
    mergeById(mergeById(merged.setlists || [], defaults.setlists || []), lyricLists)
  );

  const favorites = new Set(merged.favorites || []);
  (defaults.favorites || []).forEach((id) => favorites.add(id));
  merged.favorites = Array.from(favorites);

  return merged;
}

function sortStarterLists(lists = []) {
  const order = new Map(STARTER_LIST_ORDER.map((id, index) => [id, index]));
  return lists
    .map((list, index) => ({ list, index }))
    .sort((a, b) => {
      const aOrder = order.has(a.list.id) ? order.get(a.list.id) : Number.MAX_SAFE_INTEGER;
      const bOrder = order.has(b.list.id) ? order.get(b.list.id) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.index - b.index;
    })
    .map(({ list }) => list);
}

function mergeById(primaryItems, fallbackItems) {
  const merged = [...primaryItems];
  const existingIds = new Set(merged.map((item) => item?.id).filter(Boolean));
  fallbackItems.forEach((item) => {
    if (!item?.id || existingIds.has(item.id)) return;
    merged.push(item);
    existingIds.add(item.id);
  });
  return merged;
}

function showLoadError(error) {
  const message = `
    <div class="empty-state">
      <p>library.json could not be loaded. Run this app from a small local web server, then refresh.</p>
      <p class="quick-meta">${escapeHtml(error.message)}</p>
    </div>
  `;
  el.libraryContent.innerHTML = message;
  el.listContent.innerHTML = message;
  el.cardsContent.innerHTML = message;
  el.favoritesContent.innerHTML = message;
  el.searchContent.innerHTML = message;
}

function loadLocalState() {
  // localStorage keeps private, device-only preferences and planning state.
  // Clearing browser site data resets these values without changing library.json.
  syncStarterDataVersion();
  const savedFavorites = readJson(STORAGE_KEYS.favorites, []);
  const migratedFavorites = migrateRetiredLyricIds(savedFavorites);
  state.favorites = new Set(migratedFavorites);
  if (JSON.stringify(savedFavorites) !== JSON.stringify(migratedFavorites)) {
    writeJson(STORAGE_KEYS.favorites, migratedFavorites);
  }
  applyStarterFavorites();
  state.lists = loadUnifiedLists();
}

function syncStarterDataVersion() {
  const savedVersion = localStorage.getItem(STORAGE_KEYS.starterDataVersion);
  if (savedVersion === STARTER_DATA_VERSION) return;

  // Keep user-created lists and favorites, but allow new built-in starter
  // content to merge in when this package is updated.
  localStorage.removeItem(STORAGE_KEYS.starterFavorites);
  localStorage.removeItem(STORAGE_KEYS.starterLists);
  localStorage.setItem(STORAGE_KEYS.starterDataVersion, STARTER_DATA_VERSION);
  shouldApplyStarterListOrder = true;
}

function applyStarterFavorites() {
  const starterFavorites = Array.isArray(state.data.favorites) ? state.data.favorites : [];
  if (!starterFavorites.length) return;

  const validStarterFavorites = starterFavorites.filter((id) =>
    state.itemsById.has(id) || isFavoriteDividerId(id)
  );
  if (localStorage.getItem(STORAGE_KEYS.starterFavoritesLayoutVersion) !== STARTER_FAVORITES_LAYOUT_VERSION) {
    state.favorites = new Set(validStarterFavorites);
    writeJson(STORAGE_KEYS.favorites, validStarterFavorites);
    writeJson(STORAGE_KEYS.starterFavorites, validStarterFavorites);
    localStorage.setItem(STORAGE_KEYS.starterFavoritesLayoutVersion, STARTER_FAVORITES_LAYOUT_VERSION);
    return;
  }

  const applied = new Set(readJson(STORAGE_KEYS.starterFavorites, []));
  let favoritesChanged = false;
  let appliedChanged = false;

  starterFavorites.forEach((id) => {
    const isValidStarterFavorite = state.itemsById.has(id) || isFavoriteDividerId(id);
    if (applied.has(id) || !isValidStarterFavorite) return;
    state.favorites.add(id);
    applied.add(id);
    favoritesChanged = true;
    appliedChanged = true;
  });

  if (favoritesChanged) writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  if (appliedChanged) writeJson(STORAGE_KEYS.starterFavorites, Array.from(applied));
}

function loadUnifiedLists() {
  const savedLists = readJson(STORAGE_KEYS.lists, null);
  if (Array.isArray(savedLists) && savedLists.length) {
    const normalizedSavedLists = pruneRetiredStarterLists(normalizeLists(savedLists), true);
    const lists = applyStarterListAlphabeticalOrder(repairStarterEntries(migrateRetiredLyricListEntries(
      syncStarterLists(pruneOldEmptyListShells(normalizedSavedLists, true))
    )));
    writeJson(STORAGE_KEYS.lists, lists);
    return lists;
  }

  const quickChecks = readJson(STORAGE_KEYS.quickChecks, {});
  const quickIndexes = readJson(STORAGE_KEYS.quickIndexes, state.data.quickIndexes || []);
  const setlists = readJson(STORAGE_KEYS.setlists, state.data.setlists || []);
  const migrated = repairStarterEntries([
    ...quickIndexes.map((list) => ({
      id: `quick-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.entries || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(quickChecks[`${list.id}:${entry.itemId}`])
      }))
    })),
    ...setlists.map((list) => ({
      id: `setlist-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: true,
      entries: (list.items || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    }))
  ]);

  const lists = applyStarterListAlphabeticalOrder(migrateRetiredLyricListEntries(
    syncStarterLists(alphabetizeStarterListEntries(
      pruneRetiredStarterLists(normalizeLists(migrated))
    ))
  ));
  writeJson(STORAGE_KEYS.lists, lists);
  return lists;
}

function migrateRetiredLyricIds(ids = []) {
  const seen = new Set();
  return ids.map((id) => RETIRED_LYRIC_PDF_REPLACEMENTS[id] || id).filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function migrateRetiredLyricListEntries(lists = []) {
  return lists.map((list) => {
    const seen = new Set();
    const entries = (list.entries || []).map((entry) => ({
      ...entry,
      itemId: RETIRED_LYRIC_PDF_REPLACEMENTS[entry.itemId] || entry.itemId
    })).filter((entry) => {
      if (!entry.itemId || seen.has(entry.itemId)) return false;
      seen.add(entry.itemId);
      return true;
    });
    return { ...list, entries };
  });
}

function repairStarterEntries(lists = []) {
  return lists;
}

function syncStarterLists(lists) {
  const starterLists = starterUnifiedLists();
  if (!starterLists.length) return lists;

  const applied = new Set(readJson(STORAGE_KEYS.starterLists, []));
  const listById = new Map(lists.map((list) => [list.id, list]));
  let listsChanged = false;
  let appliedChanged = false;

  starterLists.forEach((starter) => {
    const starterEntries = (starter.entries || []).filter((entry) => state.itemsById.has(entry.itemId));
    const existing = listById.get(starter.id);
    if (applied.has(starter.id) && existing) return;

    if (existing) {
      const existingItems = new Set((existing.entries || []).map((entry) => entry.itemId));
      starterEntries.forEach((entry) => {
        if (existingItems.has(entry.itemId)) return;
        existing.entries.push({ ...entry });
        listsChanged = true;
      });
    } else {
      const merged = { ...starter, entries: starterEntries.map((entry) => ({ ...entry })) };
      lists.push(merged);
      listById.set(merged.id, merged);
      listsChanged = true;
    }

    applied.add(starter.id);
    appliedChanged = true;
  });

  if (shouldApplyStarterListOrder) {
    const starterOrder = new Map(starterLists.map((list, index) => [list.id, index]));
    const originalOrder = new Map(lists.map((list, index) => [list.id, index]));
    lists.sort((a, b) => {
      const aStarter = starterOrder.has(a.id);
      const bStarter = starterOrder.has(b.id);
      if (aStarter && bStarter) return starterOrder.get(a.id) - starterOrder.get(b.id);
      if (aStarter) return -1;
      if (bStarter) return 1;
      return originalOrder.get(a.id) - originalOrder.get(b.id);
    });
    listsChanged = true;
    shouldApplyStarterListOrder = false;
  }

  if (appliedChanged) writeJson(STORAGE_KEYS.starterLists, Array.from(applied));
  if (listsChanged) writeJson(STORAGE_KEYS.lists, lists);
  return lists;
}

function starterUnifiedLists() {
  return alphabetizeStarterListEntries(normalizeLists([
    ...(state.data.quickIndexes || []).map((list) => ({
      id: `quick-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.entries || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    })),
    ...(state.data.setlists || []).map((list) => ({
      id: `setlist-${list.id}`,
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      entries: (list.items || []).map((entry) => ({
        itemId: entry.itemId,
        page: entry.page || null,
        book: entry.book || "",
        notes: entry.notes || "",
        order: entry.order || null,
        checked: Boolean(entry.checked)
      }))
    }))
  ]));
}

function alphabetizeStarterListEntries(lists = []) {
  return lists.map((list) => ({
    ...list,
    entries: [...(list.entries || [])].sort((a, b) => {
      const aTitle = state.itemsById.get(a.itemId)?.title || "";
      const bTitle = state.itemsById.get(b.itemId)?.title || "";
      return aTitle.localeCompare(bTitle, undefined, { numeric: true, sensitivity: "base" });
    })
  }));
}

function applyStarterListAlphabeticalOrder(lists = []) {
  if (localStorage.getItem(STORAGE_KEYS.starterListAlphabeticalVersion) === STARTER_LIST_ALPHABETICAL_VERSION) {
    return lists;
  }

  const starterIds = new Set(starterUnifiedLists().map((list) => list.id));
  const sorted = lists.map((list) => {
    if (list.userCreated || !starterIds.has(list.id)) return list;
    return alphabetizeStarterListEntries([list])[0];
  });
  localStorage.setItem(STORAGE_KEYS.starterListAlphabeticalVersion, STARTER_LIST_ALPHABETICAL_VERSION);
  return sorted;
}

function normalizeLists(lists) {
  const normalized = (lists || [])
    .filter((list) => list && list.id)
    .map((list) => ({
      id: String(list.id),
      title: list.title || "Untitled List",
      showCheckboxes: Boolean(list.showCheckboxes),
      userCreated: Boolean(list.userCreated || list.createdEmpty),
      entries: (list.entries || list.items || [])
        .filter((entry) => entry?.itemId)
        .map((entry) => ({
          itemId: entry.itemId,
          page: entry.page || null,
          book: entry.book || "",
          notes: entry.notes || "",
          order: entry.order || null,
          checked: Boolean(entry.checked)
        }))
    }));

  return normalized;
}

function pruneRetiredStarterLists(lists, persist = false) {
  const retiredById = new Map(RETIRED_STARTER_LISTS.map((list) => [list.id, list]));
  const pruned = lists.filter((list) => {
    const retired = retiredById.get(list.id);
    if (!retired || list.userCreated || list.title !== retired.title) return true;

    const entries = list.entries || [];
    const unchanged = entries.length === retired.itemIds.length && entries.every((entry, index) => {
      const hasPersonalDetails = entry.page || entry.book || entry.notes || entry.order;
      return entry.itemId === retired.itemIds[index] && !hasPersonalDetails;
    });
    return !unchanged;
  });

  if (persist && pruned.length !== lists.length) {
    writeJson(STORAGE_KEYS.lists, pruned);
  }
  return pruned;
}

function pruneOldEmptyListShells(lists, persist = false) {
  if (state.itemsById.size) return lists;

  const pruned = lists.filter((list) => (list.entries || []).length || list.userCreated);
  if (persist && pruned.length !== lists.length) {
    writeJson(STORAGE_KEYS.lists, pruned);
  }
  return pruned;
}

function setupInitialSelections() {
  populateSelect(el.listSelect, state.lists || []);
  const defaultList = state.lists[0];
  state.activeListId = defaultList?.id || "";
  state.expandedListIds = [];
  el.listSelect.value = state.activeListId;
}

function populateSelect(select, options) {
  select.innerHTML = "";
  if (!options.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No lists yet";
    select.appendChild(opt);
    return;
  }
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.id;
    opt.textContent = option.title;
    select.appendChild(opt);
  });
}

function openInitialSection() {
  if (!showSectionFromHash()) {
    showSection(localStorage.getItem(STORAGE_KEYS.welcomeSeen) ? "lists" : "welcome");
  }
}

function showSectionFromHash() {
  const hashSection = window.location.hash.replace("#", "");
  const mappedSection = hashSection === "quick" || hashSection === "setlists"
    ? "lists"
    : hashSection === "all"
      ? "library"
      : hashSection;
  if (mappedSection !== "lists" && !el.sections[mappedSection]) return false;
  showSection(mappedSection);
  return true;
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then((registration) => {
      registration.update();
    }).catch(() => {
      // The app still works as a normal static site if service workers are unavailable.
    });
  }
}

function openImportModal(itemId = null, preferredType = "pdf", context = "library") {
  state.editingItemId = itemId;
  state.importContext = context;
  state.importReturnSection = itemId && context === "lists" ? "lists" : "";
  resetImportForm();
  if (itemId) {
    const item = state.itemsById.get(itemId);
    state.importContext = context === "lists"
      ? "lists"
      : item?.type === "card"
        ? "cards"
        : item?.type === "link"
          ? "links"
          : "library";
    prefillImportForm(item);
  } else {
    el.importType.value = preferredType;
  }
  applyImportContext();
  updateImportTypeFields();
  clearModalPanelLayout(el.modalPanel);
  el.importModal.classList.remove("hidden");
  fitOpenMobileModals();
  el.importTitleField.focus();
}

function closeImportModal() {
  el.importModal.classList.add("hidden");
  clearModalPanelLayout(el.modalPanel);
  state.editingItemId = null;
  state.importContext = "library";
  state.importReturnSection = "";
  el.importType.disabled = false;
  setImportStatus("");
  fitOpenMobileModals();
}

function clearModalPanelLayout(panel) {
  if (!panel) return;
  [
    "position",
    "left",
    "right",
    "top",
    "bottom",
    "margin",
    "width",
    "maxWidth",
    "height",
    "maxHeight"
  ].forEach((name) => {
    panel.style[name] = "";
  });
}

function fitOpenMobileModals() {
  const openPanels = [
    [el.importModal, el.modalPanel],
    [el.listEditModal, el.listEditPanel],
    [el.helpModal, el.helpPanel],
    [el.aboutModal, el.aboutPanel]
  ].filter(([modal, panel]) => modal && panel && !modal.classList.contains("hidden"));

  const shouldFit = window.matchMedia("(max-width: 760px)").matches;
  document.body.classList.toggle("modal-open", shouldFit && openPanels.length > 0);

  if (!shouldFit) {
    openPanels.forEach(([, panel]) => clearModalPanelLayout(panel));
    return;
  }

  const viewport = window.visualViewport;
  const width = Math.floor(viewport?.width || document.documentElement.clientWidth || window.innerWidth);
  const height = Math.floor(viewport?.height || window.innerHeight);
  const left = Math.floor(viewport?.offsetLeft || 0);
  const top = Math.floor(viewport?.offsetTop || 0);

  openPanels.forEach(([, panel]) => {
    panel.style.position = "fixed";
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.margin = "0";
    panel.style.width = `${width}px`;
    panel.style.maxWidth = `${width}px`;
    panel.style.height = `${height}px`;
    panel.style.maxHeight = `${height}px`;
  });
}

function resetImportForm() {
  el.importForm.reset();
  state.cardEditorRange = null;
  el.importType.value = "pdf";
  el.importCategory.value = "";
  el.importCardContent.value = "";
  el.importPlainContent.value = "";
  el.importCardEditor.innerHTML = "";
  el.cardFontPicker.value = "Verdana";
  updateFilePickerName(el.importPdfFile, el.importPdfFileName);
  updateFilePickerName(el.importCardImage, el.importCardImageName, "No image selected");
  el.importType.disabled = false;
  el.importDialogTitle.textContent = "Add item";
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", "Save");
  el.importSaveButton.title = "Save";
  el.importTitleLabel.textContent = "Title";
  el.importDeleteButton.classList.add("hidden");
  setImportStatus("");
}

function applyImportContext() {
  const context = state.importContext;
  const type = el.importType.value;
  const editing = Boolean(state.editingItemId);
  const linkOnly = context === "links" || type === "link";
  const cardOnly = context === "cards" || type === "card";

  el.importModal.dataset.context = context;
  el.importModal.dataset.itemType = type;
  el.importTypeRow.classList.toggle("hidden", context !== "library" || editing);
  el.importTitleLabel.textContent = "Title";
  el.importDialogTitle.textContent = editing
    ? `Edit ${type === "link" ? "link" : type === "card" ? "card" : "item"}`
    : context === "links"
      ? "Add link"
      : context === "cards"
        ? "Add card"
        : "Add item";
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", editing ? "Save changes" : "Save");
  el.importSaveButton.title = editing ? "Save changes" : "Save";
  el.importDeleteButton.classList.toggle("hidden", !editing || !isDeletableItem(state.editingItemId));

  el.importCategoryRow.classList.toggle("hidden", linkOnly);
  el.importBookRow.classList.add("hidden");
  el.importComposerRow.classList.toggle("hidden", linkOnly || cardOnly);
  el.importPageRow.classList.add("hidden");
  el.importTagsRow.classList.toggle("hidden", linkOnly || cardOnly);
  el.importNotesRow.classList.toggle("hidden", false);

  if (linkOnly) {
    el.importCategory.value = "";
    el.importBook.value = "";
    el.importComposer.value = "";
    el.importPage.value = "";
    el.importTags.value = "";
  }

  if (context !== "library" && !editing) {
    el.importType.value = context === "links" ? "link" : "card";
  }
}

function updateImportTypeFields() {
  const type = el.importType.value;
  const editing = Boolean(state.editingItemId);
  applyImportContext();
  const fileBacked = type === "pdf" || type === "image";
  el.pdfImportFields.classList.toggle("hidden", !fileBacked || editing);
  el.importFileLabel.textContent = "File";
  el.importPdfFile.accept = "application/pdf,.pdf,image/*";
  el.cardImportFields.classList.toggle("hidden", type !== "card" && type !== "note");
  el.importCardImageRow.classList.toggle("hidden", type !== "card");
  el.richCardContentRow.classList.toggle("hidden", type !== "card");
  el.plainCardContentRow.classList.toggle("hidden", type !== "note");
  el.linkImportFields.classList.toggle("hidden", type !== "link");
}

function startModalDrag(event) {
  if (window.matchMedia("(max-width: 760px)").matches) return;
  if (event.target.closest("button, input, select, textarea, a, [contenteditable]")) return;
  const rect = el.modalPanel.getBoundingClientRect();
  state.modalDrag = {
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
  el.modalPanel.classList.add("is-dragging");
  el.modalPanel.style.position = "fixed";
  el.modalPanel.style.left = `${rect.left}px`;
  el.modalPanel.style.top = `${rect.top}px`;
  el.modalPanel.style.margin = "0";
  el.modalPanel.style.width = `${rect.width}px`;
  el.modalPanel.style.maxWidth = "calc(100vw - 24px)";
  el.modalHeading.setPointerCapture?.(event.pointerId);
}

function moveModalDrag(event) {
  if (!state.modalDrag) return;
  const drag = state.modalDrag;
  const nextLeft = clamp(drag.left + event.clientX - drag.startX, 8, Math.max(8, window.innerWidth - drag.width - 8));
  const nextTop = clamp(drag.top + event.clientY - drag.startY, 8, Math.max(8, window.innerHeight - 80));
  el.modalPanel.style.left = `${nextLeft}px`;
  el.modalPanel.style.top = `${nextTop}px`;
}

function endModalDrag() {
  if (!state.modalDrag) return;
  state.modalDrag = null;
  el.modalPanel.classList.remove("is-dragging");
}

function prefillImportForm(item) {
  if (!item) return;
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", "Save changes");
  el.importSaveButton.title = "Save changes";
  el.importType.value = item.type === "link" ? "link" : item.type;
  el.importType.disabled = true;
  el.importTitleField.value = normalizeVisibleText(item.title);
  el.importCategory.value = item.category || "";
  el.importBook.value = item.book || "";
  el.importComposer.value = item.composer || "";
  el.importPage.value = item.page || "";
  el.importTags.value = (item.tags || []).join(", ");
  el.importNotes.value = item.notes || "";
  if (item.type === "card") {
    const cardHtml = item.cardHtml || (item.lyricsText ? lyricsTextToHtml(item.lyricsText) : plainCardLinesToHtml(item.content || []));
    el.importCardEditor.innerHTML = sanitizeCardHtml(cardHtml);
    syncCardEditorToHiddenField();
  } else {
    el.importCardEditor.innerHTML = "";
    el.importCardContent.value = "";
  }
  el.importPlainContent.value = item.type === "note" ? (item.body || "") : "";
  el.importUrl.value = item.url || "";
}

function fillTitleFromPdfFile() {
  const file = el.importPdfFile.files?.[0];
  if (file && !state.editingItemId) {
    const detectedType = detectImportFileType(file, el.importType.value);
    if (detectedType !== el.importType.value) {
      el.importType.value = detectedType;
      updateImportTypeFields();
    }
  }
  if (file && !el.importTitleField.value.trim()) {
    el.importTitleField.value = file.name.replace(/\.[^.]+$/i, "");
  }
}

function updateFilePickerName(input, nameEl, emptyText = "No file selected") {
  if (!input || !nameEl) return;
  nameEl.textContent = input.files?.[0]?.name || emptyText;
}

function handleRichToolbarClick(event) {
  const sizeButton = event.target.closest("[data-rich-size]");
  if (sizeButton) {
    changeSelectedCardTextSize(Number(sizeButton.dataset.richSize));
    return;
  }

  const button = event.target.closest("[data-rich-command]");
  if (!button) return;

  const command = button.dataset.richCommand;
  if (command === "photo") {
    saveCardEditorSelection();
    el.inlineCardImageInput.click();
    return;
  }

  el.importCardEditor.focus();
  document.execCommand(command, false, null);
  syncCardEditorToHiddenField();
  updateRichToolbarState();
}

function handleCardFontChange() {
  const face = CARD_FONT_FACES.includes(el.cardFontPicker.value) ? el.cardFontPicker.value : "Verdana";
  restoreCardEditorSelection();
  document.execCommand("fontName", false, face);
  syncCardEditorToHiddenField();
  saveCardEditorSelection();
  updateRichToolbarState();
}

function changeSelectedCardTextSize(direction) {
  restoreCardEditorSelection();
  const current = Number(document.queryCommandValue("fontSize")) || 3;
  document.execCommand("fontSize", false, String(clamp(current + direction, 1, 7)));
  syncCardEditorToHiddenField();
  saveCardEditorSelection();
  updateRichToolbarState();
}

function restoreCardEditorSelection() {
  el.importCardEditor.focus();
  if (!state.cardEditorRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(state.cardEditorRange);
}

function handleCardEditorClick(event) {
  const image = event.target.closest("img");
  if (!image || !el.importCardEditor.contains(image)) return;
  cycleCardImageSize(image);
  syncCardEditorToHiddenField();
}

function cycleCardImageSize(image) {
  const sizes = ["small", "medium", "large"];
  const current = image.dataset.cardImageSize || "medium";
  const next = sizes[(sizes.indexOf(current) + 1) % sizes.length] || "medium";
  image.dataset.cardImageSize = next;
  image.title = `Tap to resize (${next})`;
  setImportStatus(`Photo size: ${next}. Tap the photo again to change size.`);
}

async function handleInlineCardImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await imageFileToCardDataUrl(file);
    insertCardEditorHtml(`<img src="${escapeHtml(dataUrl)}" alt="" data-card-image-size="medium" title="Tap to resize"><div><br></div>`);
    syncCardEditorToHiddenField();
    updateRichToolbarState();
  } catch {
    setImportStatus("That photo could not be inserted into the card text.", true);
  } finally {
    event.target.value = "";
  }
}

function saveCardEditorSelection() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!el.importCardEditor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== el.importCardEditor) return;
  state.cardEditorRange = range.cloneRange();
}

function insertCardEditorHtml(html) {
  el.importCardEditor.focus();
  const selection = window.getSelection();
  selection.removeAllRanges();
  if (state.cardEditorRange) {
    selection.addRange(state.cardEditorRange);
  } else {
    const range = document.createRange();
    range.selectNodeContents(el.importCardEditor);
    range.collapse(false);
    selection.addRange(range);
  }
  document.execCommand("insertHTML", false, html);
  saveCardEditorSelection();
}

function imageFileToCardDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image."));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        const maxEdge = 1000;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        URL.revokeObjectURL(url);
        readFileAsDataUrl(file).then(resolve, reject);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      readFileAsDataUrl(file).then(resolve, reject);
    };
    image.src = url;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function syncCardEditorToHiddenField() {
  el.importCardContent.value = sanitizeCardHtml(el.importCardEditor.innerHTML);
}

function updateRichToolbarState() {
  if (!el.importCardEditor || !el.cardFormatToolbar) return;
  const selection = window.getSelection();
  const hasEditorSelection = selection?.rangeCount
    ? el.importCardEditor.contains(selection.anchorNode) || selection.anchorNode === el.importCardEditor
    : document.activeElement === el.importCardEditor;

  if (hasEditorSelection) saveCardEditorSelection();

  if (hasEditorSelection) {
    const currentFace = String(document.queryCommandValue("fontName") || "").replace(/^["']|["']$/g, "");
    const matchedFace = CARD_FONT_FACES.find((face) => face.toLowerCase() === currentFace.toLowerCase());
    if (matchedFace) el.cardFontPicker.value = matchedFace;
  }

  el.cardFormatToolbar.querySelectorAll("[data-rich-command]").forEach((button) => {
    const command = button.dataset.richCommand;
    if (!RICH_TOGGLE_COMMANDS.includes(command)) return;
    let active = false;
    if (hasEditorSelection) {
      try {
        active = document.queryCommandState(command);
      } catch {
        active = false;
      }
    }
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function plainCardLinesToHtml(lines = []) {
  return (lines || [])
    .map((line) => line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>")
    .join("");
}

function lyricsTextToHtml(text = "") {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const verse = line.match(/^(\d+\.)\s+(.*)$/);
      if (verse) return `<p>${escapeHtml(verse[1])} ${escapeHtml(verse[2])}</p>`;
      if (/^chorus:?$/i.test(line)) return `<p><strong>${escapeHtml(line)}</strong></p>`;
      return line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>";
    })
    .join("");
}

function sanitizeCardHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html || "";
  const allowedTags = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "DIV", "P", "SPAN", "FONT", "TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "UL", "OL", "LI", "IMG"]);
  const allowedAttrs = new Set(["colspan", "rowspan"]);

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode("");

    const tagName = node.tagName.toUpperCase();
    if (!allowedTags.has(tagName)) {
      const fragment = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));
      return fragment;
    }

    const clean = document.createElement(tagName.toLowerCase());
    Array.from(node.attributes || []).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (tagName === "IMG" && name === "src" && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(attr.value)) {
        clean.setAttribute("src", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "alt") {
        clean.setAttribute("alt", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "data-card-image-size" && ["small", "medium", "large"].includes(attr.value)) {
        clean.setAttribute("data-card-image-size", attr.value);
        return;
      }
      if (tagName === "IMG" && name === "title") {
        clean.setAttribute("title", attr.value);
        return;
      }
      if (tagName === "FONT" && name === "face" && CARD_FONT_FACES.includes(attr.value)) {
        clean.setAttribute("face", attr.value);
        return;
      }
      if (tagName === "FONT" && name === "size" && /^[1-7]$/.test(attr.value)) {
        clean.setAttribute("size", attr.value);
        return;
      }
      if (allowedAttrs.has(name)) clean.setAttribute(name, attr.value);
    });
    Array.from(node.childNodes).forEach((child) => clean.appendChild(cleanNode(child)));
    return clean;
  }

  const fragment = document.createDocumentFragment();
  Array.from(template.content.childNodes).forEach((child) => fragment.appendChild(cleanNode(child)));

  const holder = document.createElement("div");
  holder.appendChild(fragment);
  return holder.innerHTML.trim();
}

function htmlToPlainText(html = "") {
  const holder = document.createElement("div");
  holder.innerHTML = sanitizeCardHtml(html);
  return holder.innerText.trim();
}

async function handleImportSubmit(event) {
  event.preventDefault();
  setImportStatus("Saving...");

  try {
    let item;
    if (state.editingItemId) {
      item = state.itemsById.get(state.editingItemId);
      const editedFields = buildEditableFieldsFromForm(item.type, itemDisplayTitle(item));
      if (item.type === "card") {
        await addCardImageFromForm(state.editingItemId, editedFields);
        if (item.lyricsCard) editedFields.lyricsText = "";
      }
      saveItemEdit(state.editingItemId, editedFields);
      item = state.itemsById.get(state.editingItemId);
    } else {
      item = await buildImportedItemFromForm();
      await saveImportedItem(item);
    }
    const returnSection = state.importReturnSection;
    closeImportModal();
    renderAll();
    showSection(returnSection || (item.type === "card" ? "cards" : item.type === "link" ? "links" : "library"));
  } catch (error) {
    setImportStatus(error.message || "The song could not be saved.", true);
  }
}

async function buildImportedItemFromForm() {
  const selectedFile = el.importPdfFile.files?.[0];
  const type = detectImportFileType(selectedFile, el.importType.value);
  const fallbackTitle = getImportFallbackTitle(type);
  const item = {
    ...buildEditableFieldsFromForm(type, fallbackTitle),
    id: createImportedId(el.importTitleField.value.trim() || fallbackTitle),
    type,
    imported: true,
    importedAt: new Date().toISOString()
  };

  if (type === "pdf" || type === "image") {
    const file = selectedFile;
    if (!file) {
      throw new Error(type === "image" ? "Select or take a photo before saving." : "Select a PDF file before saving.");
    }
    item.fileName = file.name;
    item.fileMime = file.type;
    item.fileSize = file.size;
    if (findDuplicateImportedItem(item)) {
      throw new Error("That file already appears in the app.");
    }
    await storeLocalFile(item.id, file);
    item.fileId = item.id;
    return item;
  }

  if (type === "card") {
    if (findDuplicateImportedItem(item)) {
      throw new Error("That card already appears in the app.");
    }
    await addCardImageFromForm(item.id, item);
  }

  return item;
}

async function addCardImageFromForm(itemId, fields) {
  const file = el.importCardImage.files?.[0];
  if (!file) return;

  const imageFileId = `${itemId}-card-image`;
  await storeLocalFile(imageFileId, file);
  fields.imageFileId = imageFileId;
  fields.imageFileName = file.name;
  fields.imageMime = file.type;
  fields.imageSize = file.size;
}

function buildEditableFieldsFromForm(type, fallbackTitle = "Untitled Item") {
  const title = el.importTitleField.value.trim() || fallbackTitle;
  const fields = {
    title,
    category: el.importCategory.value.trim(),
    book: el.importBook.value.trim(),
    composer: el.importComposer.value.trim(),
    page: el.importPage.value ? Number(el.importPage.value) : undefined,
    tags: parseTags(el.importTags.value),
    notes: el.importNotes.value.trim()
  };

  if (!fields.category) delete fields.category;
  if (!fields.book) delete fields.book;
  if (!fields.composer) delete fields.composer;
  if (!fields.page) delete fields.page;
  if (!fields.notes) delete fields.notes;

  if (type === "card") {
    syncCardEditorToHiddenField();
    const cardHtml = sanitizeCardHtml(el.importCardEditor.innerHTML);
    const content = htmlToPlainText(cardHtml).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    fields.content = content ? content.split("\n") : [];
    if (cardHtml) {
      fields.cardHtml = cardHtml;
    } else {
      delete fields.cardHtml;
    }
  }

  if (type === "note") {
    const body = el.importPlainContent.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    fields.body = body || fields.notes || "";
  }

  if (type === "link") {
    const url = el.importUrl.value.trim();
    if (!url) {
      throw new Error("Paste a URL before saving.");
    }
    fields.url = normalizeUrl(url);
  }

  return fields;
}

function getImportFallbackTitle(type) {
  if (type === "pdf" || type === "image") {
    const file = el.importPdfFile.files?.[0];
    if (file?.name) return file.name.replace(/\.[^.]+$/i, "");
  }

  if (type === "link") {
    const url = el.importUrl.value.trim();
    if (url) {
      try {
        return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "") || "Untitled Link";
      } catch {
        return "Untitled Link";
      }
    }
    return "Untitled Link";
  }

  if (type === "card") return "Untitled Card";
  if (type === "image") return "Untitled Image";
  if (type === "note") return "Untitled Note";
  return "Untitled Item";
}

function detectImportFileType(file, selectedType) {
  if (!file) return selectedType;
  const name = file.name || "";
  if (file.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif|bmp|tiff?)$/i.test(name)) {
    return "image";
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(name)) {
    return "pdf";
  }
  return selectedType;
}

async function saveImportedItem(item) {
  const imported = getImportedItems();
  if (findDuplicateImportedItem(item, imported)) {
    throw new Error("That item already appears in the app.");
  }
  imported.push(item);
  writeJson(STORAGE_KEYS.importedItems, imported);
  state.data.items.push(item);
  state.itemsById.set(item.id, item);
}

function getImportedItems() {
  return readJson(STORAGE_KEYS.importedItems, [])
    .filter((item) => item && item.id && item.type);
}

function cleanupImportedItemDuplicates() {
  const imported = getImportedItems();
  const seen = new Map();
  const builtInByTitleType = new Map();
  const duplicateMap = new Map();
  const cleaned = [];

  (state.data.items || []).forEach((item) => {
    const key = importedItemDuplicateKey(item);
    if (key) seen.set(key, item);
    const titleTypeKey = `${item.type}|${normalize(item.title)}`;
    if (item.type && normalize(item.title)) builtInByTitleType.set(titleTypeKey, item);
  });

  imported.forEach((item) => {
    const builtInMatch = builtInByTitleType.get(`${item.type}|${normalize(item.title)}`);
    if (builtInMatch) {
      duplicateMap.set(item.id, builtInMatch.id);
      return;
    }
    const key = importedItemDuplicateKey(item);
    if (!key) {
      cleaned.push(item);
      return;
    }

    const existing = seen.get(key);
    if (existing) {
      duplicateMap.set(item.id, existing.id);
      return;
    }

    seen.set(key, item);
    cleaned.push(item);
  });

  if (!duplicateMap.size) return imported;

  writeJson(STORAGE_KEYS.importedItems, cleaned);
  remapDuplicateItemReferences(duplicateMap);
  return cleaned;
}

function findDuplicateImportedItem(item, imported = getImportedItems()) {
  const key = importedItemDuplicateKey(item);
  const titleTypeKey = `${item.type}|${normalize(item.title)}`;
  const builtInMatch = (state.data.items || []).find((candidate) =>
    candidate.id !== item.id &&
    `${candidate.type}|${normalize(candidate.title)}` === titleTypeKey
  );
  if (builtInMatch) return builtInMatch;
  if (!key) return null;
  return imported.find((candidate) => candidate.id !== item.id && importedItemDuplicateKey(candidate) === key) || null;
}

function importedItemDuplicateKey(item) {
  if (!item?.type) return "";
  const title = normalize(item.title);
  if (!title) return "";

  if (item.type === "pdf" || item.type === "image") {
    const fileName = normalize(item.fileName || item.imageFileName || item.file || "");
    const fileSize = item.fileSize || item.imageSize || "";
    if (!fileName || !fileSize) return "";
    return [item.type, title, fileName, fileSize, normalize(item.fileMime || item.imageMime || "")].join("|");
  }

  if (item.type === "link") {
    const url = normalize(item.url || "");
    return url ? [item.type, title, url].join("|") : "";
  }

  if (item.type === "card") {
    const cardText = normalize(item.cardHtml || (item.content || []).join("\n"));
    return cardText ? [item.type, title, cardText].join("|") : "";
  }

  if (item.type === "note") {
    const body = normalize(item.body || item.notes || "");
    return body ? [item.type, title, body].join("|") : "";
  }

  return "";
}

function remapDuplicateItemReferences(duplicateMap) {
  const duplicateIds = new Set(duplicateMap.keys());

  const favorites = readJson(STORAGE_KEYS.favorites, []);
  if (Array.isArray(favorites)) {
    const remappedFavorites = [];
    const seenFavorites = new Set();
    favorites.forEach((id) => {
      const nextId = duplicateMap.get(id) || id;
      if (seenFavorites.has(nextId)) return;
      seenFavorites.add(nextId);
      remappedFavorites.push(nextId);
    });
    writeJson(STORAGE_KEYS.favorites, remappedFavorites);
  }

  const remapEntries = (entries = []) => {
    const seen = new Set();
    return entries.map((entry) => {
      const nextId = duplicateMap.get(entry.itemId) || entry.itemId;
      return nextId === entry.itemId ? entry : { ...entry, itemId: nextId };
    }).filter((entry) => {
      if (!entry.itemId || seen.has(entry.itemId)) return false;
      seen.add(entry.itemId);
      return true;
    });
  };

  const lists = readJson(STORAGE_KEYS.lists, null);
  if (Array.isArray(lists)) {
    writeJson(STORAGE_KEYS.lists, lists.map((list) => ({
      ...list,
      entries: remapEntries(list.entries || list.items || [])
    })));
  }

  const setlists = readJson(STORAGE_KEYS.setlists, null);
  if (Array.isArray(setlists)) {
    writeJson(STORAGE_KEYS.setlists, setlists.map((list) => ({
      ...list,
      items: remapEntries(list.items || [])
    })));
  }

  const recents = readJson(STORAGE_KEYS.recents, []);
  if (Array.isArray(recents)) {
    const remappedRecents = [];
    const seenRecents = new Set();
    recents.forEach((id) => {
      const nextId = duplicateMap.get(id) || id;
      if (seenRecents.has(nextId)) return;
      seenRecents.add(nextId);
      remappedRecents.push(nextId);
    });
    writeJson(STORAGE_KEYS.recents, remappedRecents);
  }

  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  let pagesChanged = false;
  duplicateMap.forEach((keptId, removedId) => {
    if (pages[removedId] && !pages[keptId]) pages[keptId] = pages[removedId];
    if (removedId in pages) {
      delete pages[removedId];
      pagesChanged = true;
    }
  });
  if (pagesChanged) writeJson(STORAGE_KEYS.pdfPages, pages);

  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  let editsChanged = false;
  duplicateIds.forEach((id) => {
    if (id in edits) {
      delete edits[id];
      editsChanged = true;
    }
  });
  if (editsChanged) writeJson(STORAGE_KEYS.itemEdits, edits);
}

function isUserCreatedItem(itemId) {
  return getImportedItems().some((item) => item.id === itemId);
}

function isDeletableItem(itemId) {
  return Boolean(itemId && state.itemsById.has(itemId));
}

function deletedItemIds() {
  return new Set(readJson(STORAGE_KEYS.deletedItems, []));
}

function applyLocalItemEdits(items) {
  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  return items.map((item) => {
    const itemEdits = edits[item.id];
    return itemEdits ? { ...item, ...sanitizeItemEdits(itemEdits), id: item.id, type: item.type } : item;
  });
}

function sanitizeItemEdits(itemEdits) {
  const clean = { ...itemEdits };
  if ("title" in clean && !normalizeVisibleText(clean.title)) delete clean.title;
  return clean;
}

function saveItemEdit(itemId, editedFields) {
  const allEdits = readJson(STORAGE_KEYS.itemEdits, {});
  allEdits[itemId] = {
    ...(allEdits[itemId] || {}),
    ...editedFields,
    editedAt: new Date().toISOString()
  };
  writeJson(STORAGE_KEYS.itemEdits, allEdits);

  const current = state.itemsById.get(itemId);
  if (current) {
    const updated = { ...current, ...editedFields, id: current.id, type: current.type };
    state.itemsById.set(itemId, updated);
    state.data.items = state.data.items.map((item) => item.id === itemId ? updated : item);
  }
}

async function handleDeleteItemFromForm() {
  if (!state.editingItemId) return;
  await confirmAndDeleteItem(state.editingItemId, { closeModal: true });
}

async function confirmAndDeleteItem(itemId, options = {}) {
  const item = state.itemsById.get(itemId);
  if (!item || !isDeletableItem(itemId)) {
    closeSwipeRows();
    return;
  }

  const ok = window.confirm("Delete this item? This cannot be undone.");
  if (!ok) {
    closeSwipeRows();
    return;
  }

  await deleteUserItem(itemId);
  const detailWasActive = el.sections.detail.classList.contains("active");
  closeSwipeRows();
  if (options.closeModal) closeImportModal();
  renderAll();

  if (state.currentPdf.item?.id === itemId) {
    closePdfViewer();
  }
  if (detailWasActive) {
    el.detailContent.innerHTML = "";
    showSection(state.previousSection || "library");
  } else if (state.activeSection === "cards" && item.type !== "card") {
    showSection("library");
  } else if (state.activeSection === "links" && item.type !== "link") {
    showSection("library");
  }
}

async function deleteUserItem(itemId) {
  const item = state.itemsById.get(itemId);
  if (!item) return;

  if (isUserCreatedItem(itemId)) {
    await Promise.all([
      removeLocalFile(item.fileId),
      removeLocalFile(item.imageFileId)
    ]);
  } else {
    const deletedIds = deletedItemIds();
    deletedIds.add(itemId);
    writeJson(STORAGE_KEYS.deletedItems, Array.from(deletedIds));
  }

  const imported = getImportedItems().filter((candidate) => candidate.id !== itemId);
  writeJson(STORAGE_KEYS.importedItems, imported);

  const edits = readJson(STORAGE_KEYS.itemEdits, {});
  delete edits[itemId];
  writeJson(STORAGE_KEYS.itemEdits, edits);

  state.data.items = state.data.items.filter((candidate) => candidate.id !== itemId);
  state.itemsById.delete(itemId);

  state.favorites.delete(itemId);
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));

  state.lists.forEach((list) => {
    list.entries = (list.entries || []).filter((entry) => entry.itemId !== itemId);
  });
  saveLists();

  const pdfPages = readJson(STORAGE_KEYS.pdfPages, {});
  delete pdfPages[itemId];
  writeJson(STORAGE_KEYS.pdfPages, pdfPages);

  const recents = readJson(STORAGE_KEYS.recents, []).filter((id) => id !== itemId);
  writeJson(STORAGE_KEYS.recents, recents);

  const lastOpened = readJson(STORAGE_KEYS.lastOpened, null);
  if (lastOpened?.id === itemId) {
    localStorage.removeItem(STORAGE_KEYS.lastOpened);
  }

  const quickChecks = readJson(STORAGE_KEYS.quickChecks, {});
  Object.keys(quickChecks).forEach((key) => {
    if (key.endsWith(`:${itemId}`)) delete quickChecks[key];
  });
  writeJson(STORAGE_KEYS.quickChecks, quickChecks);

  cleanupLegacyLists(itemId);
}

function cleanupLegacyLists(itemId) {
  const quickIndexes = readJson(STORAGE_KEYS.quickIndexes, []);
  if (Array.isArray(quickIndexes)) {
    writeJson(STORAGE_KEYS.quickIndexes, quickIndexes.map((list) => ({
      ...list,
      entries: (list.entries || []).filter((entry) => entry.itemId !== itemId)
    })));
  }

  const setlists = readJson(STORAGE_KEYS.setlists, []);
  if (Array.isArray(setlists)) {
    writeJson(STORAGE_KEYS.setlists, setlists.map((list) => ({
      ...list,
      items: (list.items || []).filter((entry) => entry.itemId !== itemId)
    })));
  }
}

function setImportStatus(message, isError = false) {
  el.importStatus.textContent = message;
  el.importStatus.classList.toggle("error", Boolean(isError));
}

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeUrl(value) {
  try {
    return new URL(value).href;
  } catch {
    try {
      return new URL(`https://${value}`).href;
    } catch {
      throw new Error("Enter a valid URL.");
    }
  }
}

function createImportedId(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "song";
  return `imported-${slug}-${Date.now().toString(36)}`;
}

function openImportDb() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support local file storage."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMPORT_DB_NAME, IMPORT_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDF_STORE_NAME)) {
        db.createObjectStore(PDF_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local PDF storage could not be opened."));
  });
}

async function storePdfFile(fileId, file) {
  return storeLocalFile(fileId, file);
}

async function storeLocalFile(fileId, file) {
  // Imported PDFs, photos, and Card images stay private on this device in IndexedDB.
  // Data exports can include these blobs so a private setup can be moved to another device/version.
  const db = await openImportDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
    transaction.objectStore(PDF_STORE_NAME).put(file, fileId);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error("The file could not be stored locally."));
    };
  });
}

async function getPdfFile(fileId) {
  return getLocalFile(fileId);
}

async function getLocalFile(fileId) {
  const db = await openImportDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PDF_STORE_NAME, "readonly");
    const request = transaction.objectStore(PDF_STORE_NAME).get(fileId);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error("The file could not be read from local storage."));
    };
  });
}

async function removeLocalFile(fileId) {
  if (!fileId) return;
  try {
    const db = await openImportDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PDF_STORE_NAME, "readwrite");
      transaction.objectStore(PDF_STORE_NAME).delete(fileId);
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("The local file could not be deleted."));
      };
    });
  } catch {
    // Visible item data is still removed. Some browsers may block IndexedDB cleanup.
  }
}

function collectLocalFileIds(data = {}) {
  const ids = new Set();
  const addFromItem = (item) => {
    if (!item || typeof item !== "object") return;
    if (item.fileId) ids.add(item.fileId);
    if (item.imageFileId) ids.add(item.imageFileId);
  };

  (data.importedItems || []).forEach(addFromItem);
  Object.values(data.itemEdits || {}).forEach(addFromItem);
  state.data.items.forEach(addFromItem);

  return Array.from(ids);
}

async function collectBackupFiles(fileIds) {
  const files = [];
  const missingFileIds = [];

  for (const fileId of fileIds) {
    try {
      const file = await getLocalFile(fileId);
      if (!file) {
        missingFileIds.push(fileId);
        continue;
      }

      files.push({
        id: fileId,
        name: file.name || fileId,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        lastModified: file.lastModified || null,
        dataUrl: await fileToDataUrl(file)
      });
    } catch {
      missingFileIds.push(fileId);
    }
  }

  return { files, missingFileIds };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("The file could not be read for export."));
    reader.readAsDataURL(file);
  });
}

async function restoreBackupFiles(fileRecords) {
  if (!Array.isArray(fileRecords) || !fileRecords.length) return;

  for (const record of fileRecords) {
    if (!record?.id || !record.dataUrl) continue;
    const response = await fetch(record.dataUrl);
    const blob = await response.blob();
    let file = blob;

    try {
      file = new File([blob], record.name || record.id, {
        type: record.type || blob.type || "application/octet-stream",
        lastModified: record.lastModified || Date.now()
      });
    } catch {
      file.name = record.name || record.id;
      file.lastModified = record.lastModified || Date.now();
    }

    await storeLocalFile(record.id, file);
  }
}

function renderAll() {
  renderLibrary();
  renderLists();
  renderCards();
  renderLinks();
  renderFavorites();
  renderSearch();
  updateAllBatchDeleteControls();
}

function goHome() {
  if (!el.importModal.classList.contains("hidden")) {
    const ok = window.confirm("Close this form without saving?");
    if (!ok) return;
    closeImportModal();
  }

  state.listPickerOpen = false;
  state.listPickerMessage = "";
  state.listEditMode = false;
  closeSwipeRows();
  closeOverflowMenu();
  closeInfoMenu();
  closeListMoreMenu();
  renderLists();
  showSection("favorites");
}

function updateIdentityBar() {
  document.body.classList.toggle("identity-condensed", window.scrollY > 28);
}

function showSection(sectionName) {
  if (!el.sections[sectionName]) return;
  if (sectionName !== "tuner") stopTuner();
  if (sectionName !== "pitch") stopPitch();

  if (sectionName !== "detail" && !el.pdfViewer.classList.contains("hidden")) {
    closePdfViewer();
  }

  Object.entries(el.sections).forEach(([name, section]) => {
    section.classList.toggle("active", name === sectionName);
  });

  setNavHighlight(sectionName);
  closeOverflowMenu({ restoreActive: false });
  closeInfoMenu({ restoreActive: false });
  closeListMoreMenu();

  if (sectionName !== "detail") {
    state.activeSection = sectionName;
    if (sectionName !== "welcome") window.location.hash = sectionName;
  }

  updateNavPlacement(sectionName);
}

function renderLibrary() {
  const query = el.librarySearch.value;
  const fileItems = state.data.items.filter(isFileItem);
  const filtered = filterItems(fileItems, query);
  renderItemList(el.libraryContent, sortLibraryItems(filtered, el.librarySort.value), {
    compact: true,
    compactAction: "edit",
    emptyTitle: query ? "No matching files" : "Your music shelf is ready",
    emptyMessage: query ? "Try a shorter title or clear the search box." : "Add a PDF or photo of music to open it quickly during rehearsal."
  });
  updateBatchDeleteControls("library");
}

function renderGroupedItems(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    container.appendChild(emptyState());
    return;
  }

  const grouped = groupBy(items, (item) => item.category || "Uncategorized");
  Object.entries(grouped).forEach(([category, categoryItems]) => {
    const block = document.createElement("section");
    block.className = "category-block";
    block.innerHTML = `
      <div class="category-title">
        <h3>${escapeHtml(category)}</h3>
        <span>${categoryItems.length}</span>
      </div>
      <div class="stack"></div>
    `;
    const stack = block.querySelector(".stack");
    categoryItems
      .slice()
      .sort(compareTitle)
      .forEach((item) => stack.appendChild(createItemCard(item)));
    container.appendChild(block);
  });
}

function renderItemList(container, items, options = {}) {
  container.innerHTML = "";
  container.classList.toggle("compact-index-list", Boolean(options.compact));
  container.classList.toggle("favorite-list", Boolean(options.favoriteList));
  container.classList.toggle("favorite-reorder-list", Boolean(options.reorderFavorites));
  container.classList.toggle("batch-delete-list", isBatchDeleteMode(options.batchDeleteSection));
  if (!items.length) {
    container.appendChild(emptyState(options.emptyTitle, options.emptyMessage));
    return;
  }
  items.forEach((item) => container.appendChild(createItemCard(item, options)));
}

function createItemCard(item, options = {}) {
  const article = document.createElement("article");
  const batchMode = isBatchDeleteMode(options.batchDeleteSection);
  const deleteAction = batchMode ? "" : itemDeleteActionHtml(item);
  const title = itemDisplayTitle(item);
  const selected = batchMode && state.batchDeleteSelections[options.batchDeleteSection]?.has(item.id);
  article.className = `${options.compact ? "item-card compact-item-card" : "item-card"}${deleteAction ? " swipe-row" : ""}${options.reorderFavorites ? " favorite-reorder-row" : ""}${batchMode ? " batch-delete-row" : ""}${selected ? " batch-selected" : ""}`;
  article.dataset.id = item.id;
  if (options.reorderFavorites) article.dataset.favoriteRow = item.id;
  if (options.compact) {
    if (batchMode) {
      article.innerHTML = batchDeleteRowHtml(item, options.batchDeleteSection, selected);
      return article;
    }
    const reorderHandle = options.reorderFavorites
      ? dragHandleHtml("favorite", item.id, title)
      : "";
    article.innerHTML = `
      ${deleteAction}
      <div class="swipe-content item-card-content compact-item-card-content">
        <button class="icon-button favorite-toggle ${state.favorites.has(item.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
          ${state.favorites.has(item.id) ? "&#9733;" : "&#9734;"}
        </button>
        ${compactItemRowHtml(item, options)}
        ${reorderHandle}
      </div>
    `;
    setFavoriteIcons(article);
    return article;
  }
  article.innerHTML = `
    ${deleteAction}
    <div class="swipe-content item-card-content">
      <button class="icon-button favorite-toggle ${state.favorites.has(item.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
        ${state.favorites.has(item.id) ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â "}
      </button>
      <button class="item-open" type="button" data-open="${escapeHtml(item.id)}">
        <h3>${escapeHtml(title)} <span class="type-pill">${escapeHtml(item.type)}</span></h3>
        ${metaHtml(item)}
        ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ""}
        ${tagsHtml(item.tags)}
      </button>
      <button class="icon-button info-button" type="button" data-detail="${escapeHtml(item.id)}" aria-label="Show info for ${escapeHtml(title)}">
        Info
      </button>
    </div>
  `;
  setFavoriteIcons(article);
  return article;
}

function itemDeleteActionHtml(item) {
  if (!isDeletableItem(item.id)) return "";
  return `<button class="swipe-delete-action" type="button" data-swipe-delete-item="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(itemDisplayTitle(item))}" title="Delete">&#128465;</button>`;
}

function compactItemRowHtml(item, options = {}) {
  const meta = options.favoriteList || options.hideMeta ? "" : compactLibraryMetaText(item);
  const title = options.favoriteList ? itemDisplayTitleWithInlinePage(item) : itemDisplayTitle(item);
  const typeLabel = compactTypeLabel(item);
  const compactAction = options.favoriteList
    ? ""
    : options.compactAction === "edit"
      ? `
    <button class="icon-button info-button compact-info-button" type="button" data-edit-item="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(title)}" title="Edit">
      &#9998;
    </button>`
      : `
    <button class="icon-button info-button compact-info-button" type="button" data-detail="${escapeHtml(item.id)}" aria-label="Show info for ${escapeHtml(title)}" title="Info">
      i
    </button>`;
  return `
    <button class="item-open compact-item-open" type="button" data-open="${escapeHtml(item.id)}">
      <span class="compact-item-line">
        <span class="compact-title">${escapeHtml(title)}</span>
        ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
        <span class="type-pill compact-type">${escapeHtml(typeLabel)}</span>
      </span>
    </button>
    ${compactAction}
  `;
}

function batchDeleteRowHtml(item, section, selected) {
  const meta = compactLibraryMetaText(item);
  const title = itemDisplayTitle(item);
  return `
    <div class="item-card-content compact-item-card-content batch-delete-content">
      <label class="batch-select-cell" title="Select ${escapeHtml(title)}">
        <input type="checkbox" data-batch-select="${escapeHtml(section)}" value="${escapeHtml(item.id)}" ${selected ? "checked" : ""}>
        <span class="sr-only">Select ${escapeHtml(title)}</span>
      </label>
      <button class="item-open compact-item-open batch-toggle-open" type="button" data-batch-toggle="${escapeHtml(section)}" data-batch-item="${escapeHtml(item.id)}">
        <span class="compact-item-line">
          <span class="compact-title">${escapeHtml(title)}</span>
          ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
        </span>
      </button>
    </div>
  `;
}

function isBatchDeleteMode(section) {
  return Boolean(section && state.batchDeleteMode[section]);
}

function isBatchDeleteSection(section) {
  return BATCH_DELETE_SECTIONS.includes(section);
}

function enterBatchDeleteMode(section) {
  if (!isBatchDeleteSection(section)) return;
  closeSwipeRows();
  state.batchDeleteMode[section] = true;
  state.batchDeleteSelections[section].clear();
  renderBatchDeleteSection(section);
}

function cancelBatchDeleteMode(section) {
  if (!isBatchDeleteSection(section)) return;
  state.batchDeleteMode[section] = false;
  state.batchDeleteSelections[section].clear();
  renderBatchDeleteSection(section);
}

function toggleBatchDeleteSelection(section, itemId) {
  if (!isBatchDeleteSection(section) || !state.batchDeleteMode[section]) return;
  const selections = state.batchDeleteSelections[section];
  if (selections.has(itemId)) {
    selections.delete(itemId);
  } else {
    selections.add(itemId);
  }
  renderBatchDeleteSection(section);
}

function setBatchDeleteSelection(section, itemId, selected) {
  if (!isBatchDeleteSection(section) || !state.batchDeleteMode[section]) return;
  const selections = state.batchDeleteSelections[section];
  if (selected) {
    selections.add(itemId);
  } else {
    selections.delete(itemId);
  }
  updateBatchDeleteControls(section);
}

async function deleteBatchSelectedItems(section) {
  if (!isBatchDeleteSection(section)) return;
  const ids = Array.from(state.batchDeleteSelections[section])
    .filter((id) => state.itemsById.has(id) && isDeletableItem(id));
  if (!ids.length) {
    updateBatchDeleteControls(section);
    return;
  }

  const label = ids.length === 1 ? "selected item" : "selected items";
  const ok = window.confirm(`Delete ${ids.length} ${label}? This cannot be undone.`);
  if (!ok) return;

  for (const itemId of ids) {
    await deleteUserItem(itemId);
  }

  state.batchDeleteSelections[section].clear();
  state.batchDeleteMode[section] = false;
  pruneBatchDeleteSelections();
  renderAll();
}

function pruneBatchDeleteSelections() {
  BATCH_DELETE_SECTIONS.forEach((section) => {
    state.batchDeleteSelections[section].forEach((itemId) => {
      if (!state.itemsById.has(itemId)) state.batchDeleteSelections[section].delete(itemId);
    });
  });
}

function renderBatchDeleteSection(section) {
  if (section === "library") renderLibrary();
  if (section === "cards") renderCards();
  if (section === "links") renderLinks();
  updateBatchDeleteControls(section);
}

function updateAllBatchDeleteControls() {
  BATCH_DELETE_SECTIONS.forEach(updateBatchDeleteControls);
}

function updateBatchDeleteControls(section) {
  if (!isBatchDeleteSection(section) || !el.batchDeleteControls) return;
  const controls = el.batchDeleteControls[section];
  if (!controls?.editButton) return;

  const active = state.batchDeleteMode[section];
  const selectedCount = state.batchDeleteSelections[section].size;
  controls.editButton.classList.toggle("active-tool", active);
  controls.editButton.textContent = active ? "Editing" : "Edit";
  controls.editButton.setAttribute("aria-pressed", active ? "true" : "false");
  controls.bar?.classList.toggle("hidden", !active);
  if (controls.status) {
    controls.status.textContent = selectedCount
      ? `${selectedCount} selected`
      : "Select items to delete";
  }
  if (controls.deleteButton) {
    controls.deleteButton.disabled = selectedCount === 0;
  }
}

function renderLists() {
  cleanupListEntries();

  if (!state.lists.length) {
    state.activeListId = "";
    populateSelect(el.listSelect, []);
    el.listTabs.innerHTML = "";
    el.listEditButton.innerHTML = "&#9998;";
    el.listEditButton.setAttribute("aria-label", "Edit list");
    el.listEditButton.title = "Edit list";
    el.listEditButton.disabled = true;
    el.listMoreButton.disabled = false;
    el.listReorderButton.classList.add("hidden");
    el.listReorderButton.classList.remove("active-tool");
    el.listReorderButton.setAttribute("aria-pressed", "false");
    state.listReorderMode = false;
    el.listItemAddButton.disabled = true;
    el.listItemAddButton.classList.add("hidden");
    el.listEditButton.classList.remove("active-tool");
    el.listEditorPanel.classList.add("hidden");
    el.listEditorPanel.innerHTML = "";
    el.listPickerPanel.classList.add("hidden");
    el.listPickerPanel.innerHTML = "";
    el.listContent.innerHTML = `<div class="empty-state"><p>No lists yet.</p></div>`;
    state.expandedListIds = [];
    return;
  }

  const active = getActiveList();
  if (!active) return;
  state.activeListId = active.id;
  state.expandedListIds = state.expandedListIds
    .filter((listId) => state.lists.some((list) => list.id === listId))
    .slice(-1);
  if (state.lists.length < 2) {
    state.listReorderMode = false;
  }
  el.listSelect.value = active.id;
  renderListTabs(active);

  el.listReorderButton.classList.add("hidden");
  el.listEditButton.innerHTML = state.listEditMode ? "&#10003;" : "&#9998;";
  el.listEditButton.setAttribute("aria-label", state.listEditMode ? "Save list changes" : "Edit list");
  el.listEditButton.title = state.listEditMode ? "Save list changes" : "Edit list";
  el.listEditButton.classList.toggle("primary-icon", state.listEditMode);
  el.listEditButton.disabled = false;
  el.listMoreButton.disabled = false;
  el.listItemAddButton.disabled = true;
  el.listItemAddButton.classList.add("hidden");
  el.listEditButton.classList.toggle("active-tool", state.listEditMode);
  renderListEditorPanel(active);

  el.listContent.innerHTML = "";
  renderListPickerPanel(active);
}

function renderListTabs(active) {
  el.listTabs.classList.add("list-reorder-list");
  el.listTabs.innerHTML = state.lists.map((list, index) => {
    const itemCount = getResolvedListEntries(list).length;
    const activeClass = list.id === active.id ? " active" : "";
    const isExpanded = state.expandedListIds.includes(list.id);
    const expandedClass = isExpanded ? " expanded" : "";
    const reorderClass = " list-reorder-row";
    const expanded = isExpanded ? "true" : "false";
    const selected = list.id === active.id ? "true" : "false";
    const title = list.title || "Untitled List";
    const reorderHandle = dragHandleHtml("list", list.id, title);
    return `
      <div class="list-tab-group${activeClass}${expandedClass}${reorderClass}" role="option" aria-selected="${selected}" data-list-row="${escapeHtml(list.id)}">
        <div class="list-tab-row">
        <button class="list-tab-main" type="button" data-select-list="${escapeHtml(list.id)}" title="${escapeHtml(title)}" aria-expanded="${expanded}">
          <span class="list-title-mark" aria-hidden="true">&#9776;</span>
          <span class="list-tab-title">${escapeHtml(title)}</span>
        </button>
        ${isExpanded && itemCount ? `<span class="list-tab-count" aria-label="${itemCount} items">${itemCount}</span>` : ""}
        <button class="icon-button list-row-edit-button" type="button" data-edit-list-row="${escapeHtml(list.id)}" aria-label="Edit ${escapeHtml(title)}" title="Edit list">&#9998;</button>
        ${reorderHandle}
        </div>
        ${isExpanded ? renderInlineListItems(list) : ""}
      </div>
    `;
  }).join("");
}

function renderInlineListItems(list) {
  const entries = getResolvedListEntries(list);
  const pdfCount = entries.filter((entry) => entry.item.type === "pdf").length;
  const playlistArmed = state.armedPdfListId === list.id;

  if (!entries.length) {
    return `<div class="inline-list-items"><div class="inline-list-empty">No items yet.</div></div>`;
  }

  return `
    <div class="inline-list-items" data-list-items="${escapeHtml(list.id)}">
      ${pdfCount > 1 ? `
        <div class="list-play-through-row">
          <button class="list-play-through-button ${playlistArmed ? "is-active" : ""}" type="button" data-play-pdf-list="${escapeHtml(list.id)}" aria-pressed="${playlistArmed}">
            ${playlistArmed
              ? `Follow: On`
              : `Follow: Off`}
          </button>
        </div>
      ` : ""}
      ${entries.map((entry) => {
        const title = itemDisplayTitleWithInlinePage(entry.item, entry.page);
        const favorite = state.favorites.has(entry.item.id);
        const typeLabel = compactTypeLabel(entry.item);
        return `
          <div class="inline-list-row" data-list-item-row="${escapeHtml(entry.item.id)}">
            <button class="icon-button favorite-toggle inline-list-favorite ${favorite ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(entry.item.id)}" aria-label="Toggle favorite for ${escapeHtml(title)}" title="Toggle favorite">
              ${favorite ? "&#9733;" : "&#9734;"}
            </button>
            <button class="inline-list-item" type="button" data-open="${escapeHtml(entry.item.id)}">
              <span class="compact-title">${escapeHtml(title)}</span>
              <span class="type-pill compact-type">${escapeHtml(typeLabel)}</span>
            </button>
            <button class="icon-button inline-list-edit-button" type="button" data-edit-item="${escapeHtml(entry.item.id)}" data-edit-context="lists" aria-label="Edit ${escapeHtml(title)}" title="Edit item">&#9998;</button>
            ${dragHandleHtml("list-item", entry.item.id, title)}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function getResolvedListEntries(list) {
  return (list.entries || []).map((entry, index) => {
    const item = state.itemsById.get(entry.itemId);
    return item ? { ...entry, item, manualIndex: index } : null;
  }).filter(Boolean);
}

function cleanupListEntries() {
  let changed = false;
  state.lists = state.lists.filter((list) => {
    let listChanged = false;
    const original = list.entries || [];
    const seen = new Set();
    const cleaned = [];

    original.forEach((entry) => {
      const itemId = entry?.itemId ? String(entry.itemId) : "";
      if (!itemId) {
        listChanged = true;
        return;
      }
      const itemExists = state.itemsById.has(itemId);
      if (!itemExists) {
        listChanged = true;
        return;
      }
      if (seen.has(itemId)) {
        listChanged = true;
        return;
      }
      seen.add(itemId);
      if (itemId === entry.itemId) {
        cleaned.push(entry);
      } else {
        listChanged = true;
        cleaned.push({ ...entry, itemId });
      }
    });

    if (listChanged) {
      list.entries = cleaned;
      changed = true;
    }

    if (original.length && !cleaned.length && !list.userCreated) {
      changed = true;
      return false;
    }

    return true;
  });

  if (changed) {
    if (state.activeListId && !state.lists.some((list) => list.id === state.activeListId)) {
      state.activeListId = state.lists[0]?.id || "";
    }
    saveLists();
  }
}

function createListRow(entry, list) {
  const showChecks = false;
  const title = itemDisplayTitle(entry.item);
  const page = entry.page || entry.item.page;
  const book = entry.book || entry.item.book;
  const note = entry.notes || entry.item.notes || "";
  const row = document.createElement("article");
  row.className = `list-row swipe-row ${showChecks ? "" : "no-check"} ${state.listEditMode ? "is-editing" : ""}`;
  row.dataset.id = entry.item.id;

  const checkboxHtml = showChecks
    ? `<input class="quick-check" type="checkbox" data-list-check="${escapeHtml(list.id)}:${entry.manualIndex}" ${entry.checked ? "checked" : ""} aria-label="Mark ${escapeHtml(title)}">`
    : "";
  const editActions = state.listEditMode
    ? `
      <div class="list-edit-actions" aria-label="Manual order">
        <button class="icon-button" type="button" data-move-list="${escapeHtml(list.id)}:${entry.manualIndex}:up" aria-label="Move up">&#8593;</button>
        <button class="icon-button" type="button" data-move-list="${escapeHtml(list.id)}:${entry.manualIndex}:down" aria-label="Move down">&#8595;</button>
        <button class="icon-button remove-button" type="button" data-remove-list="${escapeHtml(list.id)}:${entry.manualIndex}" aria-label="Remove from list">&times;</button>
      </div>
    `
    : "";
  const infoAction = state.listEditMode
    ? `
      <button class="icon-button info-button" type="button" data-detail="${escapeHtml(entry.item.id)}" aria-label="Show info for ${escapeHtml(title)}" title="Info">
        i
      </button>
    `
    : "";

  row.innerHTML = `
    <button class="swipe-delete-action" type="button" data-swipe-remove-list="${escapeHtml(list.id)}:${entry.manualIndex}" aria-label="Remove ${escapeHtml(title)} from this list" title="Remove from list">&#128465;</button>
    <div class="swipe-content list-row-content">
      ${checkboxHtml}
      <button class="quick-main" type="button" data-open="${escapeHtml(entry.item.id)}">
        <div class="quick-line">
          <span class="quick-title">${entry.order ? `<span class="quick-order">${escapeHtml(String(entry.order))}</span>` : ""}${escapeHtml(title)}</span>
          <span class="quick-page">${page ? `p. ${escapeHtml(String(page))}` : ""}</span>
        </div>
        <div class="quick-meta">
          ${book ? escapeHtml(book) : escapeHtml(entry.item.category || "")}
          ${note ? ` &middot; ${escapeHtml(note)}` : ""}
        </div>
      </button>
      ${infoAction}
      ${editActions}
    </div>
  `;
  return row;
}

function renderListEditorPanel(list) {
  el.listEditorPanel.classList.toggle("hidden", !state.listEditMode);
  if (!state.listEditMode) {
    el.listEditorPanel.innerHTML = "";
    return;
  }

  el.listEditorPanel.innerHTML = `
    <div class="editor-grid list-name-editor">
      <label>
        <span>List name</span>
        <input id="listTitleDraft" type="text" value="${escapeHtml(list.title)}" autocomplete="off">
      </label>
      <div class="quick-edit-actions">
        <button class="primary-button compact-action-button" type="button" data-save-list-title="${escapeHtml(list.id)}">Save</button>
        <button class="secondary-button compact-action-button" type="button" data-cancel-list-edit>Cancel</button>
      </div>
    </div>
  `;
}

function renderListPickerPanel(list) {
  el.listPickerPanel.classList.toggle("hidden", !state.listPickerOpen);
  if (!state.listPickerOpen) {
    el.listPickerPanel.innerHTML = "";
    state.listPickerMessage = "";
    return;
  }

  el.listPickerPanel.innerHTML = `
    <div class="picker-heading">
      <strong>Add item to list</strong>
      <button class="icon-button" type="button" data-close-list-picker aria-label="Close add item picker" title="Close">&times;</button>
    </div>
    <div class="editor-grid">
      <label>
        <span>Find item</span>
        <input id="listPickerSearch" type="search" autocomplete="off" placeholder="Title, book, composer, category">
      </label>
      <label>
        <span>Category / Genre</span>
        <input id="listPickerCategory" type="text" autocomplete="off" list="categorySuggestions" placeholder="Any">
      </label>
      <label>
        <span>Page override</span>
        <input id="listPickerPage" type="number" min="1" inputmode="numeric" placeholder="Optional">
      </label>
    </div>
    <p id="listPickerStatus" class="quick-meta">${escapeHtml(state.listPickerMessage || "")}</p>
    <div id="listPickerResults" class="picker-results"></div>
  `;
  updateListPickerOptions(list.id);
}

function updateListPickerOptions(listId = state.activeListId) {
  const results = document.getElementById("listPickerResults");
  if (!results) return;

  const query = document.getElementById("listPickerSearch")?.value || "";
  const category = normalize(document.getElementById("listPickerCategory")?.value || "");
  const items = state.data.items
    .filter(isFileItem)
    .filter((item) => matchesQuery(item, query))
    .filter((item) => !category || normalize(item.category).includes(category))
    .sort(compareTitle)
    .slice(0, 40);

  if (!items.length) {
    results.innerHTML = `<div class="empty-state"><p>No matching items.</p></div>`;
    return;
  }

  results.innerHTML = items.map((item) => {
    const title = itemDisplayTitle(item);
    return `
      <button class="picker-row" type="button" data-add-list="${escapeHtml(listId)}" data-picker-item="${escapeHtml(item.id)}">
        <span class="picker-title">${escapeHtml(title)}</span>
        <small>${escapeHtml(compactMetaText(item))}</small>
        <span class="picker-add">Add</span>
      </button>
    `;
  }).join("");
}

function renderCards() {
  const cards = state.data.items.filter((item) => item.type === "card").sort(compareTitle);
  el.cardsContent.classList.remove("cards-grid");
  renderItemList(el.cardsContent, cards, {
    compact: true,
    compactAction: "edit",
    hideMeta: true,
    emptyTitle: "Turn words into a rehearsal aid",
    emptyMessage: "Add a Card for lyrics, cues, actions, or teaching notes that need to be easy to read."
  });
  updateBatchDeleteControls("cards");
}

function renderCardPreviews() {
  const cards = state.data.items.filter((item) => item.type === "card").sort(compareTitle);
  el.cardsContent.innerHTML = "";
  if (!cards.length) {
    el.cardsContent.appendChild(emptyState());
    return;
  }

  cards.forEach((card) => {
    const title = itemDisplayTitle(card);
    const article = document.createElement("article");
    const deleteAction = itemDeleteActionHtml(card);
    article.className = `song-card-preview${deleteAction ? " swipe-row" : ""}`;
    article.innerHTML = `
      ${deleteAction}
      <div class="swipe-content song-card-preview-content">
        <div class="card-actions">
          <button class="item-open" type="button" data-detail="${escapeHtml(card.id)}">
            <h3>${escapeHtml(title)}</h3>
            ${card.key ? `<p class="quick-meta">Key: ${escapeHtml(card.key)}</p>` : ""}
          </button>
          <button class="icon-button favorite-toggle ${state.favorites.has(card.id) ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(card.id)}" aria-label="Toggle favorite">
            ${state.favorites.has(card.id) ? "ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" : "ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã‚Â "}
          </button>
        </div>
        ${card.imageFileId ? localImageSlotHtml(card) : ""}
        ${cardContentHtml(card, { preview: true })}
      </div>
    `;
    setFavoriteIcons(article);
    hydrateLocalImages(article);
    el.cardsContent.appendChild(article);
  });
}

function renderLinks() {
  const links = state.data.items.filter((item) => item.type === "link").sort(compareTitle);
  renderItemList(el.linksContent, links, {
    compact: true,
    compactAction: "edit",
    emptyTitle: "Keep useful music links close",
    emptyMessage: "Add a link to a song collection, recording, or rehearsal resource."
  });
  updateBatchDeleteControls("links");
}

function renderFavorites() {
  const favoriteRows = getFavoriteRows();
  const favoriteItemCount = favoriteRows.filter((row) => row.kind === "item").length;
  el.favoritesReorderButton.classList.add("hidden");
  el.favoriteDividerAddButton.classList.toggle("hidden", favoriteItemCount < 3);
  if (!favoriteRows.length) {
    el.favoritesContent.classList.remove("compact-index-list");
    el.favoritesContent.classList.remove("favorite-list");
    el.favoritesContent.classList.remove("favorite-reorder-list");
    el.favoritesContent.innerHTML = `<div class="empty-state compact-empty"><h3>Your quickest songs live here</h3><p>Tap a star beside any file, Card, or link to add it to Favorites.</p></div>`;
    return;
  }
  renderFavoriteRows(favoriteRows);
}

function getFavoriteRows() {
  const rows = Array.from(state.favorites).map((id) => {
    if (isFavoriteDividerId(id)) return { kind: "divider", id };
    const item = state.itemsById.get(id);
    return item ? { kind: "item", item } : null;
  }).filter(Boolean);
  return cleanupFavoriteRows(rows);
}

function cleanupFavoriteRows(rows) {
  const cleanedRows = [];
  let changed = false;
  let previousWasDivider = true;

  rows.forEach((row) => {
    if (row.kind === "divider") {
      if (previousWasDivider) {
        changed = true;
        return;
      }
      cleanedRows.push(row);
      previousWasDivider = true;
      return;
    }

    cleanedRows.push(row);
    previousWasDivider = false;
  });

  if (changed) {
    const cleanedIds = cleanedRows.map((row) => row.kind === "divider" ? row.id : row.item.id);
    state.favorites = new Set(cleanedIds);
    writeJson(STORAGE_KEYS.favorites, cleanedIds);
  }

  return cleanedRows;
}

function renderFavoriteRows(rows) {
  el.favoritesContent.innerHTML = "";
  el.favoritesContent.classList.add("compact-index-list", "favorite-list");
  el.favoritesContent.classList.add("favorite-reorder-list");
  rows.forEach((row, index) => {
    if (row.kind === "divider") {
      el.favoritesContent.appendChild(createFavoriteDividerRow(row.id, {
        reorderFavorites: true,
        reorderIndex: index,
        reorderCount: rows.length
      }));
      return;
    }
    el.favoritesContent.appendChild(createItemCard(row.item, {
      compact: true,
      favoriteList: true,
      reorderFavorites: true,
      reorderIndex: index,
      reorderCount: rows.length
    }));
  });
}

function createFavoriteDividerRow(id, options = {}) {
  const article = document.createElement("article");
  article.className = `favorite-divider-row swipe-row${options.reorderFavorites ? " favorite-reorder-row" : ""}`;
  article.dataset.id = id;
  if (options.reorderFavorites) article.dataset.favoriteRow = id;

  const reorderHandle = options.reorderFavorites
    ? dragHandleHtml("favorite", id, "section break")
    : "";

  article.innerHTML = `
    <button class="swipe-delete-action" type="button" data-remove-favorite-divider="${escapeHtml(id)}" aria-label="Delete section break" title="Delete section break">&#128465;</button>
    <div class="swipe-content favorite-divider-content${options.reorderFavorites ? " favorite-divider-editing" : ""}">
      <span class="favorite-divider-line" aria-hidden="true"></span>
      <button class="icon-button section-break-delete-button" type="button" data-remove-favorite-divider="${escapeHtml(id)}" aria-label="Delete section break" title="Delete section break">&#128465;</button>
      ${reorderHandle}
    </div>
  `;
  return article;
}

function toggleFavoriteReorderMode() {
  state.favoriteReorderMode = !state.favoriteReorderMode;
  closeSwipeRows();
  renderFavorites();
}

function updateReorderToggle(button, isActive, itemName) {
  if (!button) return;
  button.textContent = isActive ? "\u2713 Done" : "\u2195 Rearrange";
  button.setAttribute("aria-label", isActive ? `Finish rearranging ${itemName}` : `Rearrange ${itemName}`);
  button.title = isActive ? `Finish rearranging ${itemName}` : `Rearrange ${itemName}`;
}

function renderSearch() {
  const query = el.globalSearch.value.trim();
  el.searchContent.innerHTML = "";

  if (!query) {
    const recentItems = getRecentItems();
    if (recentItems.length) {
      recentItems.forEach((item) => el.searchContent.appendChild(createItemCard(item)));
    } else {
      el.searchContent.innerHTML = `<div class="empty-state"><p>Type a search term to find songs, cards, notes, pages, and tags.</p></div>`;
    }
    return;
  }

  renderItemList(el.searchContent, filterItems(state.data.items, query).sort(compareTitle));
}

async function handleBodyClick(event) {
  if (state.swipe.suppressClick) {
    state.swipe.suppressClick = false;
    event.preventDefault();
    return;
  }

  const cardExitButton = event.target.closest("[data-exit-card]");
  if (cardExitButton) {
    returnFromCardDetail();
    return;
  }

  const cardReadingButton = event.target.closest("[data-card-reading-size]");
  if (cardReadingButton) {
    changeCardReadingSize(cardReadingButton.dataset.cardReadingSize);
    return;
  }

  if (!event.target.closest(".overflow-wrap")) {
    closeOverflowMenu();
    closeInfoMenu();
    closeListMoreMenu();
  }

  const menuSectionButton = event.target.closest("[data-menu-section]");
  if (menuSectionButton) {
    closeInfoMenu();
    showSection(menuSectionButton.dataset.menuSection);
    return;
  }

  const refreshAppButton = event.target.closest("[data-refresh-app]");
  if (refreshAppButton) {
    await refreshAppShell();
    return;
  }

  const helpButton = event.target.closest("[data-open-help]");
  if (helpButton) {
    openHelpModal();
    return;
  }

  const aboutButton = event.target.closest("[data-open-about]");
  if (aboutButton) {
    openAboutModal();
    return;
  }

  const menuMessageButton = event.target.closest("[data-menu-message]");
  if (menuMessageButton) {
    window.alert(menuMessageButton.dataset.menuMessage);
    closeOverflowMenu();
    return;
  }

  const swipeDeleteButton = event.target.closest("[data-swipe-delete-item]");
  if (swipeDeleteButton) {
    await confirmAndDeleteItem(swipeDeleteButton.dataset.swipeDeleteItem);
    return;
  }

  const swipeRemoveListButton = event.target.closest("[data-swipe-remove-list]");
  if (swipeRemoveListButton) {
    confirmAndRemoveListItem(swipeRemoveListButton.dataset.swipeRemoveList);
    return;
  }

  const removeFavoriteDividerButton = event.target.closest("[data-remove-favorite-divider]");
  if (removeFavoriteDividerButton) {
    removeFavoriteDivider(removeFavoriteDividerButton.dataset.removeFavoriteDivider);
    return;
  }

  if (!event.target.closest(".swipe-row.swipe-open")) {
    closeSwipeRows();
  }

  const editButton = event.target.closest("[data-edit-item]");
  if (editButton) {
    const editContext = editButton.dataset.editContext || (editButton.closest("#listsSection") ? "lists" : "library");
    if (editButton.closest("#listEditModal")) {
      saveCurrentModalListTitle();
      closeListEditModal();
    }
    openImportModal(editButton.dataset.editItem, "pdf", editContext);
    return;
  }

  const deleteItemButton = event.target.closest("[data-delete-item]");
  if (deleteItemButton) {
    await confirmAndDeleteItem(deleteItemButton.dataset.deleteItem);
    return;
  }

  const batchToggleButton = event.target.closest("[data-batch-toggle]");
  if (batchToggleButton) {
    toggleBatchDeleteSelection(batchToggleButton.dataset.batchToggle, batchToggleButton.dataset.batchItem);
    return;
  }

  const addListButton = event.target.closest("[data-add-list]");
  if (addListButton) {
    addItemToList(
      addListButton.dataset.addList,
      addListButton.dataset.pickerItem,
      document.getElementById("listPickerPage")?.value
    );
    return;
  }

  const moveListModalButton = event.target.closest("[data-list-modal-move]");
  if (moveListModalButton) {
    moveListItemFromModal(moveListModalButton.dataset.listModalMove);
    return;
  }

  const listEditViewButton = event.target.closest("[data-list-edit-view]");
  if (listEditViewButton) {
    setListEditView(listEditViewButton.dataset.listEditView);
    return;
  }

  const addListModalButton = event.target.closest("[data-list-modal-add]");
  if (addListModalButton) {
    toggleListItemFromModal(addListModalButton.dataset.listModalAdd, true);
    return;
  }

  const removeListModalButton = event.target.closest("[data-list-modal-remove]");
  if (removeListModalButton) {
    saveCurrentModalListTitle();
    removeListItem(removeListModalButton.dataset.listModalRemove);
    renderListEditModal();
    return;
  }

  const selectListButton = event.target.closest("[data-select-list]");
  if (selectListButton) {
    selectList(selectListButton.dataset.selectList);
    return;
  }

  const editListRowButton = event.target.closest("[data-edit-list-row]");
  if (editListRowButton) {
    editListFromRow(editListRowButton.dataset.editListRow);
    return;
  }

  const closeListPickerButton = event.target.closest("[data-close-list-picker]");
  if (closeListPickerButton) {
    state.listPickerOpen = false;
    state.listPickerMessage = "";
    renderLists();
    return;
  }

  const newListButton = event.target.closest("[data-new-list]");
  if (newListButton) {
    createList();
    closeListMoreMenu();
    return;
  }

  const deleteActiveListButton = event.target.closest("[data-delete-active-list]");
  if (deleteActiveListButton) {
    const active = getActiveList();
    if (active) deleteList(active.id);
    closeListMoreMenu();
    return;
  }

  const deleteListButton = event.target.closest("[data-delete-list]");
  if (deleteListButton) {
    deleteList(deleteListButton.dataset.deleteList);
    closeListMoreMenu();
    return;
  }

  const saveListTitleButton = event.target.closest("[data-save-list-title]");
  if (saveListTitleButton) {
    saveListTitleFromEditor(saveListTitleButton.dataset.saveListTitle);
    return;
  }

  const cancelListEditButton = event.target.closest("[data-cancel-list-edit]");
  if (cancelListEditButton) {
    state.listEditMode = false;
    renderLists();
    return;
  }

  const removeListButton = event.target.closest("[data-remove-list]");
  if (removeListButton) {
    removeListItem(removeListButton.dataset.removeList);
    return;
  }

  const favoriteOrderButton = event.target.closest("[data-favorite-order-move]");
  if (favoriteOrderButton) {
    moveFavoriteOrderStep(favoriteOrderButton.dataset.favoriteOrderMove, favoriteOrderButton.dataset.orderDirection);
    return;
  }

  const listOrderButton = event.target.closest("[data-list-order-move]");
  if (listOrderButton) {
    moveListOrderStep(listOrderButton.dataset.listOrderMove, listOrderButton.dataset.orderDirection);
    return;
  }

  const moveListButton = event.target.closest("[data-move-list]");
  if (moveListButton) {
    moveListItem(moveListButton.dataset.moveList);
    return;
  }

  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const playListButton = event.target.closest("[data-play-pdf-list]");
  if (playListButton) {
    togglePdfListArming(playListButton.dataset.playPdfList);
    return;
  }

  const openButton = event.target.closest("[data-open]");
  if (openButton) {
    const listItems = openButton.closest("[data-list-items]");
    const listId = listItems?.dataset.listItems || "";
    const startInPlaylist = Boolean(listId && state.armedPdfListId === listId);
    if (startInPlaylist) {
      state.armedPdfListId = "";
      renderLists();
    }
    openItem(openButton.dataset.open, { listId, followEnabled: startInPlaylist });
    return;
  }

  const detailButton = event.target.closest("[data-detail]");
  if (detailButton) {
    openDetail(detailButton.dataset.detail);
    return;
  }

}

function handleFavoriteDragPointerDown(event) {
  const handle = event.target.closest("[data-favorite-drag]");
  if (!handle) return;

  const row = handle.closest("[data-favorite-row]");
  const container = row?.parentElement;
  if (!row || !container) return;

  event.preventDefault();
  closeSwipeRows();
  state.favoriteDrag = {
    row,
    container,
    pointerId: event.pointerId,
    startY: event.clientY,
    moved: false
  };
  row.classList.add("is-dragging");
  container.classList.add("favorites-reorder-active");
  handle.setPointerCapture?.(event.pointerId);
}

function handleFavoriteDragPointerMove(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;

  const deltaY = event.clientY - drag.startY;
  if (Math.abs(deltaY) > 4) drag.moved = true;
  event.preventDefault();

  const rows = Array.from(drag.container.querySelectorAll("[data-favorite-row]"))
    .filter((row) => row !== drag.row);
  const beforeRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2;
  });

  markDragDestination(drag.container, beforeRow || rows[rows.length - 1]);

  if (beforeRow) {
    drag.container.insertBefore(drag.row, beforeRow);
  } else {
    drag.container.appendChild(drag.row);
  }
}

function handleFavoriteDragPointerUp(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishFavoriteDrag(true);
}

function handleFavoriteDragPointerCancel(event) {
  const drag = state.favoriteDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishFavoriteDrag(false);
}

function finishFavoriteDrag(saveOrder) {
  const drag = state.favoriteDrag;
  if (!drag.row || !drag.container) return;

  const orderedIds = Array.from(drag.container.querySelectorAll("[data-favorite-row]"))
    .map((row) => row.dataset.favoriteRow)
    .filter(Boolean);

  drag.row.classList.remove("is-dragging");
  drag.container.classList.remove("favorites-reorder-active");
  clearDragDestination(drag.container);

  const shouldSave = saveOrder && drag.moved;
  state.favoriteDrag = {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  };

  if (shouldSave) {
    saveFavoriteOrder(orderedIds);
    state.swipe.suppressClick = true;
    window.setTimeout(() => {
      state.swipe.suppressClick = false;
    }, 250);
  } else if (!saveOrder) {
    renderFavorites();
  }
}

function handleListDragPointerDown(event) {
  const handle = event.target.closest("[data-list-drag]");
  if (!handle) return;

  const row = handle.closest("[data-list-row]");
  const container = row?.parentElement;
  if (!row || !container) return;

  event.preventDefault();
  closeSwipeRows();
  state.listDrag = {
    row,
    container,
    pointerId: event.pointerId,
    startY: event.clientY,
    moved: false
  };
  row.classList.add("is-dragging");
  container.classList.add("list-reorder-active");
  handle.setPointerCapture?.(event.pointerId);
}

function handleListItemDragPointerDown(event) {
  const handle = event.target.closest("[data-list-item-drag]");
  if (!handle) return;
  const row = handle.closest("[data-list-item-row]");
  const container = row?.parentElement;
  if (!row || !container) return;

  event.preventDefault();
  closeSwipeRows();
  state.listItemDrag = {
    row,
    container,
    pointerId: event.pointerId,
    startY: event.clientY,
    moved: false,
    listId: container.dataset.listItems || ""
  };
  row.classList.add("is-dragging");
  handle.setPointerCapture?.(event.pointerId);
}

function handleListItemDragPointerMove(event) {
  const drag = state.listItemDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
  event.preventDefault();

  const rows = Array.from(drag.container.querySelectorAll("[data-list-item-row]"))
    .filter((row) => row !== drag.row);
  const beforeRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2;
  });
  markDragDestination(drag.container, beforeRow || rows[rows.length - 1]);
  if (beforeRow) drag.container.insertBefore(drag.row, beforeRow);
  else drag.container.appendChild(drag.row);
}

function handleListItemDragPointerUp(event) {
  if (!state.listItemDrag.row || event.pointerId !== state.listItemDrag.pointerId) return;
  finishListItemDrag(true);
}

function handleListItemDragPointerCancel(event) {
  if (!state.listItemDrag.row || event.pointerId !== state.listItemDrag.pointerId) return;
  finishListItemDrag(false);
}

function finishListItemDrag(saveOrder) {
  const drag = state.listItemDrag;
  if (!drag.row || !drag.container) return;
  const orderedIds = Array.from(drag.container.querySelectorAll("[data-list-item-row]"))
    .map((row) => row.dataset.listItemRow)
    .filter(Boolean);
  drag.row.classList.remove("is-dragging");
  clearDragDestination(drag.container);
  const shouldSave = saveOrder && drag.moved;
  const listId = drag.listId;
  state.listItemDrag = {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false,
    listId: ""
  };

  if (shouldSave) {
    const list = state.lists.find((candidate) => candidate.id === listId);
    if (list) {
      const entriesById = new Map((list.entries || []).map((entry) => [entry.itemId, entry]));
      list.entries = orderedIds.map((id) => entriesById.get(id)).filter(Boolean);
      saveLists();
      renderLists();
      if (state.editingListId === listId && !el.listEditModal.classList.contains("hidden")) {
        renderListEditModal();
      }
      state.swipe.suppressClick = true;
      window.setTimeout(() => {
        state.swipe.suppressClick = false;
      }, 250);
    }
  } else if (!saveOrder) {
    renderLists();
  }
}

function handleListDragPointerMove(event) {
  const drag = state.listDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;

  const deltaY = event.clientY - drag.startY;
  if (Math.abs(deltaY) > 4) drag.moved = true;
  event.preventDefault();

  const rows = Array.from(drag.container.querySelectorAll("[data-list-row]"))
    .filter((row) => row !== drag.row);
  const beforeRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2;
  });
  markDragDestination(drag.container, beforeRow || rows[rows.length - 1]);

  if (beforeRow) {
    drag.container.insertBefore(drag.row, beforeRow);
  } else {
    drag.container.appendChild(drag.row);
  }
}

function handleListDragPointerUp(event) {
  const drag = state.listDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishListDrag(true);
}

function handleListDragPointerCancel(event) {
  const drag = state.listDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  finishListDrag(false);
}

function finishListDrag(saveOrder) {
  const drag = state.listDrag;
  if (!drag.row || !drag.container) return;

  const orderedIds = Array.from(drag.container.querySelectorAll("[data-list-row]"))
    .map((row) => row.dataset.listRow)
    .filter(Boolean);

  drag.row.classList.remove("is-dragging");
  drag.container.classList.remove("list-reorder-active");
  clearDragDestination(drag.container);

  const shouldSave = saveOrder && drag.moved;
  state.listDrag = {
    row: null,
    container: null,
    pointerId: null,
    startY: 0,
    moved: false
  };

  if (shouldSave) {
    saveListOrder(orderedIds);
    state.swipe.suppressClick = true;
    window.setTimeout(() => {
      state.swipe.suppressClick = false;
    }, 250);
  } else if (!saveOrder) {
    renderLists();
  }
}

function markDragDestination(container, row) {
  clearDragDestination(container);
  if (row) row.classList.add("drag-destination");
}

function clearDragDestination(container) {
  container?.querySelectorAll(".drag-destination").forEach((row) => row.classList.remove("drag-destination"));
}

function handleSwipePointerDown(event) {
  if (event.pointerType && event.pointerType !== "touch" && event.pointerType !== "pen") return;
  if (event.target.closest(".swipe-delete-action, .drag-handle, .reorder-step-controls, input, textarea, select")) return;

  const row = event.target.closest(".swipe-row");
  if (!row) return;

  state.swipe.row = row;
  state.swipe.startX = event.clientX;
  state.swipe.startY = event.clientY;
  state.swipe.wasSwipe = false;
}

function handleSwipePointerMove(event) {
  const row = state.swipe.row;
  if (!row) return;

  const dx = event.clientX - state.swipe.startX;
  const dy = event.clientY - state.swipe.startY;
  const horizontal = Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.2;
  if (!horizontal) return;

  state.swipe.wasSwipe = true;
  event.preventDefault();

  if (dx < -42) {
    closeSwipeRows(row);
    row.classList.add("swipe-open");
  } else if (dx > 28) {
    row.classList.remove("swipe-open");
  }
}

function handleSwipePointerUp() {
  if (state.swipe.wasSwipe) {
    state.swipe.suppressClick = true;
    window.setTimeout(() => {
      state.swipe.suppressClick = false;
    }, 350);
  }

  state.swipe.row = null;
  state.swipe.startX = 0;
  state.swipe.startY = 0;
  state.swipe.wasSwipe = false;
}

function closeSwipeRows(exceptRow = null) {
  document.querySelectorAll(".swipe-row.swipe-open").forEach((row) => {
    if (row !== exceptRow) row.classList.remove("swipe-open");
  });
}

function handleBodyChange(event) {
  const batchSelect = event.target.closest("[data-batch-select]");
  if (batchSelect) {
    setBatchDeleteSelection(batchSelect.dataset.batchSelect, batchSelect.value, batchSelect.checked);
    return;
  }

  const listModalCheckbox = event.target.closest("[data-list-modal-check]");
  if (listModalCheckbox) {
    toggleListItemFromModal(listModalCheckbox.dataset.listModalCheck, listModalCheckbox.checked);
    return;
  }

  const listTitleInput = event.target.closest("[data-list-title]");
  if (listTitleInput) {
    updateListTitle(listTitleInput.dataset.listTitle, listTitleInput.value);
    return;
  }

  const listCheck = event.target.closest("[data-list-check]");
  if (listCheck) {
    const [listId, indexText] = listCheck.dataset.listCheck.split(":");
    const list = state.lists.find((candidate) => candidate.id === listId);
    const index = Number(indexText);
    if (list?.entries?.[index]) {
      list.entries[index].checked = listCheck.checked;
      saveLists();
    }
  }
}

function handleBodyInput(event) {
  if (event.target.closest("#listPickerSearch") || event.target.closest("#listPickerCategory")) {
    updateListPickerOptions();
    return;
  }

  if (event.target.closest("#listEditSearch")) {
    renderListEditResults();
    return;
  }

  const listTitleInput = event.target.closest("[data-list-title]");
  if (listTitleInput) {
    updateListTitle(listTitleInput.dataset.listTitle, listTitleInput.value);
  }
}

function openItem(id, options = {}) {
  const item = state.itemsById.get(id);
  if (!item) return;
  const sourceSection = state.activeSection;
  const sourceScrollY = window.scrollY;
  rememberOpened(item);

  if (item.type === "image") {
    return `
      <article class="detail-card compact-detail-card image-detail-card">
        ${localImageSlotHtml(item)}
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        ${compactHeader}
      </article>
    `;
  }

  if (item.type === "pdf") {
    state.previousSection = sourceSection;
    state.previousScrollY = sourceScrollY;
    openPdf(item, {
      listId: options.listId || "",
      followEnabled: Boolean(options.followEnabled)
    });
  } else if (item.type === "link") {
    openLinkItem(item);
  } else {
    openDetail(id);
  }
}

function openDetail(id) {
  const item = state.itemsById.get(id);
  if (!item) return;
  rememberOpened(item);

  state.previousSection = state.activeSection;
  state.previousScrollY = window.scrollY;
  el.detailContent.innerHTML = detailHtml(item);
  setFavoriteIcons(el.detailContent);
  hydrateLocalImages(el.detailContent);
  showSection("detail");
}

function normalizeCardReadingScale(value) {
  const numeric = Number(value);
  return CARD_READING_SCALES.includes(numeric) ? numeric : 1;
}

function changeCardReadingSize(action) {
  const currentIndex = Math.max(0, CARD_READING_SCALES.indexOf(state.cardReadingScale));
  const nextIndex = action === "reset"
    ? CARD_READING_SCALES.indexOf(1)
    : clamp(currentIndex + (action === "increase" ? 1 : -1), 0, CARD_READING_SCALES.length - 1);
  state.cardReadingScale = CARD_READING_SCALES[nextIndex];
  const settings = readJson(STORAGE_KEYS.settings, {});
  writeJson(STORAGE_KEYS.settings, { ...settings, cardReadingScale: state.cardReadingScale });
  const card = document.querySelector(".card-detail-card");
  if (card) card.dataset.cardReadingLevel = String(CARD_READING_SCALES.indexOf(state.cardReadingScale));
}

function detailHtml(item) {
  const title = itemDisplayTitle(item);
  const favorite = state.favorites.has(item.id);
  const editAction = `<button class="secondary-button" type="button" data-edit-item="${escapeHtml(item.id)}">Edit</button>`;
  const deleteAction = isDeletableItem(item.id)
    ? `<button class="icon-button danger-icon" type="button" data-delete-item="${escapeHtml(item.id)}" aria-label="Delete" title="Delete">&#128465;</button>`
    : "";
  const favoriteAction = `
    <button class="icon-button favorite-toggle ${favorite ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(item.id)}" aria-label="Toggle favorite">
      ${favorite ? "&#9733;" : "&#9734;"}
    </button>
  `;
  const cardExitAction = `
    <button class="icon-button card-exit-button" type="button" data-exit-card aria-label="Exit card and return" title="Return">
      &#8592;
    </button>
  `;
  const cardReadingControls = `
    <div class="card-reading-controls" role="group" aria-label="Lyric text size">
      <button type="button" data-card-reading-size="decrease" aria-label="Reduce lyric text" title="Reduce lyric text">A&minus;</button>
      <button type="button" data-card-reading-size="reset" aria-label="Reset lyric text size" title="Reset lyric text size">A</button>
      <button type="button" data-card-reading-size="increase" aria-label="Enlarge lyric text" title="Enlarge lyric text">A+</button>
    </div>
  `;
  const compactHeader = `
    <div class="compact-detail-header">
      <span id="detailTitle" class="compact-detail-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
      <span class="type-pill compact-type">${escapeHtml(item.type)}</span>
      ${favoriteAction}
      ${deleteAction}
      ${editAction}
    </div>
    <div class="compact-detail-meta">
      ${metaHtml(item)}
      ${tagsHtml(item.tags)}
    </div>
  `;

  if (item.type === "card") {
    const visibleTitle = title && title !== "Untitled Song Card" && title !== "Untitled Card";
    const cardTitle = visibleTitle
      ? `<span id="detailTitle" class="compact-detail-title">${escapeHtml(title)}</span>`
      : `<span id="detailTitle" class="sr-only">Card</span>`;
    const lyricHeading = item.lyricsCard && visibleTitle
      ? `<h2 id="detailTitle" class="lyrics-card-title">${escapeHtml(title)}</h2>`
      : "";
    return `
      <article class="detail-card card-detail-card${item.lyricsCard ? " lyrics-card-detail" : ""}" data-card-reading-level="${CARD_READING_SCALES.indexOf(state.cardReadingScale)}">
        <div class="detail-actions card-detail-actions">
          ${cardExitAction}
          ${item.lyricsCard ? `<span class="card-toolbar-spacer" aria-hidden="true"></span>` : cardTitle}
          ${item.lyricsCard ? cardReadingControls : ""}
          ${favoriteAction}
          ${deleteAction}
          ${editAction}
        </div>
        ${lyricHeading}
        ${item.imageFileId ? localImageSlotHtml(item) : ""}
        ${cardContentHtml(item)}
        ${cardFactsHtml(item)}
        ${item.notes ? `<p class="item-notes">${escapeHtml(item.notes)}</p>` : ""}
        <div class="card-detail-footer-actions">
          ${cardExitAction}
        </div>
      </article>
    `;
  }

  if (item.type === "note") {
    return `
      <article class="detail-card compact-detail-card">
        ${compactHeader}
        <div class="note-body">${escapeHtml(item.body || item.notes || "")}</div>
      </article>
    `;
  }

  if (item.type === "link") {
    return `
      <article class="detail-card compact-detail-card">
        <div class="detail-actions detail-primary-actions">
          <a class="primary-button" href="${escapeHtml(item.url || "#")}" target="_blank" rel="noopener">Open Link</a>
        </div>
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        <p class="quick-meta compact-url">${escapeHtml(item.url || "")}</p>
        ${compactHeader}
      </article>
    `;
  }

  if (item.type === "pdf") {
    return `
      <article class="detail-card compact-detail-card">
        <div class="detail-actions detail-primary-actions">
          <button class="primary-button" type="button" data-open="${escapeHtml(item.id)}">Open PDF</button>
        </div>
        ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
        ${compactHeader}
      </article>
    `;
  }

  return `
    <article class="detail-card compact-detail-card">
      ${item.notes ? `<p class="note-body">${escapeHtml(item.notes)}</p>` : ""}
      ${compactHeader}
    </article>
  `;
}

function returnFromCardDetail() {
  const targetSection = state.previousSection || "cards";
  el.detailContent.innerHTML = "";
  showSection(targetSection);
  window.requestAnimationFrame(() => window.scrollTo(0, state.previousScrollY || 0));
}

function cardFactsHtml(item) {
  const facts = [
    item.key ? `Key: ${item.key}` : "",
    item.capo ? `Capo: ${item.capo}` : "",
    item.startingNote ? `Starting note: ${item.startingNote}` : ""
  ].filter(Boolean);
  return facts.length ? `<p class="quick-meta">${escapeHtml(facts.join(" ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· "))}</p>` : "";
}

function cardContentHtml(item, options = {}) {
  if (item.lyricsCard && item.lyricsText) {
    const lines = String(item.lyricsText).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const html = lines.map((line) => {
      const verse = line.match(/^(\d+\.)\s+(.*)$/);
      if (verse) return `<p class="lyrics-verse">${escapeHtml(verse[1])} ${escapeHtml(verse[2])}</p>`;
      if (/^chorus:?$/i.test(line)) return `<p class="lyrics-chorus-label"><strong>${escapeHtml(line)}</strong></p>`;
      return line ? `<div>${escapeHtml(line)}</div>` : "<div><br></div>";
    }).join("");
    return `<div class="lyrics-card-content${options.preview ? " lyrics-card-preview" : ""}">${html}</div>`;
  }

  if (item.cardHtml) {
    return `<div class="rich-card-content${item.lyricsCard ? " lyrics-card-content" : ""}${options.preview ? " rich-card-preview" : ""}">${sanitizeCardHtml(item.cardHtml)}</div>`;
  }
  const lines = options.preview ? (item.content || []).slice(0, 10) : (item.content || []);
  return lines.length ? `<pre class="chord-sheet">${escapeHtml(lines.join("\n"))}</pre>` : "";
}

function localImageSlotHtml(item) {
  const fileId = item.imageFileId || item.fileId;
  return `
    <div class="song-card-image" data-image-file-id="${escapeHtml(fileId)}" data-image-alt="${escapeHtml(itemDisplayTitle(item))} image">
      <p class="quick-meta">Loading image...</p>
    </div>
  `;
}

async function openPdf(item, options = {}) {
  const {
    listId = "",
    followEnabled = false,
    initialPage = "first",
    preserveSequence = false
  } = options;
  if (!preserveSequence) {
    const validSequenceListId = getPdfSequence(listId).some((entry) => entry.id === item.id) ? listId : "";
    state.currentPdf.sequenceListId = followEnabled ? validSequenceListId : "";
    state.currentPdf.sequenceSourceListId = validSequenceListId;
  }
  updatePdfSequenceControls();
  state.currentPdf.sequenceTransitioning = preserveSequence;
  releasePdfObjectUrl();
  state.currentPdf.item = item;
  state.currentPdf.doc = null;
  state.currentPdf.objectUrl = null;
  state.currentPdf.pageNumber = 1;
  state.currentPdf.pageCount = 0;
  resetPdfZoom();
  el.pdfTitle.textContent = itemDisplayTitle(item);
  el.pdfPageStatus.textContent = preserveSequence ? "Loading next song…" : "Loading";
  if (preserveSequence) {
    el.pdfLoading.classList.add("hidden");
  } else {
    el.pdfCanvas.classList.add("hidden");
    showPdfMessage("Loading PDF...");
  }
  document.body.classList.add("pdf-open");
  el.pdfViewer.classList.remove("hidden");
  if (!preserveSequence) showPdfTipsOnOpen();

  if (!window.pdfjsLib) {
    showPdfMessage("PDF.js could not be loaded. Check your internet connection or download PDF.js for local use.");
    return;
  }

  try {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const pdfSource = await getPdfSource(item);
    const loadingTask = window.pdfjsLib.getDocument(pdfSource);
    state.currentPdf.doc = await loadingTask.promise;
    state.currentPdf.pageCount = state.currentPdf.doc.numPages;
    state.currentPdf.pageNumber = initialPage === "last" ? state.currentPdf.pageCount : 1;
    state.currentPdf.pageNumber = clamp(state.currentPdf.pageNumber, 1, state.currentPdf.pageCount);
    resetPdfZoom();
    await renderPdfPage(state.currentPdf.pageNumber);
    savePdfPage();
    rememberOpened(item, state.currentPdf.pageNumber);
  } catch (error) {
    const message = item.fileId
      ? "This imported PDF was not found in local browser storage. Try importing it again from this device."
      : getBundledPdfErrorMessage();
    showPdfMessage(message);
    el.pdfPageStatus.textContent = "PDF unavailable";
  } finally {
    state.currentPdf.sequenceTransitioning = false;
  }
}

function getBundledPdfErrorMessage() {
  if (window.location.protocol === "file:") {
    return "This PDF could not be opened from a file folder. Start the local web server or use the GitHub Pages link so PDF.js can read the PDF files.";
  }

  return "This PDF file was not found. Check that the PDF is in the music folder and that the filename matches library.json exactly.";
}

function openLinkItem(item) {
  if (!item.url) {
    openDetail(item.id);
    return;
  }
  if (!navigator.onLine) {
    window.alert("This link requires internet access.");
    return;
  }
  const opened = window.open(item.url, "_blank", "noopener");
  if (!opened) {
    window.location.href = item.url;
  }
}

async function getPdfSource(item) {
  if (item.fileId) {
    const file = await getPdfFile(item.fileId);
    if (!file) {
      throw new Error("Imported PDF missing");
    }
    state.currentPdf.objectUrl = URL.createObjectURL(file);
    return state.currentPdf.objectUrl;
  }

  if (!item.file) {
    throw new Error("PDF path missing");
  }
  return item.file.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function releasePdfObjectUrl() {
  if (state.currentPdf.objectUrl) {
    URL.revokeObjectURL(state.currentPdf.objectUrl);
    state.currentPdf.objectUrl = null;
  }
}

async function renderPdfPage(pageNumber) {
  if (!state.currentPdf.doc) return;

  if (state.currentPdf.rendering) {
    state.currentPdf.pendingPage = pageNumber;
    return;
  }

  state.currentPdf.rendering = true;
  const canvas = el.pdfCanvas;
  const hasVisiblePage = !canvas.classList.contains("hidden");
  if (!hasVisiblePage) showPdfMessage("Rendering page...");

  try {
    const page = await state.currentPdf.doc.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const stageBox = el.pdfStage.getBoundingClientRect();
    const maxWidth = Math.max(stageBox.width - 24, 320);
    const maxHeight = Math.max(stageBox.height - 24, 320);
    const fitScale = Math.min(maxWidth / unscaled.width, maxHeight / unscaled.height);
    const viewport = page.getViewport({ scale: fitScale });
    const outputScale = window.devicePixelRatio || 1;
    const renderCanvas = document.createElement("canvas");
    const renderContext = renderCanvas.getContext("2d");
    renderCanvas.width = Math.floor(viewport.width * outputScale);
    renderCanvas.height = Math.floor(viewport.height * outputScale);
    renderContext.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    await page.render({ canvasContext: renderContext, viewport }).promise;

    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const displayContext = canvas.getContext("2d");
    displayContext.setTransform(1, 0, 0, 1, 0, 0);
    displayContext.drawImage(renderCanvas, 0, 0);
    applyPdfTransform();
    state.currentPdf.pageNumber = pageNumber;
    savePdfPage();
    rememberOpened(state.currentPdf.item, pageNumber);
    updatePdfStatus();
    el.pdfCanvas.classList.remove("hidden");
    el.pdfLoading.classList.add("hidden");
  } catch (error) {
    showPdfMessage("This PDF page could not be displayed.");
  } finally {
    state.currentPdf.rendering = false;
    if (state.currentPdf.pendingPage) {
      const pending = state.currentPdf.pendingPage;
      state.currentPdf.pendingPage = null;
      renderPdfPage(pending);
    }
  }
}

function showPdfMessage(message) {
  el.pdfLoading.textContent = message;
  el.pdfLoading.classList.remove("hidden");
}

function updatePdfStatus() {
  const sequence = getCurrentPdfSequencePosition();
  const sequenceStatus = sequence ? ` · Song ${sequence.index + 1} of ${sequence.items.length}` : "";
  el.pdfPageStatus.textContent = `Page ${state.currentPdf.pageNumber} of ${state.currentPdf.pageCount}${sequenceStatus}`;
  updatePdfSequenceControls();
}

function returnFromPdfViewer() {
  const targetSection = state.previousSection || (
    state.activeSection && state.activeSection !== "detail" ? state.activeSection : "lists"
  );
  const returnScrollY = state.previousScrollY || 0;
  closePdfViewer();
  showSection(targetSection);
  window.setTimeout(() => window.scrollTo(0, returnScrollY), 80);
}

function togglePdfTips() {
  const showTips = !el.pdfViewer.classList.contains("show-tips");
  if (showTips) {
    syncPdfTipsPreference();
    setPdfTipsVisible(true, 0, "manual");
  } else {
    dismissPdfTips();
  }
}

function showPdfTipsOnOpen() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  const firstTime = !settings.pdfTipsSeen;
  const showOnOpen = settings.showPdfTipsOnOpen !== false;
  el.pdfTipsShowOnOpen.checked = showOnOpen;
  if (firstTime) {
    setPdfTipsVisible(true, 0, "first");
  } else if (showOnOpen) {
    setPdfTipsVisible(true, PDF_TIPS_REMINDER_MS, "reminder");
  } else {
    setPdfTipsVisible(false);
  }
}

function syncPdfTipsPreference() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  el.pdfTipsShowOnOpen.checked = settings.showPdfTipsOnOpen !== false;
}

function savePdfTipsPreference() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  writeJson(STORAGE_KEYS.settings, {
    ...settings,
    showPdfTipsOnOpen: el.pdfTipsShowOnOpen.checked
  });
}

function handlePdfZoneTipsClick(event) {
  if (event.target.closest(".pdf-tips-preference")) return;
  dismissPdfTips();
}

function dismissPdfTips() {
  if (state.currentPdf.tipsMode === "first") {
    const settings = readJson(STORAGE_KEYS.settings, {});
    writeJson(STORAGE_KEYS.settings, { ...settings, pdfTipsSeen: true });
  }
  setPdfTipsVisible(false);
}

function setPdfTipsVisible(showTips, duration = 0, mode = "") {
  window.clearTimeout(state.currentPdf.tipsTimer);
  state.currentPdf.tipsTimer = null;
  state.currentPdf.tipsMode = showTips ? mode : "";
  el.pdfViewer.classList.toggle("show-tips", showTips);
  el.pdfZoneTips.dataset.guideMode = showTips ? mode : "";
  el.pdfZoneTips.setAttribute("aria-hidden", showTips ? "false" : "true");
  el.pdfTipsButton.setAttribute("aria-pressed", showTips ? "true" : "false");
  if (showTips && duration > 0) {
    state.currentPdf.tipsTimer = window.setTimeout(() => {
      setPdfTipsVisible(false);
    }, duration);
  }
}

function hidePdfTips() {
  if (!el.pdfViewer || !el.pdfTipsButton) return;
  setPdfTipsVisible(false);
}

function previousPdfPage() {
  if (!state.currentPdf.doc || state.currentPdf.sequenceTransitioning) return;
  if (state.currentPdf.pageNumber <= 1) {
    moveToAdjacentPdfInList(-1);
    return;
  }
  goToPdfPage(state.currentPdf.pageNumber - 1);
}

function nextPdfPage() {
  if (!state.currentPdf.doc || state.currentPdf.sequenceTransitioning) return;
  if (state.currentPdf.pageNumber >= state.currentPdf.pageCount) {
    moveToAdjacentPdfInList(1);
    return;
  }
  goToPdfPage(state.currentPdf.pageNumber + 1);
}

function getPdfSequence(listId) {
  if (!listId) return [];
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return [];
  return getResolvedListEntries(list)
    .map((entry) => entry.item)
    .filter((item) => item.type === "pdf");
}

function togglePdfListArming(listId) {
  const sequence = getPdfSequence(listId);
  if (sequence.length < 2) return;
  state.armedPdfListId = state.armedPdfListId === listId ? "" : listId;
  renderLists();
}

function getCurrentPdfSequencePosition() {
  const items = getPdfSequence(state.currentPdf.sequenceListId);
  const index = items.findIndex((item) => item.id === state.currentPdf.item?.id);
  return index >= 0 ? { items, index } : null;
}

function moveToAdjacentPdfInList(direction) {
  const sequence = getCurrentPdfSequencePosition();
  if (!sequence) return false;
  const targetIndex = sequence.index + direction;
  if (targetIndex < 0 || targetIndex >= sequence.items.length) {
    const edgeLabel = direction < 0 ? "Start of list" : "End of list";
    el.pdfPageStatus.textContent = `Page ${state.currentPdf.pageNumber} of ${state.currentPdf.pageCount} · ${edgeLabel}`;
    return false;
  }

  const targetItem = sequence.items[targetIndex];
  openPdf(targetItem, {
    listId: state.currentPdf.sequenceListId,
    initialPage: direction < 0 ? "last" : "first",
    preserveSequence: true
  });
  return true;
}

function updatePdfSequenceControls() {
  if (!el.pdfFollowButton) return;
  const sourceItems = getPdfSequence(state.currentPdf.sequenceSourceListId);
  const sourceIndex = sourceItems.findIndex((item) => item.id === state.currentPdf.item?.id);
  const hasSourcePosition = sourceIndex >= 0;
  const onLastPage = state.currentPdf.pageCount > 0 && state.currentPdf.pageNumber === state.currentPdf.pageCount;
  const followOn = Boolean(getCurrentPdfSequencePosition());
  el.pdfFollowButton.classList.toggle("hidden", !hasSourcePosition || !onLastPage);
  el.pdfFollowButton.classList.toggle("is-active", followOn);
  el.pdfFollowButton.textContent = `Follow: ${followOn ? "On" : "Off"}`;
  el.pdfFollowButton.setAttribute("aria-pressed", followOn ? "true" : "false");
  el.pdfRestartListButton.classList.toggle(
    "hidden",
    !hasSourcePosition || !onLastPage || sourceIndex !== sourceItems.length - 1
  );
}

function togglePdfFollow() {
  const sourceListId = state.currentPdf.sequenceSourceListId;
  if (!sourceListId) return;
  state.currentPdf.sequenceListId = state.currentPdf.sequenceListId ? "" : sourceListId;
  state.currentPdf.sequenceTransitioning = false;
  updatePdfStatus();
}

function restartPdfList() {
  const sourceListId = state.currentPdf.sequenceSourceListId;
  const sourceItems = getPdfSequence(sourceListId);
  if (!sourceItems.length) return;
  state.currentPdf.sequenceListId = sourceListId;
  openPdf(sourceItems[0], {
    listId: sourceListId,
    initialPage: "first",
    preserveSequence: true
  });
}

function firstPdfPage() {
  goToPdfPage(1);
}

function lastPdfPage() {
  goToPdfPage(state.currentPdf.pageCount);
}

function goToPdfPage(pageNumber) {
  if (!state.currentPdf.doc || !state.currentPdf.pageCount) return;
  const targetPage = clamp(pageNumber, 1, state.currentPdf.pageCount);
  if (targetPage === state.currentPdf.pageNumber && !state.currentPdf.rendering) return;
  resetPdfZoom();
  renderPdfPage(targetPage);
}

function closePdfViewer() {
  hidePdfTips();
  el.pdfViewer.classList.add("hidden");
  document.body.classList.remove("pdf-open");
  resetPdfZoom();
  releasePdfObjectUrl();
  state.currentPdf.doc = null;
  state.currentPdf.item = null;
  state.currentPdf.sequenceListId = "";
  state.currentPdf.sequenceSourceListId = "";
  state.currentPdf.sequenceTransitioning = false;
  updatePdfSequenceControls();
}

function handlePdfTapZoneClick(event, direction) {
  if (state.currentPdf.suppressClick) {
    event.preventDefault();
    state.currentPdf.suppressClick = false;
    return;
  }

  performPdfTapZoneAction(event.clientY, direction);
}

function performPdfTapZoneAction(clientY, direction) {
  const stageBox = el.pdfStage.getBoundingClientRect();
  const tappedTopQuarter = clientY <= stageBox.top + stageBox.height / 4;
  if (tappedTopQuarter) {
    if (direction === "previous") {
      firstPdfPage();
    } else {
      lastPdfPage();
    }
    return;
  }

  if (direction === "previous") {
    previousPdfPage();
  } else {
    nextPdfPage();
  }
}

function handlePdfTouchStart(event) {
  if (event.touches.length === 2) {
    event.preventDefault();
    const center = getTouchCenter(event.touches);
    state.currentPdf.touchMode = "pinch";
    state.currentPdf.touchMoved = true;
    state.currentPdf.touchStartDistance = getTouchDistance(event.touches);
    state.currentPdf.touchStartCenterX = center.x;
    state.currentPdf.touchStartCenterY = center.y;
    state.currentPdf.touchStartZoom = state.currentPdf.zoom;
    state.currentPdf.touchStartPanX = state.currentPdf.panX;
    state.currentPdf.touchStartPanY = state.currentPdf.panY;
    return;
  }

  const touch = event.touches[0];
  state.currentPdf.touchMode = state.currentPdf.zoom > 1.02 ? "pan" : "tap";
  state.currentPdf.touchMoved = false;
  state.currentPdf.touchStartX = touch.clientX;
  state.currentPdf.touchStartY = touch.clientY;
  state.currentPdf.touchStartPanX = state.currentPdf.panX;
  state.currentPdf.touchStartPanY = state.currentPdf.panY;
}

function handlePdfTouchMove(event) {
  if (state.currentPdf.touchMode === "pinch" && event.touches.length >= 2) {
    event.preventDefault();
    const distance = getTouchDistance(event.touches);
    const center = getTouchCenter(event.touches);
    const ratio = distance / Math.max(state.currentPdf.touchStartDistance, 1);
    state.currentPdf.zoom = clamp(state.currentPdf.touchStartZoom * ratio, 1, 4);
    state.currentPdf.panX = state.currentPdf.touchStartPanX + (center.x - state.currentPdf.touchStartCenterX);
    state.currentPdf.panY = state.currentPdf.touchStartPanY + (center.y - state.currentPdf.touchStartCenterY);
    state.currentPdf.touchMoved = true;
    applyPdfTransform();
    return;
  }

  if (state.currentPdf.touchMode === "pan" && event.touches.length === 1) {
    event.preventDefault();
    const touch = event.touches[0];
    const dx = touch.clientX - state.currentPdf.touchStartX;
    const dy = touch.clientY - state.currentPdf.touchStartY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.currentPdf.touchMoved = true;
    state.currentPdf.panX = state.currentPdf.touchStartPanX + dx;
    state.currentPdf.panY = state.currentPdf.touchStartPanY + dy;
    applyPdfTransform();
  }
}

function handlePdfTouchEnd(event) {
  if (state.currentPdf.touchMode === "pinch") {
    event.preventDefault();
    if (event.touches.length >= 2) return;
    suppressNextPdfClick();
    finishPdfGesture();
    return;
  }

  const touch = event.changedTouches[0];
  const dx = touch.clientX - state.currentPdf.touchStartX;
  const dy = touch.clientY - state.currentPdf.touchStartY;
  const moved = state.currentPdf.touchMoved || Math.abs(dx) > 10 || Math.abs(dy) > 10;

  if (state.currentPdf.touchMode === "pan") {
    if (moved) {
      event.preventDefault();
      suppressNextPdfClick();
    }
    finishPdfGesture();
    return;
  }

  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) {
    event.preventDefault();
    suppressNextPdfClick();
    if (dx < 0) {
      nextPdfPage();
    } else {
      previousPdfPage();
    }
    return;
  }

  if (state.currentPdf.touchMode === "tap" && !moved) {
    const tapZone = event.target.closest(".pdf-tap-zone");
    if (tapZone) {
      event.preventDefault();
      const direction = tapZone === el.pdfTapLeft ? "previous" : "next";
      finishPdfGesture();
      performPdfTapZoneAction(touch.clientY, direction);
      suppressNextPdfClick();
      return;
    }
  }

  finishPdfGesture();
}

function finishPdfGesture() {
  if (state.currentPdf.zoom <= 1.02) {
    resetPdfZoom();
  } else {
    clampPdfPan();
    applyPdfTransform();
  }
  state.currentPdf.touchMode = "";
  state.currentPdf.touchMoved = false;
}

function suppressNextPdfClick() {
  state.currentPdf.suppressClick = true;
  window.setTimeout(() => {
    state.currentPdf.suppressClick = false;
  }, 250);
}

function getTouchDistance(touches) {
  const first = touches[0];
  const second = touches[1];
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
}

function getTouchCenter(touches) {
  const first = touches[0];
  const second = touches[1];
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2
  };
}

function resetPdfZoom() {
  if (!state.currentPdf) return;
  state.currentPdf.zoom = 1;
  state.currentPdf.panX = 0;
  state.currentPdf.panY = 0;
  state.currentPdf.touchMode = "";
  state.currentPdf.touchMoved = false;
  applyPdfTransform();
}

function applyPdfTransform() {
  if (!el.pdfCanvas) return;
  clampPdfPan();
  const { panX, panY, zoom } = state.currentPdf;
  el.pdfCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  el.pdfCanvas.classList.toggle("is-zoomed", zoom > 1.02);
}

function clampPdfPan() {
  if (!el.pdfCanvas || state.currentPdf.zoom <= 1.02) {
    state.currentPdf.panX = 0;
    state.currentPdf.panY = 0;
    return;
  }

  const stageBox = el.pdfStage.getBoundingClientRect();
  const canvasWidth = el.pdfCanvas.offsetWidth || stageBox.width;
  const canvasHeight = el.pdfCanvas.offsetHeight || stageBox.height;
  const scaledWidth = canvasWidth * state.currentPdf.zoom;
  const scaledHeight = canvasHeight * state.currentPdf.zoom;
  const extraX = Math.max((scaledWidth - stageBox.width) / 2 + 48, 0);
  const maxPanY = 48;
  const minPanY = -Math.max(scaledHeight - stageBox.height + 48, 0);

  state.currentPdf.panX = clamp(state.currentPdf.panX, -extraX, extraX);
  state.currentPdf.panY = clamp(state.currentPdf.panY, minPanY, maxPanY);
}

function loadPitchSettings() {
  const saved = readJson(STORAGE_KEYS.pitch, {});
  state.pitch.preset = PITCH_PRESETS[saved.preset] ? saved.preset : "guitar";
  state.pitch.note = getPitchNotes(state.pitch.preset).some((note) => note.label === saved.note)
    ? saved.note
    : PITCH_PRESETS[state.pitch.preset].defaultNote;
}

function savePitchSettings() {
  writeJson(STORAGE_KEYS.pitch, {
    preset: state.pitch.preset,
    note: state.pitch.note
  });
}

function renderPitch() {
  if (!el.pitchPreset) return;
  const notes = getPitchNotes(state.pitch.preset);
  el.pitchPreset.value = state.pitch.preset;
  el.pitchNote.innerHTML = "";
  notes.forEach((note) => {
    const option = document.createElement("option");
    option.value = note.label;
    option.textContent = note.label;
    el.pitchNote.appendChild(option);
  });
  if (!notes.some((note) => note.label === state.pitch.note)) {
    state.pitch.note = PITCH_PRESETS[state.pitch.preset].defaultNote;
  }
  el.pitchNote.value = state.pitch.note;
  const selected = getSelectedPitchNote();
  el.pitchNoteName.textContent = selected.label;
  el.pitchFrequency.textContent = `${selected.frequency.toFixed(1)} Hz`;
  el.pitchStatus.textContent = state.pitch.playing ? "Playing" : "Ready";
  el.pitchPlayButton.textContent = state.pitch.playing ? "Change pitch" : "Play pitch";
  renderPitchQuickButtons(notes);
}

function renderPitchQuickButtons(notes) {
  if (!el.pitchQuickButtons) return;
  el.pitchQuickButtons.innerHTML = "";
  const preset = PITCH_PRESETS[state.pitch.preset];
  const quickNotes = preset.notes ? notes : notes.filter((note) => ["C", "D", "E", "F", "G", "A", "B"].includes(note.label.replace(/\d+$/, "")));
  quickNotes.slice(0, 18).forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pitch-note-button";
    button.dataset.pitchNote = note.label;
    button.textContent = note.label;
    button.classList.toggle("active", note.label === state.pitch.note);
    el.pitchQuickButtons.appendChild(button);
  });
}

function getPitchNotes(presetKey) {
  const preset = PITCH_PRESETS[presetKey] || PITCH_PRESETS.chromatic;
  if (preset.notes) return preset.notes.map((note) => ({ ...note }));
  const notes = [];
  for (let midi = preset.midiStart; midi <= preset.midiEnd; midi += 1) {
    notes.push(pitchNoteFromMidi(midi));
  }
  return notes;
}

function pitchNoteFromMidi(midi) {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return {
    label: `${TUNER_NOTE_NAMES[noteIndex]}${octave}`,
    frequency: 440 * Math.pow(2, (midi - 69) / 12)
  };
}

function getSelectedPitchNote() {
  return getPitchNotes(state.pitch.preset).find((note) => note.label === state.pitch.note) || pitchNoteFromMidi(69);
}

function setPitchPreset(value) {
  const nextPreset = PITCH_PRESETS[value] ? value : "chromatic";
  const nextNotes = getPitchNotes(nextPreset);
  state.pitch.preset = nextPreset;
  if (!nextNotes.some((note) => note.label === state.pitch.note)) {
    state.pitch.note = PITCH_PRESETS[nextPreset].defaultNote;
  }
  savePitchSettings();
  if (state.pitch.playing) {
    playPitch();
  } else {
    renderPitch();
  }
}

function setPitchNote(value) {
  const notes = getPitchNotes(state.pitch.preset);
  state.pitch.note = notes.some((note) => note.label === value) ? value : PITCH_PRESETS[state.pitch.preset].defaultNote;
  savePitchSettings();
  if (state.pitch.playing) {
    playPitch();
  } else {
    renderPitch();
  }
}

function handlePitchQuickButtonClick(event) {
  const button = event.target.closest("[data-pitch-note]");
  if (!button) return;
  setPitchNote(button.dataset.pitchNote);
  playPitch();
}

async function playPitch() {
  const note = getSelectedPitchNote();
  const audioContext = await ensurePitchAudio();
  if (!audioContext) return;
  stopPitchTone(false);
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(note.frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.28, audioContext.currentTime + 0.02);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  state.pitch.oscillator = oscillator;
  state.pitch.gain = gain;
  state.pitch.playing = true;
  renderPitch();
}

async function ensurePitchAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    window.alert("This browser cannot play pitch audio.");
    return null;
  }
  if (!state.pitch.audioContext || state.pitch.audioContext.state === "closed") {
    state.pitch.audioContext = new AudioContextCtor();
  }
  if (state.pitch.audioContext.state === "suspended") {
    await state.pitch.audioContext.resume();
  }
  return state.pitch.audioContext;
}

function stopPitch() {
  stopPitchTone(true);
  if (state.pitch.audioContext) {
    state.pitch.audioContext.close?.();
    state.pitch.audioContext = null;
  }
}

function stopPitchTone(shouldRender = true) {
  if (state.pitch.gain && state.pitch.audioContext && state.pitch.audioContext.state !== "closed") {
    const now = state.pitch.audioContext.currentTime;
    try {
      state.pitch.gain.gain.cancelScheduledValues(now);
      state.pitch.gain.gain.setValueAtTime(Math.max(state.pitch.gain.gain.value, 0.0001), now);
      state.pitch.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    } catch (error) { /* Ignore gain ramp errors during shutdown. */ }
  }
  if (state.pitch.oscillator) {
    try { state.pitch.oscillator.stop(state.pitch.audioContext.currentTime + 0.04); } catch (error) { /* Ignore repeated stop calls. */ }
    try { state.pitch.oscillator.disconnect(); } catch (error) { /* Ignore disconnect errors. */ }
  }
  if (state.pitch.gain) {
    try { state.pitch.gain.disconnect(); } catch (error) { /* Ignore disconnect errors. */ }
  }
  state.pitch.oscillator = null;
  state.pitch.gain = null;
  state.pitch.playing = false;
  if (shouldRender) renderPitch();
}
function loadTunerSettings() {
  const saved = readJson(STORAGE_KEYS.tuner, {});
  state.tuner.instrument = TUNER_INSTRUMENTS[saved.instrument] ? saved.instrument : "guitar";
}

function saveTunerSettings() {
  writeJson(STORAGE_KEYS.tuner, { instrument: state.tuner.instrument });
}

function renderTuner() {
  if (!el.tunerInstrument) return;
  el.tunerInstrument.value = state.tuner.instrument;
  el.tunerStatus.textContent = state.tuner.running ? "Listening" : "Microphone off";
  el.tunerNote.parentElement.classList.toggle("is-idle", !state.tuner.running);
  el.tunerStartButton.textContent = state.tuner.running ? "Stop tuner" : "Start tuner";
  renderTunerStrings();
  if (!state.tuner.running) {
    el.tunerNote.textContent = "--";
    el.tunerFrequency.textContent = "Tap Start and play a note";
    el.tunerTarget.textContent = "";
    el.tunerNeedle.style.left = "50%";
  }
}

function renderTunerStrings(activeLabel = "") {
  if (!el.tunerStrings) return;
  const instrument = TUNER_INSTRUMENTS[state.tuner.instrument] || TUNER_INSTRUMENTS.chromatic;
  el.tunerStrings.innerHTML = "";
  if (!instrument.targets.length) {
    el.tunerStrings.classList.add("hidden");
    return;
  }
  el.tunerStrings.classList.remove("hidden");
  instrument.targets.forEach((target) => {
    const chip = document.createElement("span");
    chip.textContent = target.label;
    chip.className = "tuner-string-chip";
    chip.classList.toggle("active", target.label === activeLabel);
    el.tunerStrings.appendChild(chip);
  });
}

function setTunerInstrument(value) {
  state.tuner.instrument = TUNER_INSTRUMENTS[value] ? value : "chromatic";
  saveTunerSettings();
  renderTuner();
}

async function toggleTuner() {
  if (state.tuner.running) {
    stopTuner();
    return;
  }
  await startTuner();
}

async function startTuner() {
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    el.tunerMessage.textContent = "Microphone access needs HTTPS. Use the GitHub Pages link for the tuner.";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    el.tunerMessage.textContent = "This browser does not provide microphone access.";
    return;
  }
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    el.tunerMessage.textContent = "This browser cannot run the tuner audio engine.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") await audioContext.resume();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    state.tuner.stream = stream;
    state.tuner.audioContext = audioContext;
    state.tuner.analyser = analyser;
    state.tuner.source = source;
    state.tuner.buffer = new Float32Array(analyser.fftSize);
    state.tuner.running = true;
    state.tuner.lastAnalysisAt = 0;
    el.tunerMessage.textContent = "Play one steady note near the microphone.";
    renderTuner();
    updateTunerLoop();
  } catch (error) {
    el.tunerMessage.textContent = "Microphone permission was not granted.";
    stopTuner();
  }
}

function stopTuner() {
  if (state.tuner.rafId) {
    cancelAnimationFrame(state.tuner.rafId);
    state.tuner.rafId = null;
  }
  if (state.tuner.source) {
    try { state.tuner.source.disconnect(); } catch (error) { /* Ignore disconnect errors. */ }
  }
  if (state.tuner.stream) {
    state.tuner.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.tuner.audioContext) {
    state.tuner.audioContext.close?.();
  }
  state.tuner.running = false;
  state.tuner.audioContext = null;
  state.tuner.analyser = null;
  state.tuner.source = null;
  state.tuner.stream = null;
  state.tuner.buffer = null;
  state.tuner.lastFrequency = 0;
  renderTuner();
}

function updateTunerLoop(timestamp = 0) {
  if (!state.tuner.running || !state.tuner.analyser || !state.tuner.buffer) return;
  if (timestamp - state.tuner.lastAnalysisAt > 80) {
    state.tuner.lastAnalysisAt = timestamp;
    state.tuner.analyser.getFloatTimeDomainData(state.tuner.buffer);
    const frequency = detectPitch(state.tuner.buffer, state.tuner.audioContext.sampleRate);
    updateTunerReadout(frequency);
  }
  state.tuner.rafId = requestAnimationFrame(updateTunerLoop);
}

function updateTunerReadout(frequency) {
  if (!frequency) {
    el.tunerFrequency.textContent = "Play one steady note";
    el.tunerTarget.textContent = "";
    el.tunerNeedle.style.left = "50%";
    renderTunerStrings();
    return;
  }
  const measurement = getTunerMeasurement(frequency);
  const cents = clamp(measurement.cents, -50, 50);
  el.tunerNote.textContent = measurement.noteLabel;
  el.tunerFrequency.textContent = `${frequency.toFixed(1)} Hz`;
  el.tunerTarget.textContent = measurement.targetLabel;
  el.tunerNeedle.style.left = `${50 + cents}%`;
  renderTunerStrings(measurement.targetChip);
}

function getTunerMeasurement(frequency) {
  const instrument = TUNER_INSTRUMENTS[state.tuner.instrument] || TUNER_INSTRUMENTS.chromatic;
  if (instrument.targets.length) {
    let bestTarget = instrument.targets[0];
    let bestCents = centsBetween(frequency, bestTarget.frequency);
    instrument.targets.forEach((target) => {
      const cents = centsBetween(frequency, target.frequency);
      if (Math.abs(cents) < Math.abs(bestCents)) {
        bestTarget = target;
        bestCents = cents;
      }
    });
    return {
      noteLabel: bestTarget.label,
      cents: Math.round(bestCents),
      targetLabel: `${Math.round(bestCents)} cents`,
      targetChip: bestTarget.label
    };
  }
  const note = noteFromFrequency(frequency);
  return {
    noteLabel: note.label,
    cents: note.cents,
    targetLabel: `${note.cents} cents`,
    targetChip: ""
  };
}

function noteFromFrequency(frequency) {
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const targetFrequency = 440 * Math.pow(2, (midi - 69) / 12);
  return {
    label: `${TUNER_NOTE_NAMES[noteIndex]}${octave}`,
    cents: Math.round(centsBetween(frequency, targetFrequency))
  };
}

function centsBetween(frequency, targetFrequency) {
  return 1200 * Math.log2(frequency / targetFrequency);
}

function detectPitch(buffer, sampleRate) {
  let rms = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    rms += buffer[index] * buffer[index];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.012) return null;

  const minFrequency = 60;
  const maxFrequency = 2000;
  const minOffset = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxOffset = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  const sampleCount = buffer.length - maxOffset;
  let bestOffset = -1;
  let bestCorrelation = 0;
  let previousCorrelation = 1;

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    let difference = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      difference += Math.abs(buffer[index] - buffer[index + offset]);
    }
    const correlation = 1 - difference / sampleCount;
    if (correlation > 0.62 && correlation > previousCorrelation && correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
    previousCorrelation = correlation;
  }

  if (bestOffset < 0) return null;
  return sampleRate / bestOffset;
}
const PIANO_SOUND_LABELS = {
  "grand-piano": "Grand piano",
  "electric-piano": "Electric piano",
  "acoustic-guitar": "Acoustic guitar",
  marimba: "Marimba",
  clarinet: "Clarinet",
  flute: "Flute",
  violin: "Violin",
  "church-bell": "Church bell",
  "toy-piano": "Toy piano",
  "water-drop": "Water drop",
  bubbles: "Bubbles",
  laser: "Laser",
  bell: "Bell",
  chirp: "Chirp",
  boing: "Boing",
  spaceship: "Spaceship",
  "retro-game": "Retro game tone"
};

function loadPianoSettings() {
  const saved = readJson(STORAGE_KEYS.piano, {});
  if (PIANO_SOUND_LABELS[saved.sound]) state.piano.sound = saved.sound;
  const savedVolume = Number(saved.volume);
  if (Number.isFinite(savedVolume)) state.piano.volume = clamp(savedVolume, 0, 1);
}

function savePianoSettings() {
  writeJson(STORAGE_KEYS.piano, {
    sound: state.piano.sound,
    volume: state.piano.volume
  });
}

function renderPiano() {
  if (!el.pianoSound) return;
  el.pianoSound.value = state.piano.sound;
  el.pianoVolume.value = String(Math.round(state.piano.volume * 100));
  el.pianoSoundStatus.textContent = PIANO_SOUND_LABELS[state.piano.sound];
  el.pianoSustainHint.hidden = !["clarinet", "flute", "violin"].includes(state.piano.sound);
  if (state.piano.masterGain && state.piano.audioContext) {
    state.piano.masterGain.gain.setTargetAtTime(state.piano.volume, state.piano.audioContext.currentTime, 0.015);
  }
}

function handlePianoSoundChange() {
  stopAllPianoVoices();
  state.piano.sound = PIANO_SOUND_LABELS[el.pianoSound.value] ? el.pianoSound.value : "grand-piano";
  savePianoSettings();
  renderPiano();
}

function handlePianoVolumeChange() {
  state.piano.volume = clamp(Number(el.pianoVolume.value) / 100, 0, 1);
  savePianoSettings();
  renderPiano();
}

async function getPianoAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    window.alert("This browser cannot play Note Arc sounds.");
    return null;
  }
  if (!state.piano.audioContext) {
    const context = new AudioContextCtor();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;
    const masterGain = context.createGain();
    masterGain.gain.value = state.piano.volume;
    masterGain.connect(compressor);
    compressor.connect(context.destination);
    state.piano.audioContext = context;
    state.piano.masterGain = masterGain;
    state.piano.compressor = compressor;
  }
  if (state.piano.audioContext.state === "suspended") await state.piano.audioContext.resume();
  return state.piano.audioContext;
}

function pianoNoteFrequency(label) {
  const match = String(label).match(/^([A-G])(?: sharp)?\s*(\d)$/i);
  if (!match) return 440;
  const noteIndex = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1].toUpperCase()];
  const sharp = /sharp/i.test(label) ? 1 : 0;
  const midi = (Number(match[2]) + 1) * 12 + noteIndex + sharp;
  return 440 * (2 ** ((midi - 69) / 12));
}

async function handlePianoPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  const button = event.currentTarget;
  if (state.piano.voices.has(event.pointerId)) return;
  try { button.setPointerCapture(event.pointerId); } catch (_error) {}
  state.piano.pointerNotes.set(event.pointerId, button);
  await playPianoNoteForPointer(event.pointerId, button);
}

async function playPianoNoteForPointer(pointerId, button) {
  const token = (state.piano.pointerTokens.get(pointerId) || 0) + 1;
  state.piano.pointerTokens.set(pointerId, token);
  const context = await getPianoAudioContext();
  if (!context) return;
  if (state.piano.pointerTokens.get(pointerId) !== token) return;
  const frequency = pianoNoteFrequency(button.getAttribute("aria-label"));
  const voice = createPianoVoice(context, frequency, state.piano.sound);
  voice.button = button;
  state.piano.voices.set(pointerId, voice);
  button.classList.add("is-playing");
}

function handlePianoPointerMove(event) {
  if (!state.piano.pointerNotes.has(event.pointerId)) return;
  event.preventDefault();
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const nextButton = hit && hit.closest ? hit.closest(".piano-note") : null;
  if (!nextButton || nextButton === state.piano.pointerNotes.get(event.pointerId)) return;
  const currentVoice = state.piano.voices.get(event.pointerId);
  if (currentVoice) releasePianoVoice(currentVoice);
  state.piano.voices.delete(event.pointerId);
  state.piano.pointerNotes.set(event.pointerId, nextButton);
  playPianoNoteForPointer(event.pointerId, nextButton);
}

function handlePianoPointerUp(event) {
  state.piano.pointerTokens.set(event.pointerId, (state.piano.pointerTokens.get(event.pointerId) || 0) + 1);
  state.piano.pointerNotes.delete(event.pointerId);
  const voice = state.piano.voices.get(event.pointerId);
  if (!voice) return;
  releasePianoVoice(voice);
  state.piano.voices.delete(event.pointerId);
}

function stopAllPianoVoices() {
  state.piano.voices.forEach((voice) => releasePianoVoice(voice, true));
  state.piano.voices.clear();
  state.piano.pointerNotes.clear();
  state.piano.pointerTokens.clear();
  document.querySelectorAll(".piano-note.is-playing").forEach((button) => button.classList.remove("is-playing"));
}

function releasePianoVoice(voice, force = false) {
  if (!voice || voice.released) return;
  voice.released = true;
  if (voice.button) voice.button.classList.remove("is-playing");
  if (voice.oneShot && !force) return;
  const context = state.piano.audioContext;
  if (!context) return;
  const now = context.currentTime;
  voice.gains.forEach((gain) => {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, voice.release || 0.08);
  });
  voice.sources.forEach((source) => {
    try { source.stop(now + Math.max(0.12, (voice.release || 0.08) * 5)); } catch (_error) {}
  });
}

function createPianoVoice(context, frequency, sound) {
  const now = context.currentTime;
  const voice = {
    sources: [],
    gains: [],
    release: 0.08,
    released: false,
    oneShot: !["clarinet", "flute", "violin"].includes(sound)
  };
  const destination = state.piano.masterGain;
  const addTone = (ratio, type, level, attack, decay, sustain = 0.0001, detune = 0, end = 4) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency * ratio;
    oscillator.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), now + Math.max(0.004, attack));
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), now + Math.max(attack + 0.02, decay));
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + end);
    voice.sources.push(oscillator);
    voice.gains.push(gain);
    return { oscillator, gain };
  };
  const addNoise = (level, duration, filterFrequency = 1800) => {
    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(now);
    source.stop(now + duration);
    voice.sources.push(source);
    voice.gains.push(gain);
  };
  const sweep = (startRatio, endRatio, type, level, duration) => {
    const part = addTone(startRatio, type, level, 0.006, duration, 0.0001, 0, duration + 0.08);
    part.oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * endRatio), now + duration);
  };

  if (sound === "grand-piano") {
    addTone(1, "triangle", 0.34, 0.006, 2.8, 0.0001, -3, 3.2);
    addTone(1, "sine", 0.24, 0.004, 2.3, 0.0001, 3, 2.8);
    addTone(2, "sine", 0.09, 0.003, 1.35, 0.0001, -4, 1.7);
    addTone(3, "sine", 0.035, 0.002, 0.7, 0.0001, 5, 1);
    addNoise(0.025, 0.045, 3800);
    voice.release = 0.14;
  } else if (sound === "electric-piano") {
    addTone(1, "sine", 0.38, 0.008, 2.4, 0.0001, 0, 2.8);
    addTone(2, "sine", 0.13, 0.006, 1.5, 0.0001, 4, 1.9);
    addTone(3, "sine", 0.055, 0.006, 0.9, 0.0001, -5, 1.2);
  } else if (sound === "acoustic-guitar") {
    addTone(1, "triangle", 0.3, 0.004, 1.7, 0.0001, 0, 2);
    addTone(2, "sine", 0.11, 0.003, 0.8, 0.0001, 2, 1.1);
    addTone(3, "sine", 0.045, 0.002, 0.45, 0.0001, -3, 0.7);
    addNoise(0.04, 0.035, 4200);
  } else if (sound === "marimba") {
    addTone(1, "sine", 0.42, 0.003, 1.15, 0.0001, 0, 1.4);
    addTone(4, "sine", 0.075, 0.002, 0.42, 0.0001, 0, 0.6);
    addTone(10, "sine", 0.02, 0.002, 0.16, 0.0001, 0, 0.3);
  } else if (sound === "clarinet") {
    addTone(1, "square", 0.16, 0.045, 6, 0.105, 0, 8);
    addTone(3, "sine", 0.04, 0.055, 5, 0.024, 0, 8);
    voice.release = 0.1;
  } else if (sound === "flute") {
    addTone(1, "sine", 0.23, 0.07, 6, 0.16, 0, 8);
    addTone(2, "sine", 0.025, 0.09, 5, 0.015, 2, 8);
    addNoise(0.012, 0.22, 5200);
    voice.release = 0.11;
  } else if (sound === "violin") {
    addTone(1, "sawtooth", 0.105, 0.08, 6, 0.075, -5, 8);
    addTone(1, "sawtooth", 0.085, 0.09, 6, 0.06, 5, 8);
    addTone(2, "sine", 0.025, 0.12, 5, 0.018, 0, 8);
    voice.release = 0.13;
  } else if (sound === "church-bell") {
    [[1, .2], [2, .11], [2.4, .1], [3, .055], [4.2, .035]].forEach(([ratio, level]) => addTone(ratio, "sine", level, 0.003, 4.5 / Math.sqrt(ratio), 0.0001, 0, 5));
  } else if (sound === "toy-piano") {
    addTone(1, "triangle", 0.25, 0.002, 0.8, 0.0001, 0, 1);
    addTone(2.02, "sine", 0.12, 0.002, 0.45, 0.0001, 0, 0.7);
    addTone(4.08, "sine", 0.045, 0.002, 0.25, 0.0001, 0, 0.4);
  } else if (sound === "water-drop") {
    sweep(1.35, 2.1, "sine", 0.28, 0.14);
    addTone(2.1, "sine", 0.11, 0.03, 0.48, 0.0001, 0, 0.6);
  } else if (sound === "bubbles") {
    [0, 0.075, 0.15].forEach((delay, index) => {
      const part = addTone(1.15 + index * 0.18, "sine", 0.13, delay + 0.006, delay + 0.22, 0.0001, 0, 0.55);
      part.oscillator.frequency.exponentialRampToValueAtTime(frequency * (1.75 + index * 0.22), now + delay + 0.19);
    });
  } else if (sound === "laser") {
    sweep(3.8, 0.35, "sawtooth", 0.15, 0.42);
  } else if (sound === "bell") {
    addTone(1, "sine", 0.25, 0.002, 2.2, 0.0001, 0, 2.6);
    addTone(2.76, "sine", 0.1, 0.002, 1.5, 0.0001, 0, 1.9);
    addTone(5.4, "sine", 0.035, 0.002, 0.9, 0.0001, 0, 1.2);
  } else if (sound === "chirp") {
    sweep(1.6, 3.4, "sine", 0.2, 0.11);
    const echo = addTone(2.2, "sine", 0.09, 0.13, 0.27, 0.0001, 0, 0.34);
    echo.oscillator.frequency.exponentialRampToValueAtTime(frequency * 3.7, now + 0.24);
  } else if (sound === "boing") {
    const part = addTone(0.55, "triangle", 0.28, 0.004, 0.85, 0.0001, 0, 1);
    part.oscillator.detune.setValueAtTime(-180, now);
    part.oscillator.detune.linearRampToValueAtTime(1, now + 0.52);
  } else if (sound === "spaceship") {
    const part = addTone(0.45, "sawtooth", 0.105, 0.015, 1.2, 0.0001, 0, 1.4);
    part.oscillator.frequency.exponentialRampToValueAtTime(frequency * 2.7, now + 0.6);
    part.oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.6, now + 1.15);
  } else if (sound === "retro-game") {
    addTone(1, "square", 0.12, 0.003, 0.23, 0.0001, 0, 0.3);
    addTone(2, "square", 0.075, 0.07, 0.32, 0.0001, 0, 0.4);
  }
  return voice;
}


function loadMetronomeSettings() {
  const saved = readJson(STORAGE_KEYS.metronome, {});
  const savedBpm = Number(saved.bpm);
  const savedBeats = Number(saved.beatsPerMeasure);
  state.metronome.bpm = clamp(Number.isFinite(savedBpm) ? savedBpm : 90, 40, 220);
  state.metronome.beatsPerMeasure = [2, 3, 4, 6].includes(savedBeats) ? savedBeats : 4;
  state.metronome.sound = METRONOME_SOUNDS.has(saved.sound) ? saved.sound : "wood";
}

function saveMetronomeSettings() {
  writeJson(STORAGE_KEYS.metronome, {
    bpm: state.metronome.bpm,
    beatsPerMeasure: state.metronome.beatsPerMeasure,
    sound: state.metronome.sound
  });
}

function renderMetronome() {
  if (!el.metronomeBpm) return;
  el.metronomeBpm.value = String(state.metronome.bpm);
  el.metronomeBpmOutput.value = String(state.metronome.bpm);
  if (el.pdfTempoInput) el.pdfTempoInput.value = String(state.metronome.bpm);
  el.metronomeBeats.value = String(state.metronome.beatsPerMeasure);
  el.metronomeSound.value = state.metronome.sound;
  el.metronomeStartButton.textContent = state.metronome.running ? "Stop" : "Start";
  el.metronomeStatus.textContent = state.metronome.running ? "Playing" : "Stopped";
  if (el.pdfMetronomeButton) {
    el.pdfMetronomeButton.classList.toggle("is-playing", state.metronome.running);
    el.pdfMetronomeButton.setAttribute("aria-label", state.metronome.running ? "Stop metronome" : "Start metronome");
    el.pdfMetronomeButton.title = state.metronome.running ? "Stop metronome" : "Start metronome";
    el.pdfMetronomeButton.innerHTML = `<span aria-hidden="true">${state.metronome.running ? "■" : "▶"}</span>`;
  }
  renderMetronomeDots(state.metronome.running ? state.metronome.currentBeat : -1);
}

function renderMetronomeDots(activeBeat) {
  if (!el.metronomeBeatDots) return;
  el.metronomeBeatDots.innerHTML = "";
  for (let index = 0; index < state.metronome.beatsPerMeasure; index += 1) {
    const dot = document.createElement("span");
    dot.className = "metronome-dot";
    dot.classList.toggle("active", index === activeBeat);
    dot.classList.toggle("accent", index === 0);
    el.metronomeBeatDots.appendChild(dot);
  }
}

function setMetronomeBpm(value) {
  state.metronome.bpm = clamp(Math.round(Number(value) || 90), 40, 220);
  saveMetronomeSettings();
  renderMetronome();
}

function setMetronomeBeats(value) {
  state.metronome.beatsPerMeasure = [2, 3, 4, 6].includes(value) ? value : 4;
  state.metronome.currentBeat = 0;
  saveMetronomeSettings();
  renderMetronome();
}

function setMetronomeSound(value) {
  state.metronome.sound = METRONOME_SOUNDS.has(value) ? value : "wood";
  saveMetronomeSettings();
  renderMetronome();
}

async function toggleMetronome() {
  if (state.metronome.running) {
    stopMetronome();
    return;
  }
  await startMetronome();
}

async function startMetronome() {
  const audioContext = await ensureMetronomeAudio();
  if (!audioContext) return;
  state.metronome.running = true;
  state.metronome.currentBeat = 0;
  state.metronome.nextNoteTime = audioContext.currentTime + 0.06;
  window.clearInterval(state.metronome.schedulerId);
  state.metronome.schedulerId = window.setInterval(scheduleMetronome, 25);
  scheduleMetronome();
  renderMetronome();
}

function stopMetronome() {
  if (!state.metronome.running && !state.metronome.schedulerId) return;
  state.metronome.running = false;
  window.clearInterval(state.metronome.schedulerId);
  state.metronome.schedulerId = null;
  state.metronome.currentBeat = 0;
  renderMetronome();
}

async function ensureMetronomeAudio() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    window.alert("This browser cannot play metronome audio.");
    return null;
  }
  if (!state.metronome.audioContext) {
    state.metronome.audioContext = new AudioContextCtor();
  }
  if (state.metronome.audioContext.state === "suspended") {
    await state.metronome.audioContext.resume();
  }
  return state.metronome.audioContext;
}

function scheduleMetronome() {
  const audioContext = state.metronome.audioContext;
  if (!audioContext || !state.metronome.running) return;
  const lookaheadSeconds = 0.12;
  while (state.metronome.nextNoteTime < audioContext.currentTime + lookaheadSeconds) {
    const beatIndex = state.metronome.currentBeat % state.metronome.beatsPerMeasure;
    const clickTime = state.metronome.nextNoteTime;
    playMetronomeClick(clickTime, beatIndex === 0);
    window.setTimeout(() => {
      if (state.metronome.running) {
        renderMetronomeDots(beatIndex);
      }
    }, Math.max(0, (clickTime - audioContext.currentTime) * 1000));
    state.metronome.currentBeat = (state.metronome.currentBeat + 1) % state.metronome.beatsPerMeasure;
    state.metronome.nextNoteTime += 60 / state.metronome.bpm;
  }
}

function playMetronomeClick(time, isAccent) {
  const audioContext = state.metronome.audioContext;
  if (!audioContext) return;
  if (state.metronome.sound === "classic") {
    scheduleMetronomeTone(time, {
      type: "square",
      frequency: isAccent ? 1250 : 900,
      gain: isAccent ? 0.24 : 0.15,
      duration: 0.045
    });
    return;
  }
  if (state.metronome.sound === "pulse") {
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: isAccent ? 520 : 390,
      gain: isAccent ? 0.24 : 0.16,
      duration: 0.11,
      endFrequency: isAccent ? 440 : 330
    });
    return;
  }
  if (state.metronome.sound === "bell") {
    const frequency = isAccent ? 880 : 660;
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency,
      gain: isAccent ? 0.22 : 0.15,
      duration: 0.24
    });
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: frequency * 2.01,
      gain: isAccent ? 0.055 : 0.038,
      duration: 0.18
    });
    return;
  }
  if (state.metronome.sound === "marimba") {
    const frequency = isAccent ? 523.25 : 392;
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency,
      gain: isAccent ? 0.3 : 0.21,
      duration: 0.17,
      endFrequency: frequency * 0.92
    });
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: frequency * 3.98,
      gain: isAccent ? 0.045 : 0.03,
      duration: 0.055,
      endFrequency: frequency * 3.6
    });
    return;
  }
  if (state.metronome.sound === "bubble") {
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: isAccent ? 270 : 220,
      gain: isAccent ? 0.27 : 0.19,
      duration: 0.13,
      endFrequency: isAccent ? 650 : 520
    });
    return;
  }
  if (state.metronome.sound === "water") {
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: isAccent ? 1120 : 900,
      gain: isAccent ? 0.24 : 0.17,
      duration: 0.16,
      endFrequency: isAccent ? 610 : 480
    });
    scheduleMetronomeTone(time, {
      type: "sine",
      frequency: isAccent ? 1680 : 1350,
      gain: isAccent ? 0.035 : 0.024,
      duration: 0.085,
      endFrequency: isAccent ? 920 : 720
    });
    return;
  }
  scheduleMetronomeTone(time, {
    type: "triangle",
    frequency: isAccent ? 560 : 430,
    gain: isAccent ? 0.34 : 0.23,
    duration: 0.075,
    endFrequency: isAccent ? 190 : 155
  });
}

function scheduleMetronomeTone(time, options) {
  const audioContext = state.metronome.audioContext;
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const duration = options.duration || 0.06;
  oscillator.type = options.type || "sine";
  oscillator.frequency.setValueAtTime(options.frequency, time);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, time + duration);
  }
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(options.gain, time + Math.min(0.005, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.01);
}

function tapMetronomeTempo() {
  const now = performance.now();
  state.metronome.tapTimes = state.metronome.tapTimes.filter((time) => now - time < 2500);
  state.metronome.tapTimes.push(now);
  if (state.metronome.tapTimes.length < 2) return;
  const intervals = [];
  for (let index = 1; index < state.metronome.tapTimes.length; index += 1) {
    intervals.push(state.metronome.tapTimes[index] - state.metronome.tapTimes[index - 1]);
  }
  const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  setMetronomeBpm(60000 / averageInterval);
}
function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  renderAll();
  if (el.sections.detail.classList.contains("active")) {
    const item = state.itemsById.get(id);
    if (item) {
      el.detailContent.innerHTML = detailHtml(item);
      setFavoriteIcons(el.detailContent);
      hydrateLocalImages(el.detailContent);
    }
  }
}

function addFavoriteDivider() {
  const favoriteItemCount = getFavoriteRows().filter((row) => row.kind === "item").length;
  if (favoriteItemCount < 3) return;
  const id = `${FAVORITE_DIVIDER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currentIds = Array.from(state.favorites);
  currentIds.push(id);
  state.favorites = new Set(currentIds);
  state.favoriteReorderMode = true;
  writeJson(STORAGE_KEYS.favorites, currentIds);
  renderFavorites();
}

function removeFavoriteDivider(id) {
  if (!isFavoriteDividerId(id)) return;
  if (!window.confirm("Delete this section break?")) return;
  state.favorites.delete(id);
  writeJson(STORAGE_KEYS.favorites, Array.from(state.favorites));
  renderFavorites();
}

function saveFavoriteOrder(orderedIds) {
  const nextIds = [];
  orderedIds.forEach((id) => {
    if (state.favorites.has(id) && !nextIds.includes(id)) nextIds.push(id);
  });
  state.favorites.forEach((id) => {
    if (!nextIds.includes(id)) nextIds.push(id);
  });

  state.favorites = new Set(nextIds);
  writeJson(STORAGE_KEYS.favorites, nextIds);
  renderFavorites();
}

function reorderStepControlsHtml(kind, id, label, index, count) {
  const dataAttribute = kind === "list" ? "data-list-order-move" : "data-favorite-order-move";
  const safeId = escapeHtml(id);
  const safeLabel = escapeHtml(label);
  const disableUp = index <= 0 ? " disabled" : "";
  const disableDown = index >= count - 1 ? " disabled" : "";
  return `
    <span class="reorder-step-controls" role="group" aria-label="Move ${safeLabel}">
      <button class="reorder-step-button" type="button" ${dataAttribute}="${safeId}" data-order-direction="up" aria-label="Move ${safeLabel} up" title="Move up"${disableUp}>&#9650;</button>
      <button class="reorder-step-button" type="button" ${dataAttribute}="${safeId}" data-order-direction="down" aria-label="Move ${safeLabel} down" title="Move down"${disableDown}>&#9660;</button>
    </span>
  `;
}

function dragHandleHtml(kind, id, label) {
  const safeId = escapeHtml(id);
  const safeLabel = escapeHtml(label);
  const dataAttribute = kind === "favorite"
    ? `data-favorite-drag="${safeId}"`
    : kind === "list"
      ? `data-list-drag="${safeId}"`
      : `data-list-item-drag="${safeId}"`;
  const extraData = kind === "list-item"
    ? ` data-drag-list-id="${escapeHtml(state.activeListId)}" data-drag-index="${getActiveList()?.entries?.findIndex((entry) => entry.itemId === id) ?? -1}"`
    : "";
  return `
    <button class="drag-handle ${kind}-drag-handle" type="button" ${dataAttribute}${extraData} aria-label="Drag ${safeLabel} to rearrange" title="Drag to rearrange">
      <span aria-hidden="true"></span>
    </button>
  `;
}

function moveFavoriteOrderStep(id, direction) {
  const orderedIds = Array.from(state.favorites);
  const index = orderedIds.indexOf(id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
  [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
  saveFavoriteOrder(orderedIds);
}

function rememberOpened(item, pageNumber) {
  writeJson(STORAGE_KEYS.lastOpened, {
    id: item.id,
    type: item.type,
    page: pageNumber || null,
    openedAt: new Date().toISOString()
  });

  const recents = readJson(STORAGE_KEYS.recents, []);
  const next = [item.id, ...recents.filter((id) => id !== item.id)].slice(0, 8);
  writeJson(STORAGE_KEYS.recents, next);
}

function getRecentItems() {
  return readJson(STORAGE_KEYS.recents, [])
    .map((id) => state.itemsById.get(id))
    .filter(Boolean);
}

function getSavedPdfPage(itemId) {
  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  return Number(pages[itemId]) || 1;
}

function savePdfPage() {
  const item = state.currentPdf.item;
  if (!item) return;
  const pages = readJson(STORAGE_KEYS.pdfPages, {});
  pages[item.id] = state.currentPdf.pageNumber;
  writeJson(STORAGE_KEYS.pdfPages, pages);
}

function saveLists() {
  writeJson(STORAGE_KEYS.lists, state.lists);
}

function toggleListReorderMode() {
  if (state.lists.length < 2) return;
  state.listReorderMode = !state.listReorderMode;
  if (state.listReorderMode) {
    state.listEditMode = false;
    state.listPickerOpen = false;
    state.listPickerMessage = "";
    closeListMoreMenu();
  }
  renderLists();
}

function saveListOrder(orderedIds) {
  const listById = new Map(state.lists.map((list) => [list.id, list]));
  const nextLists = orderedIds
    .map((id) => listById.get(id))
    .filter(Boolean);

  state.lists.forEach((list) => {
    if (!orderedIds.includes(list.id)) nextLists.push(list);
  });

  state.lists = nextLists;
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = state.activeListId;
  renderLists();
}

function moveListOrderStep(id, direction) {
  const orderedIds = state.lists.map((list) => list.id);
  const index = orderedIds.indexOf(id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
  [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
  saveListOrder(orderedIds);
}

function toggleListEditMode() {
  if (state.listEditMode) {
    const active = getActiveList();
    if (active) {
      const draft = document.getElementById("listTitleDraft");
      if (draft) updateListTitle(active.id, draft.value);
    }
    state.listEditMode = false;
    renderLists();
    return;
  }
  state.listEditMode = !state.listEditMode;
  state.listReorderMode = false;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  renderLists();
}

function toggleListPicker() {
  if (!state.lists.length) {
    createList();
    return;
  }
  state.listPickerOpen = !state.listPickerOpen;
  state.listPickerMessage = "";
  renderLists();
}

function selectList(listId) {
  if (!state.lists.some((list) => list.id === listId)) return;
  if (state.armedPdfListId && state.armedPdfListId !== listId) {
    state.armedPdfListId = "";
  }
  const isExpanded = state.expandedListIds.includes(listId);
  state.activeListId = listId;
  state.expandedListIds = isExpanded
    ? []
    : [listId];
  el.listSelect.value = listId;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  state.listEditMode = false;
  state.listReorderMode = false;
  closeListMoreMenu();
  renderLists();
}

function editListFromRow(listId) {
  if (!state.lists.some((list) => list.id === listId)) return;
  openListEditModal(listId);
}

function openListEditModal(listId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return;

  state.activeListId = list.id;
  state.expandedListIds = [list.id];
  state.editingListId = list.id;
  state.listEditView = "current";
  state.listEditMode = false;
  state.listReorderMode = false;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  closeListMoreMenu();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = list.id;
  renderLists();
  renderListEditModal();
  el.listEditModal.classList.remove("hidden");
  fitOpenMobileModals();
}

function closeListEditModal() {
  if (!el.listEditModal || el.listEditModal.classList.contains("hidden")) return;
  el.listEditModal.classList.add("hidden");
  clearModalPanelLayout(el.listEditPanel);
  fitOpenMobileModals();
  state.editingListId = "";
  el.listEditStatus.textContent = "";
}

function saveListEditModal(event) {
  event.preventDefault();
  if (document.activeElement === el.listEditSearch) {
    renderListEditResults();
    return;
  }
  if (!state.editingListId) return;
  updateListTitle(state.editingListId, el.listEditTitleField.value);
  closeListEditModal();
  renderLists();
}

function saveCurrentModalListTitle() {
  if (!state.editingListId) return;
  updateListTitle(state.editingListId, el.listEditTitleField.value);
}

function handleDeleteListFromForm() {
  const listId = state.editingListId;
  if (!listId) return;
  if (deleteList(listId)) closeListEditModal();
}

function renderListEditModal() {
  const list = state.lists.find((candidate) => candidate.id === state.editingListId);
  if (!list) {
    closeListEditModal();
    return;
  }

  el.listEditTitle.textContent = "Edit list";
  el.listEditTitleField.value = list.title || "";
  el.listEditSort.value = state.listEditSort;
  renderListEditItems(list);
  renderListEditResults();
  updateListEditView();
}

function updateListEditView() {
  const showAdd = state.listEditView === "add";
  el.listEditPanel.classList.toggle("add-items-view", showAdd);
  el.listEditCurrentSection.classList.toggle("hidden", showAdd);
  el.listEditAddSection.classList.toggle("hidden", !showAdd);
  document.querySelectorAll("[data-list-edit-view].list-edit-view-tab").forEach((button) => {
    const active = button.dataset.listEditView === state.listEditView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function setListEditView(view) {
  if (!["current", "add"].includes(view)) return;
  saveCurrentModalListTitle();
  state.listEditView = view;
  updateListEditView();
  if (view === "add") el.listEditSearch.focus();
}

function renderListEditItems(list) {
  const entries = getResolvedListEntries(list);
  el.listEditCurrentCount.textContent = `${entries.length} ${entries.length === 1 ? "item" : "items"}`;
  el.listEditItems.dataset.listItems = list.id;

  if (!entries.length) {
    el.listEditItems.innerHTML = `<div class="empty-state compact-empty"><p>No items yet.</p></div>`;
    return;
  }

  el.listEditItems.innerHTML = entries.map((entry) => {
    const title = itemDisplayTitle(entry.item);
    const page = entry.page || entry.item.page;
    const meta = [
      page ? `p. ${page}` : "",
      entry.item.book || entry.item.category || "",
      entry.item.type || ""
    ].filter(Boolean).join(" - ");
    const value = `${escapeHtml(list.id)}:${entry.manualIndex}`;
    return `
      <div class="list-edit-item-row" data-list-item-row="${escapeHtml(entry.item.id)}">
        <div class="list-edit-item-main">
          <span class="compact-title">${escapeHtml(title)}</span>
          ${meta ? `<span class="compact-meta">${escapeHtml(meta)}</span>` : ""}
        </div>
        <div class="list-edit-item-actions">
          <button class="icon-button remove-button" type="button" data-list-modal-remove="${value}" aria-label="Remove ${escapeHtml(title)} from list" title="Remove from list">&#128465;</button>
          ${dragHandleHtml("list-item", entry.item.id, title)}
        </div>
      </div>
    `;
  }).join("");
}

function renderListEditResults() {
  if (!state.editingListId) return;
  const list = state.lists.find((candidate) => candidate.id === state.editingListId);
  if (!list) return;

  const query = el.listEditSearch.value || "";
  const existingIds = new Set((list.entries || []).map((entry) => entry.itemId));
  const items = state.data.items
    .filter(isLibraryContentItem)
    .filter((item) => matchesQuery(item, query))
    .filter((item) => !["pdf", "card", "link"].includes(state.listEditSort) || item.type === state.listEditSort)
    .sort(state.listEditSort === "title" ? compareTitle : compareListPickerType)
    .slice(0, 80);

  if (!items.length) {
    el.listEditResults.innerHTML = `<div class="empty-state compact-empty"><p>No matching items.</p></div>`;
    return;
  }

  let currentGroup = "";
  el.listEditResults.innerHTML = items.map((item) => {
    const group = listPickerTypeGroup(item);
    const groupHeading = state.listEditSort === "type" && group !== currentGroup
      ? `<div class="picker-type-heading">${escapeHtml(group)}</div>`
      : "";
    currentGroup = group;
    const alreadyAdded = existingIds.has(item.id);
    return `${groupHeading}
    <div class="checklist-row list-edit-result-row${alreadyAdded ? " is-added" : ""}">
      <span class="checklist-main">
        <span class="picker-title">${escapeHtml(itemDisplayTitle(item))}</span>
        <small>${escapeHtml(compactMetaText(item))}</small>
      </span>
      <span class="type-pill compact-type">${escapeHtml(item.type)}</span>
      <button class="list-edit-add-item-button" type="button" data-list-modal-add="${escapeHtml(item.id)}"${alreadyAdded ? " disabled" : ""}>
        ${alreadyAdded ? "&#10003; Added" : "+ Add"}
      </button>
    </div>
  `;
  }).join("");
}

function listPickerTypeGroup(item) {
  if (item.type === "card") return "Cards";
  if (item.type === "link") return "Links";
  return "Files";
}

function normalizeListEditSort(value) {
  return ["type", "title", "pdf", "card", "link"].includes(value) ? value : "type";
}

function compareListPickerType(a, b) {
  const order = { Cards: 0, Files: 1, Links: 2 };
  const groupDifference = order[listPickerTypeGroup(a)] - order[listPickerTypeGroup(b)];
  return groupDifference || compareTitle(a, b);
}

function toggleListItemFromModal(itemId, checked) {
  if (!state.editingListId) return;
  saveCurrentModalListTitle();
  if (checked) {
    addItemToList(state.editingListId, itemId);
    const item = state.itemsById.get(itemId);
    el.listEditStatus.textContent = item ? `Added ${itemDisplayTitle(item)}.` : "Added item.";
  } else {
    removeListItemByItemId(state.editingListId, itemId);
    const item = state.itemsById.get(itemId);
    el.listEditStatus.textContent = item ? `Removed ${itemDisplayTitle(item)}.` : "Removed item.";
  }
  renderListEditModal();
}

function moveListItemFromModal(value) {
  saveCurrentModalListTitle();
  moveListItem(value);
  renderListEditModal();
}

function updateListTitle(listId, title) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return;
  list.title = title.trim() || "Untitled List";
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = state.activeListId;
}

function saveListTitleFromEditor(listId) {
  const draft = document.getElementById("listTitleDraft");
  updateListTitle(listId, draft?.value || "");
  state.listEditMode = false;
  renderLists();
}

function createList(title = "", entries = []) {
  const list = {
    id: createLocalListId("list"),
    title,
    showCheckboxes: false,
    userCreated: true,
    entries
  };
  state.lists.push(list);
  state.activeListId = list.id;
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = list.id;
  state.listEditMode = false;
  state.listReorderMode = false;
  state.listPickerOpen = false;
  state.listPickerMessage = "";
  renderLists();
  openListEditModal(list.id);
}

function deleteList(listId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list) return false;
  const ok = window.confirm(`Delete "${list.title}"? This only removes the list, not the songs.`);
  if (!ok) return false;

  state.lists = state.lists.filter((candidate) => candidate.id !== listId);
  state.activeListId = state.lists[0]?.id || "";
  saveLists();
  populateSelect(el.listSelect, state.lists);
  el.listSelect.value = state.activeListId;
  renderLists();
  return true;
}

function addItemToList(listId, itemId, pageValue = "") {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list || !itemId) return;
  const item = state.itemsById.get(itemId);
  list.entries = list.entries || [];
  if (list.entries.some((entry) => entry.itemId === itemId)) return;
  const entry = { itemId, checked: false };
  const page = Number(pageValue);
  if (page) entry.page = page;
  list.entries.push(entry);
  state.listPickerMessage = item ? `Added ${itemDisplayTitle(item)}.` : "Added item.";
  const pageInput = document.getElementById("listPickerPage");
  if (pageInput) pageInput.value = "";
  saveLists();
  renderLists();
}

function moveListItem(value) {
  const [listId, indexText, direction] = value.split(":");
  const list = state.lists.find((candidate) => candidate.id === listId);
  const index = Number(indexText);
  if (!list?.entries?.[index]) return;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= list.entries.length) return;

  const [entry] = list.entries.splice(index, 1);
  list.entries.splice(targetIndex, 0, entry);
  saveLists();
  renderLists();
}

function removeListItem(value) {
  const [listId, indexText] = value.split(":");
  const list = state.lists.find((candidate) => candidate.id === listId);
  const index = Number(indexText);
  if (!list?.entries?.[index]) return;
  list.entries.splice(index, 1);
  saveLists();
  renderLists();
}

function removeListItemByItemId(listId, itemId) {
  const list = state.lists.find((candidate) => candidate.id === listId);
  if (!list?.entries?.length) return;
  list.entries = list.entries.filter((entry) => entry.itemId !== itemId);
  saveLists();
  renderLists();
}

function confirmAndRemoveListItem(value) {
  const ok = window.confirm("Remove this item from this list?");
  if (!ok) {
    closeSwipeRows();
    return;
  }
  removeListItem(value);
  closeSwipeRows();
}

function getActiveList() {
  return state.lists.find((list) => list.id === state.activeListId) || state.lists[0];
}

function createLocalListId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function filterItems(items, query) {
  return (items || []).filter((item) => matchesQuery(item, query));
}

function isFileItem(item) {
  return Boolean(item?.id && FILE_ITEM_TYPES.has(item.type));
}

function isLibraryContentItem(item) {
  return Boolean(item?.id && LIBRARY_CONTENT_TYPES.has(item.type));
}

function itemDisplayTitle(item) {
  const candidates = [
    item?.title,
    item?.fileName,
    item?.imageFileName,
    item?.url,
    titleFromId(item?.id)
  ];
  for (const candidate of candidates) {
    const title = normalizeVisibleText(candidate);
    if (title) return title;
  }
  return "Untitled";
}

function itemDisplayTitleWithInlinePage(item, pageOverride = null) {
  const title = itemDisplayTitle(item);
  const page = normalizeVisibleText(pageOverride ?? item?.page);
  if (!page || titleContainsPage(title, page)) return title;

  const pdfMatch = title.match(/\.pdf$/i);
  if (pdfMatch) {
    return `${title.slice(0, -pdfMatch[0].length)}, ${page}${pdfMatch[0]}`;
  }

  return `${title}, ${page}`;
}

function titleContainsPage(title, page) {
  const escapedPage = escapeRegExp(page);
  return new RegExp(`(^|[^0-9])${escapedPage}([^0-9]|$)`).test(title);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeVisibleText(value) {
  return String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function titleFromId(id) {
  const text = normalizeVisibleText(id).replace(/[-_]+/g, " ");
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
}

function matchesQuery(item, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;
  return searchableText(item).includes(normalizedQuery);
}

function searchableText(item) {
  return normalize([
    itemDisplayTitle(item),
    item.title,
    item.type,
    item.category,
    item.book,
    item.page,
    item.url,
    item.fileName,
    item.fileMime,
    item.imageFileName,
    item.aliases?.join(" "),
    item.tags?.join(" "),
    item.notes,
    item.key,
    item.capo,
    item.startingNote,
    item.content?.join(" "),
    item.cardHtml ? htmlToPlainText(item.cardHtml) : "",
    item.body
  ].filter(Boolean).join(" "));
}

function sortItems(items, mode) {
  const copy = items.slice();
  if (mode === "page") {
    return copy.sort(comparePageThenTitle);
  }
  if (mode === "alpha") {
    return copy.sort(compareTitle);
  }
  return copy.sort((a, b) => {
    const categoryCompare = (a.category || "").localeCompare(b.category || "");
    return categoryCompare || compareTitle(a, b);
  });
}

function sortLibraryItems(items, mode) {
  const copy = items.slice();
  if (mode === "alpha") {
    return copy.sort(compareTitle);
  }

  return copy.sort((a, b) => {
    const aValue = librarySortValue(a, mode);
    const bValue = librarySortValue(b, mode);
    const aHasValue = Boolean(aValue);
    const bHasValue = Boolean(bValue);

    if (aHasValue !== bHasValue) return aHasValue ? -1 : 1;
    return aValue.localeCompare(bValue) || compareTitle(a, b);
  });
}

function librarySortValue(item, mode) {
  if (mode === "category") return item.category || "";
  if (mode === "book") return item.book || "";
  if (mode === "composer") return item.composer || "";
  if (mode === "tag") return (item.tags || []).join(", ");
  return itemDisplayTitle(item);
}

function sortQuickEntries(entries, mode) {
  const copy = entries.slice();
  if (mode === "alpha") {
    return copy.sort((a, b) => compareTitle(a.item, b.item));
  }
  if (mode === "page") {
    return copy.sort((a, b) => comparePageThenTitle(a.item, b.item));
  }
  return copy.sort((a, b) => a.manualIndex - b.manualIndex);
}

function compareTitle(a, b) {
  return itemDisplayTitle(a).localeCompare(itemDisplayTitle(b));
}

function comparePageThenTitle(a, b) {
  const aPage = Number(a.page) || Number.MAX_SAFE_INTEGER;
  const bPage = Number(b.page) || Number.MAX_SAFE_INTEGER;
  return aPage - bPage || compareTitle(a, b);
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function metaHtml(item) {
  const parts = [
    item.category,
    item.book,
    item.page ? `p. ${item.page}` : ""
  ].filter(Boolean);
  if (!parts.length) return "";
  return `<div class="meta-line">${parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("")}</div>`;
}

function compactLibraryMetaText(item) {
  const pieces = [];
  if (item.page && !titleContainsPage(itemDisplayTitle(item), item.page)) pieces.push(`p. ${item.page}`);
  const locator = item.book || item.composer || item.category || "";
  if (locator) pieces.push(locator);
  return pieces.join(" \u00b7 ");
}

function compactTypeLabel(item) {
  return item?.type || "item";
}

function setlistMeta(item, entry) {
  const page = entry.page || item.page;
  const pieces = [
    page ? `p. ${page}` : "",
    item.type,
    entry.notes || item.notes || ""
  ].filter(Boolean);
  return escapeHtml(pieces.join(" ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· "));
}

function tagsHtml(tags) {
  if (!tags?.length) return "";
  return `<div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function compactMetaText(item) {
  return [
    item.book,
    item.composer,
    item.category,
    item.page ? `p. ${item.page}` : "",
    item.type
  ].filter(Boolean).join(" - ");
}

function libraryOptionsHtml() {
  return state.data.items
    .slice()
    .sort(compareTitle)
    .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(itemDisplayTitle(item))} (${escapeHtml(item.type)})</option>`)
    .join("");
}

function emptyState(title = "Nothing here yet", message = "Add something of your own or choose another section to explore the starter content.") {
  const node = document.getElementById("emptyStateTemplate").content.firstElementChild.cloneNode(true);
  node.querySelector("h3").textContent = title;
  node.querySelector("p").textContent = message;
  return node;
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or storage limits can block writes; the app remains usable.
  }
}

async function exportBackup() {
  try {
    const data = {
      importedItems: readJson(STORAGE_KEYS.importedItems, []),
      itemEdits: readJson(STORAGE_KEYS.itemEdits, {}),
      lists: readJson(STORAGE_KEYS.lists, state.lists),
      quickIndexes: readJson(STORAGE_KEYS.quickIndexes, state.data.quickIndexes || []),
      setlists: readJson(STORAGE_KEYS.setlists, state.data.setlists || []),
      favorites: readJson(STORAGE_KEYS.favorites, []),
      lastOpened: readJson(STORAGE_KEYS.lastOpened, null),
      quickChecks: readJson(STORAGE_KEYS.quickChecks, {}),
      pdfPages: readJson(STORAGE_KEYS.pdfPages, {}),
      recents: readJson(STORAGE_KEYS.recents, []),
      settings: readJson(STORAGE_KEYS.settings, {}),
      starterFavorites: readJson(STORAGE_KEYS.starterFavorites, []),
      starterLists: readJson(STORAGE_KEYS.starterLists, []),
      deletedItems: readJson(STORAGE_KEYS.deletedItems, [])
    };
    const fileIds = collectLocalFileIds(data);
    const { files, missingFileIds } = await collectBackupFiles(fileIds);
    const backup = {
      app: "kens-music-app",
      version: 2,
      exportedAt: new Date().toISOString(),
      note: "Private app export. Includes lists, favorites, cards, links, metadata, and uploaded local file blobs when available. Share only with people who should receive those files.",
      data,
      files,
      missingFileIds
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kens-music-app-data-and-files-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    if (missingFileIds.length) {
      window.alert("The export was created, but one or more local files could not be found. The visible app data was still included.");
    }
  } catch {
    window.alert("The app data and files could not be exported from this browser.");
  }
}

function importBackupFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const backup = JSON.parse(String(reader.result || "{}"));
      const data = backup.data || backup;
      const fileRecords = Array.isArray(backup.files) ? backup.files : Array.isArray(data.files) ? data.files : [];
      const ok = window.confirm("Import this app data and included files? This will replace local lists, favorites, cards, links, and item metadata on this device.");
      if (!ok) return;

      await restoreBackupFiles(fileRecords);
      writeJson(STORAGE_KEYS.importedItems, data.importedItems || []);
      writeJson(STORAGE_KEYS.itemEdits, data.itemEdits || {});
      if (data.lists) {
        writeJson(STORAGE_KEYS.lists, data.lists);
      } else {
        localStorage.removeItem(STORAGE_KEYS.lists);
      }
      writeJson(STORAGE_KEYS.quickIndexes, data.quickIndexes || []);
      writeJson(STORAGE_KEYS.setlists, data.setlists || []);
      writeJson(STORAGE_KEYS.favorites, data.favorites || []);
      if (data.lastOpened) {
        writeJson(STORAGE_KEYS.lastOpened, data.lastOpened);
      } else {
        localStorage.removeItem(STORAGE_KEYS.lastOpened);
      }
      writeJson(STORAGE_KEYS.quickChecks, data.quickChecks || {});
      writeJson(STORAGE_KEYS.pdfPages, data.pdfPages || {});
      writeJson(STORAGE_KEYS.recents, data.recents || []);
      writeJson(STORAGE_KEYS.settings, data.settings || {});
      writeJson(STORAGE_KEYS.starterFavorites, data.starterFavorites || []);
      writeJson(STORAGE_KEYS.starterLists, data.starterLists || []);
      writeJson(STORAGE_KEYS.deletedItems, data.deletedItems || []);
      window.location.reload();
    } catch {
      window.alert("That app data file could not be imported.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
