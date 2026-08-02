"use strict";

const PDFJS_VERSION = "3.11.174";
const PDFJS_WORKER_URL = new URL(`assets/pdf.worker.min.js?v=${PDFJS_VERSION}`, document.baseURI).href;

const APP_STORAGE_SCOPE = getAppStorageScope();
const APP_RELEASE_VERSION = "1.0";
const APP_BUILD_VERSION = "1.01";
const UPDATE_CHECK_SESSION_KEY = `${APP_STORAGE_SCOPE}.updateCheck`;
const STORAGE_KEYS = {
  deletedItems: storageKey("deletedItems"),
  favorites: storageKey("favorites"),
  importedItems: storageKey("importedItems"),
  itemEdits: storageKey("itemEdits"),
  itemMetadataRepairVersion: storageKey("itemMetadataRepairVersion"),
  lastOpened: storageKey("lastOpened"),
  lists: storageKey("lists"),
  listEditSort: storageKey("listEditSort"),
  cardSubtypes: storageKey("cardSubtypes"),
  cardOrder: storageKey("cardOrder"),
  pdfPages: storageKey("pdfPages"),
  pdfNumbering: storageKey("pdfNumbering"),
  pdfAnnotations: storageKey("pdfAnnotations"),
  quickIndexes: storageKey("quickIndexes"),
  recents: storageKey("recents"),
  settings: storageKey("settings"),
  metronome: storageKey("metronome"),
  piano: storageKey("piano"),
  tuner: storageKey("tuner"),
  pitch: storageKey("pitch"),
  audioTracks: storageKey("audioTracks"),
  audioPlaylists: storageKey("audioPlaylists"),
  audioSelectedPlaylist: storageKey("audioSelectedPlaylist"),
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
const AUDIO_DB_NAME = `${APP_STORAGE_SCOPE}.audio`;
const AUDIO_DB_VERSION = 1;
const AUDIO_STORE_NAME = "audioFiles";
const RICH_TOGGLE_COMMANDS = ["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
const CARD_FONT_FACES = ["Verdana", "Aptos, Calibri, Arial, sans-serif", "Calibri, Aptos, Arial, sans-serif", "system-ui", "Arial", "Trebuchet MS", "Georgia", "Atkinson Hyperlegible"];
const CARD_READING_SCALES = [0.82, 0.9, 1, 1.12, 1.25, 1.4];
const CARD_SUBTYPE_PRESETS = ["Lyrics", "Song plan", "Notes", "Image", "Chords", "Teaching aid", "Cue"];
const CARD_SUBTYPE_OTHER = "__other__";
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
  listEditSort: "pdf",
  listEditView: "current",
  favoriteReorderMode: false,
  listReorderMode: false,
  editingListId: "",
  editingItemId: null,
  importContext: "library",
  importReturnSection: "",
  modalDrag: null,
  cardEditorRange: null,
  selectedCardImage: null,
  speechCardId: "",
  speechUtterance: null,
  pdfSettingsDraft: null,
  cardReadingScale: normalizeCardReadingScale(readJson(STORAGE_KEYS.settings, {}).cardReadingScale),
  activeSection: "lists",
  previousSection: "library",
  previousScrollY: 0,
  activeListId: "",
  expandedListIds: [],
  alphabeticalListViewIds: new Set(),
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
  cardDrag: {
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
    tipsMode: "",
    pageNoticeTimer: null
  },
  pdfAnnotation: {
    active: false,
    tool: "pencil",
    color: "#245A9A",
    pointerId: null,
    currentStroke: null,
    erasing: false,
    undoByPage: new Map(),
    noticeTimer: null
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
    oscillators: [],
    gain: null,
    playRequestId: 0
  },
  piano: {
    sound: "grand-piano",
    volume: 0.58,
    transpose: 0,
    shape: "circle",
    audioContext: null,
    masterGain: null,
    compressor: null,
    voices: new Map(),
    pointerNotes: new Map(),
    pointerTokens: new Map(),
    twinkleIndex: 0,
    game: {
      mode: "",
      sequence: [],
      inputIndex: 0,
      targetLabel: "",
      acceptingInput: false,
      playToken: 0
    }
  },
  audio: {
    tracks: [],
    playlists: [],
    selectedPlaylistId: "",
    mode: "library",
    currentTrackId: "",
    queue: [],
    objectUrl: "",
    shuffle: false,
    repeat: false
  }
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  collectElements();
  setupKeyboardUi();
  applyAppSettings();
  wireEvents();
  configurePdfJs();
  await loadLibrary();
  loadLocalState();
  loadMetronomeSettings();
  loadTunerSettings();
  loadPitchSettings();
  loadPianoSettings();
  await loadAudioLibrary();
  setupInitialSelections();
  renderMetronome();
  renderTuner();
  renderPitch();
  renderPiano();
  renderPianoChordGuide();
  renderKeyChangeGuide();
  renderAudioLibrary();
  renderAll();
  openInitialSection();
  setupServiceWorker();
  showPendingUpdateResult();
}

function collectElements() {
  el.appShell = document.getElementById("appShell");
  el.appUpdateNotice = document.getElementById("appUpdateNotice");
  el.offlineReadiness = document.getElementById("offlineReadiness");
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
    keyboard: document.getElementById("keyboardSection"),
    audio: document.getElementById("audioSection"),
    detail: document.getElementById("detailSection")
  };

  el.libraryContent = document.getElementById("libraryContent");
  el.librarySearch = document.getElementById("librarySearch");
  el.librarySort = document.getElementById("librarySort");
  el.libraryTopAddButton = document.getElementById("libraryTopAddButton");
  el.libraryFileCount = document.getElementById("libraryFileCount");
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
  el.listsFollowNote = document.getElementById("listsFollowNote");

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
  el.pianoSoundButtons = Array.from(document.querySelectorAll("[data-piano-sound]"));
  el.pianoMoreSoundsButton = document.getElementById("pianoMoreSoundsButton");
  el.pianoMoreSounds = document.getElementById("pianoMoreSounds");
  el.pianoVolume = document.getElementById("pianoVolume");
  el.pianoShape = document.getElementById("pianoShape");
  el.pianoShapeButtons = Array.from(document.querySelectorAll("[data-piano-shape]"));
  el.pianoNoteArc = document.querySelector(".piano-note-arc");
  el.sidetrackJazzPuzzle = document.getElementById("sidetrackJazzPuzzle");
  el.sidetrackKeyboard = document.getElementById("sidetrackKeyboard");
  el.sidetrackPuzzle = document.getElementById("sidetrackPuzzle");
  el.sidetrackAir = document.getElementById("sidetrackAir");
  el.sidetrackAirField = document.getElementById("sidetrackAirField");
  el.sidetrackAirStatus = document.getElementById("sidetrackAirStatus");
  el.sidetrackAirRestart = document.getElementById("sidetrackAirRestart");
  el.pianoEffectPads = Array.from(document.querySelectorAll("[data-piano-effect]"));
  el.pianoSoundStatus = document.getElementById("pianoSoundStatus");
  el.keyboardSound = document.getElementById("keyboardSound");
  el.keyboardVolume = document.getElementById("keyboardVolume");
  el.keyboardTransposeDown = document.getElementById("keyboardTransposeDown");
  el.keyboardTransposeReset = document.getElementById("keyboardTransposeReset");
  el.keyboardTransposeUp = document.getElementById("keyboardTransposeUp");
  el.keyboardTransposeValue = document.getElementById("keyboardTransposeValue");
  el.keyboardSoundStatus = document.getElementById("keyboardSoundStatus");
  el.realKeyboard = document.getElementById("realKeyboard");
  el.audioFileInput = document.getElementById("audioFileInput");
  el.audioLibraryTab = document.getElementById("audioLibraryTab");
  el.audioPlaylistTab = document.getElementById("audioPlaylistTab");
  el.audioPlaylistSelect = document.getElementById("audioPlaylistSelect");
  el.audioNewPlaylistButton = document.getElementById("audioNewPlaylistButton");
  el.audioDeletePlaylistButton = document.getElementById("audioDeletePlaylistButton");
  el.audioLibraryStatus = document.getElementById("audioLibraryStatus");
  el.audioTrackList = document.getElementById("audioTrackList");
  el.audioNowTitle = document.getElementById("audioNowTitle");
  el.audioPreviousButton = document.getElementById("audioPreviousButton");
  el.audioPlayButton = document.getElementById("audioPlayButton");
  el.audioNextButton = document.getElementById("audioNextButton");
  el.audioProgress = document.getElementById("audioProgress");
  el.audioElapsed = document.getElementById("audioElapsed");
  el.audioDuration = document.getElementById("audioDuration");
  el.audioShuffleButton = document.getElementById("audioShuffleButton");
  el.audioRepeatButton = document.getElementById("audioRepeatButton");
  el.audioPlayer = document.getElementById("audioPlayer");
  el.pianoChordGuide = document.getElementById("pianoChordGuide");
  el.pianoStyle = document.getElementById("pianoStyle");
  el.pianoStyleRecipe = document.getElementById("pianoStyleRecipe");
  el.pianoChordRoot = document.getElementById("pianoChordRoot");
  el.pianoChordType = document.getElementById("pianoChordType");
  el.pianoChordPlayButton = document.getElementById("pianoChordPlayButton");
  el.pianoChordUse = document.getElementById("pianoChordUse");
  el.pianoChordNotes = document.getElementById("pianoChordNotes");
  el.pianoChordPartners = document.getElementById("pianoChordPartners");
  el.pianoChordFamily = document.getElementById("pianoChordFamily");
  el.chordGuideTab = document.getElementById("chordGuideTab");
  el.keyChangeTab = document.getElementById("keyChangeTab");
  el.keyChangeGuide = document.getElementById("keyChangeGuide");
  el.keyChangeRoot = document.getElementById("keyChangeRoot");
  el.keyChangeDown = document.getElementById("keyChangeDown");
  el.keyChangeUp = document.getElementById("keyChangeUp");
  el.keyChangeSteps = document.getElementById("keyChangeSteps");
  el.keyChangeResult = document.getElementById("keyChangeResult");
  el.keyChangeTable = document.getElementById("keyChangeTable");
  el.scaleGuideTab = document.getElementById("scaleGuideTab");
  el.scaleGuide = document.getElementById("scaleGuide");
  el.scaleRoot = document.getElementById("scaleRoot");
  el.scaleType = document.getElementById("scaleType");
  el.scalePlayButton = document.getElementById("scalePlayButton");
  el.scaleResult = document.getElementById("scaleResult");
  el.scaleTipText = document.getElementById("scaleTipText");

  el.detailContent = document.getElementById("detailContent");

  el.pdfViewer = document.getElementById("pdfViewer");
  el.pdfToolbar = document.querySelector(".pdf-toolbar");
  el.pdfAnnotateButton = document.getElementById("pdfAnnotateButton");
  el.pdfMobileToolsButton = document.getElementById("pdfMobileToolsButton");
  el.pdfMobileToolsMenu = document.getElementById("pdfMobileToolsMenu");
  el.pdfMobilePrintButton = document.getElementById("pdfMobilePrintButton");
  el.pdfMobileAnnotateButton = document.getElementById("pdfMobileAnnotateButton");
  el.pdfMobileThemeButton = document.getElementById("pdfMobileThemeButton");
  el.pdfMobileThemeLabel = el.pdfMobileThemeButton?.querySelector(".pdf-mobile-theme-label");
  el.pdfPageThemeToggleButton = document.getElementById("pdfPageThemeToggleButton");
  el.pdfTopTapZonesButton = document.getElementById("pdfTopTapZonesButton");
  el.pdfHomeButton = document.getElementById("pdfHomeButton");
  el.pdfTipsButton = document.getElementById("pdfTipsButton");
  el.pdfFollowButton = document.getElementById("pdfFollowButton");
  el.pdfSkipSongButton = document.getElementById("pdfSkipSongButton");
  el.pdfMetronomeButton = document.getElementById("pdfMetronomeButton");
  el.pdfTempoInput = document.getElementById("pdfTempoInput");
  el.pdfTempoUpButton = document.getElementById("pdfTempoUpButton");
  el.pdfTempoDownButton = document.getElementById("pdfTempoDownButton");
  el.pdfTitle = document.getElementById("pdfTitle");
  el.pdfPageStatus = document.getElementById("pdfPageStatus");
  el.pdfPageNotice = document.getElementById("pdfPageNotice");
  el.pdfPageMarker = document.getElementById("pdfPageMarker");
  el.pdfStage = document.getElementById("pdfStage");
  el.pdfZoneTips = document.getElementById("pdfZoneTips");
  el.pdfTipsShowOnOpen = document.getElementById("pdfTipsShowOnOpen");
  el.pdfLoading = document.getElementById("pdfLoading");
  el.pdfCanvas = document.getElementById("pdfCanvas");
  el.pdfAnnotationCanvas = document.getElementById("pdfAnnotationCanvas");
  el.pdfAnnotationToolbar = document.getElementById("pdfAnnotationToolbar");
  el.pdfAnnotationNotice = document.getElementById("pdfAnnotationNotice");
  el.pdfAnnotationUndoButton = document.getElementById("pdfAnnotationUndoButton");
  el.pdfAnnotationClearButton = document.getElementById("pdfAnnotationClearButton");
  el.pdfAnnotationPreviousButton = document.getElementById("pdfAnnotationPreviousButton");
  el.pdfAnnotationNextButton = document.getElementById("pdfAnnotationNextButton");
  el.pdfAnnotationDoneButton = document.getElementById("pdfAnnotationDoneButton");
  el.pdfTapLeft = document.getElementById("pdfTapLeft");
  el.pdfTapRight = document.getElementById("pdfTapRight");
  el.pdfSettingsLayer = document.getElementById("pdfSettingsLayer");
  el.pdfSettingsCloseButton = document.getElementById("pdfSettingsCloseButton");
  el.pdfSettingsApplyButton = document.getElementById("pdfSettingsApplyButton");
  el.pdfPrintButton = document.getElementById("pdfPrintButton");
  el.pdfNumberingModeOptions = Array.from(document.querySelectorAll('input[name="pdfNumberingMode"]'));
  el.pdfRepeatListEnabled = document.getElementById("pdfRepeatListEnabled");
  el.pdfSongNumberingFields = document.getElementById("pdfSongNumberingFields");
  el.pdfSongStartButton = document.getElementById("pdfSongStartButton");
  el.pdfSongPageCount = document.getElementById("pdfSongPageCount");
  el.pdfSongNumberingStatus = document.getElementById("pdfSongNumberingStatus");
  el.pdfMetronomeEnabled = document.getElementById("pdfMetronomeEnabled");
  el.pdfSettingsTempoRow = document.getElementById("pdfSettingsTempoRow");
  el.pdfSettingsTempoInput = document.getElementById("pdfSettingsTempoInput");

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
  el.cardImageControls = document.getElementById("cardImageControls");
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
  el.importCardSubtypeRow = document.getElementById("importCardSubtypeRow");
  el.importCardSubtype = document.getElementById("importCardSubtype");
  el.importCardSubtypeCustomRow = document.getElementById("importCardSubtypeCustomRow");
  el.importCardSubtypeCustom = document.getElementById("importCardSubtypeCustom");
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
  el.importDiscardButton = document.getElementById("importDiscardButton");

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
  el.importDiscardButton.addEventListener("click", closeImportModal);
  el.importDeleteButton.addEventListener("click", handleDeleteItemFromForm);
  el.importType.addEventListener("change", updateImportTypeFields);
  el.importCardSubtype.addEventListener("change", handleCardSubtypeChange);
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
  el.cardImageControls.addEventListener("click", handleCardImageControlClick);
  el.importForm.addEventListener("submit", handleImportSubmit);
  el.listEditCloseButton.addEventListener("click", closeListEditModal);
  el.listEditDeleteButton.addEventListener("click", handleDeleteListFromForm);
  el.listEditForm.addEventListener("submit", saveListEditModal);
  el.listEditSort.addEventListener("change", () => {
    state.listEditSort = normalizeListEditSort(el.listEditSort.value);
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
  el.pianoSoundButtons.forEach((button) => button.addEventListener("click", () => selectVisualPianoSound(button.dataset.pianoSound)));
  el.pianoMoreSoundsButton.addEventListener("click", () => setPianoMoreSounds(el.pianoMoreSounds.hidden));
  el.pianoVolume.addEventListener("input", handlePianoVolumeChange);
  el.pianoShape.addEventListener("change", handlePianoShapeChange);
  el.pianoShapeButtons.forEach((button) => button.addEventListener("click", () => {
    el.pianoShape.value = button.dataset.pianoShape;
    handlePianoShapeChange();
  }));
  initializeSidetrackActivities();
  el.pianoEffectPads.forEach((button) => button.addEventListener("click", () => playPianoEffect(button.dataset.pianoEffect, button)));
  el.keyboardSound.addEventListener("change", handlePianoSoundChange);
  el.keyboardVolume.addEventListener("input", handlePianoVolumeChange);
  el.keyboardTransposeDown.addEventListener("click", () => adjustKeyboardTranspose(-1));
  el.keyboardTransposeReset.addEventListener("click", () => setKeyboardTranspose(0));
  el.keyboardTransposeUp.addEventListener("click", () => adjustKeyboardTranspose(1));
  el.pianoStyle.addEventListener("change", applyPianoStyleGuide);
  el.pianoStyleRecipe.addEventListener("click", handlePianoStyleRecipeClick);
  el.pianoChordRoot.addEventListener("change", handlePianoChordRootChange);
  el.pianoChordType.addEventListener("change", renderPianoChordGuide);
  el.pianoChordPlayButton.addEventListener("click", playPianoGuideChord);
  el.chordGuideTab.addEventListener("click", () => showKeyboardGuide("chord"));
  el.keyChangeTab.addEventListener("click", () => showKeyboardGuide("key"));
  el.scaleGuideTab.addEventListener("click", () => showKeyboardGuide("scale"));
  el.keyChangeRoot.addEventListener("change", renderKeyChangeGuide);
  el.keyChangeDown.addEventListener("click", () => adjustKeyChange(-1));
  el.keyChangeUp.addEventListener("click", () => adjustKeyChange(1));
  el.keyChangeTable.addEventListener("click", handleKeyChangeTableClick);
  el.scaleRoot.addEventListener("change", renderPianoScaleGuide);
  el.scaleType.addEventListener("change", renderPianoScaleGuide);
  el.scalePlayButton.addEventListener("click", playPianoScale);
  el.audioFileInput.addEventListener("change", importAudioFiles);
  el.audioLibraryTab.addEventListener("click", () => setAudioMode("library"));
  el.audioPlaylistTab.addEventListener("click", () => setAudioMode("playlist"));
  el.audioPlaylistSelect.addEventListener("change", selectAudioPlaylist);
  el.audioNewPlaylistButton.addEventListener("click", createAudioPlaylist);
  el.audioDeletePlaylistButton.addEventListener("click", deleteAudioPlaylist);
  el.audioTrackList.addEventListener("click", handleAudioTrackAction);
  el.audioPlayButton.addEventListener("click", toggleAudioPlayback);
  el.audioPreviousButton.addEventListener("click", () => playAdjacentAudio(-1));
  el.audioNextButton.addEventListener("click", () => playAdjacentAudio(1));
  el.audioProgress.addEventListener("input", seekAudioTrack);
  el.audioShuffleButton.addEventListener("click", toggleAudioShuffle);
  el.audioRepeatButton.addEventListener("click", toggleAudioRepeat);
  el.audioPlayer.addEventListener("play", renderAudioPlayer);
  el.audioPlayer.addEventListener("pause", renderAudioPlayer);
  el.audioPlayer.addEventListener("timeupdate", renderAudioProgress);
  el.audioPlayer.addEventListener("loadedmetadata", renderAudioProgress);
  el.audioPlayer.addEventListener("ended", handleAudioEnded);
  document.querySelectorAll(".piano-note, .keyboard-key").forEach((button) => {
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
      stopCardSpeech();
    }
  });
  window.addEventListener("beforeunload", () => {
    stopMetronome();
    stopTuner();
    stopPitch();
    stopAllPianoVoices();
    stopCardSpeech();
    if (state.audio.objectUrl) URL.revokeObjectURL(state.audio.objectUrl);
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
  document.body.addEventListener("pointerdown", handleCardDragPointerDown);
  document.body.addEventListener("pointermove", handleCardDragPointerMove, { passive: false });
  document.body.addEventListener("pointerup", handleCardDragPointerUp);
  document.body.addEventListener("pointercancel", handleCardDragPointerCancel);
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

  el.pdfAnnotateButton.addEventListener("click", () => setPdfAnnotationMode(!state.pdfAnnotation.active));
  el.pdfMobileToolsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePdfMobileToolsMenu();
  });
  el.pdfMobileToolsMenu.addEventListener("click", (event) => event.stopPropagation());
  el.pdfMobilePrintButton.addEventListener("click", () => {
    closePdfMobileToolsMenu();
    printCurrentPdf();
  });
  el.pdfMobileAnnotateButton.addEventListener("click", () => {
    closePdfMobileToolsMenu();
    setPdfAnnotationMode(!state.pdfAnnotation.active);
  });
  el.pdfMobileThemeButton.addEventListener("click", () => {
    togglePdfPageTheme();
    closePdfMobileToolsMenu();
  });
  document.addEventListener("click", closePdfMobileToolsMenu);
  el.pdfPageThemeToggleButton.addEventListener("click", togglePdfPageTheme);
  el.pdfTopTapZonesButton.addEventListener("click", () => {
    const guideIsVisible = el.pdfViewer.classList.contains("show-tips");
    if (guideIsVisible) {
      dismissPdfTips();
      return;
    }
    syncPdfTipsPreference();
    setPdfTipsVisible(true, 0, "manual");
  });
  el.pdfHomeButton.addEventListener("click", returnFromPdfViewer);
  el.pdfTipsButton.addEventListener("click", togglePdfTips);
  el.pdfSettingsCloseButton.addEventListener("click", closePdfSettings);
  el.pdfSettingsApplyButton.addEventListener("click", applyPdfSettings);
  el.pdfPrintButton.addEventListener("click", printCurrentPdf);
  el.pdfAnnotationToolbar.querySelectorAll("[data-annotation-tool]").forEach((button) => button.addEventListener("click", () => selectPdfAnnotationTool(button.dataset.annotationTool)));
  el.pdfAnnotationToolbar.querySelectorAll("[data-annotation-color]").forEach((button) => button.addEventListener("click", () => selectPdfAnnotationColor(button.dataset.annotationColor)));
  el.pdfAnnotationUndoButton.addEventListener("click", undoPdfAnnotation);
  el.pdfAnnotationClearButton.addEventListener("click", clearPdfAnnotationsForPage);
  el.pdfAnnotationPreviousButton.addEventListener("click", () => goToPdfPage(state.currentPdf.pageNumber - 1));
  el.pdfAnnotationNextButton.addEventListener("click", () => goToPdfPage(state.currentPdf.pageNumber + 1));
  el.pdfAnnotationDoneButton.addEventListener("click", () => setPdfAnnotationMode(false));
  el.pdfAnnotationCanvas.addEventListener("pointerdown", handlePdfAnnotationPointerDown);
  el.pdfAnnotationCanvas.addEventListener("pointermove", handlePdfAnnotationPointerMove);
  el.pdfAnnotationCanvas.addEventListener("pointerup", finishPdfAnnotationPointer);
  el.pdfAnnotationCanvas.addEventListener("pointercancel", finishPdfAnnotationPointer);
  el.pdfSettingsLayer.addEventListener("click", (event) => {
    if (event.target === el.pdfSettingsLayer) closePdfSettings();
  });
  el.pdfNumberingModeOptions.forEach((option) => option.addEventListener("change", updatePdfSettingsDraft));
  el.pdfRepeatListEnabled.addEventListener("change", updatePdfSettingsDraft);
  el.pdfSongStartButton.addEventListener("click", setDraftPdfSongStart);
  el.pdfSongPageCount.addEventListener("change", updatePdfSettingsDraft);
  el.pdfMetronomeEnabled.addEventListener("change", updatePdfSettingsDraft);
  el.pdfSettingsTempoInput.addEventListener("change", updatePdfSettingsDraft);
  el.pdfFollowButton.addEventListener("click", togglePdfFollow);
  el.pdfSkipSongButton.addEventListener("click", skipCurrentPdfInList);
  el.pdfZoneTips.addEventListener("click", handlePdfZoneTipsClick);
  el.pdfTipsShowOnOpen.addEventListener("change", updatePdfSettingsDraft);
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
    if (state.activeSection === "piano") applyPianoShape();
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

async function refreshAppShell(button = null) {
  closeOverflowMenu();
  closeInfoMenu();
  closeListMoreMenu();

  if (button) {
    button.disabled = true;
    button.textContent = "Checking…";
  }

  if (!navigator.onLine) {
    if (button) {
      button.disabled = false;
      button.textContent = "Check for updates";
    }
    showAppNotice("You are offline. Your installed version is still available.");
    return;
  }

  try {
    sessionStorage.setItem(UPDATE_CHECK_SESSION_KEY, JSON.stringify({
      fromBuild: APP_BUILD_VERSION,
      requestedAt: Date.now()
    }));
  } catch {
    // Update checking still works when session storage is unavailable.
  }

  try {
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

function showPendingUpdateResult() {
  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem(UPDATE_CHECK_SESSION_KEY) || "null");
    sessionStorage.removeItem(UPDATE_CHECK_SESSION_KEY);
  } catch {
    pending = null;
  }
  if (!pending || Date.now() - Number(pending.requestedAt || 0) > 5 * 60 * 1000) return;

  const updated = pending.fromBuild && pending.fromBuild !== APP_BUILD_VERSION;
  showAppNotice(updated
    ? `MusicDocs was updated to build ${APP_BUILD_VERSION}.`
    : `MusicDocs is up to date (build ${APP_BUILD_VERSION}).`);
}

function showAppNotice(message) {
  if (!el.appUpdateNotice) return;
  window.clearTimeout(state.appNoticeTimer);
  el.appUpdateNotice.textContent = message;
  el.appUpdateNotice.classList.remove("hidden");
  state.appNoticeTimer = window.setTimeout(() => el.appUpdateNotice.classList.add("hidden"), 5000);
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
  el.overflowMenuButton.classList.toggle("active", ["metronome", "tuner", "pitch", "piano", "keyboard", "audio"].includes(sectionName));
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

  const dragHandle = event.target.closest?.("[data-favorite-drag], [data-card-drag], [data-list-drag], [data-list-item-drag]");
  if (dragHandle && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();
    const direction = event.key === "ArrowUp" ? "up" : "down";
    if (dragHandle.dataset.favoriteDrag) {
      moveFavoriteOrderStep(dragHandle.dataset.favoriteDrag, direction);
    } else if (dragHandle.dataset.cardDrag) {
      moveCardOrderStep(dragHandle.dataset.cardDrag, direction);
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
  closePdfSettings();
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
  state.data.items = normalizeBuiltInLyricCardTitles(applyLocalItemEdits(baseItems));
  state.itemsById = new Map(state.data.items.map((item) => [item.id, item]));
}

function normalizeBuiltInLyricCardTitles(items) {
  return (items || []).map((item) => {
    if (!item?.lyricsCard || !String(item.id || "").startsWith("lyrics-card-")) return item;
    const title = normalizeVisibleText(item.title).replace(/\s+-\s+Lyrics$/i, "").trim();
    return title && title !== item.title ? { ...item, title } : item;
  });
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
    if (existing?.title === "Holiday" && starter.title === "Events") {
      existing.title = "Events";
      listsChanged = true;
    }
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
  if (!("serviceWorker" in navigator)) {
    setOfflineReadiness(false, "Offline mode unavailable");
    return;
  }
  navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then(async (registration) => {
    await registration.update();
    const readyRegistration = await navigator.serviceWorker.ready;
    await checkOfflineReadiness(readyRegistration);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.setTimeout(() => checkOfflineReadiness(readyRegistration), 300);
    });
  }).catch(() => setOfflineReadiness(false, "Offline setup incomplete"));
}

function checkOfflineReadiness(registration) {
  return new Promise((resolve) => {
    const worker = registration?.active || navigator.serviceWorker.controller;
    if (!worker) {
      setOfflineReadiness(false, "Preparing offline access…", "checking");
      resolve(false);
      return;
    }
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      setOfflineReadiness(false, navigator.onLine ? "Preparing offline access…" : "Offline files are incomplete", navigator.onLine ? "checking" : "incomplete");
      resolve(false);
    }, 10000);
    channel.port1.onmessage = ({ data }) => {
      if (data?.type !== "OFFLINE_READY_STATUS") return;
      window.clearTimeout(timer);
      if (data.ready) setOfflineReadiness(true, "✓ Ready offline");
      else setOfflineReadiness(false, navigator.onLine ? "Preparing offline access…" : "Offline files are incomplete — connect to finish setup", navigator.onLine ? "checking" : "incomplete");
      resolve(Boolean(data.ready));
    };
    worker.postMessage({ type: "CHECK_OFFLINE_READY" }, [channel.port2]);
  });
}

function setOfflineReadiness(ready, text, mode = "") {
  if (!el.offlineReadiness) return;
  el.offlineReadiness.textContent = text;
  el.offlineReadiness.classList.toggle("is-ready", ready);
  el.offlineReadiness.classList.toggle("is-incomplete", !ready && mode === "incomplete");
  el.offlineReadiness.classList.toggle("is-checking", !ready && mode !== "incomplete");
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
  state.selectedCardImage = null;
  el.importType.value = "pdf";
  el.importCategory.value = "";
  el.importCardSubtypeCustom.value = "";
  refreshCardSubtypeOptions("");
  el.importCardContent.value = "";
  el.importPlainContent.value = "";
  el.importCardEditor.innerHTML = "";
  updateCardImageControls();
  el.cardFontPicker.value = "Georgia";
  updateFilePickerName(el.importPdfFile, el.importPdfFileName);
  updateFilePickerName(el.importCardImage, el.importCardImageName, "No image selected");
  el.importType.disabled = false;
  el.importDialogTitle.textContent = "Add item";
  el.importSaveButton.innerHTML = "&#10003;";
  el.importSaveButton.setAttribute("aria-label", "Save");
  el.importSaveButton.title = "Save";
  el.importTitleLabel.textContent = "Title";
  el.importTitleField.required = false;
  el.importDiscardButton.classList.add("hidden");
  el.importDeleteButton.classList.add("hidden");
  setImportStatus("");
}

function normalizeCardSubtype(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
}

function getCardSubtype(item) {
  const subtype = normalizeCardSubtype(item?.cardSubtype);
  if (subtype) return subtype;
  return item?.lyricsCard ? "Lyrics" : "";
}

function getRememberedCardSubtypes() {
  const saved = readJson(STORAGE_KEYS.cardSubtypes, []);
  if (!Array.isArray(saved)) return [];
  const seen = new Set(CARD_SUBTYPE_PRESETS.map((label) => label.toLowerCase()));
  return saved.map(normalizeCardSubtype).filter((label) => {
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function rememberCardSubtype(value) {
  const label = normalizeCardSubtype(value);
  if (!label || CARD_SUBTYPE_PRESETS.some((preset) => preset.toLowerCase() === label.toLowerCase())) return;
  const labels = getRememberedCardSubtypes().filter((saved) => saved.toLowerCase() !== label.toLowerCase());
  writeJson(STORAGE_KEYS.cardSubtypes, [label, ...labels].slice(0, 12));
}

function refreshCardSubtypeOptions(selectedValue = "") {
  const selected = normalizeCardSubtype(selectedValue);
  const custom = getRememberedCardSubtypes();
  if (selected
    && !CARD_SUBTYPE_PRESETS.some((label) => label.toLowerCase() === selected.toLowerCase())
    && !custom.some((label) => label.toLowerCase() === selected.toLowerCase())) {
    custom.unshift(selected);
  }
  const labels = [...CARD_SUBTYPE_PRESETS, ...custom];
  el.importCardSubtype.innerHTML = `
    <option value="">Choose a subtype</option>
    ${labels.map((label) => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join("")}
    <option value="${CARD_SUBTYPE_OTHER}">Other...</option>
  `;
  const match = labels.find((label) => label.toLowerCase() === selected.toLowerCase());
  el.importCardSubtype.value = match || "";
  syncCardSubtypeFields();
}

function syncCardSubtypeFields() {
  const isCard = el.importType.value === "card";
  el.importCardSubtypeRow.classList.toggle("hidden", !isCard);
  el.importCardSubtypeCustomRow.classList.toggle("hidden", !isCard || el.importCardSubtype.value !== CARD_SUBTYPE_OTHER);
}

function handleCardSubtypeChange() {
  syncCardSubtypeFields();
  if (el.importCardSubtype.value === CARD_SUBTYPE_OTHER) el.importCardSubtypeCustom.focus();
}

function getCardSubtypeFromForm() {
  if (el.importCardSubtype.value !== CARD_SUBTYPE_OTHER) {
    return normalizeCardSubtype(el.importCardSubtype.value);
  }
  const custom = normalizeCardSubtype(el.importCardSubtypeCustom.value);
  if (!custom) throw new Error("Enter a custom card subtype before saving.");
  return custom;
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
  const titleRequired = type === "card";
  el.importTitleLabel.innerHTML = titleRequired
    ? `Title <span class="required-marker" aria-hidden="true">*</span><span class="sr-only"> (required)</span>`
    : "Title";
  el.importTitleField.required = titleRequired;
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
  el.importDiscardButton.classList.toggle("hidden", editing || type !== "card");

  el.importCategoryRow.classList.toggle("hidden", linkOnly);
  syncCardSubtypeFields();
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
  // Card photos are inserted from the editor toolbar so sizing is explicit.
  // Keep the legacy field in the DOM for older saved cards, but do not offer a
  // second, conflicting image workflow.
  el.importCardImageRow.classList.add("hidden");
  el.richCardContentRow.classList.toggle("hidden", type !== "card");
  el.plainCardContentRow.classList.toggle("hidden", type !== "note");
  el.linkImportFields.classList.toggle("hidden", type !== "link");
  syncCardSubtypeFields();
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
  refreshCardSubtypeOptions(getCardSubtype(item));
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
  const face = CARD_FONT_FACES.includes(el.cardFontPicker.value) ? el.cardFontPicker.value : "Georgia";
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
  state.selectedCardImage = image && el.importCardEditor.contains(image) ? image : null;
  updateCardImageControls();
}

function normalizeCardImageSize(value) {
  if (value === "small") return "thumbnail";
  if (value === "large") return "full";
  return ["thumbnail", "medium", "full"].includes(value) ? value : "thumbnail";
}

function updateCardImageControls() {
  if (!el.cardImageControls) return;
  const image = state.selectedCardImage;
  const isSelected = Boolean(image && image.isConnected && el.importCardEditor.contains(image));
  el.cardImageControls.classList.toggle("hidden", !isSelected);
  if (!isSelected) {
    state.selectedCardImage = null;
    return;
  }
  const size = normalizeCardImageSize(image.dataset.cardImageSize);
  image.dataset.cardImageSize = size;
  el.cardImageControls.querySelectorAll("[data-card-image-size-choice]").forEach((button) => {
    const active = button.dataset.cardImageSizeChoice === size;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function handleCardImageControlClick(event) {
  const image = state.selectedCardImage;
  if (!image || !image.isConnected) {
    updateCardImageControls();
    return;
  }
  const sizeButton = event.target.closest("[data-card-image-size-choice]");
  if (sizeButton) {
    image.dataset.cardImageSize = sizeButton.dataset.cardImageSizeChoice;
    image.title = "Select image to change its size";
    syncCardEditorToHiddenField();
    updateCardImageControls();
    setImportStatus(`Image size: ${sizeButton.textContent.trim()}.`);
    return;
  }
  if (event.target.closest("[data-card-image-remove]")) {
    image.remove();
    state.selectedCardImage = null;
    syncCardEditorToHiddenField();
    updateCardImageControls();
    setImportStatus("Image removed from this card.");
  }
}

async function handleInlineCardImageSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await imageFileToCardDataUrl(file);
    const marker = `new-card-image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    insertCardEditorHtml(`<img src="${escapeHtml(dataUrl)}" alt="" data-card-image-size="thumbnail" data-new-card-image="${marker}" title="Select image to change its size"><div><br></div>`);
    state.selectedCardImage = el.importCardEditor.querySelector(`[data-new-card-image="${marker}"]`);
    state.selectedCardImage?.removeAttribute("data-new-card-image");
    syncCardEditorToHiddenField();
    updateRichToolbarState();
    updateCardImageControls();
    setImportStatus("Image added as a thumbnail. Choose its size below the image.");
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
  let inChorus = false;
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => {
      const verse = line.match(/^(\d+\.)\s+(.*)$/);
      if (verse) {
        inChorus = false;
        return `<p>${escapeHtml(verse[1])} ${escapeHtml(verse[2])}</p>`;
      }
      if (/^chorus:?$/i.test(line)) {
        inChorus = true;
        return `<p><strong>${escapeHtml(line)}</strong></p>`;
      }
      if (/^(by\s|©|copyright\b)/i.test(line.trim())) inChorus = false;
      if (line && inChorus) return `<div><em>${escapeHtml(line)}</em></div>`;
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
      if (tagName === "IMG" && name === "data-card-image-size" && ["small", "medium", "large", "thumbnail", "full"].includes(attr.value)) {
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
  const enteredTitle = el.importTitleField.value.trim();
  if (type === "card" && !enteredTitle) {
    throw new Error("Enter a title before saving the card.");
  }
  const title = enteredTitle || fallbackTitle;
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
    const cardSubtype = getCardSubtypeFromForm();
    fields.cardSubtype = cardSubtype;
    rememberCardSubtype(cardSubtype);
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
  const savedImported = getImportedItems();
  const imported = savedImported.filter((item) => !isEmptyUntitledCard(item));
  if (imported.length !== savedImported.length) {
    writeJson(STORAGE_KEYS.importedItems, imported);
  }
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

function isEmptyUntitledCard(item) {
  if (item?.type !== "card" || normalize(item.title) !== "untitled card") return false;
  const cardText = item.cardHtml ? htmlToPlainText(item.cardHtml) : "";
  const content = Array.isArray(item.content) ? item.content.join(" ") : item.content;
  return ![
    cardText,
    content,
    item.lyricsText,
    item.body,
    item.notes,
    item.imageFileId,
    item.imageData,
    item.imageUrl,
    item.imageFileName
  ].some((value) => normalizeVisibleText(value));
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

  const annotations = readJson(STORAGE_KEYS.pdfAnnotations, {});
  let annotationsChanged = false;
  duplicateMap.forEach((keptId, removedId) => {
    if (annotations[removedId]) {
      annotations[keptId] = { ...(annotations[removedId] || {}), ...(annotations[keptId] || {}) };
      delete annotations[removedId];
      annotationsChanged = true;
    }
  });
  if (annotationsChanged) writeJson(STORAGE_KEYS.pdfAnnotations, annotations);

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

  const title = itemDisplayTitle(item);
  const ok = window.confirm(`Delete "${title}" from this app?\n\nIt will also be removed from Favorites and every list on this device. This cannot be undone.`);
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
  const pdfAnnotations = readJson(STORAGE_KEYS.pdfAnnotations, {});
  delete pdfAnnotations[itemId];
  writeJson(STORAGE_KEYS.pdfAnnotations, pdfAnnotations);

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
  if (sectionName !== "detail") stopCardSpeech();

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
  const funTitle = document.getElementById("pianoTitle");
  funTitle?.classList.remove("fun-title-animated");
  if (sectionName === "piano") {
    window.requestAnimationFrame(() => {
      applyPianoShape();
      funTitle?.classList.add("fun-title-animated");
    });
  }
}

async function loadAudioLibrary() {
  state.audio.tracks = readJson(STORAGE_KEYS.audioTracks, []);
  state.audio.playlists = readJson(STORAGE_KEYS.audioPlaylists, []);
  state.audio.selectedPlaylistId = localStorage.getItem(STORAGE_KEYS.audioSelectedPlaylist) || "";

  if (!Array.isArray(state.audio.tracks)) state.audio.tracks = [];
  if (!Array.isArray(state.audio.playlists)) state.audio.playlists = [];
  state.audio.tracks = state.audio.tracks.filter((track) => track?.id && track?.title);
  state.audio.playlists = state.audio.playlists
    .filter((playlist) => playlist?.id && playlist?.name)
    .map((playlist) => ({
      ...playlist,
      trackIds: Array.isArray(playlist.trackIds)
        ? playlist.trackIds.filter((id) => state.audio.tracks.some((track) => track.id === id))
        : []
    }));

  if (!state.audio.playlists.length) {
    state.audio.playlists.push({
      id: "audio-playlist-default",
      name: "My Playlist",
      trackIds: []
    });
  }
  if (!state.audio.playlists.some((playlist) => playlist.id === state.audio.selectedPlaylistId)) {
    state.audio.selectedPlaylistId = state.audio.playlists[0].id;
  }
  saveAudioLibrary();
  setupAudioMediaSession();
}

function saveAudioLibrary() {
  writeJson(STORAGE_KEYS.audioTracks, state.audio.tracks);
  writeJson(STORAGE_KEYS.audioPlaylists, state.audio.playlists);
  localStorage.setItem(STORAGE_KEYS.audioSelectedPlaylist, state.audio.selectedPlaylistId);
}

function openAudioDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser cannot store audio files."));
      return;
    }
    const request = indexedDB.open(AUDIO_DB_NAME, AUDIO_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        database.createObjectStore(AUDIO_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Audio storage could not be opened."));
  });
}

async function writeAudioBlob(id, blob) {
  const database = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).put({ id, blob });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("The audio file could not be saved."));
    };
  });
}

async function readAudioBlob(id) {
  const database = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readonly");
    const request = transaction.objectStore(AUDIO_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error || new Error("The audio file could not be read."));
    transaction.oncomplete = () => database.close();
  });
}

async function deleteAudioBlob(id) {
  const database = await openAudioDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE_NAME, "readwrite");
    transaction.objectStore(AUDIO_STORE_NAME).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("The audio file could not be deleted."));
    };
  });
}

async function importAudioFiles(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("audio/") || file.type === "video/mp4" || /\.(mp3|mp4|m4a|aac|wav|ogg)$/i.test(file.name));
  event.target.value = "";
  if (!files.length) {
    setAudioStatus("Choose an MP3, MP4, M4A, AAC, WAV, or OGG recording.");
    return;
  }

  setAudioStatus(`Adding ${files.length} ${files.length === 1 ? "track" : "tracks"}…`);
  const playlist = getSelectedAudioPlaylist();
  let added = 0;
  for (const file of files) {
    const id = `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      await writeAudioBlob(id, file);
      state.audio.tracks.push({
        id,
        title: file.name.replace(/\.[^.]+$/, "") || "Untitled audio",
        artist: "",
        fileName: file.name,
        type: file.type || "audio",
        size: file.size,
        addedAt: Date.now()
      });
      if (playlist && !playlist.trackIds.includes(id)) playlist.trackIds.push(id);
      added += 1;
    } catch (error) {
      console.warn("Audio import failed", error);
    }
  }
  saveAudioLibrary();
  renderAudioLibrary();
  setAudioStatus(added
    ? `${added} ${added === 1 ? "track" : "tracks"} added to this device${playlist ? ` and “${playlist.name}”` : ""}.`
    : "The selected audio could not be stored on this device.");
}

function setAudioMode(mode) {
  state.audio.mode = mode === "playlist" ? "playlist" : "library";
  renderAudioLibrary();
}

function selectAudioPlaylist() {
  state.audio.selectedPlaylistId = el.audioPlaylistSelect.value;
  saveAudioLibrary();
  renderAudioLibrary();
}

function getSelectedAudioPlaylist() {
  return state.audio.playlists.find((playlist) => playlist.id === state.audio.selectedPlaylistId) || state.audio.playlists[0] || null;
}

function createAudioPlaylist() {
  const requestedName = window.prompt("Name this playlist:", "New Playlist");
  const name = requestedName?.trim();
  if (!name) return;
  const playlist = {
    id: `audio-playlist-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    trackIds: []
  };
  state.audio.playlists.push(playlist);
  state.audio.selectedPlaylistId = playlist.id;
  state.audio.mode = "playlist";
  saveAudioLibrary();
  renderAudioLibrary();
  setAudioStatus(`“${name}” is ready. Add tracks from All audio.`);
}

function deleteAudioPlaylist() {
  const playlist = getSelectedAudioPlaylist();
  if (!playlist || state.audio.playlists.length <= 1) return;
  if (!window.confirm(`Delete the playlist “${playlist.name}”? The audio files will remain in All audio.`)) return;
  state.audio.playlists = state.audio.playlists.filter((entry) => entry.id !== playlist.id);
  state.audio.selectedPlaylistId = state.audio.playlists[0].id;
  saveAudioLibrary();
  renderAudioLibrary();
  setAudioStatus("Playlist deleted. Its audio files remain in All audio.");
}

function getVisibleAudioTracks() {
  if (state.audio.mode !== "playlist") return [...state.audio.tracks];
  const playlist = getSelectedAudioPlaylist();
  if (!playlist) return [];
  return playlist.trackIds
    .map((id) => state.audio.tracks.find((track) => track.id === id))
    .filter(Boolean);
}

function renderAudioLibrary() {
  if (!el.audioTrackList) return;
  const playlist = getSelectedAudioPlaylist();
  el.audioPlaylistSelect.innerHTML = "";
  state.audio.playlists.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    option.selected = entry.id === state.audio.selectedPlaylistId;
    el.audioPlaylistSelect.appendChild(option);
  });
  el.audioLibraryTab.classList.toggle("active", state.audio.mode === "library");
  el.audioPlaylistTab.classList.toggle("active", state.audio.mode === "playlist");
  el.audioLibraryTab.setAttribute("aria-selected", String(state.audio.mode === "library"));
  el.audioPlaylistTab.setAttribute("aria-selected", String(state.audio.mode === "playlist"));
  el.audioDeletePlaylistButton.disabled = state.audio.playlists.length <= 1;
  el.audioPlaylistSelect.closest(".audio-playlist-bar")?.classList.toggle("playlist-active", state.audio.mode === "playlist");

  const tracks = getVisibleAudioTracks();
  state.audio.queue = tracks.map((track) => track.id);
  if (!tracks.length) {
    el.audioTrackList.innerHTML = `
      <div class="audio-empty">
        <strong>${state.audio.mode === "playlist" ? "This playlist is empty" : "Your Audio Library is ready"}</strong>
        <p>${state.audio.mode === "playlist"
          ? "Open All audio and use + Playlist beside a track."
          : "Add a practice recording stored on this device. MP3, MP4, M4A, AAC, WAV, and OGG are supported when the browser can play them."}</p>
      </div>`;
  } else {
    el.audioTrackList.innerHTML = tracks.map((track, index) => {
      const isCurrent = track.id === state.audio.currentTrackId;
      const inPlaylist = Boolean(playlist?.trackIds.includes(track.id));
      const actions = state.audio.mode === "playlist"
        ? `
          <button type="button" data-audio-action="up" data-track-id="${escapeHtml(track.id)}" aria-label="Move up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-audio-action="down" data-track-id="${escapeHtml(track.id)}" aria-label="Move down" ${index === tracks.length - 1 ? "disabled" : ""}>↓</button>
          <button class="danger-text" type="button" data-audio-action="remove" data-track-id="${escapeHtml(track.id)}">Remove</button>`
        : `
          <button type="button" data-audio-action="add" data-track-id="${escapeHtml(track.id)}" ${inPlaylist ? "disabled" : ""}>${inPlaylist ? "In playlist" : "+ Playlist"}</button>
          <button class="danger-text" type="button" data-audio-action="delete" data-track-id="${escapeHtml(track.id)}" aria-label="Delete ${escapeHtml(track.title)}">Delete</button>`;
      return `
        <article class="audio-track-row ${isCurrent ? "is-current" : ""}">
          <button class="audio-track-play" type="button" data-audio-action="play" data-track-id="${escapeHtml(track.id)}" aria-label="Play ${escapeHtml(track.title)}">${isCurrent && !el.audioPlayer.paused ? "❚❚" : "▶"}</button>
          <div class="audio-track-copy">
            <strong>${escapeHtml(track.title)}</strong>
            <span>${escapeHtml(audioTypeLabel(track))} · ${formatAudioSize(track.size)}</span>
          </div>
          <div class="audio-track-actions">${actions}</div>
        </article>`;
    }).join("");
  }
  renderAudioPlayer();
}

async function handleAudioTrackAction(event) {
  const button = event.target.closest("[data-audio-action]");
  if (!button) return;
  const { audioAction: action, trackId } = button.dataset;
  if (action === "play") {
    if (trackId === state.audio.currentTrackId) toggleAudioPlayback();
    else await playAudioTrack(trackId);
    return;
  }
  const playlist = getSelectedAudioPlaylist();
  if (action === "add" && playlist && !playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    saveAudioLibrary();
    renderAudioLibrary();
    setAudioStatus(`Added to “${playlist.name}”.`);
  } else if (action === "remove" && playlist) {
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
    saveAudioLibrary();
    renderAudioLibrary();
  } else if ((action === "up" || action === "down") && playlist) {
    const currentIndex = playlist.trackIds.indexOf(trackId);
    const nextIndex = currentIndex + (action === "up" ? -1 : 1);
    if (currentIndex >= 0 && nextIndex >= 0 && nextIndex < playlist.trackIds.length) {
      [playlist.trackIds[currentIndex], playlist.trackIds[nextIndex]] = [playlist.trackIds[nextIndex], playlist.trackIds[currentIndex]];
      saveAudioLibrary();
      renderAudioLibrary();
    }
  } else if (action === "delete") {
    await deleteAudioTrack(trackId);
  }
}

async function deleteAudioTrack(trackId) {
  const track = state.audio.tracks.find((entry) => entry.id === trackId);
  if (!track || !window.confirm(`Delete “${track.title}” from this device?`)) return;
  if (state.audio.currentTrackId === trackId) stopAudioPlayback();
  state.audio.tracks = state.audio.tracks.filter((entry) => entry.id !== trackId);
  state.audio.playlists.forEach((playlist) => {
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId);
  });
  try {
    await deleteAudioBlob(trackId);
  } catch (error) {
    console.warn("Audio blob deletion failed", error);
  }
  saveAudioLibrary();
  renderAudioLibrary();
  setAudioStatus("Audio deleted from this device.");
}

async function playAudioTrack(trackId) {
  const track = state.audio.tracks.find((entry) => entry.id === trackId);
  if (!track) return;
  try {
    const blob = await readAudioBlob(trackId);
    if (!blob) throw new Error("The stored audio file is missing.");
    if (state.audio.objectUrl) URL.revokeObjectURL(state.audio.objectUrl);
    state.audio.objectUrl = URL.createObjectURL(blob);
    state.audio.currentTrackId = trackId;
    state.audio.queue = getVisibleAudioTracks().map((entry) => entry.id);
    el.audioPlayer.src = state.audio.objectUrl;
    updateAudioMediaMetadata(track);
    await el.audioPlayer.play();
    renderAudioLibrary();
  } catch (error) {
    console.warn("Audio playback failed", error);
    setAudioStatus("This audio file could not be played. Try importing it again.");
  }
}

function toggleAudioPlayback() {
  if (!state.audio.currentTrackId) {
    const firstTrackId = getVisibleAudioTracks()[0]?.id;
    if (firstTrackId) playAudioTrack(firstTrackId);
    return;
  }
  if (el.audioPlayer.paused) el.audioPlayer.play().catch(() => setAudioStatus("Tap a track to begin playing."));
  else el.audioPlayer.pause();
}

function stopAudioPlayback() {
  el.audioPlayer.pause();
  el.audioPlayer.removeAttribute("src");
  el.audioPlayer.load();
  if (state.audio.objectUrl) URL.revokeObjectURL(state.audio.objectUrl);
  state.audio.objectUrl = "";
  state.audio.currentTrackId = "";
  if ("mediaSession" in navigator) navigator.mediaSession.metadata = null;
  renderAudioPlayer();
}

function playAdjacentAudio(direction) {
  const queue = state.audio.queue.length ? state.audio.queue : getVisibleAudioTracks().map((track) => track.id);
  if (!queue.length) return;
  let nextId;
  if (state.audio.shuffle && queue.length > 1) {
    const alternatives = queue.filter((id) => id !== state.audio.currentTrackId);
    nextId = alternatives[Math.floor(Math.random() * alternatives.length)];
  } else {
    const currentIndex = Math.max(0, queue.indexOf(state.audio.currentTrackId));
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = queue.length - 1;
    if (nextIndex >= queue.length) nextIndex = 0;
    nextId = queue[nextIndex];
  }
  if (nextId) playAudioTrack(nextId);
}

function handleAudioEnded() {
  if (state.audio.repeat) {
    el.audioPlayer.currentTime = 0;
    el.audioPlayer.play();
    return;
  }
  playAdjacentAudio(1);
}

function seekAudioTrack() {
  if (!Number.isFinite(el.audioPlayer.duration) || !el.audioPlayer.duration) return;
  el.audioPlayer.currentTime = (Number(el.audioProgress.value) / 1000) * el.audioPlayer.duration;
}

function toggleAudioShuffle() {
  state.audio.shuffle = !state.audio.shuffle;
  renderAudioPlayer();
}

function toggleAudioRepeat() {
  state.audio.repeat = !state.audio.repeat;
  renderAudioPlayer();
}

function renderAudioPlayer() {
  if (!el.audioPlayer) return;
  const track = state.audio.tracks.find((entry) => entry.id === state.audio.currentTrackId);
  const isPlaying = Boolean(track) && !el.audioPlayer.paused;
  el.audioNowTitle.textContent = track?.title || "Nothing selected";
  el.audioPlayButton.textContent = isPlaying ? "❚❚" : "▶";
  el.audioPlayButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  el.audioShuffleButton.textContent = `Shuffle: ${state.audio.shuffle ? "On" : "Off"}`;
  el.audioShuffleButton.setAttribute("aria-pressed", String(state.audio.shuffle));
  el.audioRepeatButton.textContent = `Repeat: ${state.audio.repeat ? "On" : "Off"}`;
  el.audioRepeatButton.setAttribute("aria-pressed", String(state.audio.repeat));
  el.audioPreviousButton.disabled = !state.audio.tracks.length;
  el.audioNextButton.disabled = !state.audio.tracks.length;
  renderAudioProgress();
}

function renderAudioProgress() {
  if (!el.audioPlayer) return;
  const duration = Number.isFinite(el.audioPlayer.duration) ? el.audioPlayer.duration : 0;
  const elapsed = Number.isFinite(el.audioPlayer.currentTime) ? el.audioPlayer.currentTime : 0;
  el.audioElapsed.textContent = formatAudioTime(elapsed);
  el.audioDuration.textContent = formatAudioTime(duration);
  el.audioProgress.value = duration ? String(Math.round((elapsed / duration) * 1000)) : "0";
  if ("mediaSession" in navigator && duration > 0 && navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: el.audioPlayer.playbackRate,
        position: Math.min(elapsed, duration)
      });
    } catch {
      // Some browsers expose Media Session without accepting position updates.
    }
  }
}

function setupAudioMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const actions = {
    play: () => el.audioPlayer.play(),
    pause: () => el.audioPlayer.pause(),
    previoustrack: () => playAdjacentAudio(-1),
    nexttrack: () => playAdjacentAudio(1),
    seekbackward: (details) => {
      el.audioPlayer.currentTime = Math.max(0, el.audioPlayer.currentTime - (details.seekOffset || 10));
    },
    seekforward: (details) => {
      el.audioPlayer.currentTime = Math.min(el.audioPlayer.duration || 0, el.audioPlayer.currentTime + (details.seekOffset || 10));
    },
    seekto: (details) => {
      if (Number.isFinite(details.seekTime)) el.audioPlayer.currentTime = details.seekTime;
    }
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Unsupported Media Session actions are safe to ignore.
    }
  });
}

function updateAudioMediaMetadata(track) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "MusicDocs Audio Library",
    album: "Personal audio"
  });
}

function setAudioStatus(message) {
  el.audioLibraryStatus.textContent = message;
}

function formatAudioTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatAudioSize(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function audioTypeLabel(track) {
  const extension = track.fileName?.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 5 ? extension : "Audio";
}

function renderLibrary() {
  const query = el.librarySearch.value;
  const fileItems = state.data.items.filter(isFileItem);
  el.libraryFileCount.textContent = `${fileItems.length} ${fileItems.length === 1 ? "file" : "files"}`;
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
  article.className = `${options.compact ? "item-card compact-item-card" : "item-card"}${deleteAction ? " swipe-row" : ""}${options.reorderFavorites ? " favorite-reorder-row" : ""}${options.reorderCards ? " card-reorder-row" : ""}${batchMode ? " batch-delete-row" : ""}${selected ? " batch-selected" : ""}`;
  article.dataset.id = item.id;
  if (options.reorderFavorites) article.dataset.favoriteRow = item.id;
  if (options.reorderCards) article.dataset.cardRow = item.id;
  if (options.compact) {
    if (batchMode) {
      article.innerHTML = batchDeleteRowHtml(item, options.batchDeleteSection, selected);
      return article;
    }
    const reorderHandle = options.reorderFavorites
      ? dragHandleHtml("favorite", item.id, title)
      : options.reorderCards
        ? dragHandleHtml("card", item.id, title)
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
        ${state.favorites.has(item.id) ? "★" : "☆"}
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
    el.listsFollowNote.classList.add("hidden");
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
  const expandedListHasPdf = state.lists.some((list) =>
    state.expandedListIds.includes(list.id)
      && getResolvedListEntries(list).some((entry) => entry.item.type === "pdf")
  );
  el.listsFollowNote.classList.toggle("hidden", !expandedListHasPdf);

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
    const activeClass = list.id === active.id ? " active" : "";
    const isExpanded = state.expandedListIds.includes(list.id);
    const expandedClass = isExpanded ? " expanded" : "";
    const reorderClass = " list-reorder-row";
    const expanded = isExpanded ? "true" : "false";
    const selected = list.id === active.id ? "true" : "false";
    const title = list.title || "Untitled List";
    const alphabeticalView = state.alphabeticalListViewIds.has(list.id);
    const reorderHandle = dragHandleHtml("list", list.id, title);
    return `
      <div class="list-tab-group${activeClass}${expandedClass}${reorderClass}" role="option" aria-selected="${selected}" data-list-row="${escapeHtml(list.id)}">
        <div class="list-tab-row">
        <button class="list-tab-main" type="button" data-select-list="${escapeHtml(list.id)}" title="${escapeHtml(title)}" aria-expanded="${expanded}">
          <span class="list-title-mark" aria-hidden="true">&#9776;</span>
          <span class="list-tab-title">${escapeHtml(title)}</span>
        </button>
        <button class="list-alphabetical-toggle${alphabeticalView ? " is-active" : ""}" type="button" data-toggle-list-alphabetical="${escapeHtml(list.id)}" aria-label="${alphabeticalView ? "Restore saved order for" : "Show alphabetically"} ${escapeHtml(title)}" aria-pressed="${alphabeticalView}" title="${alphabeticalView ? "Restore saved order" : "Show A-Z"}">A-Z</button>
        <button class="icon-button list-row-edit-button" type="button" data-edit-list-row="${escapeHtml(list.id)}" aria-label="Edit ${escapeHtml(title)}" title="Edit list">&#9998;</button>
        ${reorderHandle}
        </div>
        ${isExpanded ? renderInlineListItems(list) : ""}
      </div>
    `;
  }).join("");
}

function renderInlineListItems(list) {
  const alphabeticalView = state.alphabeticalListViewIds.has(list.id);
  const entries = getResolvedListEntries(list);
  if (alphabeticalView) {
    entries.sort((a, b) => itemDisplayTitle(a.item).localeCompare(
      itemDisplayTitle(b.item),
      undefined,
      { numeric: true, sensitivity: "base" }
    ));
  }
  const pdfCount = entries.filter((entry) => entry.item.type === "pdf").length;
  const playlistArmed = state.armedPdfListId === list.id;

  if (!entries.length) {
    return `<div class="inline-list-items"><div class="inline-list-empty">No items yet.</div></div>`;
  }

  return `
    <div class="inline-list-items" data-list-items="${escapeHtml(list.id)}">
      ${pdfCount ? `
        <div class="list-play-through-row${alphabeticalView ? " alphabetical-view" : ""}">
          ${pdfCount > 1 ? `
            <button class="list-play-through-button ${playlistArmed ? "is-active" : ""}" type="button" data-play-pdf-list="${escapeHtml(list.id)}" aria-pressed="${playlistArmed}">
              ${playlistArmed
                ? `Next Song: On`
                : `Next Song: Off`}
            </button>
          ` : ""}
          <span class="list-file-count" aria-label="${pdfCount} PDF ${pdfCount === 1 ? "file" : "files"}">${pdfCount} ${pdfCount === 1 ? "file" : "files"}</span>
        </div>
      ` : ""}
      ${entries.map((entry) => {
        const title = itemDisplayTitleWithInlinePage(entry.item, entry.page);
        const favorite = state.favorites.has(entry.item.id);
        const typeLabel = compactTypeLabel(entry.item);
        return `
          <div class="inline-list-row${alphabeticalView ? " alphabetical-view" : ""}" data-list-item-row="${escapeHtml(entry.item.id)}">
            <button class="icon-button favorite-toggle inline-list-favorite ${favorite ? "favorite-on" : ""}" type="button" data-favorite="${escapeHtml(entry.item.id)}" aria-label="Toggle favorite for ${escapeHtml(title)}" title="Toggle favorite">
              ${favorite ? "&#9733;" : "&#9734;"}
            </button>
            <button class="inline-list-item" type="button" data-open="${escapeHtml(entry.item.id)}">
              <span class="compact-title">${escapeHtml(title)}</span>
              <span class="type-pill compact-type">${escapeHtml(typeLabel)}</span>
            </button>
            <button class="icon-button inline-list-edit-button" type="button" data-edit-item="${escapeHtml(entry.item.id)}" data-edit-context="lists" aria-label="Edit ${escapeHtml(title)}" title="Edit item">&#9998;</button>
            ${alphabeticalView ? "" : dragHandleHtml("list-item", entry.item.id, title)}
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
  const cards = getOrderedCards();
  el.cardsContent.classList.remove("cards-grid");
  renderItemList(el.cardsContent, cards, {
    compact: true,
    compactAction: "edit",
    reorderCards: true,
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
            ${state.favorites.has(card.id) ? "★" : "☆"}
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

  const readingImage = event.target.closest(".rich-card-content img");
  if (readingImage) {
    openCardImageLightbox(readingImage);
    return;
  }

  const cardExitButton = event.target.closest("[data-exit-card]");
  if (cardExitButton) {
    returnFromCardDetail();
    return;
  }

  const cardSpeechButton = event.target.closest("[data-card-speech]");
  if (cardSpeechButton) {
    toggleCardSpeech(cardSpeechButton.dataset.cardSpeech);
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
    await refreshAppShell(refreshAppButton);
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

  const alphabeticalListButton = event.target.closest("[data-toggle-list-alphabetical]");
  if (alphabeticalListButton) {
    toggleAlphabeticalListView(alphabeticalListButton.dataset.toggleListAlphabetical);
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

function handleCardDragPointerDown(event) {
  const handle = event.target.closest("[data-card-drag]");
  if (!handle) return;
  const row = handle.closest("[data-card-row]");
  const container = row?.parentElement;
  if (!row || !container) return;

  event.preventDefault();
  closeSwipeRows();
  state.cardDrag = { row, container, pointerId: event.pointerId, startY: event.clientY, moved: false };
  row.classList.add("is-dragging");
  container.classList.add("cards-reorder-active");
  handle.setPointerCapture?.(event.pointerId);
}

function handleCardDragPointerMove(event) {
  const drag = state.cardDrag;
  if (!drag.row || event.pointerId !== drag.pointerId) return;
  if (Math.abs(event.clientY - drag.startY) > 4) drag.moved = true;
  event.preventDefault();

  const rows = Array.from(drag.container.querySelectorAll("[data-card-row]"))
    .filter((row) => row !== drag.row);
  const beforeRow = rows.find((row) => {
    const rect = row.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2;
  });
  markDragDestination(drag.container, beforeRow || rows[rows.length - 1]);
  if (beforeRow) drag.container.insertBefore(drag.row, beforeRow);
  else drag.container.appendChild(drag.row);
}

function handleCardDragPointerUp(event) {
  if (!state.cardDrag.row || event.pointerId !== state.cardDrag.pointerId) return;
  finishCardDrag(true);
}

function handleCardDragPointerCancel(event) {
  if (!state.cardDrag.row || event.pointerId !== state.cardDrag.pointerId) return;
  finishCardDrag(false);
}

function finishCardDrag(saveOrder) {
  const drag = state.cardDrag;
  if (!drag.row || !drag.container) return;
  const orderedIds = Array.from(drag.container.querySelectorAll("[data-card-row]"))
    .map((row) => row.dataset.cardRow)
    .filter(Boolean);
  drag.row.classList.remove("is-dragging");
  drag.container.classList.remove("cards-reorder-active");
  clearDragDestination(drag.container);
  const shouldSave = saveOrder && drag.moved;
  state.cardDrag = { row: null, container: null, pointerId: null, startY: 0, moved: false };
  if (shouldSave) {
    saveCardOrder(orderedIds);
    state.swipe.suppressClick = true;
    window.setTimeout(() => { state.swipe.suppressClick = false; }, 250);
  } else if (!saveOrder) {
    renderCards();
  }
}

function getOrderedCards() {
  const cards = state.data.items.filter((item) => item.type === "card");
  const byId = new Map(cards.map((card) => [card.id, card]));
  const savedOrder = readJson(STORAGE_KEYS.cardOrder, []);
  const ordered = Array.isArray(savedOrder)
    ? savedOrder.map((id) => byId.get(id)).filter(Boolean)
    : [];
  const included = new Set(ordered.map((card) => card.id));
  const remaining = cards.filter((card) => !included.has(card.id)).sort(compareTitle);
  return [...ordered, ...remaining];
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
  stopCardSpeech();
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

function cardSpeechText(item) {
  const title = itemDisplayTitle(item);
  const body = item.lyricsText
    || (item.cardHtml ? htmlToPlainText(item.cardHtml) : "")
    || (Array.isArray(item.content) ? item.content.join("\n") : item.content || "");
  return [title, body].map((value) => String(value || "").trim()).filter(Boolean).join(". \n");
}

function updateCardSpeechUi(isSpeaking = false, message = "") {
  document.querySelectorAll("[data-card-speech]").forEach((button) => {
    const active = isSpeaking && button.dataset.cardSpeech === state.speechCardId;
    button.classList.toggle("is-speaking", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    const label = button.querySelector("[data-card-speech-label]");
    if (label) label.textContent = active ? "Stop" : "Read aloud";
  });
  const status = document.querySelector("[data-card-speech-status]");
  if (status) status.textContent = message;
}

function stopCardSpeech(message = "") {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  state.speechCardId = "";
  state.speechUtterance = null;
  updateCardSpeechUi(false, message);
}

function toggleCardSpeech(itemId) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    window.alert("Read aloud is not supported by this browser or device.");
    return;
  }

  if (state.speechCardId === itemId && state.speechUtterance) {
    stopCardSpeech("Reading stopped.");
    return;
  }

  const item = state.itemsById.get(itemId);
  const text = item ? cardSpeechText(item) : "";
  if (!text) {
    window.alert("This card has no text to read aloud.");
    return;
  }

  stopCardSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = document.documentElement.lang || navigator.language || "en-US";
  utterance.rate = 0.95;
  state.speechCardId = itemId;
  state.speechUtterance = utterance;
  utterance.onend = () => {
    if (state.speechUtterance === utterance) stopCardSpeech("Finished reading.");
  };
  utterance.onerror = (event) => {
    if (state.speechUtterance !== utterance) return;
    const message = ["canceled", "interrupted"].includes(event.error) ? "" : "Unable to read this card aloud.";
    stopCardSpeech(message);
  };
  updateCardSpeechUi(true, "Reading card aloud.");
  window.speechSynthesis.speak(utterance);
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
    const speechAction = `
      <div class="card-speech-row">
        <button class="secondary-button card-speech-button" type="button" data-card-speech="${escapeHtml(item.id)}" aria-pressed="false">
          <span class="card-speech-icon" aria-hidden="true">&#128266;</span>
          <span data-card-speech-label>Read aloud</span>
        </button>
        <span class="card-speech-status" data-card-speech-status aria-live="polite"></span>
      </div>
    `;
    return `
      <article class="detail-card card-detail-card${item.lyricsCard ? " lyrics-card-detail" : ""}" data-card-reading-level="${CARD_READING_SCALES.indexOf(state.cardReadingScale)}">
        <div class="detail-actions card-detail-actions">
          ${cardExitAction}
          ${speechAction}
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
  stopCardSpeech();
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
  return facts.length ? `<p class="quick-meta">${escapeHtml(facts.join(" · "))}</p>` : "";
}

function cardContentHtml(item, options = {}) {
  if (item.lyricsCard && item.lyricsText) {
    const lines = String(item.lyricsText).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let inChorus = false;
    const html = lines.map((line) => {
      const verse = line.match(/^(\d+\.)\s+(.*)$/);
      if (verse) {
        inChorus = false;
        return `<p class="lyrics-verse">${escapeHtml(verse[1])} ${escapeHtml(verse[2])}</p>`;
      }
      if (/^chorus:?$/i.test(line)) {
        inChorus = true;
        return `<p class="lyrics-chorus-label"><strong>${escapeHtml(line)}</strong></p>`;
      }
      if (/^(by\s|©|copyright\b)/i.test(line.trim())) inChorus = false;
      if (line && inChorus) return `<div class="lyrics-chorus-line"><em>${escapeHtml(line)}</em></div>`;
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
    preserveSequence = false,
    sequenceNotice = ""
  } = options;
  if (!preserveSequence) {
    const validSequenceListId = getPdfSequence(listId).some((entry) => entry.id === item.id) ? listId : "";
    state.currentPdf.sequenceListId = followEnabled ? validSequenceListId : "";
    state.currentPdf.sequenceSourceListId = validSequenceListId;
  }
  state.currentPdf.sequenceTransitioning = preserveSequence;
  updatePdfSequenceControls();
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
  syncPdfViewerSettings();
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
    if (sequenceNotice) showPdfSequenceNotice(sequenceNotice);
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
    const visibleViewportWidth = window.visualViewport?.width || document.documentElement.clientWidth || window.innerWidth;
    const availableStageWidth = Math.min(stageBox.width, visibleViewportWidth);
    const maxWidth = Math.max(240, availableStageWidth - 24);
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
    alignPdfToolbarToPage();
    syncPdfAnnotationCanvas();
    updatePdfAnnotationControls();
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
  const sequenceStatus = sequence ? `Song ${sequence.index + 1} of ${sequence.items.length}` : "";
  const pageStatus = getPdfNumberingLabel();
  el.pdfPageStatus.textContent = [pageStatus, sequenceStatus].filter(Boolean).join(" · ");
  renderPdfPageNumbering(true);
  updatePdfSequenceControls();
}

function alignPdfToolbarToPage() {
  if (!el.pdfToolbar || !el.pdfCanvas || el.pdfCanvas.classList.contains("hidden")) return;
  window.requestAnimationFrame(() => {
    const toolbarRect = el.pdfToolbar.getBoundingClientRect();
    const canvasRect = el.pdfCanvas.getBoundingClientRect();
    if (!toolbarRect.width || !canvasRect.width) return;
    const left = Math.max(8, Math.round(canvasRect.left - toolbarRect.left));
    const right = Math.max(8, Math.round(toolbarRect.right - canvasRect.right));
    el.pdfToolbar.style.setProperty("--pdf-page-left", `${left}px`);
    el.pdfToolbar.style.setProperty("--pdf-page-right", `${right}px`);
    el.pdfViewer.style.setProperty("--pdf-page-right", `${right}px`);
  });
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
  if (el.pdfSettingsLayer.classList.contains("hidden")) openPdfSettings();
  else closePdfSettings();
}

function openPdfSettings() {
  const settings = getPdfViewerSettings();
  const custom = getCurrentPdfSongNumbering();
  state.pdfSettingsDraft = {
    showOnOpen: readJson(STORAGE_KEYS.settings, {}).showPdfTipsOnOpen !== false,
    numberingMode: settings.numberingMode,
    nextSongDefault: settings.nextSongDefault,
    metronomeEnabled: settings.metronomeEnabled,
    bpm: state.metronome.bpm,
    songStartPage: custom?.startPage || null,
    songPageCount: custom?.pageCount || 1
  };
  syncPdfViewerSettings();
  el.pdfSettingsLayer.classList.remove("hidden");
  el.pdfTipsButton.setAttribute("aria-expanded", "true");
}

function closePdfSettings() {
  state.pdfSettingsDraft = null;
  el.pdfSettingsLayer.classList.add("hidden");
  el.pdfTipsButton.setAttribute("aria-expanded", "false");
}

async function printCurrentPdf() {
  const item = state.currentPdf.item;
  if (!item) return;
  const isAppleTouchDevice = /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isAppleTouchDevice && navigator.share) {
    try {
      let sourceFile;
      if (item.fileId) {
        sourceFile = await getPdfFile(item.fileId);
        if (!sourceFile) throw new Error("Imported PDF missing");
      } else if (item.file) {
        const encodedPath = item.file.split("/").map((part) => encodeURIComponent(part)).join("/");
        const response = await fetch(new URL(encodedPath, window.location.href).href);
        if (!response.ok) throw new Error("PDF fetch failed");
        sourceFile = await response.blob();
      } else {
        throw new Error("PDF path missing");
      }
      const safeTitle = itemDisplayTitle(item).replace(/[\\/:*?"<>|]+/g, "-").trim() || "Sheet music";
      const shareFile = new File([sourceFile], `${safeTitle}.pdf`, { type: "application/pdf" });
      if (!navigator.canShare || navigator.canShare({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile], title: safeTitle });
        closePdfSettings();
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      window.alert("The Share sheet could not open. The PDF will open next; use Safari's Share button, then choose Print.");
    }
  } else if (isAppleTouchDevice) {
    window.alert("The clean PDF will open next.\n\nTo print on iPhone or iPad, use Safari's Share button, then choose Print.");
  }
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) {
    window.alert("Allow pop-ups for this app, then choose Print PDF again.");
    return;
  }
  printWindow.document.title = `Preparing ${itemDisplayTitle(item)}`;
  printWindow.document.body.innerHTML = '<p style="font:16px system-ui;padding:24px">Preparing PDF for printing&hellip;</p>';
  try {
    let printUrl = "";
    let revokeUrl = false;
    if (item.fileId) {
      const file = await getPdfFile(item.fileId);
      if (!file) throw new Error("Imported PDF missing");
      printUrl = URL.createObjectURL(file);
      revokeUrl = true;
    } else if (item.file) {
      const encodedPath = item.file.split("/").map((part) => encodeURIComponent(part)).join("/");
      printUrl = new URL(encodedPath, window.location.href).href;
    } else {
      throw new Error("PDF path missing");
    }
    printWindow.location.replace(printUrl);
    printWindow.focus();
    if (revokeUrl) window.setTimeout(() => URL.revokeObjectURL(printUrl), 120000);
    closePdfSettings();
  } catch (error) {
    printWindow.close();
    window.alert("This PDF could not be prepared for printing.");
  }
}

function getPdfViewerSettings() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  return {
    numberingMode: ["document", "song"].includes(settings.pdfNumberingMode) ? settings.pdfNumberingMode : "off",
    nextSongDefault: settings.pdfNextSongDefault !== false,
    metronomeEnabled: settings.pdfMetronomeEnabled === true
  };
}

function syncPdfViewerSettings() {
  const savedSettings = getPdfViewerSettings();
  const settings = state.pdfSettingsDraft || savedSettings;
  if (state.pdfSettingsDraft) el.pdfTipsShowOnOpen.checked = settings.showOnOpen;
  el.pdfNumberingModeOptions.forEach((option) => {
    option.checked = option.value === settings.numberingMode;
  });
  el.pdfRepeatListEnabled.checked = settings.nextSongDefault;
  el.pdfMetronomeEnabled.checked = settings.metronomeEnabled;
  el.pdfSettingsTempoInput.value = String(settings.bpm || state.metronome.bpm);
  el.pdfSettingsTempoRow.classList.toggle("hidden", !settings.metronomeEnabled);
  el.pdfTempoInput.closest(".pdf-tempo-box")?.classList.toggle("hidden", !savedSettings.metronomeEnabled);
  el.pdfSongNumberingFields.classList.toggle("hidden", settings.numberingMode !== "song");
  const custom = state.pdfSettingsDraft?.songStartPage
    ? { startPage: state.pdfSettingsDraft.songStartPage, pageCount: state.pdfSettingsDraft.songPageCount }
    : getCurrentPdfSongNumbering();
  el.pdfSongPageCount.value = String(custom?.pageCount || 1);
  el.pdfSongNumberingStatus.textContent = custom
    ? `Page 1 is set to PDF page ${custom.startPage}.`
    : "Go to the page that should be page 1, then choose “Use current page as page 1.”";
  renderPdfPageNumbering(false);
  applyPdfPageTheme();
}

function togglePdfPageTheme() {
  const settings = readJson(STORAGE_KEYS.settings, {});
  const nextSettings = { ...settings, pdfDarkPage: !settings.pdfDarkPage };
  writeJson(STORAGE_KEYS.settings, nextSettings);
  applyPdfPageTheme(nextSettings.pdfDarkPage);
}

function applyPdfPageTheme(darkPage = Boolean(readJson(STORAGE_KEYS.settings, {}).pdfDarkPage)) {
  el.pdfViewer?.classList.toggle("pdf-page-dark", darkPage);
  if (el.pdfPageThemeToggleButton) {
    el.pdfPageThemeToggleButton.setAttribute("aria-pressed", String(darkPage));
    el.pdfPageThemeToggleButton.setAttribute("aria-label", darkPage ? "Use white sheet music background" : "Use black sheet music background");
    el.pdfPageThemeToggleButton.title = darkPage ? "Use white sheet music background" : "Use black sheet music background";
  }
  if (el.pdfMobileThemeButton) {
    el.pdfMobileThemeButton.setAttribute("aria-pressed", String(darkPage));
    if (el.pdfMobileThemeLabel) el.pdfMobileThemeLabel.textContent = darkPage ? "Light page" : "Dark page";
  }
  syncPdfMobileToolsState();
}

function togglePdfMobileToolsMenu() {
  const opening = el.pdfMobileToolsMenu.classList.contains("hidden");
  el.pdfMobileToolsMenu.classList.toggle("hidden", !opening);
  el.pdfMobileToolsButton.setAttribute("aria-expanded", opening ? "true" : "false");
  syncPdfMobileToolsState();
}

function closePdfMobileToolsMenu() {
  if (!el.pdfMobileToolsMenu) return;
  el.pdfMobileToolsMenu.classList.add("hidden");
  el.pdfMobileToolsButton?.setAttribute("aria-expanded", "false");
}

function syncPdfMobileToolsState() {
  if (!el.pdfMobileAnnotateButton) return;
  el.pdfMobileAnnotateButton.setAttribute("aria-pressed", state.pdfAnnotation.active ? "true" : "false");
  el.pdfMobileAnnotateButton.lastChild.textContent = state.pdfAnnotation.active ? " Done annotating" : " Annotate";
  el.pdfMobileToolsButton.classList.toggle("has-active-tool", state.pdfAnnotation.active || el.pdfViewer.classList.contains("pdf-page-dark"));
}

function updatePdfSettingsDraft() {
  if (!state.pdfSettingsDraft) return;
  const draft = state.pdfSettingsDraft;
  draft.showOnOpen = el.pdfTipsShowOnOpen.checked;
  draft.numberingMode = el.pdfNumberingModeOptions.find((option) => option.checked)?.value || "off";
  draft.nextSongDefault = el.pdfRepeatListEnabled.checked;
  draft.metronomeEnabled = el.pdfMetronomeEnabled.checked;
  draft.bpm = clamp(Math.round(Number(el.pdfSettingsTempoInput.value) || 90), 40, 220);
  const startPage = draft.songStartPage || state.currentPdf.pageNumber;
  const maxCount = Math.max(1, state.currentPdf.pageCount - startPage + 1);
  draft.songPageCount = clamp(Math.round(Number(el.pdfSongPageCount.value) || 1), 1, maxCount);
  syncPdfViewerSettings();
}

function setDraftPdfSongStart() {
  if (!state.pdfSettingsDraft) return;
  state.pdfSettingsDraft.songStartPage = state.currentPdf.pageNumber;
  updatePdfSettingsDraft();
}

function applyPdfSettings() {
  updatePdfSettingsDraft();
  const draft = state.pdfSettingsDraft;
  if (!draft) return;
  const settings = readJson(STORAGE_KEYS.settings, {});
  writeJson(STORAGE_KEYS.settings, {
    ...settings,
    showPdfTipsOnOpen: draft.showOnOpen,
    pdfNumberingMode: draft.numberingMode,
    pdfNextSongDefault: draft.nextSongDefault,
    pdfMetronomeEnabled: draft.metronomeEnabled
  });
  if (draft.numberingMode === "song" && draft.songStartPage) {
    writeCurrentPdfSongNumbering({ startPage: draft.songStartPage, pageCount: draft.songPageCount });
  }
  setMetronomeBpm(draft.bpm);
  if (!draft.metronomeEnabled) stopMetronome();
  state.pdfSettingsDraft = null;
  syncPdfViewerSettings();
  updatePdfStatus();
  closePdfSettings();
}

function getCurrentPdfSongNumbering() {
  const itemId = state.currentPdf.item?.id;
  if (!itemId) return null;
  const all = readJson(STORAGE_KEYS.pdfNumbering, {});
  const saved = all[itemId];
  if (!saved) return null;
  const startPage = clamp(Math.round(Number(saved.startPage) || 1), 1, Math.max(1, state.currentPdf.pageCount));
  return {
    startPage,
    pageCount: clamp(Math.round(Number(saved.pageCount) || 1), 1, Math.max(1, state.currentPdf.pageCount - startPage + 1))
  };
}

function writeCurrentPdfSongNumbering(numbering) {
  const itemId = state.currentPdf.item?.id;
  if (!itemId) return;
  const all = readJson(STORAGE_KEYS.pdfNumbering, {});
  all[itemId] = numbering;
  writeJson(STORAGE_KEYS.pdfNumbering, all);
}

function getPdfDisplayedPage() {
  const settings = getPdfViewerSettings();
  if (settings.numberingMode === "document") {
    return { number: state.currentPdf.pageNumber, count: state.currentPdf.pageCount };
  }
  if (settings.numberingMode === "song") {
    const custom = getCurrentPdfSongNumbering();
    if (!custom) return null;
    const number = state.currentPdf.pageNumber - custom.startPage + 1;
    if (number < 1 || number > custom.pageCount) return null;
    return { number, count: custom.pageCount };
  }
  return null;
}

function getPdfNumberingLabel() {
  const displayed = getPdfDisplayedPage();
  return displayed ? `Page ${displayed.number} of ${displayed.count}` : "";
}

function renderPdfPageNumbering(showNotice) {
  window.clearTimeout(state.currentPdf.pageNoticeTimer);
  state.currentPdf.pageNoticeTimer = null;
  const displayed = getPdfDisplayedPage();
  const useful = Boolean(displayed && displayed.count > 1);
  el.pdfViewer.classList.toggle("show-page-number", useful);
  el.pdfPageMarker.classList.toggle("hidden", !useful);
  el.pdfPageMarker.textContent = useful ? String(displayed.number) : "";
  if (!useful || !showNotice) {
    el.pdfPageNotice.classList.add("hidden");
    return;
  }
  el.pdfPageNotice.textContent = `${displayed.number} of ${displayed.count}`;
  el.pdfPageNotice.classList.remove("hidden");
  state.currentPdf.pageNoticeTimer = window.setTimeout(() => {
    el.pdfPageNotice.classList.add("hidden");
  }, 1200);
}

function showPdfSequenceNotice(message) {
  window.clearTimeout(state.currentPdf.pageNoticeTimer);
  el.pdfPageNotice.textContent = message;
  el.pdfPageNotice.classList.remove("hidden");
  state.currentPdf.pageNoticeTimer = window.setTimeout(() => {
    el.pdfPageNotice.classList.add("hidden");
  }, 1800);
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
  el.pdfTopTapZonesButton.setAttribute("aria-pressed", String(showTips));
  el.pdfTopTapZonesButton.setAttribute("aria-label", showTips ? "Hide tap zones" : "Show tap zones");
  el.pdfTopTapZonesButton.title = showTips ? "Hide tap zones" : "Show tap zones";
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
    if (direction > 0 && sequence.items.length) {
      openPdf(sequence.items[0], {
        listId: state.currentPdf.sequenceListId,
        initialPage: "first",
        preserveSequence: true,
        sequenceNotice: "List starting over"
      });
      return true;
    }
    const edgeLabel = direction < 0 ? "Start of list" : "End of list";
    el.pdfPageStatus.textContent = [getPdfNumberingLabel(), edgeLabel].filter(Boolean).join(" · ");
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
  if (!el.pdfFollowButton || !el.pdfSkipSongButton) return;
  const sourceItems = getPdfSequence(state.currentPdf.sequenceSourceListId);
  const sourceIndex = sourceItems.findIndex((item) => item.id === state.currentPdf.item?.id);
  const hasSourcePosition = sourceIndex >= 0;
  const onLastPage = state.currentPdf.pageCount > 0 && state.currentPdf.pageNumber === state.currentPdf.pageCount;
  const followOn = Boolean(getCurrentPdfSequencePosition());
  el.pdfFollowButton.classList.toggle("hidden", !hasSourcePosition || !onLastPage);
  el.pdfFollowButton.classList.toggle("is-active", followOn);
  el.pdfFollowButton.textContent = `Next Song: ${followOn ? "On" : "Off"}`;
  el.pdfFollowButton.setAttribute("aria-pressed", followOn ? "true" : "false");
  el.pdfSkipSongButton.classList.toggle("hidden", !hasSourcePosition || !followOn);
  el.pdfSkipSongButton.disabled = state.currentPdf.sequenceTransitioning;
}

function openCardImageLightbox(image) {
  const existing = document.querySelector(".card-image-lightbox");
  existing?.remove();
  const layer = document.createElement("div");
  layer.className = "card-image-lightbox";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-label", "Enlarged card image");
  layer.innerHTML = `<button type="button" aria-label="Close enlarged image" title="Close">&times;</button><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || "Card image")}">`;
  const close = () => layer.remove();
  layer.addEventListener("click", close);
  layer.querySelector("img").addEventListener("click", (event) => event.stopPropagation());
  layer.querySelector("button").addEventListener("click", close);
  document.body.appendChild(layer);
  layer.querySelector("button").focus();
}

function skipCurrentPdfInList() {
  if (!state.currentPdf.doc || state.currentPdf.sequenceTransitioning || !getCurrentPdfSequencePosition()) return;
  el.pdfSkipSongButton.disabled = true;
  moveToAdjacentPdfInList(1);
}

function togglePdfFollow() {
  const sourceListId = state.currentPdf.sequenceSourceListId;
  if (!sourceListId) return;
  state.currentPdf.sequenceListId = state.currentPdf.sequenceListId ? "" : sourceListId;
  state.currentPdf.sequenceTransitioning = false;
  updatePdfStatus();
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

function getPdfAnnotationPageKey() {
  const itemId = state.currentPdf.item?.id;
  return itemId ? `${itemId}:${state.currentPdf.pageNumber}` : "";
}

function getPdfAnnotationDocument() {
  return readJson(STORAGE_KEYS.pdfAnnotations, {});
}

function getPdfPageAnnotations() {
  const itemId = state.currentPdf.item?.id;
  if (!itemId) return [];
  const all = getPdfAnnotationDocument();
  const strokes = all[itemId]?.[state.currentPdf.pageNumber];
  return Array.isArray(strokes) ? strokes : [];
}

function savePdfPageAnnotations(strokes) {
  const itemId = state.currentPdf.item?.id;
  if (!itemId) return;
  const all = getPdfAnnotationDocument();
  const itemPages = { ...(all[itemId] || {}) };
  if (strokes.length) itemPages[state.currentPdf.pageNumber] = strokes;
  else delete itemPages[state.currentPdf.pageNumber];
  if (Object.keys(itemPages).length) all[itemId] = itemPages;
  else delete all[itemId];
  writeJson(STORAGE_KEYS.pdfAnnotations, all);
}

function clonePdfAnnotationStrokes(strokes) {
  return strokes.map((stroke) => ({ ...stroke, points: stroke.points.map((point) => ({ ...point })) }));
}

function pushPdfAnnotationUndo() {
  const key = getPdfAnnotationPageKey();
  if (!key) return;
  const history = state.pdfAnnotation.undoByPage.get(key) || [];
  history.push(clonePdfAnnotationStrokes(getPdfPageAnnotations()));
  if (history.length > 20) history.shift();
  state.pdfAnnotation.undoByPage.set(key, history);
  updatePdfAnnotationControls();
}

function undoPdfAnnotation() {
  const key = getPdfAnnotationPageKey();
  const history = state.pdfAnnotation.undoByPage.get(key) || [];
  if (!history.length) return;
  savePdfPageAnnotations(history.pop());
  state.pdfAnnotation.undoByPage.set(key, history);
  renderPdfAnnotations();
  updatePdfAnnotationControls();
}

function clearPdfAnnotationsForPage() {
  if (!getPdfPageAnnotations().length) return;
  if (!window.confirm("Clear all annotations from this page?")) return;
  pushPdfAnnotationUndo();
  savePdfPageAnnotations([]);
  renderPdfAnnotations();
  updatePdfAnnotationControls();
}

function setPdfAnnotationMode(active) {
  if (!state.currentPdf.doc) return;
  state.pdfAnnotation.active = Boolean(active);
  state.pdfAnnotation.pointerId = null;
  state.pdfAnnotation.currentStroke = null;
  state.pdfAnnotation.erasing = false;
  hidePdfTips();
  el.pdfViewer.classList.toggle("annotation-active", state.pdfAnnotation.active);
  el.pdfAnnotationToolbar.classList.toggle("hidden", !state.pdfAnnotation.active);
  el.pdfAnnotateButton.setAttribute("aria-pressed", state.pdfAnnotation.active ? "true" : "false");
  el.pdfAnnotateButton.setAttribute("aria-label", state.pdfAnnotation.active ? "Finish annotating" : "Annotate this PDF");
  el.pdfTopTapZonesButton.disabled = state.pdfAnnotation.active;
  el.pdfTapLeft.disabled = state.pdfAnnotation.active;
  el.pdfTapRight.disabled = state.pdfAnnotation.active;
  if (state.pdfAnnotation.active) {
    showPdfAnnotationNotice();
    syncPdfAnnotationCanvas();
  }
  syncPdfMobileToolsState();
  updatePdfAnnotationControls();
}

function showPdfAnnotationNotice() {
  window.clearTimeout(state.pdfAnnotation.noticeTimer);
  el.pdfAnnotationNotice.classList.remove("hidden");
  state.pdfAnnotation.noticeTimer = window.setTimeout(() => el.pdfAnnotationNotice.classList.add("hidden"), 2400);
}

function selectPdfAnnotationTool(tool) {
  if (!["pencil", "highlighter", "eraser"].includes(tool)) return;
  state.pdfAnnotation.tool = tool;
  updatePdfAnnotationControls();
}

function selectPdfAnnotationColor(color) {
  state.pdfAnnotation.color = color;
  if (state.pdfAnnotation.tool === "eraser") state.pdfAnnotation.tool = "pencil";
  updatePdfAnnotationControls();
}

function updatePdfAnnotationControls() {
  if (!el.pdfAnnotationToolbar) return;
  el.pdfAnnotationToolbar.querySelectorAll("[data-annotation-tool]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.annotationTool === state.pdfAnnotation.tool ? "true" : "false"));
  el.pdfAnnotationToolbar.querySelectorAll("[data-annotation-color]").forEach((button) => button.setAttribute("aria-pressed", button.dataset.annotationColor === state.pdfAnnotation.color ? "true" : "false"));
  const history = state.pdfAnnotation.undoByPage.get(getPdfAnnotationPageKey()) || [];
  el.pdfAnnotationUndoButton.disabled = !history.length;
  el.pdfAnnotationClearButton.disabled = !getPdfPageAnnotations().length;
  el.pdfAnnotationPreviousButton.disabled = state.currentPdf.pageNumber <= 1;
  el.pdfAnnotationNextButton.disabled = state.currentPdf.pageNumber >= state.currentPdf.pageCount;
}

function syncPdfAnnotationCanvas() {
  if (!el.pdfAnnotationCanvas || !el.pdfCanvas || el.pdfCanvas.classList.contains("hidden")) return;
  window.requestAnimationFrame(() => {
    const stageRect = el.pdfStage.getBoundingClientRect();
    const pageRect = el.pdfCanvas.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.pdfAnnotationCanvas.style.left = `${pageRect.left - stageRect.left}px`;
    el.pdfAnnotationCanvas.style.top = `${pageRect.top - stageRect.top}px`;
    el.pdfAnnotationCanvas.style.width = `${pageRect.width}px`;
    el.pdfAnnotationCanvas.style.height = `${pageRect.height}px`;
    el.pdfAnnotationCanvas.width = Math.max(1, Math.round(pageRect.width * dpr));
    el.pdfAnnotationCanvas.height = Math.max(1, Math.round(pageRect.height * dpr));
    el.pdfAnnotationCanvas.dataset.dpr = String(dpr);
    renderPdfAnnotations();
  });
}

function renderPdfAnnotations() {
  const canvas = el.pdfAnnotationCanvas;
  if (!canvas?.width) return;
  const dpr = Number(canvas.dataset.dpr) || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  getPdfPageAnnotations().forEach((stroke) => drawPdfAnnotationStroke(context, stroke, width, height));
  if (state.pdfAnnotation.currentStroke) drawPdfAnnotationStroke(context, state.pdfAnnotation.currentStroke, width, height);
}

function drawPdfAnnotationStroke(context, stroke, width, height) {
  if (!stroke?.points?.length) return;
  context.save();
  context.strokeStyle = stroke.color || "#245A9A";
  context.globalAlpha = stroke.tool === "highlighter" ? 0.3 : 0.94;
  context.lineWidth = Math.max(stroke.tool === "highlighter" ? 14 : 2.2, Math.min(width, height) * (stroke.tool === "highlighter" ? 0.022 : 0.0035));
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  stroke.points.forEach((point, index) => {
    const x = point.x * width;
    const y = point.y * height;
    if (index) context.lineTo(x, y);
    else context.moveTo(x, y);
  });
  if (stroke.points.length === 1) context.lineTo(stroke.points[0].x * width + 0.1, stroke.points[0].y * height + 0.1);
  context.stroke();
  context.restore();
}

function getPdfAnnotationPoint(event) {
  const rect = el.pdfAnnotationCanvas.getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1), y: clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1) };
}

function handlePdfAnnotationPointerDown(event) {
  if (!state.pdfAnnotation.active || (event.pointerType === "mouse" && event.button !== 0)) return;
  event.preventDefault();
  state.pdfAnnotation.pointerId = event.pointerId;
  el.pdfAnnotationCanvas.setPointerCapture?.(event.pointerId);
  pushPdfAnnotationUndo();
  const point = getPdfAnnotationPoint(event);
  if (state.pdfAnnotation.tool === "eraser") {
    state.pdfAnnotation.erasing = true;
    erasePdfAnnotationsAt(point);
    return;
  }
  state.pdfAnnotation.currentStroke = { tool: state.pdfAnnotation.tool, color: state.pdfAnnotation.color, points: [point] };
  renderPdfAnnotations();
}

function handlePdfAnnotationPointerMove(event) {
  if (!state.pdfAnnotation.active || state.pdfAnnotation.pointerId !== event.pointerId) return;
  event.preventDefault();
  const events = event.getCoalescedEvents ? event.getCoalescedEvents() : [event];
  events.forEach((sample) => {
    const point = getPdfAnnotationPoint(sample);
    if (state.pdfAnnotation.erasing) erasePdfAnnotationsAt(point);
    else state.pdfAnnotation.currentStroke?.points.push(point);
  });
  renderPdfAnnotations();
}

function finishPdfAnnotationPointer(event) {
  if (state.pdfAnnotation.pointerId !== event.pointerId) return;
  event.preventDefault();
  if (state.pdfAnnotation.currentStroke) {
    const strokes = getPdfPageAnnotations();
    strokes.push(state.pdfAnnotation.currentStroke);
    savePdfPageAnnotations(strokes);
  }
  state.pdfAnnotation.pointerId = null;
  state.pdfAnnotation.currentStroke = null;
  state.pdfAnnotation.erasing = false;
  renderPdfAnnotations();
  updatePdfAnnotationControls();
}

function erasePdfAnnotationsAt(point) {
  const canvasRect = el.pdfAnnotationCanvas.getBoundingClientRect();
  const threshold = 22 / Math.max(1, Math.min(canvasRect.width, canvasRect.height));
  const strokes = getPdfPageAnnotations();
  const kept = strokes.filter((stroke) => !stroke.points.some((sample) => Math.hypot(sample.x - point.x, sample.y - point.y) <= threshold));
  if (kept.length !== strokes.length) {
    savePdfPageAnnotations(kept);
    renderPdfAnnotations();
  }
}

function closePdfViewer() {
  closePdfMobileToolsMenu();
  setPdfAnnotationMode(false);
  hidePdfTips();
  closePdfSettings();
  window.clearTimeout(state.currentPdf.pageNoticeTimer);
  el.pdfPageNotice.classList.add("hidden");
  el.pdfPageMarker.classList.add("hidden");
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
  if (state.pdfAnnotation.active) return;
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
  if (state.pdfAnnotation.active) return;
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
  if (state.pdfAnnotation.active) return;
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
  if (state.pdfAnnotation.active) return;
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
  syncPdfAnnotationCanvas();
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
  if (!state.pitch.playing) playPitch();
}

async function playPitch() {
  const requestId = ++state.pitch.playRequestId;
  const note = getSelectedPitchNote();
  const audioContext = await ensurePitchAudio();
  if (!audioContext || requestId !== state.pitch.playRequestId) return;
  stopPitchTone(false);
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(note.frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.32, audioContext.currentTime + 0.025);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  state.pitch.oscillators = [oscillator];
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
  state.pitch.playRequestId += 1;
  stopPitchTone(true);
  if (state.pitch.audioContext) {
    state.pitch.audioContext.close?.();
    state.pitch.audioContext = null;
  }
}

function stopPitchTone(shouldRender = true) {
  const audioContext = state.pitch.audioContext;
  const gain = state.pitch.gain;
  const oscillators = Array.isArray(state.pitch.oscillators) ? [...state.pitch.oscillators] : [];
  if (gain && audioContext && audioContext.state !== "closed") {
    const now = state.pitch.audioContext.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
    } catch (error) { /* Ignore gain ramp errors during shutdown. */ }
  }
  oscillators.forEach((oscillator) => {
    oscillator.onended = () => {
      try { oscillator.disconnect(); } catch (error) { /* Ignore disconnect errors after release. */ }
    };
    try { oscillator.stop((audioContext?.currentTime || 0) + 0.045); } catch (error) { /* Ignore repeated stop calls. */ }
  });
  if (gain) {
    window.setTimeout(() => {
      try { gain.disconnect(); } catch (error) { /* Ignore disconnect errors after release. */ }
    }, 70);
  }
  state.pitch.oscillators = [];
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
  "toy-piano": "Toy piano",
  "water-drop": "Water drop",
  bubbles: "Bubbles",
  laser: "Laser",
  bell: "Bell",
  chirp: "Chirp",
  spaceship: "Spaceship",
  "retro-game": "Retro game tone"
};
const PIANO_CHORDS = {
  major: { intervals: [0, 4, 7], use: "Major sounds bright and settled. It is the basic home sound in many songs." },
  minor: { intervals: [0, 3, 7], use: "Minor sounds reflective or emotional and often provides contrast to major chords." },
  diminished: { intervals: [0, 3, 6], use: "Diminished creates tension and commonly connects two nearby chords." },
  dominant7: { intervals: [0, 4, 7, 10], use: "Dominant 7th strongly wants to resolve home. It is central to blues and common as V7 in country." },
  major7: { intervals: [0, 4, 7, 11], use: "Major 7th adds a warm, polished color often heard in jazz and ballads." },
  minor7: { intervals: [0, 3, 7, 10], use: "Minor 7th is mellow and is the ii chord in many jazz ii–V–I progressions." },
  diminished7: { intervals: [0, 3, 6, 9], use: "Diminished 7th creates strong suspense and works well as a passing chord." },
  halfDiminished: { intervals: [0, 3, 6, 10], use: "Half-diminished is common as the ii chord in minor-key jazz progressions." },
  sus2: { intervals: [0, 2, 7], use: "Suspended 2nd sounds open and modern before resolving to major or minor." },
  sus4: { intervals: [0, 5, 7], use: "Suspended 4th creates gentle tension that often resolves down to a major chord." },
  augmented: { intervals: [0, 4, 8], use: "Augmented sounds unsettled and can lead upward into the next chord." },
  sixth: { intervals: [0, 4, 7, 9], use: "The 6th adds warmth without the stronger pull of a 7th; useful in country, jazz, and older popular music." },
  ninth: { intervals: [0, 2, 4, 7, 10], use: "The 9th expands a dominant 7th with extra color, especially in blues, funk, and jazz." }
};
const PIANO_STYLE_GUIDES = {
  hymn: {
    intro: "A familiar, settled sound. Move away from the home chord, then return to it.",
    chordType: "major", scaleType: "major", scaleLabel: "Major",
    chords: [[0, "major", "I · Home"], [5, "major", "IV · Away"], [7, "dominant7", "V7 · Leads home"], [0, "major", "I · Home"]]
  },
  country: {
    intro: "Start with three dependable chords. The dominant 7th gives the return home extra pull.",
    chordType: "major", scaleType: "majorPentatonic", scaleLabel: "Major pentatonic",
    chords: [[0, "major", "I"], [5, "major", "IV"], [7, "dominant7", "V7"], [0, "major", "I"]]
  },
  blues: {
    intro: "Use dominant 7th chords for the progression and the Blues scale for melody or improvising.",
    chordType: "dominant7", scaleType: "blues", scaleLabel: "Blues",
    chords: [[0, "dominant7", "I7"], [5, "dominant7", "IV7"], [7, "dominant7", "V7"], [0, "dominant7", "I7"]]
  },
  jazz: {
    intro: "Try the common ii–V–I movement: mellow minor 7th, tense dominant 7th, then a warm major 7th home.",
    chordType: "major7", scaleType: "dorian", scaleLabel: "Dorian over ii; Mixolydian over V; Major over I",
    chords: [[2, "minor7", "ii7", "dorian"], [7, "dominant7", "V7", "mixolydian"], [0, "major7", "Imaj7", "major"]]
  },
  pop: {
    intro: "These four chords create a familiar progression used in many popular songs.",
    chordType: "major", scaleType: "majorPentatonic", scaleLabel: "Major or major pentatonic",
    chords: [[0, "major", "I"], [7, "major", "V"], [9, "minor", "vi"], [5, "major", "IV"]]
  }
};
const PIANO_CHORD_SUFFIXES = {
  major: "", minor: "m", dominant7: "7", major7: "maj7", minor7: "m7"
};
const PIANO_SCALES = {
  major: { intervals: [0, 2, 4, 5, 7, 9, 11, 12], label: "Major", use: "Bright and familiar; common in hymns, folk music, and popular songs." },
  naturalMinor: { intervals: [0, 2, 3, 5, 7, 8, 10, 12], label: "Natural minor", use: "Reflective or dramatic; the basic minor-scale pattern." },
  majorPentatonic: { intervals: [0, 2, 4, 7, 9, 12], label: "Major pentatonic", use: "Open and friendly; useful in folk, country, and simple improvisation." },
  minorPentatonic: { intervals: [0, 3, 5, 7, 10, 12], label: "Minor pentatonic", use: "Flexible and expressive; widely used in rock, blues, and improvisation." },
  blues: { intervals: [0, 3, 5, 6, 7, 10, 12], label: "Blues", use: "Adds the distinctive blue note between the fourth and fifth." },
  dorian: { intervals: [0, 2, 3, 5, 7, 9, 10, 12], label: "Dorian", use: "A minor sound with a brighter sixth; common over minor 7th chords in jazz, funk, and modal music." },
  mixolydian: { intervals: [0, 2, 4, 5, 7, 9, 10, 12], label: "Mixolydian", use: "A major sound with a lowered seventh; useful over dominant 7th chords in blues, jazz, rock, and country." },
  chromatic: { intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], label: "Chromatic", use: "Uses every neighboring note; helpful for fingering, warmups, and hearing half steps." }
};
const PIANO_NOTE_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const KEY_CHANGE_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const KEY_SIGNATURES = [
  { count: 0, type: "", label: "No sharps or flats" },
  { count: 5, type: "flat", label: "5 flats: B♭, E♭, A♭, D♭, G♭" },
  { count: 2, type: "sharp", label: "2 sharps: F♯, C♯" },
  { count: 3, type: "flat", label: "3 flats: B♭, E♭, A♭" },
  { count: 4, type: "sharp", label: "4 sharps: F♯, C♯, G♯, D♯" },
  { count: 1, type: "flat", label: "1 flat: B♭" },
  { count: 6, type: "flat", label: "6 flats: B♭, E♭, A♭, D♭, G♭, C♭" },
  { count: 1, type: "sharp", label: "1 sharp: F♯" },
  { count: 4, type: "flat", label: "4 flats: B♭, E♭, A♭, D♭" },
  { count: 3, type: "sharp", label: "3 sharps: F♯, C♯, G♯" },
  { count: 2, type: "flat", label: "2 flats: B♭, E♭" },
  { count: 5, type: "sharp", label: "5 sharps: F♯, C♯, G♯, D♯, A♯" }
];
const keyboardKeyChange = { steps: 0 };
const PIANO_KEY_NAMES = ["C", "C♯ / D♭", "D", "D♯ / E♭", "E", "F", "F♯ / G♭", "G", "G♯ / A♭", "A", "A♯ / B♭", "B"];
const PIANO_SHAPES = new Set(["circle", "zigzag", "rainbow"]);
const PIANO_GARDEN_OBJECTS = [
  ["🐶", "Dog"], ["🐱", "Cat"], ["🎵", "Music note"],
  ["🦊", "Fox"], ["🐼", "Panda"], ["🎹", "Keyboard"],
  ["🐵", "Monkey"], ["🦁", "Lion"], ["🎺", "Trumpet"],
  ["🐯", "Tiger"], ["🐨", "Koala"], ["🎸", "Guitar"],
  ["🐰", "Rabbit"], ["🐙", "Octopus"], ["🥁", "Drum"],
  ["🦋", "Butterfly"], ["🐳", "Whale"], ["🎻", "Violin"],
  ["🐢", "Turtle"], ["🦄", "Unicorn"], ["🎷", "Saxophone"],
  ["🐞", "Ladybug"], ["🐟", "Fish"], ["🎼", "Music"],
  ["🦖", "Dinosaur"], ["🐝", "Bee"], ["🎤", "Microphone"],
  ["🦉", "Owl"], ["🐸", "Frog"], ["🎶", "Music notes"]
];
const PIANO_WAVE_NOTES = [
  ["C4", "D sharp 4", "F4", "F sharp 4", "G4", "A sharp 4", "C5", "D sharp 5", "F5", "G5"],
  ["F3", "G sharp 3", "A sharp 3", "B3", "C4", "D sharp 4", "F4", "G sharp 4", "A sharp 4", "C5"]
];
const PIANO_WAVE_OBJECTS = [
  ["\u{1F3B9}", "Keyboard"], ["\u{1F3B8}", "Guitar"], ["\u{1F3BB}", "Violin"],
  ["\u{1F3B7}", "Saxophone"], ["\u{1F3BA}", "Trumpet"], ["\u{1F941}", "Drum"],
  ["\u{1F3A4}", "Microphone"], ["\u{1F3B5}", "Music note"], ["\u{1F3B6}", "Music notes"],
  ["\u{1F3BC}", "Music"], ["\u{1FA87}", "Maracas"], ["\u{1FA95}", "Banjo"],
  ["\u{1FA97}", "Accordion"], ["\u{1F436}", "Dog"], ["\u{1F431}", "Cat"],
  ["\u{1F438}", "Frog"], ["\u{1F98A}", "Fox"], ["\u{1F98B}", "Butterfly"],
  ["\u{1F984}", "Unicorn"], ["\u{1F31F}", "Star"]
];
const TWINKLE_MELODY = [
  "C4", "C4", "G4", "G4", "A4", "A4", "G4",
  "F4", "F4", "E4", "E4", "D4", "D4", "C4",
  "G4", "G4", "F4", "F4", "E4", "E4", "D4",
  "G4", "G4", "F4", "F4", "E4", "E4", "D4",
  "C4", "C4", "G4", "G4", "A4", "A4", "G4",
  "F4", "F4", "E4", "E4", "D4", "D4", "C4"
];
const SIDETRACK_POP_JAZZ_SCALE = [
  "C4", "D sharp 4", "F4", "F sharp 4", "G4", "A sharp 4", "C5",
  "A sharp 4", "G4", "F sharp 4", "F4", "D sharp 4", "C4"
];
const PIANO_FEATURED_SOUNDS = new Set(["grand-piano", "water-drop", "spaceship"]);

function setupKeyboardUi() {
  if (!el.realKeyboard || !el.keyboardSound || !el.pianoSound) return;
  el.keyboardSound.innerHTML = el.pianoSound.innerHTML;
  const whiteMidis = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84];
  const blackKeys = [
    [61, 1], [63, 2], [66, 4], [68, 5], [70, 6],
    [73, 8], [75, 9], [78, 11], [80, 12], [82, 13]
  ];
  const whiteWrap = document.createElement("div");
  whiteWrap.className = "keyboard-white-keys";
  whiteMidis.forEach((midi) => whiteWrap.appendChild(createKeyboardKey(midi, "keyboard-white")));
  el.realKeyboard.replaceChildren(whiteWrap);
  blackKeys.forEach(([midi, boundary]) => {
    const key = createKeyboardKey(midi, "keyboard-black");
    key.style.setProperty("--key-x", `${(boundary / whiteMidis.length) * 100}%`);
    el.realKeyboard.appendChild(key);
  });
}

function createKeyboardKey(midi, keyClass) {
  const key = document.createElement("button");
  const pitchClass = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  const accessibleNames = ["C", "C sharp", "D", "D sharp", "E", "F", "F sharp", "G", "G sharp", "A", "A sharp", "B"];
  const displayNames = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  key.type = "button";
  key.className = `keyboard-key ${keyClass}`;
  key.dataset.midi = String(midi);
  key.setAttribute("aria-label", `${accessibleNames[pitchClass]}${octave}`);
  key.innerHTML = `<span>${displayNames[pitchClass]}</span>`;
  return key;
}

function loadPianoSettings() {
  const saved = readJson(STORAGE_KEYS.piano, {});
  if (PIANO_SOUND_LABELS[saved.sound]) state.piano.sound = saved.sound;
  if (PIANO_SHAPES.has(saved.shape)) state.piano.shape = saved.shape;
  else if (saved.shape) state.piano.shape = "circle";
  const savedVolume = Number(saved.volume);
  if (Number.isFinite(savedVolume)) state.piano.volume = clamp(savedVolume, 0, 1);
  const savedTranspose = Number(saved.transpose);
  if (Number.isFinite(savedTranspose)) state.piano.transpose = clamp(Math.round(savedTranspose), -6, 6);
}

function savePianoSettings() {
  writeJson(STORAGE_KEYS.piano, {
    sound: state.piano.sound,
    volume: state.piano.volume,
    transpose: state.piano.transpose,
    shape: state.piano.shape
  });
}

function renderJazzyRibbons() {
  document.querySelectorAll(".jazzy-ribbon").forEach((svg) => {
    if (svg.dataset.rendered === "true") return;
    const phase = Number(svg.dataset.jazzyPhase || 0);
    const keyCount = 24;
    const margin = 18;
    const usableWidth = 1000 - margin * 2;
    const halfDepth = 60;
    const pointAt = (index) => {
      const x = margin + (usableWidth * index) / keyCount;
      const theta = ((x - margin) / usableWidth) * Math.PI * 2 + phase;
      const y = 110 + Math.sin(theta) * 29;
      const slope = Math.cos(theta) * 29 * Math.PI * 2 / usableWidth;
      const scale = 1 / Math.sqrt(1 + slope * slope);
      const tangent = { x: scale, y: slope * scale };
      const normal = { x: -slope * scale, y: scale };
      return {
        center: { x, y },
        tangent,
        normal,
        top: { x: x - normal.x * halfDepth, y: y - normal.y * halfDepth },
        bottom: { x: x + normal.x * halfDepth, y: y + normal.y * halfDepth }
      };
    };
    const points = Array.from({ length: keyCount + 1 }, (_, index) => pointAt(index));
    const whiteKeys = Array.from({ length: keyCount }, (_, index) => {
      const left = points[index];
      const right = points[index + 1];
      const fillClass = index % 2 ? "jazzy-white-key alternate" : "jazzy-white-key";
      return `<polygon class="${fillClass}" points="${left.top.x},${left.top.y} ${right.top.x},${right.top.y} ${right.bottom.x},${right.bottom.y} ${left.bottom.x},${left.bottom.y}"/>`;
    }).join("");
    const blackAfter = new Set([0, 1, 3, 4, 5]);
    const blackKeys = Array.from({ length: keyCount - 1 }, (_, offset) => offset + 1)
      .filter((boundary) => blackAfter.has((boundary - 1) % 7))
      .map((boundary) => {
        const point = points[boundary];
        const topCenter = {
          x: point.top.x + point.normal.x * 4,
          y: point.top.y + point.normal.y * 4
        };
        const bottomCenter = {
          x: topCenter.x + point.normal.x * 72,
          y: topCenter.y + point.normal.y * 72
        };
        const halfWidth = 10;
        return `<polygon class="jazzy-black-key" points="${topCenter.x - point.tangent.x * halfWidth},${topCenter.y - point.tangent.y * halfWidth} ${topCenter.x + point.tangent.x * halfWidth},${topCenter.y + point.tangent.y * halfWidth} ${bottomCenter.x + point.tangent.x * halfWidth},${bottomCenter.y + point.tangent.y * halfWidth} ${bottomCenter.x - point.tangent.x * halfWidth},${bottomCenter.y - point.tangent.y * halfWidth}"/>`;
      }).join("");
    svg.innerHTML = `<g class="jazzy-white-keys">${whiteKeys}</g><g class="jazzy-black-keys">${blackKeys}</g>`;
    svg.dataset.rendered = "true";
  });
}

function renderPiano() {
  if (!el.pianoSound) return;
  renderJazzyRibbons();
  el.pianoSound.value = state.piano.sound;
  el.pianoSoundButtons.forEach((button) => {
    const selected = button.dataset.pianoSound === state.piano.sound;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  el.pianoMoreSoundsButton.classList.toggle("has-selection", !PIANO_FEATURED_SOUNDS.has(state.piano.sound));
  const pianoVolumePercent = Math.round(state.piano.volume * 100);
  el.pianoVolume.value = String(pianoVolumePercent);
  el.pianoVolume.style.setProperty("--volume-level", `${pianoVolumePercent}%`);
  el.pianoShape.value = state.piano.shape;
  el.pianoShapeButtons.forEach((button) => {
    const selected = button.dataset.pianoShape === state.piano.shape;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  el.pianoSoundStatus.textContent = PIANO_SOUND_LABELS[state.piano.sound];
  if (el.keyboardSound) el.keyboardSound.value = state.piano.sound;
  if (el.keyboardVolume) {
    const keyboardVolumePercent = Math.round(state.piano.volume * 100);
    el.keyboardVolume.value = String(keyboardVolumePercent);
    el.keyboardVolume.style.setProperty("--volume-level", `${keyboardVolumePercent}%`);
  }
  if (el.keyboardTransposeValue) el.keyboardTransposeValue.value = state.piano.transpose > 0 ? `+${state.piano.transpose}` : String(state.piano.transpose);
  if (el.keyboardTransposeDown) el.keyboardTransposeDown.disabled = state.piano.transpose <= -6;
  if (el.keyboardTransposeUp) el.keyboardTransposeUp.disabled = state.piano.transpose >= 6;
  if (el.keyboardSoundStatus) {
    const soundingC = PIANO_NOTE_NAMES[(state.piano.transpose + 120) % 12];
    el.keyboardSoundStatus.textContent = `${PIANO_SOUND_LABELS[state.piano.sound]} · Transpose ${state.piano.transpose > 0 ? `+${state.piano.transpose}` : state.piano.transpose} · C sounds ${soundingC}`;
  }
  if (state.piano.masterGain && state.piano.audioContext) {
    state.piano.masterGain.gain.setTargetAtTime(state.piano.volume, state.piano.audioContext.currentTime, 0.015);
  }
  applyPianoShape();
}

function handlePianoShapeChange() {
  state.piano.shape = PIANO_SHAPES.has(el.pianoShape.value) ? el.pianoShape.value : "circle";
  state.piano.twinkleIndex = 0;
  savePianoSettings();
  renderPiano();
}

const SIDETRACK_NOTES = [
  ["C4", "C"], ["C sharp 4", "C#"], ["D4", "D"], ["D sharp 4", "D#"],
  ["E4", "E"], ["F4", "F"], ["F sharp 4", "F#"], ["G4", "G"],
  ["G sharp 4", "G#"], ["A4", "A"], ["A sharp 4", "A#"], ["B4", "B"], ["C5", "C"]
];
const KEY_ORDER_SCALE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const KEY_ORDER_CHORDS = {
  C4: ["C4", "E4", "G4"],
  D4: ["D4", "F4", "A4"],
  E4: ["E4", "G4", "B4"],
  F4: ["F4", "A4", "C5"],
  G4: ["G4", "B4", "D5"],
  A4: ["A4", "C5", "E5"],
  B4: ["B4", "D5", "F5"],
  C5: ["C5", "E5", "G5"]
};
const sidetrackAirGame = { active: false, popped: 0, created: 0, total: 26 };
const JAZZ_PUZZLE_IMAGES = [
  "assets/jazz-ensemble-puzzle.webp",
  "assets/jazz-ensemble-puzzle-2.webp",
  "assets/jazz-ensemble-puzzle-3.webp",
  "assets/jazz-ensemble-puzzle-4.webp",
  "assets/jazz-ensemble-puzzle-5.webp",
  "assets/jazz-ensemble-puzzle-6.webp",
  "assets/jazz-ensemble-puzzle-7.webp"
];
let sidetrackPuzzleDrag = null;
let sidetrackJazzDrag = null;
let sidetrackJazzSelected = null;
let sidetrackJazzImageIndex = 0;
let sidetrackJazzAdvanceTimer = null;

function initializeSidetrackActivities() {
  if (!el.sidetrackKeyboard || el.sidetrackKeyboard.childElementCount) return;
  SIDETRACK_NOTES.forEach(([note, label]) => {
    const key = document.createElement("button");
    key.type = "button";
    key.className = `sidetrack-key keyboard-key ${label.includes("#") ? "is-black" : "is-white"}`;
    key.dataset.note = note;
    key.setAttribute("aria-label", `${label}; tap again to hide or show its name`);
    key.innerHTML = `<span>${label}</span>`;
    ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
      const handler = eventName === "pointerdown" ? handlePianoPointerDown
        : eventName === "pointermove" ? handlePianoPointerMove : handlePianoPointerUp;
      key.addEventListener(eventName, handler);
    });
    key.addEventListener("click", () => key.classList.toggle("show-note"));
    el.sidetrackKeyboard.appendChild(key);
  });
  buildSidetrackPuzzle();
  buildJazzPuzzle();
  el.sidetrackAirRestart?.addEventListener("click", resetSidetrackAirGame);
}

function buildJazzPuzzle() {
  if (!el.sidetrackJazzPuzzle) return;
  window.clearTimeout(sidetrackJazzAdvanceTimer);
  sidetrackJazzAdvanceTimer = null;
  const image = JAZZ_PUZZLE_IMAGES[sidetrackJazzImageIndex];
  const pictureNumber = sidetrackJazzImageIndex + 1;
  el.sidetrackJazzPuzzle.style.setProperty("--jazz-puzzle-image", `url("${image}")`);
  const pieces = Array.from({ length: 9 }, (_, index) => index).sort(() => Math.random() - 0.5);
  el.sidetrackJazzPuzzle.innerHTML = `
    <div class="jazz-puzzle-heading">
      <strong>Build the music scene</strong>
      <button class="jazz-puzzle-reset" type="button" aria-label="Shuffle and start over" title="Start over">↻</button>
    </div>
    <div class="jazz-puzzle-choices" role="group" aria-label="Choose a puzzle picture">
      ${JAZZ_PUZZLE_IMAGES.map((choiceImage, index) => `
        <button class="jazz-puzzle-choice${index === sidetrackJazzImageIndex ? " selected" : ""}" type="button" data-jazz-picture="${index}" aria-label="Choose puzzle ${index + 1}" aria-pressed="${index === sidetrackJazzImageIndex}" style="--jazz-choice-image: url('${choiceImage}')"></button>
      `).join("")}
    </div>
    <div class="jazz-puzzle-workspace">
      <div class="jazz-puzzle-board" aria-label="Music picture ${pictureNumber} of ${JAZZ_PUZZLE_IMAGES.length} puzzle board">
        ${Array.from({ length: 9 }, (_, index) => `<span class="jazz-puzzle-slot" data-jazz-index="${index}"></span>`).join("")}
      </div>
      <div class="jazz-puzzle-tray" aria-label="Current puzzle piece">
        ${pieces.map((index) => `<button class="jazz-puzzle-piece" type="button" data-jazz-index="${index}" aria-label="Music puzzle piece ${index + 1}"></button>`).join("")}
      </div>
    </div>
    <p class="jazz-puzzle-status" aria-live="polite">Picture ${pictureNumber} of ${JAZZ_PUZZLE_IMAGES.length} • Piece 1 of 9</p>`;
  el.sidetrackJazzPuzzle.querySelectorAll(".jazz-puzzle-piece").forEach((piece) => {
    const index = Number(piece.dataset.jazzIndex);
    piece.style.setProperty("--piece-column", String(index % 3));
    piece.style.setProperty("--piece-row", String(Math.floor(index / 3)));
    piece.addEventListener("pointerdown", startJazzPuzzleDrag);
    piece.addEventListener("pointermove", moveJazzPuzzleDrag);
    piece.addEventListener("pointerup", endJazzPuzzleDrag);
    piece.addEventListener("pointercancel", cancelJazzPuzzleDrag);
  });
  el.sidetrackJazzPuzzle.querySelectorAll(".jazz-puzzle-slot").forEach((slot) => {
    slot.addEventListener("click", () => {
      if (!sidetrackJazzSelected) return;
      if (slot.dataset.jazzIndex === sidetrackJazzSelected.dataset.jazzIndex) {
        placeJazzPuzzlePiece(sidetrackJazzSelected, slot);
      } else {
        el.sidetrackJazzPuzzle.querySelector(".jazz-puzzle-status").textContent = "Try another space";
      }
    });
  });
  el.sidetrackJazzPuzzle.querySelectorAll("[data-jazz-picture]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextIndex = Number(button.dataset.jazzPicture);
      if (!Number.isInteger(nextIndex) || !JAZZ_PUZZLE_IMAGES[nextIndex]) return;
      sidetrackJazzImageIndex = nextIndex;
      resetJazzPuzzle();
    });
  });
  el.sidetrackJazzPuzzle.querySelector(".jazz-puzzle-reset")?.addEventListener("click", resetJazzPuzzle);
}

function resetJazzPuzzle() {
  window.clearTimeout(sidetrackJazzAdvanceTimer);
  sidetrackJazzAdvanceTimer = null;
  sidetrackJazzDrag?.floating?.remove();
  sidetrackJazzDrag?.piece?.classList.remove("dragging");
  sidetrackJazzDrag = null;
  sidetrackJazzSelected = null;
  buildJazzPuzzle();
}

function startJazzPuzzleDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  const piece = event.currentTarget;
  try { piece.setPointerCapture(event.pointerId); } catch (_error) {}
  const slot = el.sidetrackJazzPuzzle.querySelector(`.jazz-puzzle-slot[data-jazz-index="${piece.dataset.jazzIndex}"]`);
  const targetRect = slot.getBoundingClientRect();
  const floating = piece.cloneNode(false);
  floating.classList.add("jazz-puzzle-floating");
  floating.style.width = `${targetRect.width}px`;
  floating.style.height = `${targetRect.height}px`;
  document.body.appendChild(floating);
  sidetrackJazzDrag = {
    piece, floating, slot, pointerId: event.pointerId,
    startX: event.clientX, startY: event.clientY, moved: false
  };
  piece.classList.add("dragging");
  positionJazzPuzzleFloating(event);
}

function moveJazzPuzzleDrag(event) {
  if (!sidetrackJazzDrag || sidetrackJazzDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const distance = Math.hypot(event.clientX - sidetrackJazzDrag.startX, event.clientY - sidetrackJazzDrag.startY);
  if (distance > 7) sidetrackJazzDrag.moved = true;
  if (sidetrackJazzDrag.moved) positionJazzPuzzleFloating(event);
}

function endJazzPuzzleDrag(event) {
  if (!sidetrackJazzDrag || sidetrackJazzDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const { piece, floating, slot, moved } = sidetrackJazzDrag;
  piece.classList.remove("dragging");
  if (moved && jazzPuzzleFloatingOverSlot(floating, slot)) {
    placeJazzPuzzlePiece(piece, slot);
  } else if (!moved) {
    sidetrackJazzSelected?.classList.remove("selected");
    sidetrackJazzSelected = piece;
    piece.classList.add("selected");
    el.sidetrackJazzPuzzle.querySelector(".jazz-puzzle-status").textContent = "Now tap its matching space";
  } else {
    el.sidetrackJazzPuzzle.querySelector(".jazz-puzzle-status").textContent = "Try again";
  }
  floating.remove();
  sidetrackJazzDrag = null;
}

function cancelJazzPuzzleDrag(event) {
  if (!sidetrackJazzDrag || sidetrackJazzDrag.pointerId !== event.pointerId) return;
  sidetrackJazzDrag.piece.classList.remove("dragging");
  sidetrackJazzDrag.floating.remove();
  sidetrackJazzDrag = null;
}

function positionJazzPuzzleFloating(event) {
  const floating = sidetrackJazzDrag?.floating;
  if (!floating) return;
  const width = floating.offsetWidth;
  const height = floating.offsetHeight;
  const left = clamp(event.clientX - width / 2, 6, window.innerWidth - width - 6);
  const top = clamp(event.clientY - height - 22, 6, window.innerHeight - height - 6);
  floating.style.left = `${left}px`;
  floating.style.top = `${top}px`;
}

function jazzPuzzleFloatingOverSlot(floating, slot) {
  if (!floating || !slot) return false;
  const pieceRect = floating.getBoundingClientRect();
  const targetRect = slot.getBoundingClientRect();
  const tolerance = Math.max(14, Math.min(28, Math.max(targetRect.width, targetRect.height) * 0.22));
  const centerX = pieceRect.left + pieceRect.width / 2;
  const centerY = pieceRect.top + pieceRect.height / 2;
  return centerX >= targetRect.left - tolerance
    && centerX <= targetRect.right + tolerance
    && centerY >= targetRect.top - tolerance
    && centerY <= targetRect.bottom + tolerance;
}

function placeJazzPuzzlePiece(piece, slot) {
  sidetrackJazzSelected?.classList.remove("selected");
  sidetrackJazzSelected = null;
  slot.appendChild(piece);
  slot.classList.add("filled");
  piece.disabled = true;
  const remaining = el.sidetrackJazzPuzzle.querySelectorAll(".jazz-puzzle-tray .jazz-puzzle-piece").length;
  const status = el.sidetrackJazzPuzzle.querySelector(".jazz-puzzle-status");
  const pictureNumber = sidetrackJazzImageIndex + 1;
  status.textContent = remaining
    ? `Picture ${pictureNumber} of ${JAZZ_PUZZLE_IMAGES.length} • Piece ${10 - remaining} of 9`
    : "Great! Choose another puzzle or play this one again.";
  el.sidetrackJazzPuzzle.classList.toggle("complete", remaining === 0);
  playJazzPuzzleSuccess();
}

async function playJazzPuzzleSuccess() {
  const context = await getPianoAudioContext();
  if (!context) return;
  ["C5", "E5", "G5"].forEach((note, index) => {
    window.setTimeout(() => {
      const voice = createPianoVoice(context, pianoNoteFrequency(note), state.piano.sound);
      window.setTimeout(() => releasePianoVoice(voice, true), 360);
    }, index * 115);
  });
}

function buildSidetrackPuzzle() {
  if (!el.sidetrackPuzzle) return;
  el.sidetrackPuzzle.innerHTML = `
    <div class="sidetrack-puzzle-heading">
      <p class="sidetrack-puzzle-instruction">Put the keys in order</p>
      <button class="sidetrack-puzzle-reset" type="button" aria-label="Reset piano puzzle" title="Start over">↻</button>
    </div>
    <div class="sidetrack-puzzle-board">${SIDETRACK_NOTES.filter(([, label]) => !label.includes("#")).map(([, label], index) => `<span class="sidetrack-puzzle-slot" data-puzzle-index="${index}"></span>`).join("")}</div>
    <div class="sidetrack-puzzle-pieces"></div>
    <p class="sidetrack-puzzle-status" aria-live="polite">Build the keyboard</p>`;
  const naturalNotes = SIDETRACK_NOTES.filter(([, label]) => !label.includes("#"));
  const pieces = naturalNotes.map(([note, label], index) => ({
    note,
    label: note === "C4" ? "C" : note === "C5" ? "C\u2191" : label,
    keyName: note === "C4" ? "middle C" : note === "C5" ? "high C" : label,
    index
  }))
    .sort(() => Math.random() - 0.5);
  const tray = el.sidetrackPuzzle.querySelector(".sidetrack-puzzle-pieces");
  pieces.forEach(({ note, label, keyName, index }) => {
    const piece = document.createElement("button");
    piece.type = "button";
    piece.className = "sidetrack-puzzle-piece";
    piece.classList.toggle("middle-c-key", note === "C4");
    piece.dataset.note = note;
    piece.dataset.keyName = keyName;
    piece.dataset.puzzleIndex = String(index);
    piece.textContent = label;
    piece.setAttribute("aria-label", `${keyName}; drag to its keyboard position`);
    piece.title = keyName;
    piece.addEventListener("pointerdown", startSidetrackPuzzleDrag);
    piece.addEventListener("pointermove", moveSidetrackPuzzleDrag);
    piece.addEventListener("pointerup", endSidetrackPuzzleDrag);
    piece.addEventListener("pointercancel", cancelSidetrackPuzzleDrag);
    tray.appendChild(piece);
  });
  el.sidetrackPuzzle.querySelector(".sidetrack-puzzle-reset").addEventListener("click", resetSidetrackPuzzle);
}

function resetSidetrackPuzzle() {
  if (sidetrackPuzzleDrag?.piece) {
    sidetrackPuzzleDrag.piece.classList.remove("dragging");
    sidetrackPuzzleDrag.piece.style.transform = "";
  }
  sidetrackPuzzleDrag = null;
  buildSidetrackPuzzle();
}

function startSidetrackPuzzleDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  event.preventDefault();
  const piece = event.currentTarget;
  try { piece.setPointerCapture(event.pointerId); } catch (_error) {}
  sidetrackPuzzleDrag = { piece, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
  piece.classList.add("dragging");
}

function moveSidetrackPuzzleDrag(event) {
  if (!sidetrackPuzzleDrag || sidetrackPuzzleDrag.pointerId !== event.pointerId) return;
  event.preventDefault();
  const { piece, startX, startY } = sidetrackPuzzleDrag;
  piece.style.transform = `translate(${event.clientX - startX}px, ${event.clientY - startY}px) scale(1.06)`;
}

function endSidetrackPuzzleDrag(event) {
  if (!sidetrackPuzzleDrag || sidetrackPuzzleDrag.pointerId !== event.pointerId) return;
  const { piece } = sidetrackPuzzleDrag;
  const pieceRect = piece.getBoundingClientRect();
  piece.style.visibility = "hidden";
  const pointedSlot = document.elementFromPoint(event.clientX, event.clientY)?.closest(".sidetrack-puzzle-slot");
  piece.style.visibility = "";
  const expectedSlot = el.sidetrackPuzzle.querySelector(`.sidetrack-puzzle-slot[data-puzzle-index="${piece.dataset.puzzleIndex}"]`);
  const expectedRect = expectedSlot?.getBoundingClientRect();
  const horizontalOverlap = expectedRect
    ? Math.max(0, Math.min(pieceRect.right, expectedRect.right) - Math.max(pieceRect.left, expectedRect.left))
    : 0;
  const verticalOverlap = expectedRect
    ? Math.max(0, Math.min(pieceRect.bottom, expectedRect.bottom) - Math.max(pieceRect.top, expectedRect.top))
    : 0;
  const overlapsExpectedSlot = horizontalOverlap >= pieceRect.width * 0.45
    && verticalOverlap >= pieceRect.height * 0.45;
  const slot = overlapsExpectedSlot ? expectedSlot : pointedSlot;
  piece.classList.remove("dragging");
  piece.style.transform = "";
  if (slot && !slot.classList.contains("filled")
      && slot.dataset.puzzleIndex === piece.dataset.puzzleIndex) {
    slot.appendChild(piece);
    slot.classList.add("filled");
    enablePlacedKeyOrderKey(piece);
    void playKeyOrderPlacementReward(piece.dataset.note);
    const remaining = el.sidetrackPuzzle.querySelectorAll(".sidetrack-puzzle-pieces .sidetrack-puzzle-piece").length;
    const status = el.sidetrackPuzzle.querySelector(".sidetrack-puzzle-status");
    status.textContent = remaining
      ? `${piece.dataset.keyName} placed — play it! ${remaining} key${remaining === 1 ? "" : "s"} left`
      : "Keyboard complete!";
    if (!remaining) enableCompletedKeyOrder();
  } else if (slot) {
    const status = el.sidetrackPuzzle.querySelector(".sidetrack-puzzle-status");
    status.textContent = piece.dataset.note === "C4"
      ? "Middle C goes on the far left"
      : piece.dataset.note === "C5"
        ? "High C goes on the far right"
        : "Try a different space";
  }
  sidetrackPuzzleDrag = null;
}

async function playKeyOrderPlacementReward(note) {
  const context = await getPianoAudioContext();
  const targetIndex = KEY_ORDER_SCALE.indexOf(note);
  if (!context || targetIndex < 0) return;
  const scale = KEY_ORDER_SCALE.slice(0, targetIndex + 1);
  scale.forEach((scaleNote, index) => {
    window.setTimeout(() => {
      const voice = createPianoVoice(context, pianoNoteFrequency(scaleNote), state.piano.sound);
      window.setTimeout(() => releasePianoVoice(voice, true), 260);
    }, index * 135);
  });
  window.setTimeout(() => {
    (KEY_ORDER_CHORDS[note] || [note]).forEach((chordNote) => {
      const voice = createPianoVoice(context, pianoNoteFrequency(chordNote), state.piano.sound);
      window.setTimeout(() => releasePianoVoice(voice, true), 720);
    });
  }, scale.length * 135 + 110);
}

function enablePlacedKeyOrderKey(piece) {
  if (!piece || piece.classList.contains("key-order-playable")) return;
  piece.disabled = false;
  piece.classList.add("keyboard-key", "key-order-playable");
  piece.removeEventListener("pointerdown", startSidetrackPuzzleDrag);
  piece.removeEventListener("pointermove", moveSidetrackPuzzleDrag);
  piece.removeEventListener("pointerup", endSidetrackPuzzleDrag);
  piece.removeEventListener("pointercancel", cancelSidetrackPuzzleDrag);
  piece.setAttribute("aria-label", `Play ${piece.dataset.keyName || piece.textContent}`);
  piece.title = `Play ${piece.dataset.keyName || piece.textContent}`;
  piece.addEventListener("pointerdown", handlePianoPointerDown);
  piece.addEventListener("pointermove", handlePianoPointerMove);
  piece.addEventListener("pointerup", handlePianoPointerUp);
  piece.addEventListener("pointercancel", handlePianoPointerUp);
  piece.addEventListener("lostpointercapture", handlePianoPointerUp);
}

function enableCompletedKeyOrder() {
  el.sidetrackPuzzle.querySelectorAll(".sidetrack-puzzle-slot .sidetrack-puzzle-piece").forEach((piece) => {
    enablePlacedKeyOrderKey(piece);
  });
  const blackKeys = [
    { slot: 0, note: "C sharp 4", label: "C sharp" },
    { slot: 1, note: "D sharp 4", label: "D sharp" },
    { slot: 3, note: "F sharp 4", label: "F sharp" },
    { slot: 4, note: "G sharp 4", label: "G sharp" },
    { slot: 5, note: "A sharp 4", label: "A sharp" }
  ];
  blackKeys.forEach(({ slot: slotIndex, note, label }) => {
    const slot = el.sidetrackPuzzle.querySelector(`.sidetrack-puzzle-slot[data-puzzle-index="${slotIndex}"]`);
    if (!slot || slot.querySelector(".key-order-black-playable")) return;
    const key = document.createElement("button");
    key.type = "button";
    key.className = "keyboard-key key-order-black-playable";
    key.dataset.note = note;
    key.setAttribute("aria-label", label);
    ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
      const handler = eventName === "pointerdown" ? handlePianoPointerDown
        : eventName === "pointermove" ? handlePianoPointerMove : handlePianoPointerUp;
      key.addEventListener(eventName, handler);
    });
    slot.appendChild(key);
  });
  el.sidetrackPuzzle.querySelector(".sidetrack-puzzle-status").textContent = "Keyboard complete — play it!";
}

function cancelSidetrackPuzzleDrag(event) {
  if (!sidetrackPuzzleDrag || sidetrackPuzzleDrag.pointerId !== event.pointerId) return;
  sidetrackPuzzleDrag.piece.classList.remove("dragging");
  sidetrackPuzzleDrag.piece.style.transform = "";
  sidetrackPuzzleDrag = null;
}

function renderSidetrackActivity(shape) {
  if (!el.sidetrackKeyboard) return;
  el.sidetrackJazzPuzzle.hidden = shape !== "trail";
  el.sidetrackKeyboard.hidden = shape !== "circle";
  el.sidetrackPuzzle.hidden = shape !== "zigzag";
  el.sidetrackAir.hidden = shape !== "rainbow";
  if (shape === "rainbow") {
    if (!sidetrackAirGame.active && sidetrackAirGame.popped < sidetrackAirGame.total) resetSidetrackAirGame();
  } else {
    sidetrackAirGame.active = false;
    el.sidetrackAirField?.replaceChildren();
  }
}

function resetSidetrackAirGame() {
  if (!el.sidetrackAirField) return;
  sidetrackAirGame.active = true;
  sidetrackAirGame.popped = 0;
  sidetrackAirGame.created = 0;
  el.sidetrackAirRestart.hidden = true;
  el.sidetrackAirField.replaceChildren();
  updateSidetrackAirStatus();
  for (let index = 0; index < 4; index += 1) spawnSidetrackAirNote();
}

async function playSidetrackPopScaleNote(popIndex) {
  const context = await getPianoAudioContext();
  if (!context) return;
  const label = SIDETRACK_POP_JAZZ_SCALE[popIndex % SIDETRACK_POP_JAZZ_SCALE.length];
  createPianoVoice(context, pianoNoteFrequency(label), "electric-piano");
}

function spawnSidetrackAirNote() {
  if (!sidetrackAirGame.active || sidetrackAirGame.created >= sidetrackAirGame.total) return;
  const sequence = [
    { label: "music note", content: "♪" },
    { label: "music notes", content: "♫" },
    { label: "quarter note", content: "♩" },
    { label: "beamed notes", content: "♬" },
    { label: "treble clef", content: "𝄞" },
    { label: "bass clef", content: "𝄢" },
    { label: "drum", content: "🥁" },
    { label: "keyboard", content: "🎹" },
    { label: "clarinet", icon: "sound-icon-clarinet" }
  ];
  const note = document.createElement("button");
  note.type = "button";
  note.className = `sidetrack-flying-note balloon-tone-${sidetrackAirGame.created % 6}`;
  const balloon = sequence[sidetrackAirGame.created % sequence.length];
  if (balloon.icon) {
    note.innerHTML = `<svg aria-hidden="true"><use href="#${balloon.icon}"></use></svg>`;
  } else {
    note.textContent = balloon.content;
  }
  note.style.setProperty("--air-x", `${8 + Math.random() * 78}%`);
  note.style.setProperty("--air-y", `${10 + Math.random() * 66}%`);
  note.style.setProperty("--air-drift-x", `${-38 + Math.random() * 76}px`);
  note.style.setProperty("--air-drift-y", `${-42 + Math.random() * 84}px`);
  note.style.setProperty("--air-duration", `${11 + Math.random() * 7}s`);
  note.style.setProperty("--air-delay", `${-Math.random() * 8}s`);
  note.setAttribute("aria-label", `Pop moving ${balloon.label}`);
  note.addEventListener("click", () => {
    if (!sidetrackAirGame.active || note.classList.contains("popped")) return;
    void playSidetrackPopScaleNote(sidetrackAirGame.popped);
    note.classList.add("popped");
    sidetrackAirGame.popped += 1;
    updateSidetrackAirStatus();
    window.setTimeout(() => {
      note.remove();
      if (sidetrackAirGame.popped >= sidetrackAirGame.total) {
        sidetrackAirGame.active = false;
        el.sidetrackAirStatus.classList.add("complete");
        el.sidetrackAirStatus.setAttribute("aria-label", "Complete. All 20 notes popped.");
        el.sidetrackAirRestart.hidden = false;
      } else {
        spawnSidetrackAirNote();
      }
    }, 180);
  });
  sidetrackAirGame.created += 1;
  el.sidetrackAirField.appendChild(note);
}

function updateSidetrackAirStatus() {
  if (!el.sidetrackAirStatus) return;
  el.sidetrackAirStatus.classList.toggle("complete", sidetrackAirGame.popped >= sidetrackAirGame.total);
  el.sidetrackAirStatus.setAttribute("aria-valuenow", String(sidetrackAirGame.popped));
  el.sidetrackAirStatus.setAttribute("aria-valuemax", String(sidetrackAirGame.total));
  el.sidetrackAirStatus.setAttribute("aria-label", `${sidetrackAirGame.popped} of ${sidetrackAirGame.total} notes popped`);
  el.sidetrackAirStatus.replaceChildren(...Array.from({ length: sidetrackAirGame.total }, (_, index) => {
    const bubble = document.createElement("span");
    bubble.className = index < sidetrackAirGame.popped ? "filled" : "";
    bubble.setAttribute("aria-hidden", "true");
    return bubble;
  }));
}

function setPianoMoreSounds(expanded) {
  if (!el.pianoMoreSounds || !el.pianoMoreSoundsButton) return;
  el.pianoMoreSounds.hidden = !expanded;
  el.pianoMoreSoundsButton.setAttribute("aria-expanded", String(expanded));
  const label = expanded ? "Fewer sounds" : "More sounds";
  el.pianoMoreSoundsButton.setAttribute("aria-label", label);
  el.pianoMoreSoundsButton.setAttribute("title", label);
  el.pianoMoreSoundsButton.querySelector("[data-more-sounds-label]").textContent = label;
}

async function selectVisualPianoSound(value) {
  if (!PIANO_SOUND_LABELS[value]) return;
  stopAllPianoVoices();
  state.piano.sound = value;
  savePianoSettings();
  renderPiano();
  const context = await getPianoAudioContext();
  if (!context) return;
  const voice = createPianoVoice(context, 523.25, state.piano.sound);
  const duration = ["clarinet", "flute", "violin"].includes(state.piano.sound) ? 900 : 620;
  window.setTimeout(() => releasePianoVoice(voice, true), duration);
}

function pianoNoteMidi(label) {
  const match = String(label).match(/^([A-G])(?: sharp)?\s*(\d)$/i);
  if (!match) return 60;
  const noteIndex = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1].toUpperCase()];
  return (Number(match[2]) + 1) * 12 + noteIndex + (/sharp/i.test(label) ? 1 : 0);
}

function shuffledGardenObjects(count) {
  const result = [];
  let previousLabel = "";
  while (result.length < count) {
    const batch = PIANO_GARDEN_OBJECTS
      .map((item) => item)
      .sort(() => Math.random() - 0.5);
    if (batch.length > 1 && batch[0][1] === previousLabel) {
      const swapIndex = batch.findIndex((item) => item[1] !== previousLabel);
      [batch[0], batch[swapIndex]] = [batch[swapIndex], batch[0]];
    }
    batch.slice(0, count - result.length).forEach((item) => {
      result.push(item);
      previousLabel = item[1];
    });
  }
  return result;
}

function applyPianoShape() {
  if (!el.pianoNoteArc) return;
  const shape = PIANO_SHAPES.has(state.piano.shape) ? state.piano.shape : "circle";
  el.pianoNoteArc.dataset.shape = shape;
  if (shape === "garden") ensureGardenFill();
  if (shape === "twinkle") ensureTwinkleFill();
  const allButtons = Array.from(el.pianoNoteArc.querySelectorAll(".piano-note"));
  allButtons.forEach((button, buttonIndex) => {
    const shapeLimit = ["trail", "circle", "zigzag", "rainbow"].includes(shape) ? 0 : Infinity;
    if (!button.dataset.objectLabel) button.dataset.objectLabel = button.getAttribute("aria-label") || "Sound object";
    button.style.removeProperty("left");
    button.style.removeProperty("bottom");
    button.style.removeProperty("right");
    button.style.removeProperty("top");
    button.style.removeProperty("transform");
    button.style.removeProperty("--jazzy-angle");
    button.classList.remove("jazzy-key", "jazzy-key-upper", "jazzy-key-lower", "has-black-key");
    button.classList.toggle("piano-shape-hidden", buttonIndex >= shapeLimit);
    if (shape === "twinkle") {
      button.textContent = "★";
      button.setAttribute("aria-label", "Play the next Twinkle note");
    } else if (shape === "trail") {
      const wave = Math.min(1, Math.floor(buttonIndex / 10));
      const note = PIANO_WAVE_NOTES[wave][buttonIndex % 10];
      button.textContent = "";
      button.setAttribute("aria-label", `Play ${note}`);
    } else if (shape !== "garden") {
      button.textContent = button.dataset.object;
      button.setAttribute("aria-label", button.dataset.objectLabel);
    }
  });

  const includeWide = shape === "garden" || shape === "trail" || shape === "twinkle"
    || window.matchMedia("(orientation: landscape) and (min-width: 600px)").matches;
  const buttons = allButtons
    .filter((button) => !button.classList.contains("piano-shape-hidden"))
    .filter((button) => shape === "garden" || !button.classList.contains("garden-extra"))
    .filter((button) => shape === "twinkle" || !button.classList.contains("twinkle-extra"))
    .filter((button) => includeWide || !button.classList.contains("piano-wide-note"))
    .sort((a, b) => {
      if (shape === "twinkle") {
        const extraOrder = Number(a.classList.contains("twinkle-extra")) - Number(b.classList.contains("twinkle-extra"));
        if (extraOrder) return extraOrder;
      }
      return pianoNoteMidi(a.dataset.note) - pianoNoteMidi(b.dataset.note);
    });
  const count = buttons.length;
  const gardenObjects = shape === "garden" ? shuffledGardenObjects(count) : [];
  buttons.forEach((button, index) => {
    if (shape === "garden") {
      const [symbol, label] = gardenObjects[index];
      button.textContent = symbol;
      button.setAttribute("aria-label", label);
    }
    const point = pianoShapePoint(shape, index, count);
    button.style.left = `${point.x}%`;
    button.style.bottom = `${point.y}px`;
    if (shape === "trail") {
      const wave = Math.min(1, Math.floor(index / 10));
      const position = index % 10;
      const waveProgress = position / 9;
      button.dataset.trailNote = PIANO_WAVE_NOTES[wave][position];
      button.classList.add("jazzy-key", wave ? "jazzy-key-lower" : "jazzy-key-upper");
      button.classList.toggle("has-black-key", [0, 1, 3, 4, 5].includes(position));
      button.style.setProperty("--jazzy-angle", `${Math.cos(waveProgress * Math.PI * 2) * 11}deg`);
    } else {
      delete button.dataset.trailNote;
    }
  });
  renderSidetrackActivity(shape);
  el.pianoSoundStatus.textContent = shape === "twinkle"
    ? "Tap any star to play Twinkle, Twinkle"
    : PIANO_SOUND_LABELS[state.piano.sound];
}

function ensureGardenFill() {
  const width = el.pianoNoteArc?.clientWidth || 680;
  const height = el.pianoNoteArc?.clientHeight || 360;
  const buttonSize = window.matchMedia("(orientation: landscape) and (min-width: 600px)").matches ? 48 : 42;
  const step = buttonSize - 2;
  const columns = Math.ceil((width - buttonSize) / step) + 1;
  const rows = Math.ceil((height - buttonSize) / step) + 1;
  const targetCount = columns * rows;
  const baseButtons = Array.from(el.pianoNoteArc.querySelectorAll(".piano-note:not(.garden-extra):not(.twinkle-extra)"));
  let extras = Array.from(el.pianoNoteArc.querySelectorAll(".garden-extra"));
  while (baseButtons.length + extras.length < targetCount) {
    const source = baseButtons[extras.length % baseButtons.length];
    const clone = source.cloneNode(true);
    clone.classList.remove("piano-wide-note", "piano-shape-hidden", "is-playing");
    clone.classList.add("garden-extra");
    clone.removeAttribute("style");
    clone.addEventListener("pointerdown", handlePianoPointerDown);
    clone.addEventListener("pointermove", handlePianoPointerMove);
    clone.addEventListener("pointerup", handlePianoPointerUp);
    clone.addEventListener("pointercancel", handlePianoPointerUp);
    clone.addEventListener("lostpointercapture", handlePianoPointerUp);
    el.pianoNoteArc.appendChild(clone);
    extras.push(clone);
  }
  while (baseButtons.length + extras.length > targetCount && extras.length) extras.pop().remove();
}

function ensureTwinkleFill() {
  const width = el.pianoNoteArc?.clientWidth || 680;
  const columns = width < 430 ? 5 : 6;
  const baseButtons = Array.from(el.pianoNoteArc.querySelectorAll(".piano-note:not(.garden-extra):not(.twinkle-extra)"));
  const rows = Math.ceil(baseButtons.length / columns);
  const targetExtraCount = Math.max(0, (columns - 1) * (rows - 1));
  let extras = Array.from(el.pianoNoteArc.querySelectorAll(".twinkle-extra"));
  while (extras.length < targetExtraCount) {
    const source = baseButtons[extras.length % baseButtons.length];
    const clone = source.cloneNode(true);
    clone.classList.remove("piano-wide-note", "piano-shape-hidden", "is-playing");
    clone.classList.add("twinkle-extra");
    clone.removeAttribute("style");
    clone.addEventListener("pointerdown", handlePianoPointerDown);
    clone.addEventListener("pointermove", handlePianoPointerMove);
    clone.addEventListener("pointerup", handlePianoPointerUp);
    clone.addEventListener("pointercancel", handlePianoPointerUp);
    clone.addEventListener("lostpointercapture", handlePianoPointerUp);
    el.pianoNoteArc.appendChild(clone);
    extras.push(clone);
  }
  while (extras.length > targetExtraCount) extras.pop().remove();
}

function pianoShapePoint(shape, index, count) {
  const progress = count > 1 ? index / (count - 1) : 0.5;
  if (shape === "trail") {
    const height = el.pianoNoteArc?.clientHeight || 360;
    const itemsPerWave = 10;
    const wave = Math.min(1, Math.floor(index / itemsPerWave));
    const position = index % itemsPerWave;
    const waveProgress = position / (itemsPerWave - 1);
    const verticalPadding = 96;
    const waveGap = height - verticalPadding * 2;
    const waveStart = wave === 1 ? 11 : 7;
    return {
      x: waveStart + waveProgress * 82,
      y: height - verticalPadding - wave * waveGap + Math.sin(waveProgress * Math.PI * 2) * 30
    };
  }
  if (shape === "garden") {
    const width = el.pianoNoteArc?.clientWidth || 680;
    const height = el.pianoNoteArc?.clientHeight || 360;
    const buttonSize = window.matchMedia("(orientation: landscape) and (min-width: 600px)").matches ? 48 : 42;
    const step = buttonSize - 2;
    const columns = Math.ceil((width - buttonSize) / step) + 1;
    const rows = Math.ceil(count / columns);
    const row = Math.floor(index / columns);
    const column = index % columns;
    const visualColumn = row % 2 ? columns - 1 - column : column;
    return {
      x: ((buttonSize / 2 + (visualColumn / Math.max(1, columns - 1)) * (width - buttonSize)) / width) * 100,
      y: rows > 1 ? (row / (rows - 1)) * (height - buttonSize) : height / 2 - buttonSize / 2
    };
  }
  if (shape === "twinkle") {
    const width = el.pianoNoteArc?.clientWidth || 680;
    const height = el.pianoNoteArc?.clientHeight || 360;
    const columns = width < 430 ? 5 : 6;
    const baseCount = el.pianoNoteArc?.querySelectorAll(".piano-note:not(.garden-extra):not(.twinkle-extra)").length || 30;
    const rows = Math.ceil(baseCount / columns);
    if (index >= baseCount) {
      const extraIndex = index - baseCount;
      const betweenColumns = columns - 1;
      const row = Math.floor(extraIndex / betweenColumns);
      const column = extraIndex % betweenColumns;
      return {
        x: ((column + 1) / columns) * 100,
        y: 12 + ((row + 0.5) / Math.max(1, rows - 1)) * (height - 70)
      };
    }
    const row = Math.floor(index / columns);
    const column = index % columns;
    return {
      x: ((column + 0.5) / columns) * 100,
      y: rows > 1 ? 12 + (row / (rows - 1)) * (height - 70) : height / 2 - 23
    };
  }
  if (shape === "circle") {
    const width = el.pianoNoteArc?.clientWidth || 680;
    const height = el.pianoNoteArc?.clientHeight || 360;
    const circleProgress = count > 1 ? index / count : 0;
    const angle = -Math.PI / 2 + circleProgress * Math.PI * 2;
    const radius = Math.min(width * 0.36, height * 0.36);
    return { x: 50 + (Math.cos(angle) * radius / width) * 100, y: height / 2 - Math.sin(angle) * radius - 21 };
  }
  if (shape === "zigzag") {
    const height = el.pianoNoteArc?.clientHeight || 360;
    const columns = 5;
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rows = Math.ceil(count / columns);
    const rowCount = Math.min(columns, count - row * columns);
    const visualColumn = row % 2 ? rowCount - 1 - column : column;
    return {
      x: rowCount > 1 ? 9 + (visualColumn / (rowCount - 1)) * 82 : 50,
      y: rows > 1 ? height - 68 - (row / (rows - 1)) * (height - 105) : height / 2
    };
  }
  if (shape === "rainbow") {
    const height = el.pianoNoteArc?.clientHeight || 360;
    return { x: 7 + progress * 86, y: 38 + Math.sin(progress * Math.PI) * Math.min(160, height * 0.45) };
  }
  const width = el.pianoNoteArc?.clientWidth || 680;
  const height = el.pianoNoteArc?.clientHeight || 360;
  const outerRadius = Math.min(width * 0.42, height * 0.39);
  const innerRadius = outerRadius * 0.42;
  const vertices = Array.from({ length: 10 }, (_, vertexIndex) => {
    const angle = -Math.PI / 2 + vertexIndex * Math.PI / 5;
    const radius = vertexIndex % 2 ? innerRadius : outerRadius;
    return {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 - Math.sin(angle) * radius - 21
    };
  });
  const segmentLengths = vertices.map((vertex, vertexIndex) => {
    const next = vertices[(vertexIndex + 1) % vertices.length];
    return Math.hypot(next.x - vertex.x, next.y - vertex.y);
  });
  const perimeter = segmentLengths.reduce((total, length) => total + length, 0);
  let distance = count > 1 ? (index / count) * perimeter : 0;
  let segment = 0;
  while (distance > segmentLengths[segment] && segment < vertices.length - 1) {
    distance -= segmentLengths[segment];
    segment += 1;
  }
  const nextSegment = (segment + 1) % vertices.length;
  const segmentProgress = segmentLengths[segment] ? distance / segmentLengths[segment] : 0;
  return {
    x: ((vertices[segment].x + (vertices[nextSegment].x - vertices[segment].x) * segmentProgress) / width) * 100,
    y: vertices[segment].y + (vertices[nextSegment].y - vertices[segment].y) * segmentProgress
  };
}

async function playPianoEffect(effect, button) {
  const context = await getPianoAudioContext();
  if (!context) return;
  button.classList.remove("effect-active");
  void button.offsetWidth;
  button.classList.add("effect-active");
  window.setTimeout(() => button.classList.remove("effect-active"), 560);

  if (effect === "drop") {
    const voice = createPianoVoice(context, 880, "water-drop");
    window.setTimeout(() => releasePianoVoice(voice, true), 520);
    return;
  }
  if (effect === "firework") {
    const launch = context.currentTime;
    const whistle = context.createOscillator();
    const whistleGain = context.createGain();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(420, launch);
    whistle.frequency.exponentialRampToValueAtTime(1550, launch + 0.42);
    whistleGain.gain.setValueAtTime(0.0001, launch);
    whistleGain.gain.exponentialRampToValueAtTime(0.2, launch + 0.05);
    whistleGain.gain.exponentialRampToValueAtTime(0.0001, launch + 0.45);
    whistle.connect(whistleGain);
    whistleGain.connect(state.piano.masterGain);
    whistle.start(launch);
    whistle.stop(launch + 0.46);
    playPianoNoiseBurst(context, launch + 0.43, 0.52, 0.78);
    [0.49, 0.56, 0.65, 0.76].forEach((delay, index) => {
      playPianoNoiseBurst(context, launch + delay, 0.07 + index * 0.015, 0.34 - index * 0.045);
    });
    const boom = context.createOscillator();
    const boomGain = context.createGain();
    boom.type = "sine";
    boom.frequency.setValueAtTime(125, launch + 0.43);
    boom.frequency.exponentialRampToValueAtTime(48, launch + 0.78);
    boomGain.gain.setValueAtTime(0.72, launch + 0.43);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, launch + 0.82);
    boom.connect(boomGain);
    boomGain.connect(state.piano.masterGain);
    boom.start(launch + 0.43);
    boom.stop(launch + 0.83);
    return;
  }

  const start = context.currentTime;
  const kick = context.createOscillator();
  const kickGain = context.createGain();
  kick.type = "sine";
  kick.frequency.setValueAtTime(190, start);
  kick.frequency.exponentialRampToValueAtTime(58, start + 0.34);
  kickGain.gain.setValueAtTime(0.95, start);
  kickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.38);
  kick.connect(kickGain);
  kickGain.connect(state.piano.masterGain);
  kick.start(start);
  kick.stop(start + 0.39);
  const attack = context.createOscillator();
  const attackGain = context.createGain();
  attack.type = "triangle";
  attack.frequency.setValueAtTime(520, start);
  attack.frequency.exponentialRampToValueAtTime(135, start + 0.1);
  attackGain.gain.setValueAtTime(0.5, start);
  attackGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
  attack.connect(attackGain);
  attackGain.connect(state.piano.masterGain);
  attack.start(start);
  attack.stop(start + 0.13);
  playPianoNoiseBurst(context, start, 0.1, 0.42);
}

function playPianoNoiseBurst(context, start, duration, volume) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const fade = 1 - index / length;
    samples[index] = (Math.random() * 2 - 1) * fade * fade;
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(gain);
  gain.connect(state.piano.masterGain);
  source.start(start);
  source.stop(start + duration);
}

function renderPianoChordGuide() {
  if (!el.pianoChordRoot || !el.pianoChordType) return;
  const root = Number(el.pianoChordRoot.value) || 0;
  const chord = PIANO_CHORDS[el.pianoChordType.value] || PIANO_CHORDS.major;
  const chordMidis = new Set(chord.intervals.map((interval) => 60 + root + interval));
  document.querySelectorAll(".keyboard-key").forEach((button) => {
    button.classList.toggle("chord-highlight", chordMidis.has(Number(button.dataset.midi)));
  });
  el.pianoChordUse.textContent = chord.use;
  const chordTypeLabel = el.pianoChordType.selectedOptions[0]?.textContent || "Chord";
  const notes = chord.intervals.map((interval) => PIANO_KEY_NAMES[(root + interval) % 12]);
  el.pianoChordNotes.innerHTML = `<strong>${PIANO_NOTE_NAMES[root]} ${chordTypeLabel}</strong><span>Play: ${notes.join(" · ")}</span>`;
  const fourth = (root + 5) % 12;
  const fifth = (root + 7) % 12;
  const relativeMinor = (root + 9) % 12;
  el.pianoChordPartners.innerHTML = `
    <strong>Often works in ${PIANO_NOTE_NAMES[root]} major</strong>
    <span>${PIANO_NOTE_NAMES[root]} · ${PIANO_NOTE_NAMES[fourth]} · ${PIANO_NOTE_NAMES[fifth]} · ${PIANO_NOTE_NAMES[relativeMinor]}m</span>
  `;
  el.pianoChordFamily.innerHTML = `
    <span><strong>${PIANO_NOTE_NAMES[root]}</strong>I · Home</span>
    <span><strong>${PIANO_NOTE_NAMES[fourth]}</strong>IV · Away</span>
    <span><strong>${PIANO_NOTE_NAMES[fifth]}</strong>V · Leads home</span>
    <span><strong>${PIANO_NOTE_NAMES[relativeMinor]}m</strong>vi · Softer</span>
  `;
  renderPianoStyleGuide();
}

function applyPianoStyleGuide() {
  const guide = PIANO_STYLE_GUIDES[el.pianoStyle?.value];
  if (guide) {
    if (!el.pianoStyle.dataset.homeRoot) el.pianoStyle.dataset.homeRoot = el.pianoChordRoot.value;
    el.pianoChordType.value = guide.chordType;
    el.scaleRoot.value = el.pianoStyle.dataset.homeRoot;
    el.scaleType.value = guide.scaleType;
  } else {
    delete el.pianoStyle.dataset.homeRoot;
  }
  renderPianoChordGuide();
}

function handlePianoChordRootChange() {
  if (PIANO_STYLE_GUIDES[el.pianoStyle?.value]) {
    el.pianoStyle.dataset.homeRoot = el.pianoChordRoot.value;
    el.scaleRoot.value = el.pianoChordRoot.value;
  }
  renderPianoChordGuide();
}

function renderPianoStyleGuide() {
  if (!el.pianoStyle || !el.pianoStyleRecipe) return;
  const guide = PIANO_STYLE_GUIDES[el.pianoStyle.value];
  el.pianoStyleRecipe.hidden = !guide;
  if (!guide) {
    el.pianoStyleRecipe.replaceChildren();
    return;
  }
  const home = Number(el.pianoStyle.dataset.homeRoot ?? el.pianoChordRoot.value) || 0;
  const chordButtons = guide.chords.map(([offset, type, role, scaleType]) => {
    const root = (home + offset) % 12;
    const suffix = PIANO_CHORD_SUFFIXES[type] ?? "";
    const scaleAttribute = scaleType ? ` data-style-scale="${scaleType}"` : "";
    return `<button type="button" data-style-root="${root}" data-style-type="${type}"${scaleAttribute}><strong>${PIANO_NOTE_NAMES[root]}${suffix}</strong><span>${role}</span></button>`;
  }).join("");
  el.pianoStyleRecipe.innerHTML = `
    <div><strong>Try this first</strong></div>
    <div class="piano-style-chords">${chordButtons}</div>
    <p><strong>Scale:</strong> ${guide.scaleLabel}</p>
  `;
}

function handlePianoStyleRecipeClick(event) {
  const button = event.target.closest("[data-style-root][data-style-type]");
  if (!button) return;
  el.pianoChordRoot.value = button.dataset.styleRoot;
  el.pianoChordType.value = button.dataset.styleType;
  if (button.dataset.styleScale) {
    el.scaleRoot.value = button.dataset.styleRoot;
    el.scaleType.value = button.dataset.styleScale;
  }
  renderPianoChordGuide();
  playPianoGuideChord();
}

function showKeyboardGuide(guide) {
  const showKeyChanges = guide === "key";
  const showScales = guide === "scale";
  const showChords = !showKeyChanges && !showScales;
  el.pianoChordGuide.hidden = !showChords;
  el.keyChangeGuide.hidden = !showKeyChanges;
  el.scaleGuide.hidden = !showScales;
  el.chordGuideTab.classList.toggle("selected", showChords);
  el.keyChangeTab.classList.toggle("selected", showKeyChanges);
  el.scaleGuideTab.classList.toggle("selected", showScales);
  el.chordGuideTab.setAttribute("aria-selected", String(showChords));
  el.keyChangeTab.setAttribute("aria-selected", String(showKeyChanges));
  el.scaleGuideTab.setAttribute("aria-selected", String(showScales));
  if (showChords) renderPianoChordGuide();
  if (showKeyChanges) renderKeyChangeGuide();
  if (showScales) renderPianoScaleGuide();
  if (showKeyChanges) {
    document.querySelectorAll(".keyboard-key").forEach((button) => {
      button.classList.remove("chord-highlight", "game-preview");
    });
  }
}

function renderPianoScaleGuide() {
  if (!el.scaleRoot || !el.scaleType || !el.scaleResult || !el.scaleTipText) return;
  const root = Number(el.scaleRoot.value) || 0;
  const scale = PIANO_SCALES[el.scaleType.value] || PIANO_SCALES.major;
  const scaleMidis = new Set(scale.intervals.map((interval) => 60 + root + interval));
  document.querySelectorAll(".keyboard-key").forEach((button) => {
    button.classList.toggle("chord-highlight", scaleMidis.has(Number(button.dataset.midi)));
    button.classList.remove("game-preview");
  });
  const notes = scale.intervals.map((interval) => PIANO_NOTE_NAMES[(root + interval) % 12]);
  el.scaleResult.innerHTML = `
    <strong>${PIANO_NOTE_NAMES[root]} ${scale.label}</strong>
    <span>${notes.join(" · ")}</span>
  `;
  el.scaleTipText.textContent = scale.use;
}

async function playPianoScale() {
  const context = await getPianoAudioContext();
  if (!context) return;
  const root = Number(el.scaleRoot.value) || 0;
  const scale = PIANO_SCALES[el.scaleType.value] || PIANO_SCALES.major;
  const ascendingMidis = scale.intervals.map((interval) => 60 + root + interval);
  const midis = ascendingMidis.concat(ascendingMidis.slice(0, -1).reverse());
  document.querySelectorAll(".keyboard-key").forEach((button) => {
    button.classList.remove("chord-highlight", "game-preview");
  });
  midis.forEach((midi, index) => {
    window.setTimeout(() => {
      const button = document.querySelector(`.keyboard-key[data-midi="${midi}"]`);
      button?.classList.add("chord-highlight", "game-preview");
      const frequency = 440 * (2 ** ((midi + state.piano.transpose - 69) / 12));
      const voice = createPianoVoice(context, frequency, state.piano.sound);
      window.setTimeout(() => {
        releasePianoVoice(voice, true);
        button?.classList.remove("game-preview");
      }, 380);
    }, index * 470);
  });
}

function adjustKeyChange(delta) {
  keyboardKeyChange.steps = Math.max(-6, Math.min(6, keyboardKeyChange.steps + delta));
  renderKeyChangeGuide();
}

function keyChangePitch(root, steps) {
  return (root + steps + 120) % 12;
}

function formatKeyChangeSteps(steps) {
  if (steps > 0) return `+${steps}`;
  if (steps < 0) return `−${Math.abs(steps)}`;
  return "0";
}

function keySignatureMemoryTrick(keyIndex) {
  const signature = KEY_SIGNATURES[keyIndex];
  if (!signature.count) return "Remember: C major has no sharps or flats.";
  if (signature.type === "sharp") return "Remember: the key is one half step above the last sharp.";
  if (signature.count === 1) return "Remember: F major is the one-flat exception; it has B♭.";
  return "Remember: with flats, the second-to-last flat names the key.";
}

function renderKeySignatureDisplay(keyIndex) {
  const signature = KEY_SIGNATURES[keyIndex];
  const symbol = signature.type === "sharp" ? "♯" : signature.type === "flat" ? "♭" : "♮";
  const signatureOffsets = signature.type === "sharp"
    ? [-10, 5, -15, 0, 15, -5, 10]
    : signature.type === "flat"
      ? [0, -15, 5, -10, 10, -5, 15]
      : [0];
  const symbols = Array.from({ length: Math.max(1, signature.count) }, (_, index) =>
    `<span style="--key-offset:${signatureOffsets[index]}px">${symbol}</span>`
  ).join("");
  const noteNames = signature.count ? signature.label.split(": ")[1] : "No sharps or flats";
  return `
    <div class="key-signature-display" role="img" aria-label="Key of ${KEY_CHANGE_NAMES[keyIndex]} major: ${signature.label}">
      <strong>Key of ${KEY_CHANGE_NAMES[keyIndex]} major</strong>
      <span class="key-signature-symbols ${signature.type || "natural"}" aria-hidden="true">${symbols}</span>
      <span class="key-signature-notes">${noteNames}</span>
    </div>
  `;
}

function renderKeyChangeGuide() {
  if (!el.keyChangeRoot || !el.keyChangeResult || !el.keyChangeTable) return;
  const root = Number(el.keyChangeRoot.value) || 0;
  const steps = keyboardKeyChange.steps;
  const result = keyChangePitch(root, steps);
  el.keyChangeSteps.textContent = formatKeyChangeSteps(steps);
  el.keyChangeDown.disabled = steps <= -6;
  el.keyChangeUp.disabled = steps >= 6;
  const direction = steps === 0
    ? "The music remains in its original key."
    : `Move every note ${Math.abs(steps)} semitone${Math.abs(steps) === 1 ? "" : "s"} ${steps > 0 ? "higher" : "lower"}.`;
  el.keyChangeResult.innerHTML = `
    <div class="key-change-summary">
      <strong>${KEY_CHANGE_NAMES[root]} <span aria-hidden="true">→</span> ${KEY_CHANGE_NAMES[result]}</strong>
      <span>${direction}</span>
    </div>
    ${renderKeySignatureDisplay(result)}
  `;
  el.keyChangeTable.innerHTML = Array.from({ length: 13 }, (_, index) => index - 6).map((rowSteps) => {
    const rowResult = keyChangePitch(root, rowSteps);
    const active = rowSteps === steps;
    return `
      <button type="button" data-key-change-step="${rowSteps}" class="${active ? "selected" : ""}" aria-pressed="${active}">
        <span>${formatKeyChangeSteps(rowSteps)}</span>
        <strong>${KEY_CHANGE_NAMES[rowResult]}</strong>
        <span>${KEY_SIGNATURES[rowResult].label}</span>
      </button>
    `;
  }).join("");
}

function handleKeyChangeTableClick(event) {
  const row = event.target.closest("[data-key-change-step]");
  if (!row) return;
  keyboardKeyChange.steps = Number(row.dataset.keyChangeStep);
  renderKeyChangeGuide();
}

async function playPianoGuideChord() {
  renderPianoChordGuide();
  const unique = Array.from(document.querySelectorAll(".keyboard-key.chord-highlight"))
    .sort((a, b) => Number(a.dataset.midi) - Number(b.dataset.midi));
  const context = await getPianoAudioContext();
  if (!context) return;
  const voices = unique.map((button) => {
    button.classList.add("game-preview");
    return createPianoVoice(
      context,
      pianoNoteFrequency(button.getAttribute("aria-label")) * (2 ** (state.piano.transpose / 12)),
      state.piano.sound,
      { sustainChord: true }
    );
  });
  await waitPianoGame(1400);
  unique.forEach((button) => button.classList.remove("game-preview"));
  voices.forEach((voice) => releasePianoVoice(voice, true));
}


function waitPianoGame(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getPlayablePianoButtons() {
  return Array.from(document.querySelectorAll(".piano-note")).filter((button) => button.offsetParent !== null);
}

function pianoGameNoteLabel(label) {
  return String(label).replace(" sharp ", "♯");
}

function randomPianoGameLabel(exclude = "") {
  const buttons = getPlayablePianoButtons();
  const choices = buttons.filter((button) => button.getAttribute("aria-label") !== exclude);
  const pool = choices.length ? choices : buttons;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)].getAttribute("aria-label") : "C4";
}

function updatePianoGameUi() {
  const mode = state.piano.game.mode;
  el.pianoCopyGameButton.classList.toggle("active", mode === "copy");
  el.pianoGuessGameButton.classList.toggle("active", mode === "guess");
  el.pianoGameReplayButton.hidden = !mode;
  el.pianoGameStopButton.hidden = !mode;
}

function resetPianoGameState() {
  state.piano.game.playToken += 1;
  state.piano.game.acceptingInput = false;
  state.piano.game.inputIndex = 0;
  document.querySelectorAll(".piano-note.game-preview").forEach((button) => button.classList.remove("game-preview"));
}

function startPianoCopyGame() {
  resetPianoGameState();
  state.piano.game.mode = "copy";
  state.piano.game.sequence = [
    randomPianoGameLabel(),
    randomPianoGameLabel(),
    randomPianoGameLabel()
  ];
  el.pianoGames.open = true;
  el.pianoGameStatus.textContent = "Get ready to listen…";
  updatePianoGameUi();
  window.setTimeout(playPianoCopySequence, 450);
}

async function playPianoCopySequence() {
  if (state.piano.game.mode !== "copy") return;
  const token = ++state.piano.game.playToken;
  state.piano.game.acceptingInput = false;
  state.piano.game.inputIndex = 0;
  el.pianoGameStatus.textContent = "Listen and watch.";
  for (const label of state.piano.game.sequence) {
    if (token !== state.piano.game.playToken || state.piano.game.mode !== "copy") return;
    const button = getPlayablePianoButtons().find((candidate) => candidate.getAttribute("aria-label") === label);
    if (button) await previewPianoGameNote(button, true, 520);
    await waitPianoGame(130);
  }
  if (token !== state.piano.game.playToken || state.piano.game.mode !== "copy") return;
  state.piano.game.acceptingInput = true;
  el.pianoGameStatus.textContent = `Your turn — copy ${state.piano.game.sequence.length} notes.`;
}

function startPianoGuessGame() {
  resetPianoGameState();
  state.piano.game.mode = "guess";
  state.piano.game.sequence = [];
  el.pianoGames.open = true;
  updatePianoGameUi();
  playNextPianoGuess();
}

async function playNextPianoGuess() {
  if (state.piano.game.mode !== "guess") return;
  const token = ++state.piano.game.playToken;
  state.piano.game.acceptingInput = false;
  state.piano.game.targetLabel = randomPianoGameLabel(state.piano.game.targetLabel);
  el.pianoGameStatus.textContent = "Listen…";
  const button = getPlayablePianoButtons().find((candidate) => candidate.getAttribute("aria-label") === state.piano.game.targetLabel);
  if (button) await previewPianoGameNote(button, false, 700);
  if (token !== state.piano.game.playToken || state.piano.game.mode !== "guess") return;
  state.piano.game.acceptingInput = true;
  el.pianoGameStatus.textContent = "Which note was that?";
}

async function previewPianoGameNote(button, reveal, duration) {
  const context = await getPianoAudioContext();
  if (!context) return;
  const voice = createPianoVoice(context, pianoNoteFrequency(button.getAttribute("aria-label")), state.piano.sound);
  if (reveal) button.classList.add("game-preview");
  await waitPianoGame(duration);
  if (reveal) button.classList.remove("game-preview");
  releasePianoVoice(voice, true);
}

function handlePianoGameInput(button) {
  const game = state.piano.game;
  if (!game.mode || !game.acceptingInput) return;
  const label = button.getAttribute("aria-label");
  if (game.mode === "copy") {
    if (label !== game.sequence[game.inputIndex]) {
      game.acceptingInput = false;
      game.inputIndex = 0;
      el.pianoGameStatus.textContent = "Not quite — listen once more.";
      window.setTimeout(playPianoCopySequence, 800);
      return;
    }
    game.inputIndex += 1;
    if (game.inputIndex < game.sequence.length) {
      el.pianoGameStatus.textContent = `${game.inputIndex} correct — keep going.`;
      return;
    }
    game.acceptingInput = false;
    game.inputIndex = 0;
    el.pianoGameStatus.textContent = "Correct! Adding one more note…";
    game.sequence.push(randomPianoGameLabel(game.sequence[game.sequence.length - 1]));
    window.setTimeout(playPianoCopySequence, 900);
    return;
  }
  if (game.mode === "guess") {
    if (label === game.targetLabel) {
      game.acceptingInput = false;
      el.pianoGameStatus.textContent = `Correct — ${pianoGameNoteLabel(label)}!`;
      window.setTimeout(playNextPianoGuess, 900);
    } else {
      el.pianoGameStatus.textContent = "Try another note.";
    }
  }
}

function replayPianoGame() {
  if (state.piano.game.mode === "copy") {
    resetPianoGameState();
    playPianoCopySequence();
  } else if (state.piano.game.mode === "guess") {
    const button = getPlayablePianoButtons().find((candidate) => candidate.getAttribute("aria-label") === state.piano.game.targetLabel);
    state.piano.game.acceptingInput = false;
    el.pianoGameStatus.textContent = "Listen again…";
    previewPianoGameNote(button, false, 700).then(() => {
      if (state.piano.game.mode !== "guess") return;
      state.piano.game.acceptingInput = true;
      el.pianoGameStatus.textContent = "Which note was that?";
    });
  }
}

function stopPianoGame() {
  resetPianoGameState();
  state.piano.game.mode = "";
  state.piano.game.sequence = [];
  state.piano.game.targetLabel = "";
  el.pianoGameStatus.textContent = "Choose a game.";
  updatePianoGameUi();
}


function handlePianoSoundChange(event) {
  stopAllPianoVoices();
  const value = event?.target?.value || el.pianoSound.value;
  state.piano.sound = PIANO_SOUND_LABELS[value] ? value : "grand-piano";
  savePianoSettings();
  renderPiano();
}

function handlePianoVolumeChange(event) {
  const value = event?.target?.value ?? el.pianoVolume.value;
  state.piano.volume = clamp(Number(value) / 100, 0, 1);
  savePianoSettings();
  renderPiano();
}

function setKeyboardTranspose(value) {
  state.piano.transpose = clamp(Math.round(Number(value) || 0), -6, 6);
  stopAllPianoVoices();
  savePianoSettings();
  renderPiano();
}

function adjustKeyboardTranspose(delta) {
  setKeyboardTranspose(state.piano.transpose + delta);
}

async function getPianoAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    window.alert("This browser cannot play these music sounds.");
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
  let note = button.dataset.note || button.getAttribute("aria-label");
  if (button.classList.contains("piano-note") && state.piano.shape === "trail" && button.dataset.trailNote) {
    note = button.dataset.trailNote;
  }
  if (button.classList.contains("piano-note") && state.piano.shape === "twinkle") {
    note = TWINKLE_MELODY[state.piano.twinkleIndex % TWINKLE_MELODY.length];
    state.piano.twinkleIndex = (state.piano.twinkleIndex + 1) % TWINKLE_MELODY.length;
    el.pianoSoundStatus.textContent = state.piano.twinkleIndex
      ? `Twinkle, Twinkle • note ${state.piano.twinkleIndex} of ${TWINKLE_MELODY.length}`
      : "Twinkle complete — tap a star to play again";
  }
  const frequency = pianoNoteFrequency(note);
  const transpose = button.classList.contains("keyboard-key") ? state.piano.transpose : 0;
  const voice = createPianoVoice(context, frequency * (2 ** (transpose / 12)), state.piano.sound);
  voice.button = button;
  state.piano.voices.set(pointerId, voice);
  button.classList.add("is-playing");
}

function handlePianoPointerMove(event) {
  if (!state.piano.pointerNotes.has(event.pointerId)) return;
  event.preventDefault();
  const hit = document.elementFromPoint(event.clientX, event.clientY);
  const nextButton = hit && hit.closest ? hit.closest(".piano-note, .keyboard-key") : null;
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
    if (typeof gain.gain.cancelAndHoldAtTime === "function") {
      gain.gain.cancelAndHoldAtTime(now);
    } else {
      const currentLevel = Math.max(0.0001, gain.gain.value);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(currentLevel, now);
    }
    gain.gain.setTargetAtTime(0.0001, now, voice.release || 0.08);
  });
  voice.sources.forEach((source) => {
    try { source.stop(now + Math.max(0.12, (voice.release || 0.08) * 5)); } catch (_error) {}
  });
}

function createPianoVoice(context, frequency, sound, options = {}) {
  const now = context.currentTime;
  const sustainChord = Boolean(options.sustainChord);
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
    addTone(1, "triangle", 0.36, 0.003, sustainChord ? 2.4 : 1.35, sustainChord ? 0.035 : 0.0001, -3, sustainChord ? 3.1 : 1.6);
    addTone(1, "sine", 0.2, 0.002, sustainChord ? 2.1 : 1.05, sustainChord ? 0.025 : 0.0001, 3, sustainChord ? 2.8 : 1.3);
    addTone(2, "sine", 0.11, 0.001, sustainChord ? 1.25 : 0.5, sustainChord ? 0.008 : 0.0001, -4, sustainChord ? 1.8 : 0.7);
    addTone(3, "sine", 0.04, 0.001, 0.24, 0.0001, 5, 0.4);
    addNoise(0.035, 0.035, 4200);
    voice.release = sustainChord ? 0.24 : 0.055;
  } else if (sound === "electric-piano") {
    addTone(1, "sine", 0.31, 0.004, 2.1, 0.0001, -7, 2.5);
    addTone(1, "sine", 0.22, 0.004, 1.8, 0.0001, 7, 2.2);
    addTone(2.01, "sine", 0.17, 0.002, 1.15, 0.0001, 0, 1.45);
    addTone(3.98, "sine", 0.075, 0.001, 0.55, 0.0001, 0, 0.8);
    addTone(7.96, "sine", 0.025, 0.001, 0.22, 0.0001, 0, 0.4);
    voice.release = 0.11;
  } else if (sound === "acoustic-guitar") {
    addTone(1, "sawtooth", 0.16, 0.002, sustainChord ? 1.15 : 0.42, sustainChord ? 0.012 : 0.0001, -5, sustainChord ? 1.8 : 0.65);
    addTone(1, "triangle", 0.24, 0.002, sustainChord ? 1.9 : 0.95, sustainChord ? 0.025 : 0.0001, 4, sustainChord ? 2.5 : 1.15);
    addTone(2, "triangle", 0.12, 0.001, sustainChord ? 0.85 : 0.34, sustainChord ? 0.006 : 0.0001, -2, sustainChord ? 1.4 : 0.5);
    addTone(4, "sine", 0.045, 0.001, 0.2, 0.0001, 3, 0.32);
    addNoise(0.075, 0.055, 5600);
    voice.release = sustainChord ? 0.2 : 0.045;
  } else if (sound === "classical-guitar") {
    addTone(1, "triangle", 0.31, 0.003, sustainChord ? 2.15 : 1.25, sustainChord ? 0.03 : 0.0001, -2, sustainChord ? 2.8 : 1.5);
    addTone(1, "sine", 0.16, 0.002, sustainChord ? 1.75 : 0.9, sustainChord ? 0.018 : 0.0001, 2, sustainChord ? 2.4 : 1.15);
    addTone(2, "sine", 0.075, 0.002, sustainChord ? 1.0 : 0.48, sustainChord ? 0.005 : 0.0001, 0, sustainChord ? 1.6 : 0.7);
    addTone(3, "sine", 0.028, 0.002, 0.28, 0.0001, 0, 0.45);
    addNoise(0.025, 0.04, 3000);
    voice.release = sustainChord ? 0.24 : 0.075;
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
  if (el.pdfSettingsTempoInput) el.pdfSettingsTempoInput.value = String(state.metronome.bpm);
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

function saveCardOrder(orderedIds) {
  const cardIds = state.data.items.filter((item) => item.type === "card").map((item) => item.id);
  const validIds = new Set(cardIds);
  const nextIds = orderedIds.filter((id, index) => validIds.has(id) && orderedIds.indexOf(id) === index);
  cardIds.forEach((id) => {
    if (!nextIds.includes(id)) nextIds.push(id);
  });
  writeJson(STORAGE_KEYS.cardOrder, nextIds);
  renderCards();
}

function dragHandleHtml(kind, id, label) {
  const safeId = escapeHtml(id);
  const safeLabel = escapeHtml(label);
  const dataAttribute = kind === "favorite"
    ? `data-favorite-drag="${safeId}"`
    : kind === "card"
      ? `data-card-drag="${safeId}"`
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
  const isExpanded = state.expandedListIds.includes(listId);
  const willExpand = !isExpanded;
  state.armedPdfListId = willExpand
    && getPdfViewerSettings().nextSongDefault
    && getPdfSequence(listId).length > 1
    ? listId
    : "";
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
  state.listEditSort = "pdf";
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

function moveCardOrderStep(id, direction) {
  const orderedIds = getOrderedCards().map((card) => card.id);
  const index = orderedIds.indexOf(id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
  [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
  saveCardOrder(orderedIds);
}

function toggleAlphabeticalListView(listId) {
  if (!state.lists.some((list) => list.id === listId)) return;
  if (state.alphabeticalListViewIds.has(listId)) {
    state.alphabeticalListViewIds.delete(listId);
  } else {
    state.alphabeticalListViewIds.add(listId);
  }
  renderLists();
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
          <button class="remove-button list-item-remove-button" type="button" data-list-modal-remove="${value}" aria-label="Remove ${escapeHtml(title)} from this list only" title="Remove from this list only"><span aria-hidden="true">&minus;</span><span>Remove</span></button>
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
  return ["type", "title", "pdf", "card", "link"].includes(value) ? value : "pdf";
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
  const ok = window.confirm(`Delete the list "${list.title}"?\n\nThe songs and files will remain available elsewhere in the app.`);
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
  if (item?.type === "card") return getCardSubtype(item) || "card";
  return item?.type || "item";
}

function setlistMeta(item, entry) {
  const page = entry.page || item.page;
  const pieces = [
    page ? `p. ${page}` : "",
    item.type,
    entry.notes || item.notes || ""
  ].filter(Boolean);
  return escapeHtml(pieces.join(" · "));
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
      cardSubtypes: getRememberedCardSubtypes(),
      cardOrder: readJson(STORAGE_KEYS.cardOrder, []),
      lists: readJson(STORAGE_KEYS.lists, state.lists),
      quickIndexes: readJson(STORAGE_KEYS.quickIndexes, state.data.quickIndexes || []),
      setlists: readJson(STORAGE_KEYS.setlists, state.data.setlists || []),
      favorites: readJson(STORAGE_KEYS.favorites, []),
      lastOpened: readJson(STORAGE_KEYS.lastOpened, null),
      quickChecks: readJson(STORAGE_KEYS.quickChecks, {}),
      pdfPages: readJson(STORAGE_KEYS.pdfPages, {}),
      pdfAnnotations: readJson(STORAGE_KEYS.pdfAnnotations, {}),
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
      writeJson(STORAGE_KEYS.cardSubtypes, data.cardSubtypes || []);
      writeJson(STORAGE_KEYS.cardOrder, data.cardOrder || []);
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
      writeJson(STORAGE_KEYS.pdfAnnotations, data.pdfAnnotations || {});
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
